import { buildTheme } from '../theme/engine.js';
import { buildFigmaTokensPayload, buildGenericPayload, buildPenpotPayload } from '../payloads.js';
import { toPenpotTokens } from '../penpotTokens.js';
import { buildCssVariables } from '../theme/styles.js';
import { buildExportFilename, downloadFile, exportAssets, exportThemePack, slugifyFilename } from '../export/index.js';
import { buildPrintTokenTree, getThemePackGuidance, sanitizeThemeName } from '../appState.js';
import { generateDesignSpacePalette } from './designSpacePalette.js';
import {
  buildPaletteCardSvg,
  buildStripSvg,
  createTarArchive,
  encodeText,
  renderPaletteCardPng,
  renderStripPng,
} from './previewAssets.js';

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

  const coverPng = await captureNode(coverNode, {
    width: 1200,
    height: 1200,
    backgroundColor: tokens.surfaces.background,
  });
  listingFolder.file('cover.png', coverPng);

  const swatchPng = await captureNode(swatchNode, {
    width: 1600,
    height: 400,
    backgroundColor: tokens.surfaces.background,
  });
  listingFolder.file('swatches.png', swatchPng);

  const uiPng = await captureNode(previewNode, {
    width: 1600,
    height: 900,
    style: { width: '1600px', height: '900px' },
    backgroundColor: tokens.surfaces.background,
  });
  listingFolder.file('ui.png', uiPng);

  if (snippetNode) {
    try {
      const snippetPng = await captureNode(snippetNode, {
        width: 1200,
        height: 600,
        backgroundColor: tokens.surfaces.background,
      });
      listingFolder.file('tokens-snippet.png', snippetPng);
    } catch (error) {
      console.warn('Listing tokens snippet failed', error);
    }
  }

  if (includeMeta) {
    const meta = {
      themeName: displayThemeName,
      baseHex: baseColor.toUpperCase(),
      harmonyMode: mode,
      themeMode,
      timestamp: new Date().toISOString(),
      version: 'v1',
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

export const downloadThemePackArchive = async ({
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
    `Theme name: ${themeLabel}`,
    `Base hex: ${baseHex}`,
    `Harmony mode: ${mode}`,
    `Theme mode: ${themeModeLabel}`,
    `Best for: ${best}`,
    `Not for: ${notFor}`,
    'Usage:',
    '- Use css/variables.css in your project',
    '- tokens.json is the canonical source',
    '- Import figma/tokens.json into Figma Tokens (if included)',
  ];
  if (printMode) {
    readme.splice(4, 0, 'Print mode: on');
  }
  root.file('README.txt', readme.join('\n'));

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
  exportThemePack({ data: blob, filename: zipName, mime: 'application/zip' });
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
