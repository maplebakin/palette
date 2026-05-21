import { sanitizeThemeName } from '../appState.js';
import { escapeXml, normalizeHex } from '../colorUtils.js';
import { buildThemePackArchive } from './workflowExports.js';
import { buildPaletteCardSvg, buildStripSvg } from './previewAssets.js';
import { buildExportFilename, exportThemePack, slugifyFilename } from '../export/index.js';

export const PRODUCT_OFFERINGS = {
  individual: 'Individual Theme Kit',
  bundle: 'Multi-Kit Bundle',
  mini: 'Mini Website Palette / Freebie',
};

export const DEFAULT_USAGE_LICENSE = [
  'Personal and commercial use is allowed for finished designs, prototypes, websites, apps, documents, and client work.',
  'Do not resell, redistribute, repackage, upload, or claim the raw theme pack files as your own.',
  'Final shop license language should be reviewed before publishing.',
].join('\n\n');

const normalizeLines = (value) => String(value || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const productSlug = (product) => (
  slugifyFilename(product?.slug || product?.title || 'product', 'product')
);

const themeSlug = (theme, fallback = 'theme') => (
  slugifyFilename(theme?.displayThemeName || theme?.currentTheme?.name || theme?.name || fallback, fallback)
);

const themeLabel = (theme, fallback = 'Theme') => (
  sanitizeThemeName(theme?.displayThemeName || theme?.currentTheme?.name || theme?.name || fallback, fallback)
);

const buildReadme = ({ product, themes, offering }) => {
  const title = sanitizeThemeName(product.title || PRODUCT_OFFERINGS[offering], PRODUCT_OFFERINGS[offering]);
  const themeNames = themes.map((theme) => themeLabel(theme));
  const themePackLines = offering === 'mini'
    ? [
      '- `mini-palette.css` - lightweight CSS variables for the sample palette.',
      '- `mini-palette.json` - five-color JSON reference for the sample palette.',
      '- `preview/mini-palette-preview.svg` - preview artwork.',
    ]
    : themes.map((theme) => `- \`${themeSlug(theme)}-theme-pack-v1.zip\` - included full theme pack ZIP`);

  return [
    `# ${title}`,
    '',
    product.shortDescription || `${title} packaged from Apocapalette.`,
    '',
    '## Product Type',
    '',
    PRODUCT_OFFERINGS[offering],
    '',
    '## Source Theme Kit(s)',
    '',
    ...themeNames.map((name) => `- ${name}`),
    '',
    '## What You Get',
    '',
    '- `README.md` - product overview.',
    '- `USAGE.txt` - usage and license notes.',
    '- `shop-listing.md` - draft marketplace listing copy.',
    '- `tags.txt` - marketplace/search tags.',
    ...themePackLines,
    '',
    'Made with Apocapalette.',
  ].join('\n');
};

const buildUsage = (product) => [
  `${sanitizeThemeName(product.title || 'Apocapalette Product', 'Apocapalette Product')} - Usage and License Notes`,
  '',
  product.usageLicense || DEFAULT_USAGE_LICENSE,
].join('\n');

const buildShopListing = ({ product, offering }) => {
  const title = sanitizeThemeName(product.title || PRODUCT_OFFERINGS[offering], PRODUCT_OFFERINGS[offering]);
  return [
    `# ${title}`,
    '',
    '## Product Title',
    '',
    title,
    '',
    '## Short Description',
    '',
    product.shortDescription || `${title} is an Apocapalette color product.`,
    '',
    '## Long Description',
    '',
    product.longDescription || product.shortDescription || `${title} includes sale-ready Apocapalette files and preview assets.`,
    '',
    '## Suggested Price',
    '',
    product.price ? `Suggested price: ${product.price}` : 'Suggested price: add before publishing.',
    '',
    '## Product Type',
    '',
    PRODUCT_OFFERINGS[offering],
  ].join('\n');
};

const buildTags = (product) => {
  const tags = normalizeLines(product.tags).length
    ? normalizeLines(product.tags)
    : ['color palette', 'design tokens', 'css variables', 'figma tokens', 'penpot'];
  return `${tags.join('\n')}\n`;
};

const deriveMiniPalette = (theme) => {
  const tokens = theme?.currentTheme?.tokens || theme?.tokens || {};
  const brand = tokens.brand || {};
  const surfaces = tokens.surfaces || {};
  const cards = tokens.cards || {};
  const typography = tokens.typography || {};
  return {
    background: normalizeHex(surfaces.background || '#ffffff', '#ffffff'),
    text: normalizeHex(typography['text-body'] || typography['text-strong'] || '#111827', '#111827'),
    primary: normalizeHex(brand.primary || theme?.baseColor || '#6366f1', '#6366f1'),
    accent: normalizeHex(brand.accent || brand.secondary || '#22d3ee', '#22d3ee'),
    surface: normalizeHex(cards['card-panel-surface'] || surfaces.surface || surfaces.background || '#f8fafc', '#f8fafc'),
  };
};

const buildMiniCss = (palette, slug) => [
  `/* ${slug} mini website palette - sample colors only */`,
  ':root {',
  `  --mini-background: ${palette.background};`,
  `  --mini-text: ${palette.text};`,
  `  --mini-primary: ${palette.primary};`,
  `  --mini-accent: ${palette.accent};`,
  `  --mini-surface: ${palette.surface};`,
  '}',
  '',
].join('\n');

const buildMiniPreviewSvg = ({ product, theme, palette }) => {
  const title = sanitizeThemeName(product.title || themeLabel(theme), 'Mini Palette');
  const swatches = Object.entries(palette).map(([key, color], index) => {
    const x = 64 + index * 168;
    return `<g><rect x="${x}" y="210" width="128" height="128" rx="18" fill="${color}"/><text x="${x}" y="372" fill="${palette.text}" font-family="Inter, system-ui" font-size="18" font-weight="800">${key}</text><text x="${x}" y="400" fill="${palette.text}" opacity="0.72" font-family="Inter, system-ui" font-size="15" font-weight="700">${color.toUpperCase()}</text></g>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="540" viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg">
  <rect width="960" height="540" rx="28" fill="${palette.background}"/>
  <rect x="40" y="40" width="880" height="460" rx="26" fill="${palette.surface}" opacity="0.92"/>
  <text x="64" y="104" fill="${palette.text}" font-family="Inter, system-ui" font-size="42" font-weight="900">${escapeXml(title)}</text>
  <text x="66" y="148" fill="${palette.text}" opacity="0.72" font-family="Inter, system-ui" font-size="20" font-weight="700">Mini website palette sample</text>
  ${swatches}
</svg>`;
};

const addProductDocs = (root, { product, themes, offering }) => {
  root.file('README.md', buildReadme({ product, themes, offering }));
  root.file('USAGE.txt', buildUsage(product));
  root.file('shop-listing.md', buildShopListing({ product, offering }));
  root.file('tags.txt', buildTags(product));
};

const addThemePreviewAssets = (root, theme, options = {}) => {
  const prefix = options.prefix || '';
  root.folder('preview')?.file(`${prefix}palette-card.svg`, buildPaletteCardSvg(theme.currentTheme || theme));
  root.folder('preview')?.file(`${prefix}swatch-strip.svg`, buildStripSvg(theme.currentTheme || theme));
};

const addThemePackZip = async (root, theme) => {
  const { blob, filename } = await buildThemePackArchive(theme);
  root.file(filename, blob);
};

export const buildProductPackageArchive = async ({
  offering = 'individual',
  product = {},
  themes = [],
  paidCta = 'See the full paid Apocapalette theme kit or bundle for the complete token files.',
}) => {
  const selectedThemes = themes.filter(Boolean);
  if (!selectedThemes.length) {
    throw new Error('Select at least one theme kit for product export.');
  }
  if (offering !== 'bundle' && selectedThemes.length > 1) {
    selectedThemes.splice(1);
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const slug = productSlug(product);
  const root = zip.folder(slug);
  if (!root) throw new Error('Failed to create product folder');

  addProductDocs(root, { product: { ...product, longDescription: offering === 'mini' ? `${product.longDescription || product.shortDescription || ''}\n\n${paidCta}`.trim() : product.longDescription }, themes: selectedThemes, offering });

  if (offering === 'mini') {
    const sourceTheme = selectedThemes[0];
    const palette = product.miniPalette || deriveMiniPalette(sourceTheme);
    root.file('mini-palette.css', buildMiniCss(palette, slug));
    root.file('mini-palette.json', JSON.stringify({
      product: sanitizeThemeName(product.title || 'Mini Website Palette', 'Mini Website Palette'),
      sourceTheme: themeLabel(sourceTheme),
      colors: palette,
      cta: paidCta,
    }, null, 2));
    root.folder('preview')?.file('mini-palette-preview.svg', buildMiniPreviewSvg({ product, theme: sourceTheme, palette }));
  } else if (offering === 'bundle') {
    for (const theme of selectedThemes) {
      const prefix = `${themeSlug(theme)}-`;
      addThemePreviewAssets(root, theme, { prefix });
      await addThemePackZip(root, theme);
    }
  } else {
    const theme = selectedThemes[0];
    addThemePreviewAssets(root, theme);
    await addThemePackZip(root, theme);
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return {
    blob,
    filename: buildExportFilename(slug, '', 'zip'),
    productSlug: slug,
  };
};

export const downloadProductPackageArchive = async (options) => {
  const { blob, filename } = await buildProductPackageArchive(options);
  exportThemePack({ data: blob, filename, mime: 'application/zip' });
};
