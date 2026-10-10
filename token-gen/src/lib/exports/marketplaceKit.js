import { buildFigmaTokensPayload } from '../payloads.js';
import { auditMarketplaceKitMode } from './marketplaceKitReleaseAudit.js';
import { flattenTokens } from '../theme/paths.js';
import { getContrastRatio, normalizeHex } from '../colorUtils.js';
import { generateAse } from './exportAse.js';
import { generateGpl } from './exportGpl.js';
import { generateProcreateSwatchesFile } from './exportProcreate.js';
import { buildTailwindConfigJs } from './tokenExports.js';
import {
  buildThemePackExportData,
  buildThemePackPreviewTheme,
} from './workflowExports.js';
import { exportAssets, slugifyFilename, buildExportFilename } from './exportUtils.js';
import { renderPaletteCardPng } from './previewAssets.js';

// Marketplace kit export: the sell-ready bundle format (per-mode folders with
// designer + developer formats, previews, contrast matrix, manifest, license).

const CONTRAST_PAIR_DEFS = [
  ['text-body / background', 'typography-text-body', 'surfaces-background'],
  ['heading / background', 'typography-heading', 'surfaces-background'],
  ['text-muted / background', 'typography-text-muted', 'surfaces-background'],
  ['text-accent / background', 'textPalette-text-accent', 'surfaces-background'],
  ['link / background', 'brand-link-color', 'surfaces-background'],
  ['primary button / foreground', 'actions-primary-foreground', 'actions-primary'],
  ['secondary button / foreground', 'actions-secondary-foreground', 'actions-secondary'],
];

const flatKey = (name) => String(name).replace(/\//g, '-');

// A buyer's CSS must contain every exported colour, not merely the UI preview's
// ordered swatch subset. The same keys and values appear in canonical JSON.
export const buildMarketplaceKitCss = (flatTokens, prefix) => [
  ':root {',
  ...flatTokens.map(({ key, hex }) => '  --' + prefix + '-' + key + ': ' + hex + ';'),
  '}',
  '',
].join('\n');

export const flattenKitTokens = (finalTokens) => flattenTokens(finalTokens || {})
  .map(({ name, value }) => {
    const raw = value && typeof value === 'object' && 'value' in value ? value.value : value;
    const hex = normalizeHex(raw, null);
    return hex ? { key: flatKey(name), hex: hex.toLowerCase(), group: String(name).split('/')[0] } : null;
  })
  .filter(Boolean);

export const buildKitContrastMatrix = (flatTokens) => {
  const map = Object.fromEntries(flatTokens.map(({ key, hex }) => [key, hex]));
  return CONTRAST_PAIR_DEFS
    .filter(([, fg, bg]) => map[fg] && map[bg])
    .map(([label, fg, bg]) => ({ pair: label, ratio: getContrastRatio(map[fg], map[bg]).toFixed(2) }));
};

export const buildKitReadme = ({ name, tokenCount, groups, modes, files, tokenCountsByVariant = null }) => {
  const groupLines = Object.entries(groups)
    .map(([group, count]) => `- **${group}** (${count})`)
    .join('\n');
  return [
    `# ${name}`,
    '',
    `A finished theme kit in ${modes.length} variant${modes.length === 1 ? '' : 's'}: ${modes.join(', ')}.`,
    tokenCountsByVariant
      ? `Colour tokens per variant: ${modes.map(mode => `${mode}: ${tokenCountsByVariant[mode]}`).join(', ')}.`
      : `Colour tokens in this variant: ${tokenCount}.`,
    '',
    '## Tokens',
    '',
    groupLines,
    '',
    '## Contents',
    '',
    'Each variant folder holds the same tokens in seven production formats:',
    '',
    '- `.ase` — Adobe Swatch Exchange (Illustrator, Photoshop, InDesign).',
    '  Figma does not open ASE natively; use a palette-import plugin or the Figma tokens file below.',
    '- `.swatches` — Procreate palette (first 30 tokens; Procreate caps palettes at 30 swatches).',
    '- `.gpl` — GIMP / Inkscape palette.',
    '- `.css` — CSS custom properties. Also usable as a Tailwind v4 `@theme` source.',
    '- `.json` — canonical design-token JSON (flat `group-name` keys).',
    '- `.figma-tokens.json` — Tokens Studio for Figma format (`{ value, type }` per token).',
    '  Import via the Tokens Studio plugin.',
    '- `tailwind.<kit>-<variant>.js` — Tailwind CSS v3 `theme.extend` snippet.',
    '',
    'Also included:',
    '',
    '- `contrast-matrix.json` — measured WCAG 2.1 contrast ratios for key text/surface pairs',
    '  and button pairs, per variant. The matrix covers the pairs a buyer actually ships —',
    '  not every theoretical token combination.',
    '- `previews/` — swatch-sheet reference images for the included variants.',
    '- `manifest.json` — kit metadata. `LICENSE.txt` — usage license.',
    '',
    'Files:',
    '',
    ...files.map((file) => `- \`${file}\``),
    '',
    'Made with Apocapalette.',
  ].join('\n');
};

export const buildKitManifest = ({ slug, name, tokenCount, groups, modes, formats, files, tokenCountsByVariant = null, tokenGroupsByVariant = null, modeSpecificTokens = null }) => (
  JSON.stringify({
    id: slug,
    name,
    tokenCount,
    variants: modes,
    formats,
    tokenGroups: groups,
    ...(tokenCountsByVariant ? { tokenCountsByVariant } : {}),
    ...(tokenGroupsByVariant ? { tokenGroupsByVariant } : {}),
    ...(modeSpecificTokens ? { modeSpecificTokens } : {}),
    accessibility: 'Key text/surface pairs and button pairs per variant measured at WCAG 2.1 ratios (see contrast-matrix.json).',
    license: 'Personal and commercial use allowed for finished work; no resale/redistribution of the kit itself.',
    created: new Date().toISOString().slice(0, 10),
    files,
  }, null, 2)
);

export const buildKitLicense = (name) => [
  `${String(name).toUpperCase()} — THEME KIT`,
  'Usage license',
  '',
  'You may use these colors and tokens in personal and commercial finished work:',
  'client projects, products, themes, templates you build with them.',
  '',
  'You may NOT resell, redistribute, repackage, or share the kit files themselves,',
  'in whole or in part, free or paid. Derivative palettes generated from these',
  'tokens for resale are not permitted.',
  '',
  'Made with Apocapalette.',
  '',
].join('\n');

const buildModeFiles = async ({ root, kitSlug, kitName, mode, variant, cssPrefix }) => {
  const { finalTokens, currentTheme } = variant;
  const flatTokens = flattenKitTokens(finalTokens);
  const modeFolder = root.folder(mode);
  if (!modeFolder) throw new Error(`Failed to create ${mode} kit folder`);
  const base = `${kitSlug}-${mode}`;
  const designerColors = flatTokens.map(({ key, hex }) => ({ name: key, hex }));

  modeFolder.file(`${base}.json`, JSON.stringify({
    kit: kitSlug,
    name: kitName,
    mode,
    tokenCount: flatTokens.length,
    tokens: Object.fromEntries(flatTokens.map(({ key, hex }) => [key, hex])),
  }, null, 2));
  const css = buildMarketplaceKitCss(flatTokens, cssPrefix);
  const gpl = generateGpl(kitName + ' ' + mode, designerColors);
  const ase = generateAse(designerColors);
  auditMarketplaceKitMode({ flatTokens, css, gpl, ase, prefix: cssPrefix });
  modeFolder.file(`${base}.css`, css);
  modeFolder.file(`${base}.gpl`, gpl);
  modeFolder.file(`${base}.ase`, ase);
  modeFolder.file(`${base}.swatches`, await generateProcreateSwatchesFile(`${kitName} ${mode}`, designerColors));

  const figmaPayload = buildFigmaTokensPayload(finalTokens, { namingPrefix: cssPrefix || undefined });
  if (figmaPayload && Object.keys(figmaPayload).length > 0) {
    modeFolder.file(`${base}.figma-tokens.json`, JSON.stringify(figmaPayload, null, 2));
  }
  modeFolder.file(
    `tailwind.${base}.js`,
    buildTailwindConfigJs({ kitName, mode, flatTokens, prefix: cssPrefix }),
  );

  return { flatTokens, currentTheme };
};

export const buildMarketplaceKitArchive = async (theme, options = {}) => {
  const exportData = buildThemePackExportData(theme, options);
  const kitName = exportData.themeName || 'Theme Kit';
  const kitSlug = exportData.slug || slugifyFilename(kitName, 'theme-kit');
  const cssPrefix = String(exportData.metadata?.tokenPrefix || kitSlug).replace(/[^a-zA-Z0-9_-]/g, '-');

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const root = zip.folder(kitSlug);
  if (!root) throw new Error('Failed to create marketplace kit folder');

  const files = [];
  const matrix = {};
  const groupCounts = {};
  const previewFolder = root.folder('previews');
  let tokenCount = 0;
  const tokenCountsByVariant = {};
  const tokenGroupsByVariant = {};
  const keysByVariant = {};

  for (const mode of exportData.availableModes) {
    const variant = exportData.variants[mode];
    const { flatTokens, currentTheme } = await buildModeFiles({
      root, kitSlug, kitName, mode, variant, cssPrefix,
    });
    // All variants must pass the required semantic-pair audit in buildModeFiles.
    // Pop legitimately adds extra pop-* tokens that are absent in Light/Dark,
    // so demanding identical key sets would reject valid complete kits.
    keysByVariant[mode] = new Set(flatTokens.map(({ key }) => key));
    tokenCountsByVariant[mode] = flatTokens.length;
    const modeGroups = {};
    flatTokens.forEach(({ group }) => {
      modeGroups[group] = (modeGroups[group] || 0) + 1;
    });
    tokenGroupsByVariant[mode] = modeGroups;
    if (!tokenCount) {
      tokenCount = flatTokens.length;
      Object.assign(groupCounts, modeGroups);
    }
    matrix[mode] = buildKitContrastMatrix(flatTokens);
    [
      `${mode}/${kitSlug}-${mode}.json`, `${mode}/${kitSlug}-${mode}.css`,
      `${mode}/${kitSlug}-${mode}.gpl`, `${mode}/${kitSlug}-${mode}.ase`,
      `${mode}/${kitSlug}-${mode}.swatches`, `${mode}/${kitSlug}-${mode}.figma-tokens.json`,
      `${mode}/tailwind.${kitSlug}-${mode}.js`,
    ].forEach((file) => files.push(file));

    try {
      const previewTheme = buildThemePackPreviewTheme(currentTheme, { name: kitName }, mode);
      const png = await renderPaletteCardPng(previewTheme);
      if (png) {
        previewFolder.file(`${kitSlug}-${mode}.png`, png);
        files.push(`previews/${kitSlug}-${mode}.png`);
      }
    } catch (error) {
      console.warn(`Marketplace kit preview failed for ${mode}`, error);
    }
  }

  const allModes = exportData.availableModes;
  const commonKeys = new Set(keysByVariant[allModes[0]] || []);
  for (const mode of allModes.slice(1)) {
    for (const key of commonKeys) {
      if (!keysByVariant[mode].has(key)) commonKeys.delete(key);
    }
  }
  const modeSpecificTokens = Object.fromEntries(allModes.map(mode => [
    mode, [...keysByVariant[mode]].filter(key => !commonKeys.has(key)).sort(),
  ]));

  root.file('contrast-matrix.json', JSON.stringify(matrix, null, 2));
  root.file('LICENSE.txt', buildKitLicense(kitName));
  files.push('contrast-matrix.json', 'LICENSE.txt');

  const orderedFiles = [...files].sort();
  root.file('README.md', buildKitReadme({
    name: kitName,
    tokenCount,
    groups: groupCounts,
    modes: exportData.availableModes,
    tokenCountsByVariant,
    files: orderedFiles,
  }));
  root.file('manifest.json', buildKitManifest({
    slug: kitSlug,
    name: kitName,
    tokenCount,
    groups: groupCounts,
    modes: exportData.availableModes,
    tokenCountsByVariant,
    tokenGroupsByVariant,
    modeSpecificTokens,
    formats: ['ase', 'swatches', 'gpl', 'css', 'json', 'figma-tokens', 'tailwind'],
    files: [...orderedFiles, 'README.md', 'manifest.json'].sort(),
  }));

  // Do not claim an export file exists unless it was actually put into the ZIP.
  const declared = [...orderedFiles, 'README.md', 'manifest.json'].sort();
  const packed = Object.entries(zip.files)
    .filter(([, item]) => !item.dir)
    .map(([path]) => path.slice(kitSlug.length + 1))
    .sort();
  if (JSON.stringify(declared) !== JSON.stringify(packed)) {
    throw new Error('Marketplace kit manifest does not match ZIP contents');
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return {
    blob,
    filename: buildExportFilename(kitSlug, '-kit', 'zip'),
    kitSlug,
    modes: exportData.availableModes,
  };
};

export const downloadMarketplaceKitArchive = async (theme, options = {}) => {
  const { blob, filename } = await buildMarketplaceKitArchive(theme, options);
  exportAssets({ data: blob, filename, mime: 'application/zip' });
};
