import { buildExportFilename, slugifyFilename, normalizeHex } from './exportUtils.js';
import { getThemePackGuidance } from '../utils/themeUtils.js';
import { sanitizeThemeName } from '../utils/stringUtils.js';
import { buildGenericPayload, buildFigmaTokensPayload } from '../payloads.js';
import { buildCssVariables } from '../theme/styles.js';
import { renderPaletteCardToPng, renderStripToPng } from './exportImage.js';
import { buildPaletteCardSvg, buildStripSvg } from './exportSVG.jsx';
import { exportAssets } from './exportUtils.js';

/**
 * Exports a theme pack as a ZIP file.
 * @param {Object} options
 * @param {Object} options.finalTokens - The final tokens object.
 * @param {Object} options.currentTheme - The current theme object.
 * @param {string} options.displayThemeName - The display name of the theme.
 * @param {string} options.mode - The current mode (e.g., Monochromatic).
 * @param {string} options.baseColor - The base color hex.
 * @param {string} options.themeMode - The theme mode ('light', 'dark', 'pop').
 * @param {boolean} options.isDark - Whether the theme is dark.
 * @param {boolean} options.printMode - Whether print mode is enabled.
 * @param {string} options.tokenPrefix - The token prefix.
 * @param {Function} options.notify - Notification function.
 * @param {Function} options.setStatusMessage - Status message function.
 * @param {Object} options.tokenStore - The token store.
 * @returns {Promise<void>}
 */
export const exportThemePack = async (options) => {
  const {
    finalTokens,
    currentTheme,
    displayThemeName,
    mode,
    baseColor,
    themeMode,
    isDark,
    printMode,
    tokenPrefix,
    notify,
    setStatusMessage,
    tokenStore, // Need access to tokenStore.finalTokens for buildCssVariables
  } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('File export is not supported in this browser');
  }

  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const themeLabel = sanitizeThemeName(displayThemeName || 'Theme', 'Theme');
    const themeSlug = slugifyFilename(themeLabel, 'theme');
    const root = zip.folder(themeSlug);
    if (!root) throw new Error('Failed to create zip root folder');
    const baseHex = normalizeHex(baseColor || '#000000', '#000000').toUpperCase();
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

    root.folder('css')?.file(
      'variables.css',
      buildCssVariables({finalTokens: tokenStore.finalTokens}, tokenPrefix)
    );

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
      const paletteSvg = buildPaletteCardSvg(currentTheme);
      addPreviewFile('palette-card.svg', paletteSvg);
    } catch (err) {
      console.warn('Theme pack palette SVG failed', err);
    }
    try {
      const stripSvg = buildStripSvg(currentTheme);
      addPreviewFile('swatch-strip.svg', stripSvg);
    } catch (err) {
      console.warn('Theme pack strip SVG failed', err);
    }

    const [palettePng, stripPng] = await Promise.allSettled([
      renderPaletteCardToPng(currentTheme),
      renderStripToPng(currentTheme),
    ]);
    if (palettePng.status === 'fulfilled') {
      addPreviewFile('palette-card.png', palettePng.value);
    }
    if (stripPng.status === 'fulfilled') {
      addPreviewFile('swatch-strip.png', stripPng.value);
    }

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
    exportAssets({ data: blob, filename: zipName, mime: 'application/zip' });
    setStatusMessage('Theme pack downloaded', 'success');
  } catch (err) {
    console.error('Theme pack export failed', err);
    notify('Theme pack export failed. Check console for details.', 'error');
  }
};