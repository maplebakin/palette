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
  addAllModeThemePackFiles: vi.fn(async (root, theme, options = {}) => {
    const slug = options.slug || String(theme.displayThemeName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const currentMode = theme.themeMode || theme.currentTheme?.themeMode || 'dark';
    const confirmedModes = theme.variants ? ['dark', 'light', 'pop'].filter((mode) => theme.variants[mode]) : [];
    const hasCurrentResolved = theme.finalTokens || theme.tokens || theme.currentTheme?.tokens;
    const modes = confirmedModes.length
      ? ['dark', 'light', 'pop'].filter((mode) => confirmedModes.includes(mode) || (mode === currentMode && hasCurrentResolved))
      : [currentMode];
    modes.forEach((mode) => {
      root.folder(`modes/${mode}`)?.file('tokens.json', JSON.stringify({
        themeName: theme.displayThemeName,
        themeMode: mode,
      }));
      root.folder(`modes/${mode}`)?.file('css/variables.css', `.${mode} { --brand-primary: #6633ff; }`);
      root.folder(`modes/${mode}`)?.file('figma/tokens.json', '{}');
      root.folder(`modes/${mode}`)?.file('penpot/tokens.json', '{}');
      root.folder(`modes/${mode}`)?.file(`libreoffice/${slug}-${mode}.soc`, '<ooo:color-table/>');
      root.folder(`modes/${mode}`)?.file('preview/palette-card.svg', '<svg>palette</svg>');
      root.folder(`modes/${mode}`)?.file('preview/swatch-strip.svg', '<svg>strip</svg>');
    });
    root.folder('combined')?.file('tokens.all-modes.json', '{}');
    root.folder('combined/css')?.file('variables.all-modes.css', ':root {}');
  }),
  buildAllModeThemePackArchive: vi.fn(async (theme) => ({
    blob: new Blob([`all-mode-theme-pack:${theme.displayThemeName}`], { type: 'application/zip' }),
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
  themeMode: 'dark',
  currentTheme: {
    name,
    baseColor: '#6633ff',
    mode: 'Monochromatic',
    themeMode: 'dark',
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

const expectMarketplaceListingSections = (listing) => {
  expect(listing).toContain('## Suggested Listing Title');
  expect(listing).toContain('## Short Description');
  expect(listing).toContain('## Long Description');
  expect(listing).toContain('## What\'s Included');
  expect(listing).toContain('## Suggested Uses');
  expect(listing).toContain('## Compatibility / File Types');
  expect(listing).toContain('## Suggested Tags');
  expect(listing).toContain('## Suggested Image Alt Text');
  expect(listing).toContain('Please review contrast and accessibility in your final design context before publishing or sharing.');
  expect(listing).toContain('## Etsy Listing Draft');
  expect(listing).toContain('## Gumroad / Ko-fi Listing Draft');
  expect(listing).toContain('## Personal Storefront Listing Draft');
};

const expectStandaloneBuyerDocs = (zip, rootPath, productTitle) => {
  const license = zip.files[`${rootPath}/LICENSE.txt`];
  const support = zip.files[`${rootPath}/SUPPORT.txt`];

  expect(license).toContain(`${productTitle} - License Terms`);
  expect(license).toContain('Personal and commercial use is allowed in finished projects');
  expect(license).toContain('You may edit, customize, recolor, and adapt the included colors and files for your own projects.');
  expect(license).toContain('You may not resell, redistribute, sublicense, repackage, upload, or share the included files as a standalone palette, token pack, theme pack, or competing digital product.');

  expect(support).toContain(`Thank you for downloading ${productTitle}.`);
  expect(support).toContain('For support, contact: [seller support email or shop contact link]');
  expect(support).toContain('Please include your order number, platform, and a short description of the issue.');
  expect(support).toContain('Please review contrast and accessibility in your final design context before publishing or sharing.');
};

describe('product export helpers', () => {
  beforeEach(() => {
    zipInstances.length = 0;
    vi.clearAllMocks();
  });

  it('builds an individual product package with confirmed current-mode folders', async () => {
    const theme = makeTheme('HollysLightBlue');
    const individualProduct = {
      ...product,
      title: 'HollysLightBlue',
      slug: 'hollys-light-blue',
      shortDescription: '',
      longDescription: '',
      usageLicense: undefined,
    };

    await productExports.buildProductPackageArchive({
      offering: 'individual',
      product: individualProduct,
      themes: [theme],
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'hollys-light-blue/README.md',
      'hollys-light-blue/USAGE.txt',
      'hollys-light-blue/LICENSE.txt',
      'hollys-light-blue/SUPPORT.txt',
      'hollys-light-blue/shop-listing.md',
      'hollys-light-blue/tags.txt',
      'hollys-light-blue/marketplace-preview/marketplace-cover.svg',
      'hollys-light-blue/modes/dark/tokens.json',
      'hollys-light-blue/modes/dark/css/variables.css',
      'hollys-light-blue/modes/dark/figma/tokens.json',
      'hollys-light-blue/modes/dark/penpot/tokens.json',
      'hollys-light-blue/modes/dark/libreoffice/hollys-light-blue-dark.soc',
      'hollys-light-blue/modes/dark/preview/palette-card.svg',
      'hollys-light-blue/modes/dark/preview/swatch-strip.svg',
      'hollys-light-blue/combined/tokens.all-modes.json',
      'hollys-light-blue/combined/css/variables.all-modes.css',
    ]));
    expect(zip.files['hollys-light-blue/modes/light/tokens.json']).toBeUndefined();
    expect(zip.files['hollys-light-blue/modes/pop/tokens.json']).toBeUndefined();
    expect(zip.files['hollys-light-blue/README.md']).toContain('# Hollys Light Blue');
    expect(zip.files['hollys-light-blue/README.md']).toContain('current/spec-derived dark mode data');
    expect(zip.files['hollys-light-blue/README.md']).toContain('Missing modes are not regenerated');
    expect(zip.files['hollys-light-blue/README.md']).toContain('- Hollys Light Blue');
    expect(zip.files['hollys-light-blue/README.md']).toContain('## How to Use This Pack');
    expect(zip.files['hollys-light-blue/README.md']).toContain('Use the CSS variables for websites, apps, landing pages, and interface prototypes.');
    expect(zip.files['hollys-light-blue/README.md']).toContain('Use the Figma/Penpot token files for design workflows and handoff.');
    expect(zip.files['hollys-light-blue/README.md']).toContain('Use the LibreOffice palettes for document, drawing, and presentation color picking.');
    expect(zip.files['hollys-light-blue/README.md']).toContain('Use preview images and swatch strips as quick visual references.');
    expect(zip.files['hollys-light-blue/USAGE.txt']).not.toContain('Final shop license language should be reviewed before publishing.');
    expect(zip.files['hollys-light-blue/USAGE.txt']).toContain('Please review contrast and accessibility in your final design context before publishing or sharing.');
    expectStandaloneBuyerDocs(zip, 'hollys-light-blue', 'Hollys Light Blue');
    const marketplaceCover = zip.files['hollys-light-blue/marketplace-preview/marketplace-cover.svg'];
    expect(marketplaceCover).toContain('<svg width="1200" height="1200" viewBox="0 0 1200 1200"');
    expect(marketplaceCover).toContain('role="img"');
    expect(marketplaceCover).toContain('<title id="marketplace-cover-title">Hollys Light Blue Website &amp; Brand Color Kit marketplace cover</title>');
    expect(marketplaceCover).toContain('<desc id="marketplace-cover-desc">Marketplace cover for Hollys Light Blue, a Website &amp; Brand Color Kit with CSS • JSON • Figma • Penpot • LibreOffice.</desc>');
    expect(marketplaceCover).toContain('Website &amp; Brand Color Kit');
    expect(marketplaceCover).toContain('CSS • JSON • Figma • Penpot • LibreOffice');
    expect(marketplaceCover).toContain('Included modes: Dark');
    expect(marketplaceCover).not.toContain('Included modes: Light');
    expect(marketplaceCover).not.toContain('Light • Dark • Pop');
    const listing = zip.files['hollys-light-blue/shop-listing.md'];
    expectMarketplaceListingSections(listing);
    expect(listing).toContain('Website & Brand Color Kit');
    expect(listing).toContain('current/spec-derived dark mode data');
    expect(listing).not.toContain('confirmed app-state mode exports');
    expect(listing).toContain('CSS variables, JSON tokens, Figma/Penpot files, LibreOffice palettes, previews, and usage notes');
    expect(listing).toContain('- CSS variables for websites, apps, landing pages, and interface prototypes.');
    expect(listing).toContain('- JSON tokens plus Figma/Penpot token files for design workflows.');
    expect(listing).toContain('- LibreOffice/OpenOffice palette files for document and presentation color picking.');
    expect(listing).toContain('- Preview images and swatch strips for quick visual reference.');
    expect(listing).toContain('- Websites, blogs, and landing pages');
    expect(listing).toContain('- css variables');
    expect(listing).toContain('Hollys Light Blue website and brand color kit preview with key palette swatches and hex values.');
    expect(listing).toContain('Title: Hollys Light Blue Website and Brand Color Kit, Digital Palette, CSS Variables and Design Tokens');
    expect(listing).toContain('Title: Hollys Light Blue Website & Brand Color Kit');
    expect(listing).toContain('Title: Hollys Light Blue Adaptive Color Kit');
    expect(listing).toContain('Digital download: after purchase, download the ZIP file and open the included README before using the files. No physical product is shipped.');
    expect(listing).toContain('Compatibility and file summary:');
    expect(listing).toContain('- CSS custom properties for websites and apps.');
    expect(listing).toContain('- Figma/Penpot token JSON for design workflows.');
    expect(zip.files['hollys-light-blue/tags.txt']).toContain('adaptive color system');
    expect(zip.files['hollys-light-blue/tags.txt']).toContain('dark mode palette');
    expect(zip.files['hollys-light-blue/tags.txt']).toContain('website color kit');
    expect(workflowExports.addAllModeThemePackFiles).toHaveBeenCalledWith(expect.any(FolderMock), theme, { slug: 'hollys-light-blue' });
    expect(workflowExports.buildAllModeThemePackArchive).not.toHaveBeenCalled();
  });

  it('labels partial confirmed product docs without implying a full confirmed family', async () => {
    const theme = {
      ...makeTheme('Partial Cobalt'),
      variants: {
        dark: { finalTokens: { brand: { cta: '#112233' } } },
        light: { finalTokens: { brand: { cta: '#eeeeee' } } },
      },
    };

    await productExports.buildProductPackageArchive({
      offering: 'individual',
      product: { ...product, title: 'Partial Cobalt', slug: 'partial-cobalt', shortDescription: '', longDescription: '' },
      themes: [theme],
    });

    const zip = zipInstances[0];
    expect(zip.files['partial-cobalt/README.md']).toContain('confirmed reviewed light, dark modes');
    expect(zip.files['partial-cobalt/README.md']).toContain('Includes confirmed reviewed light, dark modes only');
    expect(zip.files['partial-cobalt/README.md']).not.toContain('current/spec-derived');
    expect(zip.files['partial-cobalt/shop-listing.md']).toContain('confirmed reviewed light, dark modes');
  });

  it('labels partial confirmed variants plus the current resolved fallback truthfully', async () => {
    const theme = {
      ...makeTheme('Mixed Cobalt'),
      themeMode: 'dark',
      variants: {
        light: { finalTokens: { brand: { cta: '#eeeeee' } } },
      },
    };

    await productExports.buildProductPackageArchive({
      offering: 'individual',
      product: { ...product, title: 'Mixed Cobalt', slug: 'mixed-cobalt', shortDescription: '', longDescription: '' },
      themes: [theme],
    });

    const zip = zipInstances[0];
    const readme = zip.files['mixed-cobalt/README.md'];
    const listing = zip.files['mixed-cobalt/shop-listing.md'];

    expect(zip.files['mixed-cobalt/modes/light/tokens.json']).toBeTruthy();
    expect(zip.files['mixed-cobalt/modes/dark/tokens.json']).toBeTruthy();
    expect(readme).toContain('confirmed reviewed light mode plus the current resolved dark mode');
    expect(readme).toContain('`modes/light/` - confirmed reviewed light mode tokens');
    expect(readme).toContain('`modes/dark/` - current resolved dark mode tokens');
    expect(readme).not.toContain('confirmed reviewed dark mode tokens');
    expect(listing).toContain('confirmed reviewed light mode plus the current resolved dark mode');
    expect(listing).not.toContain('confirmed reviewed light, dark modes only');
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
      'starter-pair/LICENSE.txt',
      'starter-pair/SUPPORT.txt',
      'starter-pair/marketplace-preview/marketplace-cover.svg',
      'starter-pair/marketplace-preview/bundle-comparison.svg',
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
    expect(zip.files['starter-pair/README.md']).toContain('## How to Use This Pack');
    expect(zip.files['starter-pair/README.md']).toContain('Each included Theme Pack ZIP contains its own README and mode files.');
    expect(zip.files['starter-pair/README.md']).toContain('Open each nested Theme Pack ZIP for that palette\'s full files.');
    expect(zip.files['starter-pair/README.md']).toContain('Use the root previews and listing docs to compare the included palettes.');
    expectStandaloneBuyerDocs(zip, 'starter-pair', 'Starter Pair');
    const marketplaceCover = zip.files['starter-pair/marketplace-preview/marketplace-cover.svg'];
    const bundleComparison = zip.files['starter-pair/marketplace-preview/bundle-comparison.svg'];
    expect(marketplaceCover).toContain('<svg width="1200" height="1200" viewBox="0 0 1200 1200"');
    expect(marketplaceCover).toContain('role="img"');
    expect(marketplaceCover).toContain('<title id="marketplace-cover-title">Starter Pair Multi-Kit Bundle marketplace cover</title>');
    expect(marketplaceCover).toContain('<desc id="marketplace-cover-desc">Marketplace cover for Starter Pair, a Multi-Kit Bundle with Nested Theme Pack ZIPs.</desc>');
    expect(marketplaceCover).toContain('Multi-Kit Bundle');
    expect(marketplaceCover).toContain('Nested Theme Pack ZIPs');
    expect(marketplaceCover).toContain('Beef Ritual • Cobalt Chapel');
    expect(bundleComparison).toContain('<svg width="1600" height="900" viewBox="0 0 1600 900"');
    expect(bundleComparison).toContain('role="img"');
    expect(bundleComparison).toContain('<title id="bundle-comparison-title">Starter Pair bundle comparison</title>');
    expect(bundleComparison).toContain('<desc id="bundle-comparison-desc">Bundle Comparison preview for Starter Pair, showing included theme names and compact swatch rows.</desc>');
    expect(bundleComparison).toContain('Bundle Comparison');
    expect(bundleComparison).toContain('Nested Theme Pack ZIPs');
    expect(bundleComparison).toContain('Beef Ritual');
    expect(bundleComparison).toContain('Cobalt Chapel');
    const listing = zip.files['starter-pair/shop-listing.md'];
    expectMarketplaceListingSections(listing);
    expect(listing).toContain('multiple Apocapalette theme kits packaged as nested Theme Pack ZIP files');
    expect(listing).toContain('- Multiple nested Theme Pack ZIPs, one for each included palette.');
    expect(listing).toContain('- Each nested Theme Pack ZIP includes its own README and mode files.');
    expect(listing).toContain('- `beef-ritual-theme-pack-v1.zip` - Beef Ritual Theme Pack ZIP.');
    expect(listing).toContain('- `cobalt-chapel-theme-pack-v1.zip` - Cobalt Chapel Theme Pack ZIP.');
    expect(listing).toContain('- Nested Theme Pack ZIP files for each included palette.');
    expect(listing).toContain('Starter Pair color palette bundle preview showing multiple included theme kits.');
    expect(listing).toContain('Title: Starter Pair Color Palette Bundle, Website Theme Kits, Digital Brand Color Pack');
    expect(listing).toContain('Title: Starter Pair Multi-Kit Color Bundle');
    expect(listing).toContain('Title: Starter Pair Theme Kit Bundle');
    expect(listing).toContain('Digital download: after purchase, download the bundle ZIP, then open each nested Theme Pack ZIP for the included palette files. No physical product is shipped.');
    expect(listing).toContain('Access note: download the bundle ZIP, then open each nested Theme Pack ZIP to access the files for each included palette.');
    expect(workflowExports.buildAllModeThemePackArchive).toHaveBeenCalledTimes(2);
    expect(workflowExports.buildAllModeThemePackArchive).toHaveBeenNthCalledWith(1, beef);
    expect(workflowExports.buildAllModeThemePackArchive).toHaveBeenNthCalledWith(2, cobalt);
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
      'mini-cobalt/LICENSE.txt',
      'mini-cobalt/SUPPORT.txt',
      'mini-cobalt/shop-listing.md',
      'mini-cobalt/tags.txt',
      'mini-cobalt/marketplace-preview/marketplace-cover.svg',
      'mini-cobalt/mini-palette.css',
      'mini-cobalt/mini-palette.json',
      'mini-cobalt/preview/mini-palette-preview.svg',
    ]));
    expect(files.some((file) => file.endsWith('tokens.json'))).toBe(false);
    expect(files.some((file) => file.includes('theme-pack-v1.zip'))).toBe(false);
    expect(zip.files['mini-cobalt/mini-palette.json']).toContain('"cta"');
    expect(zip.files['mini-cobalt/mini-palette.json']).toContain('"primary": "#112233"');
    expect(zip.files['mini-cobalt/README.md']).toContain('## How to Use This Pack');
    expect(zip.files['mini-cobalt/README.md']).toContain('Use the included CSS, JSON, and preview as a lightweight starter palette.');
    expect(zip.files['mini-cobalt/README.md']).toContain('This mini package is smaller than a full Theme Pack.');
    expectStandaloneBuyerDocs(zip, 'mini-cobalt', 'Mini Cobalt');
    const marketplaceCover = zip.files['mini-cobalt/marketplace-preview/marketplace-cover.svg'];
    expect(marketplaceCover).toContain('<svg width="1200" height="1200" viewBox="0 0 1200 1200"');
    expect(marketplaceCover).toContain('role="img"');
    expect(marketplaceCover).toContain('<title id="marketplace-cover-title">Mini Cobalt Mini Website Palette marketplace cover</title>');
    expect(marketplaceCover).toContain('<desc id="marketplace-cover-desc">Marketplace cover for Mini Cobalt, a Mini Website Palette with CSS • JSON • Preview.</desc>');
    expect(marketplaceCover).toContain('Mini Website Palette');
    expect(marketplaceCover).toContain('CSS • JSON • Preview');
    expect(marketplaceCover).toContain('Lightweight starter palette');
    expect(marketplaceCover).not.toContain('Figma');
    expect(marketplaceCover).not.toContain('Penpot');
    expect(marketplaceCover).not.toContain('LibreOffice');
    expect(marketplaceCover).not.toContain('full Theme Pack');
    expect(marketplaceCover).not.toContain('Nested Theme Pack ZIPs');
    expect(zip.files['mini-cobalt/marketplace-preview/bundle-comparison.svg']).toBeUndefined();
    const listing = zip.files['mini-cobalt/shop-listing.md'];
    expectMarketplaceListingSections(listing);
    expect(listing).toContain('small starter palette');
    expect(listing).toContain('This mini/freebie package includes lightweight CSS variables, a five-color JSON reference, and preview artwork.');
    expect(listing).toContain('It is smaller than a full Theme Pack and does not include full token, Figma/Penpot, or LibreOffice files.');
    expect(listing).toContain('- `mini-palette.css` - lightweight CSS variables for the starter palette.');
    expect(listing).toContain('- `mini-palette.json` - five-color JSON reference.');
    expect(listing).toContain('- `preview/mini-palette-preview.svg` - visual preview for quick reference.');
    expect(listing).toContain('- CSS custom properties in `mini-palette.css`.');
    expect(listing).toContain('- JSON color reference in `mini-palette.json`.');
    expect(listing).toContain('Mini Cobalt mini website palette preview showing five starter colors and hex values.');
    expect(listing).not.toContain('CSS variables, JSON tokens, Figma/Penpot files, LibreOffice palettes, previews, and usage notes');
    expect(listing).not.toContain('Figma/Penpot token JSON for design workflows');
    expect(listing).not.toContain('LibreOffice/OpenOffice palettes for document color picking');
    expect(listing).not.toContain('nested Theme Pack ZIP');
    expect(listing).not.toContain('complete files and README');
    expect(listing).toContain('Title: Mini Cobalt Mini Website Palette, Digital Color Palette, CSS and JSON Starter Colors');
    expect(listing).toContain('Title: Mini Cobalt Mini Website Palette');
    expect(listing).toContain('Title: Mini Cobalt Starter Color Palette');
    expect(listing).toContain('Digital download: after purchase, download the ZIP file and open the included README before using the files. No physical product is shipped.');
    expect(listing).toContain('This mini/freebie package is intentionally smaller than a full paid color kit.');
    expect(listing).toContain('See the full paid Apocapalette theme kit or bundle');
    expect(files.some((file) => file.includes('/modes/'))).toBe(false);
    expect(files.some((file) => file.includes('all-modes'))).toBe(false);
    expect(workflowExports.addAllModeThemePackFiles).not.toHaveBeenCalled();
    expect(workflowExports.buildAllModeThemePackArchive).not.toHaveBeenCalled();
  });
});
