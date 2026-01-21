import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Generates listing assets (cover, swatches, UI previews) as a ZIP
 * @param {Object} options
 * @param {HTMLElement} options.coverNode - Cover element to capture
 * @param {HTMLElement} options.swatchNode - Swatch element to capture
 * @param {HTMLElement} options.snippetNode - Snippet element to capture
 * @param {HTMLElement} options.previewNode - Preview element to capture
 * @param {Object} options.tokens - Theme tokens
 * @param {string} options.themeName - Theme name
 * @param {string} options.rootFolder - Root folder name in ZIP
 * @param {boolean} options.includeMeta - Whether to include metadata
 * @returns {Promise<void>}
 */
export const exportListingAssets = async (options) => {
  const {
    coverNode,
    swatchNode,
    snippetNode,
    previewNode,
    tokens,
    themeName,
    rootFolder = 'listing',
    includeMeta = true,
  } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  if (!coverNode || !swatchNode || !previewNode) {
    throw new Error('Required nodes for listing assets are missing');
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const listingFolder = zip.folder(rootFolder || 'listing');
  
  if (!listingFolder) throw new Error('Failed to create listing folder');

  try {
    const { toPng } = await import('html-to-image');
    
    const captureNode = async (node, opts) => {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        ...opts,
      });
      const res = await fetch(dataUrl);
      return new Uint8Array(await res.arrayBuffer());
    };

    // Capture cover image
    const coverPng = await captureNode(coverNode, {
      width: 1200,
      height: 1200,
      backgroundColor: tokens?.surfaces?.background || '#ffffff',
    });
    listingFolder.file('cover.png', coverPng);

    // Capture swatch image
    const swatchPng = await captureNode(swatchNode, {
      width: 1600,
      height: 400,
      backgroundColor: tokens?.surfaces?.background || '#ffffff',
    });
    listingFolder.file('swatches.png', swatchPng);

    // Capture UI preview
    const uiPng = await captureNode(previewNode, {
      width: 1600,
      height: 900,
      style: { width: '1600px', height: '900px' },
      backgroundColor: tokens?.surfaces?.background || '#ffffff',
    });
    listingFolder.file('ui.png', uiPng);

    // Capture snippet if available
    if (snippetNode) {
      try {
        const snippetPng = await captureNode(snippetNode, {
          width: 1200,
          height: 600,
          backgroundColor: tokens?.surfaces?.background || '#ffffff',
        });
        listingFolder.file('tokens-snippet.png', snippetPng);
      } catch (err) {
        console.warn('Listing tokens snippet failed', err);
      }
    }

    // Add metadata if requested
    if (includeMeta) {
      const meta = {
        themeName: themeName,
        timestamp: new Date().toISOString(),
        version: 'v1',
      };
      listingFolder.file('meta.json', JSON.stringify(meta, null, 2));
    }

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
    const defaultName = buildExportFilename(
      slugifyFilename(themeName || 'theme', 'theme'),
      '-listing-assets-v1',
      'zip'
    );
    
    exportAssets({ data: blob, filename: defaultName, mime: 'application/zip' });
  } catch (err) {
    console.error('Listing assets export failed', err);
    throw err;
  }
};