import { describe, expect, it, vi } from 'vitest';

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

  file(name, data) {
    this.files[name] = data;
    return this;
  }
}

vi.mock('jszip', () => ({ default: JSZipMock }));
vi.mock('./previewAssets.js', () => ({
  renderPaletteCardPng: vi.fn(async () => new Uint8Array([1, 2, 3])),
}));

const {
  flattenKitTokens,
  buildKitContrastMatrix,
  buildMarketplaceKitCss,
  buildKitReadme,
  buildKitManifest,
  buildKitLicense,
  buildMarketplaceKitArchive,
} = await import('./marketplaceKit.js');
const { buildTailwindConfigJs } = await import('./tokenExports.js');
const { getContrastRatio } = await import('../colorUtils.js');
const { generateAse } = await import('./exportAse.js');
const { generateGpl } = await import('./exportGpl.js');
const { auditMarketplaceKitMode } = await import('./marketplaceKitReleaseAudit.js');

const FLAT = [
  { key: 'brand-primary', hex: '#76a653', group: 'brand' },
  { key: 'surfaces-background', hex: '#1b1e20', group: 'surfaces' },
  { key: 'typography-text-body', hex: '#ccceca', group: 'typography' },
  { key: 'actions-primary', hex: '#76a653', group: 'actions' },
  { key: 'actions-primary-foreground', hex: '#0b0b10', group: 'actions' },
];

const RELEASE_FLAT = [
  ...FLAT,
  { key: 'cards-card-panel-surface', hex: '#29353d', group: 'cards' },
  { key: 'typography-heading', hex: '#ffffff', group: 'typography' },
  { key: 'typography-text-muted', hex: '#ccd6dd', group: 'typography' },
  { key: 'brand-accent', hex: '#ffc663', group: 'brand' },
];

const releaseFiles = (tokens = RELEASE_FLAT) => ({
  flatTokens: tokens,
  prefix: 'testkit',
  css: buildMarketplaceKitCss(tokens, 'testkit'),
  gpl: generateGpl('Test Kit', tokens.map(({ key, hex }) => ({ name: key, hex }))),
  ase: generateAse(tokens.map(({ key, hex }) => ({ name: key, hex }))),
});

describe('sell-ready mode maths and format consistency', () => {
  it('independently verifies required WCAG pairs and exact CSS/GPL/ASE swatches', () => {
    expect(auditMarketplaceKitMode(releaseFiles())).toEqual({
      tokenCount: RELEASE_FLAT.length,
      checkedPairs: 8,
    });
  });

  it('rejects unreadable manually overridden CTA text even when formats agree', () => {
    const broken = RELEASE_FLAT.map(token => token.key === 'actions-primary-foreground'
      ? { ...token, hex: '#76a653' }
      : token);
    expect(() => auditMarketplaceKitMode(releaseFiles(broken))).toThrow(/button label \/ button/);
  });

  it('rejects missing CSS colours instead of shipping a subset of JSON tokens', () => {
    const files = releaseFiles();
    files.css = files.css.replace(/.*--testkit-brand-accent:.*\n/, '');
    expect(() => auditMarketplaceKitMode(files)).toThrow(/CSS mismatch: brand-accent/);
  });

  it('rejects a GPL swatch that silently differs from JSON', () => {
    const files = releaseFiles();
    files.gpl = files.gpl.replace(/118 166 83 brand-primary/, '0 0 0 brand-primary');
    expect(() => auditMarketplaceKitMode(files)).toThrow(/GPL mismatch: brand-primary/);
  });

  it('rejects truncated or malformed ASE files', () => {
    const files = releaseFiles();
    files.ase = files.ase.slice(0, 18);
    expect(() => auditMarketplaceKitMode(files)).toThrow(/ASE parse error/);
  });
});

describe('flattenKitTokens', () => {
  it('flattens nested tokens to group-name keys and skips non-colors', () => {
    const flat = flattenKitTokens({
      brand: { primary: '#76a653' },
      notes: { label: 'not a color' },
    });
    expect(flat).toEqual([{ key: 'brand-primary', hex: '#76a653', group: 'brand' }]);
  });
});

describe('buildKitContrastMatrix', () => {
  it('measures available pairs and skips missing tokens', () => {
    const matrix = buildKitContrastMatrix(FLAT);
    const pairs = Object.fromEntries(matrix.map(({ pair, ratio }) => [pair, ratio]));
    expect(pairs['text-body / background']).toBe(getContrastRatio('#ccceca', '#1b1e20').toFixed(2));
    expect(pairs['primary button / foreground']).toBe(getContrastRatio('#0b0b10', '#76a653').toFixed(2));
    expect(matrix.some(({ pair }) => pair.includes('secondary button'))).toBe(false);
  });
});

describe('buildTailwindConfigJs', () => {
  it('emits a tailwind v3 theme.extend snippet namespaced by prefix', () => {
    const js = buildTailwindConfigJs({ kitName: 'Test Kit', mode: 'dark', flatTokens: FLAT, prefix: 'testkit' });
    expect(js).toContain('testkit:');
    expect(js).toContain('primary: "#76a653"');
    expect(js).toContain('theme: { extend:');
    // Hyphenated token names must stay quoted to be valid JavaScript property keys.
    expect(js).toContain('"primary-foreground": "#0b0b10"');
  });
});

describe('buildKitReadme', () => {
  it('lists real files with no empty placeholders', () => {
    const readme = buildKitReadme({
      name: 'Test Kit',
      tokenCount: 5,
      groups: { brand: 1, surfaces: 1, typography: 1, actions: 2 },
      modes: ['dark'],
      files: ['dark/test-kit-dark.css', 'manifest.json'],
    });
    expect(readme).toContain('- `dark/test-kit-dark.css`');
    expect(readme).toContain('- `manifest.json`');
    expect(readme).not.toMatch(/- `,|`\s*,/);
  });
});

describe('buildKitManifest', () => {
  it('records kit metadata and the file list', () => {
    const manifest = JSON.parse(buildKitManifest({
      slug: 'test-kit',
      name: 'Test Kit',
      tokenCount: 5,
      groups: { brand: 1 },
      modes: ['dark'],
      formats: ['css', 'json'],
      files: ['dark/test-kit-dark.css'],
    }));
    expect(manifest.tokenCount).toBe(5);
    expect(manifest.formats).toContain('css');
    expect(manifest.files).toContain('dark/test-kit-dark.css');
  });
});

describe('buildKitLicense', () => {
  it('allows commercial finished work but not kit resale', () => {
    const license = buildKitLicense('Test Kit');
    expect(license).toMatch(/commercial/i);
    expect(license).toMatch(/not resell/i);
  });
});

describe('buildMarketplaceKitArchive', () => {
  it('builds per-mode folders with seven formats plus docs', async () => {
    const theme = {
      displayThemeName: 'Test Kit',
      themeMode: 'dark',
      mode: 'Analogous',
      baseColor: '#76a653',
      variants: {
        dark: {
          finalTokens: {
            brand: { primary: '#76a653', accent: '#ffc663' },
            surfaces: { background: '#1b1e20' },
            cards: { 'card-panel-surface': '#29353d' },
            typography: { 'text-body': '#ccceca', heading: '#ffffff', 'text-muted': '#ccd6dd' },
            actions: { primary: '#76a653', 'primary-foreground': '#0b0b10' },
          },
        },
      },
    };
    const before = zipInstances.length;
    const { filename, kitSlug, modes } = await buildMarketplaceKitArchive(theme);
    expect(filename).toBe('test-kit-kit.zip');
    expect(kitSlug).toBe('test-kit');
    expect(modes).toEqual(['dark']);

    const zip = zipInstances[before];
    const names = Object.keys(zip.files);
    const base = 'test-kit/dark/test-kit-dark';
    [`${base}.json`, `${base}.css`, `${base}.gpl`, `${base}.ase`, `${base}.swatches`,
      `${base}.figma-tokens.json`, `test-kit/dark/tailwind.test-kit-dark.js`,
      'test-kit/README.md', 'test-kit/manifest.json',
      'test-kit/contrast-matrix.json', 'test-kit/LICENSE.txt',
    ].forEach((name) => expect(names).toContain(name));

    const manifest = JSON.parse(zip.files['test-kit/manifest.json']);
    expect(manifest.tokenCount).toBe(9);
    expect(manifest.tokenGroups).toEqual({ brand: 2, surfaces: 1, cards: 1, typography: 3, actions: 2 });
    const css = zip.files[base + '.css'];
    expect(css).toContain('--test-kit-typography-text-body: #ccceca;');
    expect(css).toContain('--test-kit-brand-accent: #ffc663;');
    const matrix = JSON.parse(zip.files['test-kit/contrast-matrix.json']);
    expect(matrix.dark.length).toBeGreaterThan(0);
    const readme = zip.files['test-kit/README.md'];
    expect(readme).toContain('dark/test-kit-dark.ase');
    expect(readme).not.toContain(',,');
  });

  it('accepts mode-specific Pop colour tokens and reports actual per-variant counts', async () => {
    const common = {
      brand: { primary: '#76a653', accent: '#ffc663' },
      surfaces: { background: '#1b1e20' },
      cards: { 'card-panel-surface': '#29353d' },
      typography: { 'text-body': '#ccceca', heading: '#ffffff', 'text-muted': '#ccd6dd' },
      actions: { primary: '#76a653', 'primary-foreground': '#0b0b10' },
    };
    const deepCopy = () => JSON.parse(JSON.stringify(common));
    const theme = {
      displayThemeName: 'Test Kit',
      themeMode: 'dark',
      mode: 'Analogous',
      baseColor: '#76a653',
      variants: {
        dark: { finalTokens: deepCopy() },
        light: { finalTokens: deepCopy() },
        pop: { finalTokens: { ...deepCopy(), pop: { 'sticker-accent': '#f23a99' } } },
      },
    };
    const index = zipInstances.length;
    const { modes } = await buildMarketplaceKitArchive(theme);
    expect(modes).toEqual(['dark', 'light', 'pop']);
    const zip = zipInstances[index];
    const manifest = JSON.parse(zip.files['test-kit/manifest.json']);
    expect(manifest.tokenCountsByVariant).toEqual({ dark: 9, light: 9, pop: 10 });
    expect(manifest.tokenGroupsByVariant.pop.pop).toBe(1);
    expect(manifest.modeSpecificTokens).toEqual({
      dark: [], light: [], pop: ['pop-sticker-accent'],
    });
    const readme = zip.files['test-kit/README.md'];
    expect(readme).toContain('dark: 9, light: 9, pop: 10');
    const pop = JSON.parse(zip.files['test-kit/pop/test-kit-pop.json']);
    expect(pop.tokenCount).toBe(10);
  });
});
