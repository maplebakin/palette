import { buildGenericPayload } from '../payloads.js';
import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Exports tokens as JSON file
 * @param {Object} options
 * @param {Object} options.finalTokens - Token object to export
 * @param {string} options.themeName - Theme display name
 * @param {string} options.mode - Harmony mode
 * @param {string} options.baseColor - Base hex color
 * @param {boolean} options.isDark - Dark mode flag
 * @param {boolean} options.printMode - Print mode flag
 * @param {string} options.tokenPrefix - Token prefix
 * @returns {Promise<void>}
 */
export const exportJSON = async (options) => {
  const {
    finalTokens,
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

  const payload = buildGenericPayload(finalTokens, {
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    generatedAt: new Date().toISOString(),
    tokenPrefix: tokenPrefix || undefined,
  });

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-tokens',
    'json'
  );

  exportAssets({ data: blob, filename, mime: 'application/json' });
};