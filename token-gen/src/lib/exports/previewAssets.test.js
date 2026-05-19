import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTheme } from '../theme/engine.js';
import {
  buildPaletteCardSvg,
  renderPaletteCardPng,
  renderStripPng,
} from './previewAssets.js';

const originalCreateElement = document.createElement.bind(document);
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;
const originalImage = globalThis.Image;

const installSvgCanvasMocks = () => {
  const drawnImages = [];
  const objectUrls = [];
  const sourceBlobs = [];
  const drawImage = vi.fn((image, ...args) => {
    drawnImages.push({ image, args });
  });
  const clearRect = vi.fn();
  const toBlob = vi.fn((callback) => {
    callback(new Blob(['png-bytes'], { type: 'image/png' }));
  });

  vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
    if (tagName === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({ clearRect, drawImage })),
        toBlob,
      };
    }
    return originalCreateElement(tagName, options);
  });

  URL.createObjectURL = vi.fn((blob) => {
    const url = `blob:preview-${objectUrls.length}`;
    objectUrls.push(url);
    sourceBlobs.push(blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();

  globalThis.Image = class {
    set src(value) {
      this.currentSrc = value;
      setTimeout(() => this.onload?.(), 0);
    }
  };

  return {
    clearRect,
    drawImage,
    drawnImages,
    objectUrls,
    sourceBlobs,
    toBlob,
  };
};

const readBlobText = (blob) => new Promise((resolve, reject) => {
  if (typeof blob.text === 'function') {
    blob.text().then(resolve, reject);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

describe('preview assets', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    globalThis.Image = originalImage;
  });

  it('builds a marketplace-ready palette card SVG with theme and token context', () => {
    const theme = buildTheme({
      name: 'Beef Ritual',
      baseColor: '#8b2f24',
      mode: 'Apocalypse',
      themeMode: 'dark',
      isDark: true,
    });

    const svg = buildPaletteCardSvg(theme.currentTheme);

    expect(svg).toContain('<svg width="1200" height="800"');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Beef Ritual');
    expect(svg).toContain('APOCAPALETTE THEME PACK');
    expect(svg).toContain('Main palette');
    expect(svg).toContain('Token categories');
    expect(svg).toContain('CSS, JSON, Figma, Penpot, LibreOffice');
    expect(svg).toContain('Preview artwork');
  });

  it('renders palette-card PNG from the polished palette-card SVG source', async () => {
    const mocks = installSvgCanvasMocks();
    const theme = buildTheme({
      name: 'Beef Ritual',
      baseColor: '#8b2f24',
      mode: 'Apocalypse',
      themeMode: 'dark',
      isDark: true,
    });

    const png = await renderPaletteCardPng(theme.currentTheme);
    const svgSource = await readBlobText(mocks.sourceBlobs[0]);

    expect(png).toBeInstanceOf(Uint8Array);
    expect(svgSource).toContain('<svg width="1200" height="800"');
    expect(svgSource).toContain('APOCAPALETTE THEME PACK');
    expect(svgSource).toContain('Main palette');
    expect(svgSource).toContain('Token categories');
    expect(mocks.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ currentSrc: 'blob:preview-0' }),
      0,
      0,
      1200,
      800
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-0');
  });

  it('renders swatch-strip PNG from the swatch-strip SVG source', async () => {
    const mocks = installSvgCanvasMocks();
    const theme = buildTheme({
      name: 'Beef Ritual',
      baseColor: '#8b2f24',
      mode: 'Apocalypse',
      themeMode: 'dark',
      isDark: true,
    });

    await renderStripPng(theme.currentTheme);
    const svgSource = await readBlobText(mocks.sourceBlobs[0]);

    expect(svgSource).toContain('<svg width="1500" height="420"');
    expect(svgSource).toContain('Beef Ritual • Swatch Strip');
    expect(mocks.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ currentSrc: 'blob:preview-0' }),
      0,
      0,
      1500,
      420
    );
  });
});
