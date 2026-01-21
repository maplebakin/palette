import { buildGenericPayload, buildFigmaTokensPayload } from '../payloads.js';
import { buildCssVariables } from '../theme/styles.js';
import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Exports a complete theme pack with multiple formats
 * @param {Object} options
 * @param {Object} options.finalTokens - Final token set
 * @param {Object} options.themeMaster - Theme master object
 * @param {string} options.themeName - Theme name
 * @param {string} options.mode - Harmony mode
 * @param {string} options.baseColor - Base hex color
 * @param {boolean} options.isDark - Dark mode flag
 * @param {boolean} options.printMode - Print mode flag
 * @param {string} options.tokenPrefix - Token prefix
 * @returns {Promise<void>}
 */
export const exportThemePack = async (options) => {
  const {
    finalTokens,
    themeMaster,
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    tokenPrefix,
  } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const themeLabel = slugifyFilename(themeName || 'Theme', 'Theme');
  const themeSlug = slugifyFilename(themeLabel, 'theme');
  const root = zip.folder(themeSlug);

  if (!root) throw new Error('Failed to create zip root folder');

  const baseHex = baseColor || '#000000';
  const zipName = buildExportFilename(themeSlug, '-theme-pack-v1', 'zip');
  const themeModeLabel = (isDark ? 'dark' : 'light');

  const readme = [
    `Theme name: ${themeLabel}`,
    `Base hex: ${baseHex.toUpperCase()}`,
    `Harmony mode: ${mode}`,
    `Theme mode: ${themeModeLabel}`,
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
    themeName,
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
    buildCssVariables(themeMaster, tokenPrefix || '')
  );

  const figmaPayload = buildFigmaTokensPayload(finalTokens, {
    namingPrefix: tokenPrefix || undefined,
  });

  if (figmaPayload && Object.keys(figmaPayload).length > 0) {
    root.folder('figma')?.file('tokens.json', JSON.stringify(figmaPayload, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  exportAssets({ data: blob, filename: zipName, mime: 'application/zip' });
};