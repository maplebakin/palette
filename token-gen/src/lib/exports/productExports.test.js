import { beforeEach, describe, expect, it, vi } from 'vitest';

const zipInstances = [];

class FolderMock {
  constructor(zip, prefix) {
    this.zip = zip;
    this.prefix = prefix;
  }

  folder(name) {
    return new FolderMock(this.zip, `${this.prefix}${name}/`);
  }

  file(name, data) {
    this.zip.files[`${this.prefix}${name}`] = data;
    return this;
  }
}

class JSZipMock {
  constructor() {
    this.files = {};
    this.generateAsync = vi.fn(async () => new Blob(['zip-content'], { type: 'application/zip' }));
    zipInstances.push(this);
  }

  folder(name) {
    return new FolderMock(this, `${name}/`);
  }
}

vi.mock('jszip', () => ({ default: JSZipMock }));
vi.mock('./workflowExports.js', () => ({
  buildThemePackArchive: vi.fn(async (theme) => ({
    blob: new Blob([`theme-pack:${theme.displayThemeName}`], { type: 'application/zip' }),
    filename: `${String(theme.displayThemeName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-theme-pack-v1.zip`,
  })),
}));
vi.mock('./previewAssets.js', () => ({
  buildPaletteCardSvg: vi.fn((theme) => `<svg>${theme.name}-palette</svg>`),
  buildStripSvg: vi.fn((theme) => `<svg>${theme.name}-strip</svg>`),
}));
vi.mock('../export/index.js', async () => {
  const actual = await vi.importActual('../export/index.js');
  return {
    ...actual,
    exportThemePack: vi.fn(),
  };
});

const productExports = await import('./productExports.js');
const workflowExports = await import('./workflowExports.js');

const makeTheme = (name) => ({
  displayThemeName: name,
  currentTheme: {
    name,
    baseColor: '#6633ff',
    mode: 'Monochromatic',
    isDark: true,
    tokens: {
      brand: { primary: '#6633ff', secondary: '#8b5cf6', accent: '#22d3ee' },
      surfaces: { background: '#101827', surface: '#172033' },
      cards: { 'card-panel-surface': '#172033' },
      typography: { 'text-body': '#f8fafc', 'text-strong': '#ffffff', 'text-muted': '#94a3b8' },
      foundation: { neutrals: {} },
    },
  },
});

const product = {
  title: 'Cobalt Chapel',
  slug: 'cobalt-chapel',
  price: '$9',
  shortDescription: 'A sharp blue kit.',
  longDescription: 'A longer product description.',
  tags: 'blue\nbrand kit',
  usageLicense: 'Use in finished work. Do not resell raw files.',
};

describe('product export helpers', () => {
  beforeEach(() => {
    zipInstances.length = 0;
    vi.clearAllMocks();
  });

  it('builds an individual product package with docs, previews, and one theme pack zip', async () => {
    await productExports.buildProductPackageArchive({
      offering: 'individual',
      product,
      themes: [makeTheme('Cobalt Chapel')],
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'cobalt-chapel/README.md',
      'cobalt-chapel/USAGE.txt',
      'cobalt-chapel/shop-listing.md',
      'cobalt-chapel/tags.txt',
      'cobalt-chapel/preview/palette-card.svg',
      'cobalt-chapel/preview/swatch-strip.svg',
      'cobalt-chapel/cobalt-chapel-theme-pack-v1.zip',
    ]));
    expect(zip.files['cobalt-chapel/README.md']).toContain('Individual Theme Kit');
    expect(workflowExports.buildThemePackArchive).toHaveBeenCalledTimes(1);
  });

  it('builds a bundle package with per-theme previews and theme pack zips', async () => {
    const beef = makeTheme('Beef Ritual');
    const cobalt = makeTheme('Cobalt Chapel');

    await productExports.buildProductPackageArchive({
      offering: 'bundle',
      product: { ...product, title: 'Starter Pair', slug: 'starter-pair' },
      themes: [beef, cobalt],
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'starter-pair/README.md',
      'starter-pair/preview/beef-ritual-palette-card.svg',
      'starter-pair/preview/beef-ritual-swatch-strip.svg',
      'starter-pair/preview/cobalt-chapel-palette-card.svg',
      'starter-pair/preview/cobalt-chapel-swatch-strip.svg',
      'starter-pair/beef-ritual-theme-pack-v1.zip',
      'starter-pair/cobalt-chapel-theme-pack-v1.zip',
    ]));
    expect(zip.files['starter-pair/README.md']).toContain('Multi-Kit Bundle');
    expect(zip.files['starter-pair/README.md']).toContain('- Beef Ritual');
    expect(zip.files['starter-pair/README.md']).toContain('- Cobalt Chapel');
    expect(workflowExports.buildThemePackArchive).toHaveBeenCalledTimes(2);
    expect(workflowExports.buildThemePackArchive).toHaveBeenNthCalledWith(1, beef);
    expect(workflowExports.buildThemePackArchive).toHaveBeenNthCalledWith(2, cobalt);
  });

  it('builds a mini palette package without paid token files or theme pack zips', async () => {
    const miniPalette = {
      background: '#010203',
      text: '#f8fafc',
      primary: '#112233',
      accent: '#445566',
      surface: '#0f172a',
    };

    await productExports.buildProductPackageArchive({
      offering: 'mini',
      product: { ...product, title: 'Mini Cobalt', slug: 'mini-cobalt', miniPalette },
      themes: [makeTheme('Cobalt Chapel')],
    });

    const zip = zipInstances[0];
    const files = Object.keys(zip.files);
    expect(files).toEqual(expect.arrayContaining([
      'mini-cobalt/README.md',
      'mini-cobalt/USAGE.txt',
      'mini-cobalt/shop-listing.md',
      'mini-cobalt/tags.txt',
      'mini-cobalt/mini-palette.css',
      'mini-cobalt/mini-palette.json',
      'mini-cobalt/preview/mini-palette-preview.svg',
    ]));
    expect(files.some((file) => file.endsWith('tokens.json'))).toBe(false);
    expect(files.some((file) => file.includes('theme-pack-v1.zip'))).toBe(false);
    expect(zip.files['mini-cobalt/mini-palette.json']).toContain('"cta"');
    expect(zip.files['mini-cobalt/mini-palette.json']).toContain('"primary": "#112233"');
    expect(zip.files['mini-cobalt/shop-listing.md']).toContain('See the full paid Apocapalette theme kit or bundle');
    expect(workflowExports.buildThemePackArchive).not.toHaveBeenCalled();
  });
});
