import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTheme } from '../theme/engine.js';

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
vi.mock('html-to-image', () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,AA=='),
}));
vi.mock('./previewAssets.js', () => ({
  buildPaletteCardSvg: vi.fn((theme) => {
    const mode = theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light');
    return `<svg><title>${theme.name} ${mode} Theme Pack palette card</title><desc>${mode} mode palette preview</desc></svg>`;
  }),
  buildStripSvg: vi.fn((theme) => {
    const mode = theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light');
    return `<svg><title>${theme.name} ${mode} mode swatch strip</title><desc>${mode} mode swatches</desc></svg>`;
  }),
  createTarArchive: vi.fn(() => new Uint8Array([9, 8, 7])),
  encodeText: vi.fn((value) => new TextEncoder().encode(value)),
  renderPaletteCardPng: vi.fn(async () => new Uint8Array([1, 2, 3])),
  renderStripPng: vi.fn(async () => new Uint8Array([4, 5, 6])),
}));
vi.mock('../export/index.js', async () => {
  const actual = await vi.importActual('../export/index.js');
  return {
    ...actual,
    downloadFile: vi.fn(),
    exportAssets: vi.fn(),
    exportThemePack: vi.fn(),
  };
});

const workflowExports = await import('./workflowExports.js');
const exportIndex = await import('../export/index.js');
const previewAssets = await import('./previewAssets.js');

const buildSampleTheme = () => buildTheme({
  name: 'Test Theme',
  baseColor: '#6633ff',
  mode: 'Monochromatic',
  themeMode: 'dark',
  isDark: true,
  printMode: false,
  apocalypseIntensity: 100,
  harmonyIntensity: 100,
  neutralCurve: 100,
  accentStrength: 100,
  popIntensity: 100,
  importedOverrides: null,
});

describe('workflow export helpers', () => {
  beforeEach(() => {
    zipInstances.length = 0;
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => ({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }));
  });

  it('packages all assets into a tar export', async () => {
    const theme = buildSampleTheme();

    await workflowExports.exportAllAssetsPack({
      currentTheme: theme.currentTheme,
      penpotPayload: { tokens: true },
    });

    expect(previewAssets.createTarArchive).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'test-theme/palette-card.svg' }),
      expect.objectContaining({ name: 'test-theme/palette-card.png' }),
      expect.objectContaining({ name: 'test-theme/swatch-strip.svg' }),
      expect.objectContaining({ name: 'test-theme/swatch-strip.png' }),
      expect.objectContaining({ name: 'test-theme/tokens.json' }),
    ]));
    expect(exportIndex.exportAssets).toHaveBeenCalledWith({
      data: new Uint8Array([9, 8, 7]),
      filename: 'test-theme-asset-pack.tar',
      mime: 'application/x-tar',
    });
  });

  it('captures listing assets, includes metadata, and exports a zip', async () => {
    await workflowExports.generateListingAssetsArchive({
      coverNode: document.createElement('div'),
      swatchNode: document.createElement('div'),
      snippetNode: document.createElement('div'),
      previewNode: document.createElement('div'),
      tokens: {
        surfaces: { background: '#101010' },
        cards: {
          'card-panel-surface': '#172033',
          'card-panel-border': '#334155',
        },
        typography: {
          'text-body': '#f8fafc',
          'text-muted': '#94a3b8',
        },
        brand: {
          primary: '#6633ff',
          accent: '#38bdf8',
          cta: '#0ea5e9',
        },
        actions: {
          primary: '#0ea5e9',
          'primary-foreground': '#ffffff',
        },
        entity: {
          'entity-highlight-bg': '#172033',
          'entity-highlight-accent': '#38bdf8',
          'entity-highlight-text': '#f8fafc',
          'entity-highlight-border': '#334155',
        },
      },
      displayThemeName: 'Listing Theme',
      baseColor: '#6633ff',
      mode: 'Analogous',
      themeMode: 'dark',
      fineTune: {
        harmonyIntensity: 111,
        neutralCurve: 96,
        accentStrength: 104,
      },
      zipName: 'listing.zip',
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'listing/cover.png',
      'listing/swatches.png',
      'listing/ui.png',
      'listing/tokens-snippet.png',
      'listing/theme.json',
      'listing/theme.css',
      'listing/hex-list.txt',
      'listing/canva-hex-list.txt',
      'listing/README.md',
      'listing/listing-copy.md',
      'listing/meta.json',
    ]));
    const themeJson = JSON.parse(zip.files['listing/theme.json']);
    expect(themeJson).toEqual(expect.objectContaining({
      themeFamilyName: 'Listing Theme',
      baseHex: '#6633FF',
      harmonyMode: 'Analogous',
      variantCoverage: 'current-mode-only',
      availableVariants: ['dark'],
      missingVariants: ['light', 'pop'],
    }));
    expect(themeJson.variants.dark.roles).toEqual(expect.objectContaining({
      background: '#101010',
      cta: '#0ea5e9',
      ctaForeground: '#ffffff',
      entityHighlightBg: '#172033',
      entityHighlightAccent: '#38bdf8',
    }));
    expect(zip.files['listing/theme.css']).toContain('[data-theme="listing-theme-dark"]');
    expect(zip.files['listing/theme.css']).toContain('--color-cta: #0ea5e9;');
    expect(zip.files['listing/theme.css']).not.toContain('[data-theme="listing-theme-light"]');
    expect(zip.files['listing/hex-list.txt']).toContain('Listing Theme - Dark');
    expect(zip.files['listing/canva-hex-list.txt']).toContain('DARK COLORS');
    const listingReadme = zip.files['listing/README.md'];
    expect(listingReadme).toContain('# Listing Theme Listing Asset Package');
    expect(listingReadme).toContain('This Apocapalette listing asset package helps prepare storefront previews and product listing materials');
    expect(listingReadme).toContain('It is not a full Light/Dark/Pop Theme Pack.');
    expect(zip.files['listing/README.md']).toContain('Coverage: Current mode only');
    expect(listingReadme).toContain('Included active mode: Dark');
    expect(listingReadme).toContain('Missing modes: Light, Pop');
    expect(listingReadme).toContain('Missing modes are not regenerated.');
    expect(listingReadme).toContain('## Included Listing Files');
    expect(listingReadme).toContain('`theme.json`');
    expect(listingReadme).toContain('`theme.css`');
    expect(listingReadme).toContain('`hex-list.txt`');
    expect(listingReadme).toContain('`canva-hex-list.txt`');
    expect(listingReadme).toContain('`listing-copy.md`');
    expect(listingReadme).toContain('`meta.json`');
    expect(listingReadme).toContain('captured listing and preview images when available');
    expect(listingReadme).not.toMatch(/\bserialized\b/i);
    expect(listingReadme).not.toMatch(/\bapp-state\b/i);
    expect(listingReadme).not.toMatch(/resolved app-state tokens/i);
    expect(listingReadme).not.toContain('current-mode-only');
    expect(listingReadme).not.toContain('available-modes');
    expect(listingReadme).not.toContain('all-modes');
    expect(JSON.parse(zip.files['listing/meta.json'])).toEqual(expect.objectContaining({
      themeName: 'Listing Theme',
      seedHex: '#6633FF',
      harmonyMode: 'Analogous',
      selectedMode: 'dark',
      variantCoverage: 'current-mode-only',
      fineTune: expect.objectContaining({ harmonyIntensity: 111 }),
    }));
    expect(exportIndex.exportAssets).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'listing.zip',
      mime: 'application/zip',
    }));
  });

  it('builds a theme pack zip with canonical files and preview assets', async () => {
    const theme = buildSampleTheme();

    await workflowExports.downloadThemePackArchive({
      finalTokens: theme.finalTokens,
      themeMaster: theme,
      currentTheme: theme.currentTheme,
      displayThemeName: 'Theme Pack',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      isDark: true,
      printMode: true,
      themeMode: 'dark',
      tokenPrefix: 'demo',
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'theme-pack/README.md',
      'theme-pack/tokens.json',
      'theme-pack/css/variables.css',
      'theme-pack/figma/tokens.json',
      'theme-pack/penpot/tokens.json',
      'theme-pack/libreoffice/theme-pack.soc',
      'theme-pack/preview/palette-card.svg',
      'theme-pack/preview/swatch-strip.svg',
    ]));
    expect(zip.files['theme-pack/README.md']).toContain('- Print mode: on');
    expect(zip.files['theme-pack/tokens.json']).toContain('"schema": "generic-token-pack-v1"');
    expect(zip.files['theme-pack/css/variables.css']).toContain('--demo-brand-primary');
    expect(zip.files['theme-pack/figma/tokens.json']).toContain('"demo"');
    expect(zip.files['theme-pack/penpot/tokens.json']).toContain('"brand"');
    expect(zip.files['theme-pack/libreoffice/theme-pack.soc']).toContain('<ooo:color-table');
    expect(zip.files['theme-pack/preview/palette-card.svg']).toContain('Test Theme Dark Theme Pack palette card');
    expect(zip.files['theme-pack/preview/swatch-strip.svg']).toContain('Test Theme Dark mode swatch strip');
    expect(exportIndex.exportThemePack).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'apocapalette-theme-pack-theme-pack-v1.zip',
      mime: 'application/zip',
    }));
  });

  it('uses a branded, slug-safe filename for named Theme Pack downloads', async () => {
    const theme = buildSampleTheme();

    await workflowExports.downloadAllModeThemePackArchive({
      ...theme,
      displayThemeName: 'Moonlit Moss',
    });

    expect(exportIndex.exportThemePack).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'apocapalette-moonlit-moss-theme-pack-v1.zip',
      mime: 'application/zip',
    }));
  });

  it('uses the branded Theme Pack fallback filename for unnamed downloads', async () => {
    const theme = buildSampleTheme();

    await workflowExports.downloadAllModeThemePackArchive({
      ...theme,
      displayThemeName: '',
      name: '',
      currentTheme: {
        ...theme.currentTheme,
        name: '',
      },
    });

    expect(exportIndex.exportThemePack).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'apocapalette-theme-pack-v1.zip',
      mime: 'application/zip',
    }));
  });

  it('sanitizes unsafe characters in Theme Pack download filenames', async () => {
    const theme = buildSampleTheme();

    await workflowExports.downloadAllModeThemePackArchive({
      ...theme,
      displayThemeName: ' Moonlit / Moss: Deluxe?! ',
    });

    expect(exportIndex.exportThemePack).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'apocapalette-moonlit-moss-deluxe-theme-pack-v1.zip',
      mime: 'application/zip',
    }));
  });

  it('builds current-mode theme packs from resolved app-state tokens without regenerating missing modes', async () => {
    const theme = buildSampleTheme();

    await workflowExports.buildAllModeThemePackArchive({
      ...theme,
      displayThemeName: 'Adaptive Cobalt',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      printMode: false,
      tokenPrefix: 'cobalt',
      harmonyIntensity: 117,
      neutralCurve: 91,
      accentStrength: 123,
      popIntensity: 136,
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'adaptive-cobalt/README.md',
      'adaptive-cobalt/modes/dark/tokens.json',
      'adaptive-cobalt/modes/dark/css/variables.css',
      'adaptive-cobalt/modes/dark/figma/tokens.json',
      'adaptive-cobalt/modes/dark/penpot/tokens.json',
      'adaptive-cobalt/modes/dark/libreoffice/adaptive-cobalt-dark.soc',
      'adaptive-cobalt/modes/dark/preview/palette-card.svg',
      'adaptive-cobalt/modes/dark/preview/swatch-strip.svg',
      'adaptive-cobalt/combined/tokens.all-modes.json',
      'adaptive-cobalt/combined/css/variables.all-modes.css',
    ]));
    expect(zip.files['adaptive-cobalt/modes/light/tokens.json']).toBeUndefined();
    expect(zip.files['adaptive-cobalt/modes/pop/tokens.json']).toBeUndefined();
    expect(zip.files['adaptive-cobalt/README.md']).toContain('Adaptive Cobalt is an Apocapalette Theme Pack exported from the current reviewed mode.');
    expect(zip.files['adaptive-cobalt/README.md']).not.toContain('serialized');
    expect(zip.files['adaptive-cobalt/README.md']).not.toContain('resolved app-state tokens');
    expect(zip.files['adaptive-cobalt/README.md']).not.toContain('app-state');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('Coverage: Current mode only');
    expect(zip.files['adaptive-cobalt/README.md']).not.toContain('(current-mode-only)');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('Included modes: Dark');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('Missing modes: Light, Pop');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('Missing modes are not regenerated from the seed or fine-tune settings during export.');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('## File Guide');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`modes/{mode}/tokens.json`');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`modes/{mode}/css/variables.css`');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`modes/{mode}/figma/tokens.json`');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`modes/{mode}/penpot/tokens.json`');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`modes/{mode}/libreoffice/`');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`modes/{mode}/preview/`');
    expect(zip.files['adaptive-cobalt/README.md']).toContain('`combined/tokens.all-modes.json`');

    const darkTokens = JSON.parse(zip.files['adaptive-cobalt/modes/dark/tokens.json']);
    const combined = JSON.parse(zip.files['adaptive-cobalt/combined/tokens.all-modes.json']);

    expect(darkTokens.meta).toEqual(expect.objectContaining({
      themeName: 'Adaptive Cobalt',
      baseColor: '#6633ff',
      mode: 'Monochromatic',
      themeMode: 'dark',
    }));
    expect(darkTokens.brand.primary).toBe(theme.finalTokens.brand.primary);
    expect(combined.variantCoverage).toBe('current-mode-only');
    expect(combined.availableModes).toEqual(['dark']);
    expect(combined.missingModes).toEqual(['light', 'pop']);
    expect(zip.files['adaptive-cobalt/combined/tokens.all-modes.json']).toContain('"dark"');
    expect(zip.files['adaptive-cobalt/combined/css/variables.all-modes.css']).toContain('adaptive-cobalt-dark');
    expect(zip.files['adaptive-cobalt/combined/css/variables.all-modes.css']).not.toContain('adaptive-cobalt-pop');
  });

  it('includes all modes only when resolved variant tokens are supplied', async () => {
    const dark = buildSampleTheme();
    const light = buildTheme({ ...dark.currentTheme, themeMode: 'light', isDark: false });
    const pop = buildTheme({ ...dark.currentTheme, themeMode: 'pop', isDark: false });

    await workflowExports.buildAllModeThemePackArchive({
      displayThemeName: 'Stored Family',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      themeMode: 'dark',
      finalTokens: dark.finalTokens,
      currentTheme: dark.currentTheme,
      themeMaster: dark,
      variants: {
        light,
        pop,
      },
    });

    const zip = zipInstances[0];
    expect(zip.files['stored-family/modes/dark/tokens.json']).toBeTruthy();
    expect(zip.files['stored-family/modes/light/tokens.json']).toBeTruthy();
    expect(zip.files['stored-family/modes/pop/tokens.json']).toBeTruthy();
    const combined = JSON.parse(zip.files['stored-family/combined/tokens.all-modes.json']);
    expect(combined.variantCoverage).toBe('all-modes');
    expect(combined.availableModes).toEqual(['dark', 'light', 'pop']);
    expect(combined).not.toHaveProperty('omittedModes');
    expect(zip.files['stored-family/README.md']).toContain('Stored Family is a complete Apocapalette Theme Pack exported from confirmed Light, Dark, and Pop modes.');
    expect(zip.files['stored-family/README.md']).not.toContain('serialized');
    expect(zip.files['stored-family/README.md']).not.toContain('resolved app-state tokens');
    expect(zip.files['stored-family/README.md']).not.toContain('app-state');
    expect(zip.files['stored-family/README.md']).toContain('Coverage: Full Light/Dark/Pop family');
    expect(zip.files['stored-family/README.md']).not.toContain('(all-modes)');
    expect(zip.files['stored-family/README.md']).toContain('Included modes: Dark, Light, Pop');
    expect(zip.files['stored-family/README.md']).toContain('Missing modes: none');
    expect(JSON.parse(zip.files['stored-family/modes/light/tokens.json']).brand.primary).toBe(light.finalTokens.brand.primary);
    expect(JSON.parse(zip.files['stored-family/modes/pop/tokens.json']).brand.primary).toBe(pop.finalTokens.brand.primary);
  });

  it('exports only explicitly selected resolved modes without re-adding a deselected current mode', async () => {
    const dark = buildSampleTheme();
    const light = buildTheme({ ...dark.currentTheme, themeMode: 'light', isDark: false });
    const pop = buildTheme({ ...dark.currentTheme, themeMode: 'pop', isDark: false });

    await workflowExports.buildAllModeThemePackArchive({
      displayThemeName: 'Selected Family',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      themeMode: 'dark',
      finalTokens: dark.finalTokens,
      currentTheme: dark.currentTheme,
      themeMaster: dark,
      variants: {
        light,
        pop,
      },
    }, {
      selectedModes: ['light', 'pop'],
    });

    const zip = zipInstances[0];
    const combined = JSON.parse(zip.files['selected-family/combined/tokens.all-modes.json']);
    const readme = zip.files['selected-family/README.md'];

    expect(zip.files['selected-family/modes/dark/tokens.json']).toBeUndefined();
    expect(zip.files['selected-family/modes/dark/preview/palette-card.svg']).toBeUndefined();
    expect(zip.files['selected-family/modes/light/tokens.json']).toBeTruthy();
    expect(zip.files['selected-family/modes/light/preview/palette-card.svg']).toBeTruthy();
    expect(zip.files['selected-family/modes/pop/tokens.json']).toBeTruthy();
    expect(zip.files['selected-family/modes/pop/preview/palette-card.svg']).toBeTruthy();
    expect(combined.availableModes).toEqual(['light', 'pop']);
    expect(combined.missingModes).toEqual([]);
    expect(combined.omittedModes).toEqual(['dark']);
    expect(combined.modes).not.toHaveProperty('dark');
    expect(readme).toContain('Included modes: Light, Pop');
    expect(readme).toContain('Missing modes: none');
    expect(readme).toContain('Omitted modes: Dark (available but intentionally excluded from this export)');
    expect(readme).not.toContain('exported from the current reviewed mode');
  });

  it('ignores selected unavailable modes and keeps them separate from omitted exportable modes', async () => {
    const dark = buildSampleTheme();
    const light = buildTheme({ ...dark.currentTheme, themeMode: 'light', isDark: false });

    await workflowExports.buildAllModeThemePackArchive({
      displayThemeName: 'Partial Selection',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      themeMode: 'dark',
      finalTokens: dark.finalTokens,
      currentTheme: dark.currentTheme,
      themeMaster: dark,
      variants: {
        dark,
        light,
      },
    }, {
      selectedModes: ['light', 'pop'],
    });

    const zip = zipInstances[0];
    const combined = JSON.parse(zip.files['partial-selection/combined/tokens.all-modes.json']);
    const readme = zip.files['partial-selection/README.md'];

    expect(combined.availableModes).toEqual(['light']);
    expect(combined.missingModes).toEqual(['pop']);
    expect(combined.omittedModes).toEqual(['dark']);
    expect(zip.files['partial-selection/modes/dark/tokens.json']).toBeUndefined();
    expect(zip.files['partial-selection/modes/pop/tokens.json']).toBeUndefined();
    expect(readme).toContain('exported from the selected reviewed mode');
    expect(readme).toContain('Coverage: Selected mode only');
    expect(readme).toContain('Included modes: Light');
    expect(readme).toContain('Missing modes: Pop');
    expect(readme).toContain('Omitted modes: Dark (available but intentionally excluded from this export)');
    expect(readme).toContain('Missing modes are not regenerated');
  });

  it('rejects selectedModes when none of the selected modes are exportable', async () => {
    const dark = buildSampleTheme();

    await expect(workflowExports.buildAllModeThemePackArchive({
      ...dark,
      displayThemeName: 'Unavailable Selection',
      themeMode: 'dark',
      variants: {},
    }, {
      selectedModes: ['pop'],
    })).rejects.toThrow('Select at least one available Theme Pack mode to export.');
  });

  it('uses the resolved export name and buyer-facing mode labels in Theme Pack previews', async () => {
    const dark = buildSampleTheme();
    const light = buildTheme({ ...dark.currentTheme, name: 'Stale Light Name', themeMode: 'light', isDark: false });
    const pop = buildTheme({ ...dark.currentTheme, name: 'Stale Pop Name', themeMode: 'pop', isDark: false });

    await workflowExports.buildAllModeThemePackArchive({
      displayThemeName: 'Moonlit Moss',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      themeMode: 'dark',
      finalTokens: dark.finalTokens,
      currentTheme: {
        ...dark.currentTheme,
        name: 'Stale Dark Name',
      },
      themeMaster: dark,
      variants: {
        dark: {
          ...dark,
          currentTheme: {
            ...dark.currentTheme,
            name: 'Stale Dark Name',
          },
        },
        light,
        pop,
      },
    });

    const zip = zipInstances[0];
    ['dark', 'light', 'pop'].forEach((mode) => {
      const label = mode[0].toUpperCase() + mode.slice(1);
      const paletteCard = zip.files[`moonlit-moss/modes/${mode}/preview/palette-card.svg`];
      const swatchStrip = zip.files[`moonlit-moss/modes/${mode}/preview/swatch-strip.svg`];

      expect(paletteCard).toContain(`Moonlit Moss ${label} Theme Pack palette card`);
      expect(paletteCard).toContain(`${label} mode palette preview`);
      expect(swatchStrip).toContain(`Moonlit Moss ${label} mode swatch strip`);
      expect(paletteCard).not.toMatch(/Stale (Dark|Light|Pop) Name/);
      expect(swatchStrip).not.toMatch(/Stale (Dark|Light|Pop) Name/);
      expect(paletteCard).not.toMatch(/current-mode-only|available-modes|all-modes/);
      expect(swatchStrip).not.toMatch(/current-mode-only|available-modes|all-modes/);
    });
  });

  it('exports restored saved-palette confirmed variants without filling missing modes', async () => {
    const dark = buildSampleTheme();
    const light = buildTheme({ ...dark.currentTheme, themeMode: 'light', isDark: false });

    await workflowExports.buildAllModeThemePackArchive({
      displayThemeName: 'Loaded Snapshot',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      themeMode: 'light',
      finalTokens: light.finalTokens,
      currentTheme: light.currentTheme,
      themeMaster: light,
      variants: {
        light: {
          signature: 'light-saved',
          finalTokens: light.finalTokens,
          orderedStack: light.orderedStack,
          currentTheme: light.currentTheme,
        },
        dark: {
          signature: 'dark-saved',
          finalTokens: dark.finalTokens,
          orderedStack: dark.orderedStack,
          currentTheme: dark.currentTheme,
        },
      },
    });

    const zip = zipInstances[0];
    const combined = JSON.parse(zip.files['loaded-snapshot/combined/tokens.all-modes.json']);
    expect(zip.files['loaded-snapshot/modes/light/tokens.json']).toBeTruthy();
    expect(zip.files['loaded-snapshot/modes/dark/tokens.json']).toBeTruthy();
    expect(zip.files['loaded-snapshot/modes/pop/tokens.json']).toBeUndefined();
    expect(JSON.parse(zip.files['loaded-snapshot/modes/light/tokens.json']).brand.cta).toBe(light.finalTokens.brand.cta);
    expect(JSON.parse(zip.files['loaded-snapshot/modes/dark/tokens.json']).brand.cta).toBe(dark.finalTokens.brand.cta);
    expect(combined.variantCoverage).toBe('available-modes');
    expect(combined.availableModes).toEqual(['dark', 'light']);
    expect(combined.missingModes).toEqual(['pop']);
    expect(zip.files['loaded-snapshot/README.md']).toContain('Loaded Snapshot is an Apocapalette Theme Pack exported from confirmed reviewed modes.');
    expect(zip.files['loaded-snapshot/README.md']).not.toContain('serialized');
    expect(zip.files['loaded-snapshot/README.md']).not.toContain('resolved app-state tokens');
    expect(zip.files['loaded-snapshot/README.md']).not.toContain('app-state');
    expect(zip.files['loaded-snapshot/README.md']).toContain('Coverage: Partial confirmed modes');
    expect(zip.files['loaded-snapshot/README.md']).not.toContain('(available-modes)');
    expect(zip.files['loaded-snapshot/README.md']).toContain('Included modes: Dark, Light');
    expect(zip.files['loaded-snapshot/README.md']).toContain('Missing modes: Pop');
  });

  it.each([
    ['StrawberryMilk', '#FF9DB8', 'light'],
    ['GrapeArcade', '#A78BFA', 'light'],
    ['Neutral Gray', '#C7C7C7', 'pop'],
    ['Dark Botanical', '#102A24', 'pop'],
    ['Cyan Launch', '#00D1FF', 'dark'],
  ])('exports resolved Theme Pack token values for %s', async (name, baseColor, themeMode) => {
    const theme = buildTheme({
      name,
      baseColor,
      mode: 'Monochromatic',
      themeMode,
      isDark: themeMode === 'dark',
      printMode: false,
      apocalypseIntensity: 100,
      harmonyIntensity: 91,
      neutralCurve: 108,
      accentStrength: 112,
      popIntensity: 127,
    });

    await workflowExports.buildAllModeThemePackArchive({
      displayThemeName: name,
      mode: 'Monochromatic',
      baseColor,
      themeMode,
      finalTokens: theme.finalTokens,
      currentTheme: theme.currentTheme,
      themeMaster: theme,
    });

    const zip = zipInstances[0];
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const exported = JSON.parse(zip.files[`${slug}/modes/${themeMode}/tokens.json`]);
    const combined = JSON.parse(zip.files[`${slug}/combined/tokens.all-modes.json`]);

    expect(exported.brand.cta).toBe(theme.finalTokens.brand.cta);
    expect(exported.surfaces.background).toBe(theme.finalTokens.surfaces.background);
    expect(exported.entity['entity-highlight-bg']).toBe(theme.finalTokens.entity['entity-highlight-bg']);
    expect(zip.files[`${slug}/modes/${themeMode}/css/variables.css`]).toContain(theme.finalTokens.brand.cta);
    expect(zip.files[`${slug}/modes/${themeMode}/figma/tokens.json`]).toContain(theme.finalTokens.brand.cta);
    expect(zip.files[`${slug}/modes/${themeMode}/penpot/tokens.json`]).toContain(theme.finalTokens.brand.cta);
    expect(zip.files[`${slug}/modes/${themeMode}/libreoffice/${slug}-${themeMode}.soc`]).toContain(theme.finalTokens.brand.cta.toLowerCase());
    expect(combined.variantCoverage).toBe('current-mode-only');
    expect(combined.availableModes).toEqual([themeMode]);

    // New assertion: Verify buildPaletteCardSvg was called with the correct theme name
    expect(previewAssets.buildPaletteCardSvg).toHaveBeenCalledWith(
      expect.objectContaining({
        name: name,
      })
    );
  });

  it('exports project print assets and reports skipped sections', async () => {
    const theme = buildSampleTheme();
    const onProgress = vi.fn();

    const skipped = await workflowExports.exportProjectPrintAssetsArchive({
      projectName: 'Project One',
      sections: [
        {
          label: 'Included',
          paletteSpec: { baseColor: '#6633ff', mode: 'Monochromatic', themeMode: 'dark', isDark: true, printMode: false },
          snapshot: { tokenSet: theme.finalTokens },
        },
        {
          label: 'Skipped',
          paletteSpec: {},
        },
      ],
      buildSpecFromSection: vi.fn(),
      onProgress,
    });

    const zip = zipInstances[0];
    expect(onProgress).toHaveBeenCalledWith('Generating 1/2: Included');
    expect(onProgress).toHaveBeenCalledWith('Generating 2/2: Skipped');
    expect(skipped).toEqual(['Skipped']);
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'project-one/included/palette-card.svg',
      'project-one/included/swatch-strip.svg',
      'project-one/included/palette-card.png',
      'project-one/included/swatch-strip.png',
      'project-one/included/tokens.json',
    ]));
  });

  it('exports project penpot print token files and skips sections without printable tokens', async () => {
    const onProgress = vi.fn();

    const skipped = await workflowExports.exportProjectPenpotPrintTokensArchive({
      projectName: 'Project One',
      sections: [
        {
          label: 'Included',
          paletteSpec: { baseColor: '#6633ff', tokenPrefix: 'demo' },
          snapshot: {
            tokenSet: {
              print: {
                'brand/primary': { value: '#112233', type: 'color' },
              },
            },
          },
        },
        {
          label: 'Skipped',
          paletteSpec: { baseColor: '#6633ff' },
          snapshot: {
            tokenSet: {
              print: {},
            },
          },
        },
      ],
      buildSpecFromSection: vi.fn(),
      onProgress,
    });

    const zip = zipInstances[0];
    expect(onProgress).toHaveBeenCalledWith('Generating 1/2: Included');
    expect(zip.files['project-one-penpot/included.json']).toContain('"demo"');
    expect(skipped).toEqual(['Skipped']);
  });

  it('exports all design space palettes as zipped json files', async () => {
    await workflowExports.exportDesignSpacePalettesArchive({
      projectName: 'Project One',
      sections: [
        { label: 'Alpha', baseHex: '#6633ff' },
        { label: 'Beta', baseHex: '#ff6633' },
      ],
    });

    const zip = zipInstances[0];
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'Project One-designspace/Alpha.json',
      'Project One-designspace/Beta.json',
    ]));
    expect(exportIndex.downloadFile).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'Project One-designspace-palettes.zip',
      mime: 'application/zip',
    }));
  });
});
