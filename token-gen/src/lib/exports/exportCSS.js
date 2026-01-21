import { buildCssVariables } from '../theme/styles.js';
import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Exports tokens as CSS variables file
 * @param {Object} options
 * @param {Object} options.themeMaster - Theme master object
 * @param {string} options.themeName - Theme name
 * @param {string} options.tokenPrefix - Optional prefix
 * @returns {Promise<void>}
 */
export const exportCSS = async (options) => {
  const { themeMaster, themeName, tokenPrefix } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const css = buildCssVariables(themeMaster, tokenPrefix || '');
  const blob = new Blob([css], { type: 'text/css' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-variables',
    'css'
  );

  exportAssets({ data: blob, filename, mime: 'text/css' });
};