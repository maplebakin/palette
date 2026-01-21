import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Captures DOM node as PNG image
 * @param {HTMLElement} node - DOM element to capture
 * @param {Object} options - html-to-image options
 * @returns {Promise<Uint8Array>} Image bytes
 */
const captureNodeAsImage = async (node, options = {}) => {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    ...options,
  });
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
};

/**
 * Exports DOM element as PNG image
 * @param {Object} options
 * @param {HTMLElement} options.node - Element to capture
 * @param {string} options.themeName - Theme name for filename
 * @param {number} options.width - Image width
 * @param {number} options.height - Image height
 * @param {string} options.backgroundColor - Background color
 * @returns {Promise<void>}
 */
export const exportImage = async (options) => {
  const { node, themeName, width, height, backgroundColor } = options;

  if (!node) {
    throw new Error('Node is required for image export');
  }

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const imageBytes = await captureNodeAsImage(node, {
    width,
    height,
    backgroundColor,
  });

  const blob = new Blob([imageBytes], { type: 'image/png' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-preview',
    'png'
  );

  exportAssets({ data: blob, filename, mime: 'image/png' });
};