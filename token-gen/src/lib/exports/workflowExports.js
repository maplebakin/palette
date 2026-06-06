import { buildTheme } from '../theme/engine.js';
import { buildFigmaTokensPayload, buildGenericPayload, buildPenpotPayload } from '../payloads.js';
import { toPenpotTokens } from '../penpotTokens.js';
import { buildCssVariables } from '../theme/styles.js';
import { buildExportFilename, downloadFile, exportAssets, exportThemePack, slugifyFilename } from '../export/index.js';
import { buildPrintTokenTree, getThemePackGuidance, sanitizeThemeName } from '../appState.js';
import { normalizeHex } from '../colorUtils.js';
import { buildOrderedStack } from '../tokens.js';
import { extractSocColorsFromTokens, generateSoc } from '../soc-exporter.js';
import { buildPreviewRoleTokens } from '../previewTokens.js';
import { generateDesignSpacePalette } from './designSpacePalette.js';
import {
  buildPaletteCardSvg,
  buildStripSvg,
  createTarArchive,
  encodeText,
  renderPaletteCardPng,
  renderStripPng,
} from './previewAssets.js';

const THEME_KIT_ROLE_LABELS = {
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  mutedText: 'Muted Text',
  border: 'Border',
  accent: 'Accent',
  cta: 'CTA',
  ctaForeground: 'CTA Foreground',
  entityHighlightBg: 'Entity Highlight Background',
  entityHighlightAccent: 'Entity Highlight Accent',
  entityHighlightText: 'Entity Highlight Text',
  entityHighlightBorder: 'Entity Highlight Border',
};

const THEME_KIT_CSS_VARS = {
  background: '--color-bg',
  surface: '--color-surface',
  text: '--color-text',
  mutedText: '--color-muted-text',
  border: '--color-border',
  accent: '--color-accent',
  cta: '--color-cta',
  ctaForeground: '--color-cta-foreground',
  entityHighlightBg: '--color-entity-highlight-bg',
  entityHighlightAccent: '--color-entity-highlight-accent',
  entityHighlightText: '--color-entity-highlight-text',
  entityHighlightBorder: '--color-entity-highlight-border',
};

export const buildThemeKitExportData = ({
  tokens,
  displayThemeName,
  baseColor,
  mode,
  themeMode,
  fineTune = {},
  generatedAt = new Date().toISOString(),
}) => {
  const themeName = sanitizeThemeName(displayThemeName || 'Theme Kit', 'Theme Kit');
  const slug = slugifyFilename(themeName, 'theme-kit');
  const activeMode = themeMode || 'light';
  const previewRoles = buildPreviewRoleTokens(tokens, activeMode);
  const roles = Object.fromEntries(
    Object.keys(THEME_KIT_ROLE_LABELS).map((role) => [role, previewRoles[role]])
  );
  const allModes = ['light', 'dark', 'pop'];

  return {
    schema: 'apocapalette-theme-kit-v1',
    themeFamilyName: themeName,
    slug,
    baseHex: normalizeHex(baseColor, '#000000').toUpperCase(),
    harmonyMode: mode || 'Monochromatic',
    generatedAt,
    version: 'v1',
    variantCoverage: 'current-mode-only',
    availableVariants: [activeMode],
    missingVariants: allModes.filter((variant) => variant !== activeMode),
    variants: {
      [activeMode]: {
        mode: activeMode,
        roles,
      },
    },
    fineTune,
    exportNotes: [
      'This listing export packages the currently previewed/tuned palette tokens from app state.',
      'Missing Light/Dark/Pop variants are not regenerated during export because they are not stored as confirmed variant state.',
    ],
  };
};

const buildThemeKitCss = (themeKit) => Object.entries(themeKit.variants).map(([variant, variantData]) => {
  const selector = `[data-theme="${themeKit.slug}-${variant}"]`;
  const lines = Object.entries(THEME_KIT_CSS_VARS).map(([role, cssVar]) => `  ${cssVar}: ${variantData.roles[role]};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}).join('\n\n');

const buildHexList = (themeKit) => Object.entries(themeKit.variants).flatMap(([variant, variantData]) => [
  `${themeKit.themeFamilyName} - ${variant[0].toUpperCase()}${variant.slice(1)}`,
  ...Object.entries(THEME_KIT_ROLE_LABELS).map(([role, label]) => `${label}: ${variantData.roles[role]}`),
  '',
]).join('\n').trimEnd();

const buildCanvaHexList = (themeKit) => Object.entries(themeKit.variants).flatMap(([variant, variantData]) => [
  `${variant.toUpperCase()} COLORS`,
  `Background ${variantData.roles.background}`,
  `Surface ${variantData.roles.surface}`,
  `Text ${variantData.roles.text}`,
  `Accent ${variantData.roles.accent}`,
  `Button ${variantData.roles.cta}`,
  `Highlight ${variantData.roles.entityHighlightBg}`,
  `Highlight Accent ${variantData.roles.entityHighlightAccent}`,
  '',
]).join('\n').trimEnd();

const formatListingMode = (mode) => (
  mode ? `${mode[0].toUpperCase()}${mode.slice(1)}` : ''
);

const buildThemeKitReadme = (themeKit) => {
  const includedModes = themeKit.availableVariants.map(formatListingMode).join(', ') || 'None';
  const missingModes = themeKit.missingVariants.map(formatListingMode).join(', ') || 'None';

  return [
    `# ${themeKit.themeFamilyName} Listing Asset Package`,
    '',
    `This Apocapalette listing asset package helps prepare storefront previews and product listing materials for ${themeKit.themeFamilyName} (${themeKit.baseHex}). It is not a full Light/Dark/Pop Theme Pack.`,
    '',
    '## Package Coverage',
    '',
    '- Coverage: Current mode only',
    `- Included active mode: ${includedModes}`,
    `- Missing modes: ${missingModes}`,
    '- Missing modes are not regenerated. Review and export those modes separately when you need additional listing assets.',
    '',
    '## Included Listing Files',
    '',
    '- `theme.json` - role-based color data for the included active mode.',
    '- `theme.css` - CSS variables for previewing the included active mode.',
    '- `hex-list.txt` - readable list of color hex codes.',
    '- `canva-hex-list.txt` - simplified hex code list for quick copy-paste.',
    '- `listing-copy.md` - draft storefront listing copy.',
    '- `meta.json` - listing package details and file metadata.',
    '- `cover.png`, `swatches.png`, `ui.png`, `tokens-snippet.png` - captured listing and preview images when available.',
    '',
    '## CSS Usage',
    '',
    'Add `theme.css` to your project, then set the matching theme attribute on a parent element.',
    '',
    '```html',
    `<main data-theme="${themeKit.slug}-${themeKit.availableVariants[0]}">`,
    '  <button class="primary">Primary Action</button>',
    '</main>',
    '```',
    '',
    '```css',
    '.primary {',
    '  background: var(--color-cta);',
    '  color: var(--color-cta-foreground);',
    '}',
    '```',
    '',
    '## Usage Notes',
    '',
    'Use the Canva list for planners, Notion pages, and simple design tools. Use `theme.json` for automation and design-system mapping. Colors are provided as-is and should be checked in final context before publishing.',
    '',
    'Made with Apocapalette.',
  ].join('\n');
};

const buildListingCopy = (themeKit) => [
  `# ${themeKit.themeFamilyName} Theme Kit`,
  '',
  `A ${themeKit.harmonyMode} Apocapalette theme kit built from ${themeKit.baseHex}.`,
  '',
  '## Short Description',
  '',
  `A ready-to-use ${themeKit.availableVariants.join(', ')} color theme kit with CSS variables, JSON tokens, hex lists, and preview assets.`,
  '',
  '## Included Files',
  '',
  '- README.md',
  '- theme.json',
  '- theme.css',
  '- hex-list.txt',
  '- canva-hex-list.txt',
  '- meta.json',
  '- preview PNG assets',
  '',
  '## Best For',
  '',
  '- Brand direction',
  '- Web UI styling',
  '- Canva and Notion planning',
  '- Storefront listing drafts',
  '',
  '## Suggested Tags',
  '',
  'theme kit, color palette, css variables, design tokens, brand colors, canva palette, apocapalette',
].join('\n');

export const exportAllAssetsPack = async ({
  currentTheme,
  penpotPayload,
}) => {
  const slug = slugifyFilename(currentTheme.name || 'theme', 'theme');
  const paletteSvg = buildPaletteCardSvg(currentTheme);
  const stripSvg = buildStripSvg(currentTheme);
  const [palettePng, stripPng] = await Promise.all([
    renderPaletteCardPng(currentTheme),
    renderStripPng(currentTheme),
  ]);

  const files = [
    { name: `${slug}/palette-card.svg`, data: encodeText(paletteSvg) },
    { name: `${slug}/palette-card.png`, data: palettePng },
    { name: `${slug}/swatch-strip.svg`, data: encodeText(stripSvg) },
    { name: `${slug}/swatch-strip.png`, data: stripPng },
    { name: `${slug}/tokens.json`, data: encodeText(JSON.stringify(penpotPayload, null, 2)) },
  ];

  const tarData = createTarArchive(files);
  const filename = buildExportFilename(slug, '-asset-pack', 'tar');
  exportAssets({ data: tarData, filename, mime: 'application/x-tar' });
};

export const generateListingAssetsArchive = async ({
  coverNode,
  swatchNode,
  snippetNode,
  previewNode,
  tokens,
  displayThemeName,
  baseColor,
  mode,
  themeMode,
  fineTune,
  rootFolder = 'listing',
  includeMeta = true,
  zipName,
}) => {
  const { toPng } = await import('html-to-image');
  const JSZip = (await import('jszip')).default;

  const toBytes = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return new Uint8Array(await response.arrayBuffer());
  };

  const captureNode = async (node, options) => {
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      ...options,
    });
    return toBytes(dataUrl);
  };

  const zip = new JSZip();
  const listingFolder = zip.folder(rootFolder || 'listing');
  if (!listingFolder) throw new Error('Failed to create listing folder');
  const themeKit = buildThemeKitExportData({
    tokens,
    displayThemeName,
    baseColor,
    mode,
    themeMode,
    fineTune,
  });

  const coverPng = await captureNode(coverNode, {
    width: 1200,
    height: 1200,
    backgroundColor: themeKit.variants[themeKit.availableVariants[0]].roles.background,
  });
  listingFolder.file('cover.png', coverPng);

  const swatchPng = await captureNode(swatchNode, {
    width: 1600,
    height: 400,
    backgroundColor: themeKit.variants[themeKit.availableVariants[0]].roles.background,
  });
  listingFolder.file('swatches.png', swatchPng);

  const uiPng = await captureNode(previewNode, {
    width: 1600,
    height: 900,
    style: { width: '1600px', height: '900px' },
    backgroundColor: themeKit.variants[themeKit.availableVariants[0]].roles.background,
  });
  listingFolder.file('ui.png', uiPng);

  let snippetCaptured = false;
  if (snippetNode) {
    try {
      const snippetPng = await captureNode(snippetNode, {
        width: 1200,
        height: 600,
        backgroundColor: themeKit.variants[themeKit.availableVariants[0]].roles.background,
      });
      listingFolder.file('tokens-snippet.png', snippetPng);
      snippetCaptured = true;
    } catch (error) {
      console.warn('Listing tokens snippet failed', error);
    }
  }

  listingFolder.file('theme.json', JSON.stringify(themeKit, null, 2));
  listingFolder.file('theme.css', buildThemeKitCss(themeKit));
  listingFolder.file('hex-list.txt', buildHexList(themeKit));
  listingFolder.file('canva-hex-list.txt', buildCanvaHexList(themeKit));
  listingFolder.file('README.md', buildThemeKitReadme(themeKit));
  listingFolder.file('listing-copy.md', buildListingCopy(themeKit));

  if (includeMeta) {
    const meta = {
      themeName: themeKit.themeFamilyName,
      slug: themeKit.slug,
      seedHex: themeKit.baseHex,
      harmonyMode: themeKit.harmonyMode,
      selectedMode: themeMode,
      generatedDate: themeKit.generatedAt,
      includedFiles: [
        'cover.png',
        'swatches.png',
        'ui.png',
        ...(snippetCaptured ? ['tokens-snippet.png'] : []),
        'theme.json',
        'theme.css',
        'hex-list.txt',
        'canva-hex-list.txt',
        'README.md',
        'meta.json',
        'listing-copy.md',
      ],
      variantCoverage: themeKit.variantCoverage,
      availableVariants: themeKit.availableVariants,
      missingVariants: themeKit.missingVariants,
      colorRoles: themeKit.variants,
      listingTitle: `${themeKit.themeFamilyName} Theme Kit`,
      listingDescription: `${themeKit.themeFamilyName} is an Apocapalette color theme kit exported from the confirmed ${themeKit.availableVariants.join(', ')} preview.`,
      suggestedTags: ['theme kit', 'color palette', 'css variables', 'design tokens', 'canva palette', 'apocapalette'],
      suggestedUseCases: ['web UI', 'brand direction', 'content pages', 'storefront drafts', 'planning templates'],
      accessibilityNotes: 'Role colors are exported from the current preview. Check final contrast in the buyer context before publishing.',
      fineTune: themeKit.fineTune,
      version: themeKit.version,
    };
    listingFolder.file('meta.json', JSON.stringify(meta, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const defaultName = buildExportFilename(
    slugifyFilename(displayThemeName || 'theme', 'theme'),
    '-listing-assets-v1',
    'zip'
  );
  exportAssets({ data: blob, filename: zipName || defaultName, mime: 'application/zip' });
};

export const buildThemePackArchive = async ({
  finalTokens,
  themeMaster,
  currentTheme,
  displayThemeName,
  mode,
  baseColor,
  isDark,
  printMode,
  themeMode,
  tokenPrefix,
}) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const themeLabel = sanitizeThemeName(displayThemeName || 'Theme', 'Theme');
  const themeSlug = slugifyFilename(themeLabel, 'theme');
  const root = zip.folder(themeSlug);
  if (!root) throw new Error('Failed to create zip root folder');

  const baseHex = baseColor.toUpperCase();
  const zipName = buildExportFilename(themeSlug, '-theme-pack-v1', 'zip');
  const { best, not: notFor } = getThemePackGuidance(mode);
  const themeModeLabel = themeMode || (isDark ? 'dark' : 'light');
  const readme = [
    `# ${themeLabel}`,
    '',
    `${themeLabel} is an Apocapalette theme pack built from ${baseHex} with a ${mode} harmony in ${themeModeLabel} mode. It includes ready-to-use color tokens, app CSS variables, design-tool token files, a LibreOffice palette, and preview artwork for quick reference.`,
    '',
    '## Theme Details',
    '',
    `- Theme name: ${themeLabel}`,
    `- Base color: ${baseHex}`,
    `- Harmony: ${mode}`,
    `- Mode: ${themeModeLabel}`,
    `- Best for: ${best}`,
    `- Not for: ${notFor}`,
    ...(printMode ? ['- Print mode: on'] : []),
    '',
    '## Included Files',
    '',
    '- `tokens.json` - canonical Apocapalette token export with theme metadata.',
    '- `css/variables.css` - CSS custom properties for web projects.',
    '- `figma/tokens.json` - nested token JSON for Figma token workflows.',
    '- `penpot/tokens.json` - Penpot-friendly token JSON.',
    '- `libreoffice/*.soc` - LibreOffice/OpenOffice color palette.',
    '- `preview/palette-card.svg` - visual summary of the theme.',
    '- `preview/swatch-strip.svg` - quick swatch reference.',
    '- `preview/*.png` - optional raster previews when your browser supports canvas export.',
    '',
    '## CSS Variables',
    '',
    'Add `css/variables.css` to your project and reference the generated custom properties in your styles.',
    '',
    '```css',
    '@import "./css/variables.css";',
    '',
    '.button {',
    `  background: var(--${tokenPrefix ? `${tokenPrefix}-` : ''}brand-primary);`,
    `  color: var(--${tokenPrefix ? `${tokenPrefix}-` : ''}typography-text-body);`,
    '}',
    '```',
    '',
    '## JSON Tokens',
    '',
    'Use `tokens.json` as the canonical source for automation, documentation, or custom token transforms. It includes the full token set plus export metadata.',
    '',
    '## Figma Tokens',
    '',
    'Import `figma/tokens.json` into your preferred Figma token workflow. The file is nested and typed for token-plugin style usage.',
    '',
    '## Penpot Tokens',
    '',
    'Use `penpot/tokens.json` as the simplified Penpot-compatible token file. It is filtered into direct token groups for easier import and handoff.',
    '',
    '## LibreOffice Palette',
    '',
    'Import `libreoffice/*.soc` into LibreOffice or OpenOffice to use the theme colors in documents, drawings, and presentation assets.',
    '',
    '## Preview Files',
    '',
    'Use the files in `preview/` as a quick visual reference, listing image source, or QA check when sharing the pack.',
    '',
    '## Licensing and Usage',
    '',
    'License/usage terms: add your license terms here before selling or distributing this pack.',
    '',
    '---',
    '',
    'Made with Apocapalette.',
  ];
  root.file('README.md', readme.join('\n'));

  const canonicalTokens = buildGenericPayload(finalTokens, {
    themeName: displayThemeName,
    mode,
    baseColor,
    isDark,
    printMode,
    generatedAt: new Date().toISOString(),
    tokenPrefix: tokenPrefix || undefined,
  });
  root.file('tokens.json', JSON.stringify(canonicalTokens, null, 2));
  root.folder('css')?.file('variables.css', buildCssVariables(themeMaster, tokenPrefix || ''));

  const figmaPayload = buildFigmaTokensPayload(finalTokens, {
    namingPrefix: tokenPrefix || undefined,
  });
  if (figmaPayload && Object.keys(figmaPayload).length > 0) {
    root.folder('figma')?.file('tokens.json', JSON.stringify(figmaPayload, null, 2));
  }

  const penpotPayload = buildPenpotPayload(
    finalTokens,
    themeMaster?.orderedStack ?? [],
    {
      themeName: displayThemeName,
      mode,
      baseColor,
      isDark,
      printMode,
      generatedAt: new Date().toISOString(),
      tokenPrefix: tokenPrefix || undefined,
    },
    { namingPrefix: tokenPrefix || undefined }
  );
  root.folder('penpot')?.file('tokens.json', JSON.stringify(toPenpotTokens(penpotPayload), null, 2));

  const socColors = extractSocColorsFromTokens(finalTokens);
  root.folder('libreoffice')?.file(`${themeSlug}.soc`, generateSoc(themeLabel, socColors));

  let previewFolder = null;
  const addPreviewFile = (name, content) => {
    if (!content) return;
    if (!previewFolder) {
      previewFolder = root.folder('preview');
    }
    previewFolder?.file(name, content);
  };

  try {
    addPreviewFile('palette-card.svg', buildPaletteCardSvg(currentTheme));
  } catch (error) {
    console.warn('Theme pack palette SVG failed', error);
  }
  try {
    addPreviewFile('swatch-strip.svg', buildStripSvg(currentTheme));
  } catch (error) {
    console.warn('Theme pack strip SVG failed', error);
  }

  const [palettePng, stripPng] = await Promise.allSettled([
    renderPaletteCardPng(currentTheme),
    renderStripPng(currentTheme),
  ]);
  if (palettePng.status === 'fulfilled') {
    addPreviewFile('palette-card.png', palettePng.value);
  }
  if (stripPng.status === 'fulfilled') {
    addPreviewFile('swatch-strip.png', stripPng.value);
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return { blob, filename: zipName, themeSlug };
};

export const THEME_PACK_MODES = ['dark', 'light', 'pop'];
const THEME_PACK_MODE_LABELS = {
  light: 'Light',
  dark: 'Dark',
  pop: 'Pop',
};

const buildThemePackDownloadFilename = (name) => {
  const themeSlug = slugifyFilename(name, '');
  return `apocapalette${themeSlug ? `-${themeSlug}` : ''}-theme-pack-v1.zip`;
};

const formatThemePackModes = (modes = []) => (
  modes.map((mode) => THEME_PACK_MODE_LABELS[mode] || mode).join(', ')
);

const resolveAllModeThemeSpec = (theme = {}) => {
  const current = theme.currentTheme || {};
  const master = theme.themeMaster || {};
  return {
    name: sanitizeThemeName(theme.displayThemeName || current.name || theme.name || 'Theme', 'Theme'),
    baseColor: theme.baseColor || current.baseColor || '#6366f1',
    mode: theme.mode || current.mode || 'Monochromatic',
    printMode: Boolean(theme.printMode ?? current.printMode),
    tokenPrefix: theme.tokenPrefix || '',
    apocalypseIntensity: theme.apocalypseIntensity ?? master.apocalypseIntensity ?? 100,
    harmonyIntensity: theme.harmonyIntensity ?? master.harmonyIntensity ?? 100,
    neutralCurve: theme.neutralCurve ?? master.neutralCurve ?? 100,
    accentStrength: theme.accentStrength ?? master.accentStrength ?? 100,
    popIntensity: theme.popIntensity ?? master.popIntensity ?? 100,
    importedOverrides: theme.importedOverrides ?? null,
  };
};

const buildModeCanonicalTokens = ({ finalTokens, spec, themeMode }) => buildGenericPayload(finalTokens, {
  themeName: spec.name,
  mode: spec.mode,
  baseColor: spec.baseColor,
  isDark: themeMode === 'dark',
  printMode: spec.printMode,
  generatedAt: new Date().toISOString(),
  tokenPrefix: spec.tokenPrefix || undefined,
  themeMode,
});

const buildThemePackPreviewTheme = (currentTheme, spec, themeMode) => ({
  ...currentTheme,
  name: spec.name,
  mode: currentTheme.mode || spec.mode,
  themeMode,
  isDark: themeMode === 'dark',
});

const normalizeThemePackVariant = (variant, themeMode, spec) => {
  const finalTokens = variant?.finalTokens || variant?.tokens || variant?.currentTheme?.tokens || null;
  if (!finalTokens || typeof finalTokens !== 'object') return null;
  const orderedStack = Array.isArray(variant?.orderedStack)
    ? variant.orderedStack
    : buildOrderedStack(finalTokens);
  const currentTheme = variant?.currentTheme || {
    name: spec.name,
    mode: spec.mode,
    themeMode,
    isDark: themeMode === 'dark',
    baseColor: spec.baseColor,
    tokens: finalTokens,
    printMode: spec.printMode,
  };
  const themeMaster = variant?.themeMaster || {
    finalTokens,
    orderedStack,
    currentTheme,
  };

  return {
    themeMode,
    finalTokens,
    orderedStack,
    currentTheme: {
      ...currentTheme,
      name: currentTheme.name || spec.name,
      mode: currentTheme.mode || spec.mode,
      themeMode,
      isDark: themeMode === 'dark',
      baseColor: currentTheme.baseColor || spec.baseColor,
      tokens: finalTokens,
      printMode: currentTheme.printMode ?? spec.printMode,
    },
    themeMaster: {
      ...themeMaster,
      finalTokens,
      orderedStack,
      currentTheme: {
        ...(themeMaster.currentTheme || currentTheme),
        name: themeMaster.currentTheme?.name || currentTheme.name || spec.name,
        mode: themeMaster.currentTheme?.mode || currentTheme.mode || spec.mode,
        themeMode,
        isDark: themeMode === 'dark',
        baseColor: themeMaster.currentTheme?.baseColor || currentTheme.baseColor || spec.baseColor,
        tokens: finalTokens,
        printMode: themeMaster.currentTheme?.printMode ?? currentTheme.printMode ?? spec.printMode,
      },
    },
  };
};

export const buildThemePackExportData = (theme = {}, options = {}) => {
  const spec = resolveAllModeThemeSpec(theme);
  const rawVariants = theme.variants && typeof theme.variants === 'object' ? theme.variants : {};
  const currentMode = theme.themeMode || theme.currentTheme?.themeMode || (theme.isDark ? 'dark' : 'light');
  const resolvedVariants = {};

  THEME_PACK_MODES.forEach((themeMode) => {
    const normalized = normalizeThemePackVariant(rawVariants[themeMode], themeMode, spec);
    if (normalized) {
      resolvedVariants[themeMode] = normalized;
    }
  });

  if (!resolvedVariants[currentMode]) {
    const currentVariant = normalizeThemePackVariant(theme, currentMode, spec);
    if (currentVariant) {
      resolvedVariants[currentMode] = currentVariant;
    }
  }

  const exportableModes = THEME_PACK_MODES.filter((themeMode) => resolvedVariants[themeMode]);
  const hasSelectedModes = Array.isArray(options.selectedModes);
  const selectedModes = hasSelectedModes
    ? THEME_PACK_MODES.filter((themeMode) => options.selectedModes.includes(themeMode))
    : exportableModes;
  const availableModes = exportableModes.filter((themeMode) => selectedModes.includes(themeMode));
  const missingModes = THEME_PACK_MODES.filter((themeMode) => !exportableModes.includes(themeMode));
  const omittedModes = exportableModes.filter((themeMode) => !availableModes.includes(themeMode));

  if (hasSelectedModes && availableModes.length === 0) {
    throw new Error('Select at least one available Theme Pack mode to export.');
  }

  const variants = Object.fromEntries(
    availableModes.map((themeMode) => [themeMode, resolvedVariants[themeMode]])
  );

  return {
    themeName: spec.name,
    slug: slugifyFilename(spec.name, 'theme'),
    seedHex: spec.baseColor,
    harmony: spec.mode,
    currentMode,
    availableModes,
    missingModes,
    omittedModes,
    variantCoverage: availableModes.length === THEME_PACK_MODES.length
      ? 'all-modes'
      : availableModes.length > 1
        ? 'available-modes'
        : 'current-mode-only',
    variants,
    metadata: {
      printMode: spec.printMode,
      tokenPrefix: spec.tokenPrefix,
      generatedAt: new Date().toISOString(),
    },
    fineTuneSettings: {
      apocalypseIntensity: spec.apocalypseIntensity,
      harmonyIntensity: spec.harmonyIntensity,
      neutralCurve: spec.neutralCurve,
      accentStrength: spec.accentStrength,
      popIntensity: spec.popIntensity,
    },
  };
};

export const addAllModeThemePackFiles = async (root, theme, options = {}) => {
  const spec = resolveAllModeThemeSpec(theme);
  const exportData = buildThemePackExportData(theme, options);
  const themeSlug = slugifyFilename(options.slug || spec.name, 'theme');
  const combinedTokens = {};
  const combinedCss = [];
  const tokenPrefix = spec.tokenPrefix || '';
  const includedModeNames = formatThemePackModes(exportData.availableModes) || 'none';
  const missingModeNames = formatThemePackModes(exportData.missingModes) || 'none';
  const omittedModeNames = formatThemePackModes(exportData.omittedModes);
  const coverageSummary = exportData.variantCoverage === 'all-modes'
    ? 'Full Light/Dark/Pop family'
    : exportData.variantCoverage === 'available-modes'
      ? 'Partial confirmed modes'
      : exportData.omittedModes.length > 0
        ? 'Selected mode only'
        : 'Current mode only';
  const combinedGuide = exportData.availableModes.length > 1
    ? [
      '- `combined/tokens.all-modes.json` - all included modes in one JSON reference.',
      '- `combined/css/variables.all-modes.css` - scoped CSS variables for all included modes.',
    ]
    : [
      '- `combined/tokens.all-modes.json` - combined reference for the included mode.',
      '- `combined/css/variables.all-modes.css` - scoped CSS variables for the included mode.',
    ];

  let introSentence;
  if (exportData.variantCoverage === 'all-modes') {
    introSentence = `${spec.name} is a complete Apocapalette Theme Pack exported from confirmed Light, Dark, and Pop modes.`;
  } else if (exportData.variantCoverage === 'available-modes') {
    introSentence = `${spec.name} is an Apocapalette Theme Pack exported from confirmed reviewed modes.`;
  } else if (exportData.omittedModes.length > 0) {
    introSentence = `${spec.name} is an Apocapalette Theme Pack exported from the selected reviewed mode.`;
  } else { // 'current-mode-only'
    introSentence = `${spec.name} is an Apocapalette Theme Pack exported from the current reviewed mode.`;
  }

  root.file(options.readmePath || 'README.md', [
    `# ${spec.name}`,
    '',
    introSentence,
    '',
    '## What You Received',
    '',
    `- Theme name: ${spec.name}`,
    `- Coverage: ${coverageSummary}`,
    `- Included modes: ${includedModeNames}`,
    `- Missing modes: ${missingModeNames}`,
    ...(omittedModeNames ? [`- Omitted modes: ${omittedModeNames} (available but intentionally excluded from this export)`] : []),
    '- Missing modes are not regenerated from the seed or fine-tune settings during export.',
    '',
    '## File Guide',
    '',
    '- `modes/{mode}/tokens.json` - canonical tokens for each included resolved mode.',
    '- `modes/{mode}/css/variables.css` - CSS variables from the same resolved mode tokens.',
    '- `modes/{mode}/figma/tokens.json` - Figma token JSON from the same resolved mode tokens.',
    '- `modes/{mode}/penpot/tokens.json` - Penpot-friendly token JSON from the same resolved mode tokens.',
    '- `modes/{mode}/libreoffice/` - LibreOffice/OpenOffice palette files from the same resolved mode tokens.',
    '- `modes/{mode}/preview/` - palette card and swatch preview assets for that mode when available.',
    ...combinedGuide,
  ].join('\n'));

  for (const themeMode of exportData.availableModes) {
    const variant = exportData.variants[themeMode];
    const { finalTokens, currentTheme, themeMaster, orderedStack } = variant;
    const previewTheme = buildThemePackPreviewTheme(currentTheme, spec, themeMode);
    const modeFolder = root.folder(`modes/${themeMode}`);
    if (!modeFolder) throw new Error(`Failed to create ${themeMode} mode folder`);

    const canonicalTokens = buildModeCanonicalTokens({ finalTokens, spec, themeMode });
    modeFolder.file('tokens.json', JSON.stringify(canonicalTokens, null, 2));
    modeFolder.folder('css')?.file('variables.css', buildCssVariables(themeMaster, tokenPrefix));

    const figmaPayload = buildFigmaTokensPayload(finalTokens, {
      namingPrefix: tokenPrefix || undefined,
    });
    if (figmaPayload && Object.keys(figmaPayload).length > 0) {
      modeFolder.folder('figma')?.file('tokens.json', JSON.stringify(figmaPayload, null, 2));
    }

    const penpotPayload = buildPenpotPayload(
      finalTokens,
      orderedStack ?? [],
      {
        themeName: spec.name,
        mode: spec.mode,
        baseColor: spec.baseColor,
        isDark: themeMode === 'dark',
        printMode: spec.printMode,
        generatedAt: new Date().toISOString(),
        tokenPrefix: tokenPrefix || undefined,
        themeMode,
      },
      { namingPrefix: tokenPrefix || undefined }
    );
    modeFolder.folder('penpot')?.file('tokens.json', JSON.stringify(toPenpotTokens(penpotPayload), null, 2));

    const socColors = extractSocColorsFromTokens(finalTokens);
    modeFolder.folder('libreoffice')?.file(`${themeSlug}-${themeMode}.soc`, generateSoc(`${spec.name} ${themeMode}`, socColors));

    const previewFolder = modeFolder.folder('preview');
    try {
      previewFolder?.file('palette-card.svg', buildPaletteCardSvg(previewTheme));
    } catch (error) {
      console.warn(`All-mode ${themeMode} palette SVG failed`, error);
    }
    try {
      previewFolder?.file('swatch-strip.svg', buildStripSvg(previewTheme));
    } catch (error) {
      console.warn(`All-mode ${themeMode} strip SVG failed`, error);
    }
    const [palettePng, stripPng] = await Promise.allSettled([
      renderPaletteCardPng(previewTheme),
      renderStripPng(previewTheme),
    ]);
    if (palettePng.status === 'fulfilled') {
      previewFolder?.file('palette-card.png', palettePng.value);
    }
    if (stripPng.status === 'fulfilled') {
      previewFolder?.file('swatch-strip.png', stripPng.value);
    }

    combinedTokens[themeMode] = canonicalTokens;
    combinedCss.push(`/* ${spec.name} - ${themeMode} mode */`);
    combinedCss.push(`.${themeSlug}-${themeMode}, [data-theme="${themeSlug}-${themeMode}"] {`);
    combinedCss.push(buildCssVariables(themeMaster, tokenPrefix)
      .split('\n')
      .filter((line) => line.trim() && !line.includes(':root') && line.trim() !== '}')
      .join('\n'));
    combinedCss.push('}');
    combinedCss.push('');
  }

  root.folder('combined')?.file('tokens.all-modes.json', JSON.stringify({
    themeName: spec.name,
    baseColor: spec.baseColor,
    harmony: spec.mode,
    variantCoverage: exportData.variantCoverage,
    availableModes: exportData.availableModes,
    missingModes: exportData.missingModes,
    ...(exportData.omittedModes.length ? { omittedModes: exportData.omittedModes } : {}),
    modes: combinedTokens,
  }, null, 2));
  root.folder('combined')?.file('css/variables.all-modes.css', combinedCss.join('\n'));

  return {
    themeSlug,
    modes: exportData.availableModes,
    missingModes: exportData.missingModes,
    omittedModes: exportData.omittedModes,
    variantCoverage: exportData.variantCoverage,
  };
};

export const buildAllModeThemePackArchive = async (theme, options = {}) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const spec = resolveAllModeThemeSpec(theme);
  const themeSlug = slugifyFilename(options.slug || spec.name, 'theme');
  const root = zip.folder(themeSlug);
  if (!root) throw new Error('Failed to create all-mode theme pack folder');

  await addAllModeThemePackFiles(root, theme, { ...options, slug: themeSlug });

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return {
    blob,
    filename: buildExportFilename(themeSlug, '-theme-pack-v1', 'zip'),
    themeSlug,
  };
};

export const downloadAllModeThemePackArchive = async (theme, options = {}) => {
  const { blob } = await buildAllModeThemePackArchive(theme, options);
  const themeName = options.slug || theme.displayThemeName || theme.currentTheme?.name || theme.name;
  exportThemePack({
    data: blob,
    filename: buildThemePackDownloadFilename(themeName),
    mime: 'application/zip',
  });
};

export const downloadThemePackArchive = async (options) => {
  const { blob } = await buildThemePackArchive(options);
  exportThemePack({
    data: blob,
    filename: buildThemePackDownloadFilename(options.displayThemeName),
    mime: 'application/zip',
  });
};

export const downloadThemePackWithPrintArchive = async ({
  currentTheme,
  penpotPayload,
  themeSlug,
}) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const root = zip.folder(themeSlug);
  if (!root) throw new Error('Failed to create zip root folder');

  root.file('tokens.json', JSON.stringify(penpotPayload, null, 2));
  try {
    root.file('palette-card.svg', buildPaletteCardSvg(currentTheme));
  } catch (error) {
    console.warn('CMYK print pack palette SVG failed', error);
  }
  try {
    root.file('swatch-strip.svg', buildStripSvg(currentTheme));
  } catch (error) {
    console.warn('CMYK print pack strip SVG failed', error);
  }

  const [palettePng, stripPng] = await Promise.allSettled([
    renderPaletteCardPng(currentTheme),
    renderStripPng(currentTheme),
  ]);
  if (palettePng.status === 'fulfilled') {
    root.file('palette-card.png', palettePng.value);
  }
  if (stripPng.status === 'fulfilled') {
    root.file('swatch-strip.png', stripPng.value);
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const filename = buildExportFilename(themeSlug, '-cmyk-print-pack-v1', 'zip');
  exportThemePack({ data: blob, filename, mime: 'application/zip' });
};

export const exportProjectPrintAssetsArchive = async ({
  projectName,
  sections,
  buildSpecFromSection,
  onProgress,
}) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const projectSlug = slugifyFilename(projectName || 'project', 'project');
  const root = zip.folder(projectSlug);
  if (!root) throw new Error('Failed to create project folder');
  const skipped = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const paletteName = section?.label || `Palette ${index + 1}`;
    onProgress?.(`Generating ${index + 1}/${sections.length}: ${paletteName}`);
    if (!section) {
      skipped.push(`(missing section ${index + 1})`);
      continue;
    }
    const paletteSpec = section.paletteSpec || buildSpecFromSection(section);
    if (!paletteSpec?.baseColor) {
      skipped.push(paletteName);
      continue;
    }
    const snapshotTokens = section.snapshot?.tokenSet || section.tokenSet || null;
    const themeMaster = snapshotTokens
      ? {
        currentTheme: {
          name: paletteName,
          mode: paletteSpec.mode,
          themeMode: paletteSpec.themeMode,
          isDark: paletteSpec.themeMode === 'dark',
          baseColor: paletteSpec.baseColor,
          tokens: snapshotTokens,
          printMode: Boolean(paletteSpec.printMode),
        },
      }
      : buildTheme({
        name: paletteName,
        baseColor: paletteSpec.baseColor,
        mode: paletteSpec.mode,
        themeMode: paletteSpec.themeMode,
        isDark: paletteSpec.isDark,
        printMode: paletteSpec.printMode,
        apocalypseIntensity: paletteSpec.apocalypseIntensity ?? 100,
        harmonyIntensity: paletteSpec.harmonyIntensity ?? 100,
        neutralCurve: paletteSpec.neutralCurve ?? 100,
        accentStrength: paletteSpec.accentStrength ?? 100,
        popIntensity: paletteSpec.popIntensity ?? 100,
        importedOverrides: paletteSpec.importedOverrides ?? null,
      });

    const theme = themeMaster.currentTheme;
    const paletteSlug = slugifyFilename(paletteName, `palette-${index + 1}`);
    const paletteFolder = root.folder(paletteSlug);
    if (!paletteFolder) continue;

    try {
      paletteFolder.file('palette-card.svg', buildPaletteCardSvg(theme));
      paletteFolder.file('swatch-strip.svg', buildStripSvg(theme));
    } catch (error) {
      console.warn('Palette SVG export failed', error);
    }

    const [palettePng, stripPng] = await Promise.allSettled([
      renderPaletteCardPng(theme),
      renderStripPng(theme),
    ]);
    if (palettePng.status === 'fulfilled') {
      paletteFolder.file('palette-card.png', palettePng.value);
    }
    if (stripPng.status === 'fulfilled') {
      paletteFolder.file('swatch-strip.png', stripPng.value);
    }
    paletteFolder.file('tokens.json', JSON.stringify(theme.tokens, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const filename = buildExportFilename(projectSlug, '-print-assets', 'zip');
  exportThemePack({ data: blob, filename, mime: 'application/zip' });

  return skipped;
};

export const exportProjectPenpotPrintTokensArchive = async ({
  projectName,
  sections,
  buildSpecFromSection,
  onProgress,
}) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const projectSlug = slugifyFilename(projectName || 'project', 'project');
  const root = zip.folder(`${projectSlug}-penpot`);
  if (!root) throw new Error('Failed to create Penpot folder');
  const skipped = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const paletteName = section?.label || `Palette ${index + 1}`;
    onProgress?.(`Generating ${index + 1}/${sections.length}: ${paletteName}`);
    if (!section) {
      skipped.push(`(missing section ${index + 1})`);
      continue;
    }
    const paletteSpec = section.paletteSpec || buildSpecFromSection(section);
    if (!paletteSpec?.baseColor) {
      skipped.push(paletteName);
      continue;
    }

    const snapshotTokens = section.snapshot?.tokenSet || section.tokenSet;
    const printTokenSet = snapshotTokens?.print && typeof snapshotTokens.print === 'object'
      ? snapshotTokens.print
      : buildTheme({
        name: paletteName,
        baseColor: paletteSpec.baseColor,
        mode: paletteSpec.mode,
        themeMode: paletteSpec.themeMode,
        isDark: paletteSpec.isDark,
        printMode: true,
        apocalypseIntensity: paletteSpec.apocalypseIntensity ?? 100,
        harmonyIntensity: paletteSpec.harmonyIntensity ?? 100,
        neutralCurve: paletteSpec.neutralCurve ?? 100,
        accentStrength: paletteSpec.accentStrength ?? 100,
        popIntensity: paletteSpec.popIntensity ?? 100,
        importedOverrides: paletteSpec.importedOverrides ?? null,
      }).finalTokens?.print;
    const printTokens = buildPrintTokenTree(printTokenSet);
    if (!printTokens) {
      skipped.push(paletteName);
      continue;
    }

    const penpotPayload = buildPenpotPayload(
      printTokens,
      [],
      null,
      { namingPrefix: paletteSpec.tokenPrefix || undefined }
    );
    const penpotTokens = toPenpotTokens(penpotPayload);
    const paletteSlug = slugifyFilename(paletteName, `palette-${index + 1}`);
    root.file(`${paletteSlug}.json`, JSON.stringify(penpotTokens, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const filename = buildExportFilename(projectSlug, '-penpot-print-tokens', 'zip');
  exportThemePack({ data: blob, filename, mime: 'application/zip' });

  return skipped;
};

export const exportDesignSpacePalettesArchive = async ({
  projectName,
  sections,
}) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const projectFolder = zip.folder(`${projectName || 'project'}-designspace`);
  if (!projectFolder) throw new Error('Failed to create project folder');

  sections.forEach((section, index) => {
    const palette = generateDesignSpacePalette(section.baseHex || '#6366f1');
    palette.name = section.label || `Palette ${index + 1}`;
    const fileName = buildExportFilename(
      `${palette.name || `palette-${index + 1}`}`,
      '',
      'json',
      { sanitize: true }
    );
    projectFolder.file(fileName, JSON.stringify(palette, null, 2));
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const filename = buildExportFilename(`${projectName || 'project'}-designspace-palettes`, '', 'zip', { sanitize: true });
  downloadFile({ data: content, filename, mime: 'application/zip' });
};
