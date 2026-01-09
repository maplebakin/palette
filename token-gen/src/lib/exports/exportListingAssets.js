import { captureNodeAsImage } from './exportImage.js';
import { exportAssets, buildExportFilename, slugifyFilename, normalizeHex } from './exportUtils.js';
import { sanitizeThemeName } from '../utils/stringUtils.js';

/**
 * Generates and exports listing assets as a ZIP file.
 * @param {Object} options
 * @param {HTMLElement} options.coverNode - DOM node for the cover image.
 * @param {HTMLElement} options.swatchNode - DOM node for the swatch strip image.
 * @param {HTMLElement} options.previewNode - DOM node for the UI preview image.
 * @param {HTMLElement | null} options.snippetNode - Optional DOM node for a tokens snippet image.
 * @param {Object} options.tokenStore - The token store (for tokens.surfaces.background).
 * @param {Object} options.paletteStore - The palette store (for baseColor, mode, themeMode).
 * @param {string} options.displayThemeName - The display name of the theme.
 * @param {Function} options.notify - Notification function.
 * @param {Function} options.setStatusMessage - Status message function.
 * @param {string} [options.rootFolder='listing'] - Name of the root folder in the zip.
 * @param {boolean} [options.includeMeta=true] - Whether to include meta.json.
 * @param {string} options.zipName - Custom name for the zip file.
 * @param {string} [options.successMessage='Listing assets generated'] - Message on successful export.
 * @returns {Promise<void>}
 */
export const exportListingAssets = async (options) => {
  const {
    coverNode,
    swatchNode,
    previewNode,
    snippetNode,
    tokenStore,
    paletteStore,
    displayThemeName,
    notify,
    setStatusMessage,
    rootFolder = 'listing',
    includeMeta = true,
    zipName,
    successMessage = 'Listing assets generated',
  } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('File export is not supported in this browser');
  }

  if (!coverNode || !swatchNode || !previewNode) {
    throw new Error('Required listing asset templates are not ready');
  }

  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const listingFolder = zip.folder(rootFolder || 'listing');
    if (!listingFolder) throw new Error('Failed to create listing folder');

    const coverPng = await captureNodeAsImage(coverNode, {
      width: 1200,
      height: 1200,
      backgroundColor: tokenStore.tokens.surfaces.background,
    });
    listingFolder.file('cover.png', coverPng);

    const swatchPng = await captureNodeAsImage(swatchNode, {
      width: 1600,
      height: 400,
      backgroundColor: tokenStore.tokens.surfaces.background,
    });
    listingFolder.file('swatches.png', swatchPng);

    const uiPng = await captureNodeAsImage(previewNode, {
      width: 1600,
      height: 900,
      style: { width: '1600px', height: '900px' },
      backgroundColor: tokenStore.tokens.surfaces.background,
    });
    listingFolder.file('ui.png', uiPng);

    if (snippetNode) {
      try {
        const snippetPng = await captureNodeAsImage(snippetNode, {
          width: 1200,
          height: 600,
          backgroundColor: tokenStore.tokens.surfaces.background,
        });
        listingFolder.file('tokens-snippet.png', snippetPng);
      } catch (err) {
        console.warn('Listing tokens snippet failed', err);
      }
    }

    if (includeMeta) {
      const meta = {
        themeName: displayThemeName,
        baseHex: normalizeHex(paletteStore.baseColor || '#000000', '#000000').toUpperCase(),
        harmonyMode: paletteStore.mode,
        themeMode: paletteStore.themeMode,
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
    setStatusMessage(successMessage, 'success');
  } catch (err) {
    console.error('Listing assets export failed', err);
    notify('Listing assets export failed. Check console for details.', 'error');
  }
};
