import { sanitizeThemeName } from '../appState.js';
import { escapeXml, normalizeHex } from '../colorUtils.js';
import { addAllModeThemePackFiles, buildAllModeThemePackArchive } from './workflowExports.js';
import { buildPaletteCardSvg, buildStripSvg } from './previewAssets.js';
import { buildExportFilename, exportThemePack, slugifyFilename } from '../export/index.js';

export const PRODUCT_OFFERINGS = {
  individual: 'Website & Brand Color Kit',
  bundle: 'Multi-Kit Bundle',
  mini: 'Mini Website Palette / Freebie',
};

const DISPLAY_PRODUCT_TYPES = {
  individual: 'Website & Brand Color Kit',
  bundle: 'Multi-Kit Bundle',
  mini: 'Mini Website Palette',
};

export const DEFAULT_USAGE_LICENSE = [
  'Personal and commercial use is allowed for finished designs, prototypes, websites, apps, documents, and client work.',
  'You may modify, adapt, recolor, and customize the kit assets for your own finished work.',
  'Do not resell, redistribute, repackage, sublicense, upload, share, or claim the kit itself as your own product.',
].join('\n\n');

const ACCESSIBILITY_USAGE_NOTE = 'Please review contrast and accessibility in your final design context before publishing or sharing.';
const SUPPORT_EMAIL = 'streamthreadsystems@gmail.com';
const COPYRIGHT_HOLDER = 'StreamThread Systems';
const COPYRIGHT_YEAR = '2026';

const normalizeLines = (value) => String(value || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const MODE_TAGS = {
  dark: 'dark mode palette',
  light: 'light mode palette',
  pop: 'pop mode palette',
};

const normalizeTags = (value) => normalizeLines(value)
  .map((tag) => tag.toLowerCase())
  .filter((tag) => !Object.values(MODE_TAGS).includes(tag));

const getIncludedModesForTags = (offering, themes = []) => {
  if (offering === 'mini') return [];
  const modes = themes.flatMap((theme) => getThemeExportSourceInfo(theme).modes);
  return THEME_MODE_ORDER.filter((mode) => modes.includes(mode));
};

const buildModeTags = (offering, themes = []) => (
  getIncludedModesForTags(offering, themes).map((mode) => MODE_TAGS[mode]).filter(Boolean)
);

const humanizeName = (value, fallback = 'Theme') => {
  const clean = sanitizeThemeName(value || fallback, fallback)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || fallback;
};

const normalizeDisplayName = (value, fallback = 'Product') => {
  if (typeof value !== 'string') return fallback;
  const clean = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s&/+-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return clean || fallback;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const productTypeVariants = (productType) => Array.from(new Set([
  productType,
  productType.replace(/\s*&\s*/g, ' '),
  productType.replace(/\s*&\s*/g, ' and '),
  productType.replace(/\s*\/\s*Freebie$/i, ''),
].map((value) => normalizeDisplayName(value, '').trim()).filter(Boolean)));

const stripProductType = (title, productType) => {
  const normalizedTitle = normalizeDisplayName(title, '');
  const variants = productTypeVariants(productType)
    .sort((a, b) => b.length - a.length);
  return variants.reduce((current, variant) => (
    current.replace(new RegExp(`\\s+${escapeRegExp(variant)}$`, 'i'), '')
  ), normalizedTitle).replace(/\s+/g, ' ').trim();
};

const getProductTitleMetadata = ({ product = {}, offering = 'individual', themes = [] }) => {
  const productType = DISPLAY_PRODUCT_TYPES[offering] || PRODUCT_OFFERINGS[offering] || 'Theme Pack';
  const explicitBaseName = product.themeName || product.baseName;
  const rawName = explicitBaseName
    || stripProductType(product.title, productType)
    || themeLabel(themes[0], PRODUCT_OFFERINGS[offering] || 'Product');
  const baseName = normalizeDisplayName(humanizeName(rawName, PRODUCT_OFFERINGS[offering] || 'Product'), PRODUCT_OFFERINGS[offering] || 'Product');
  const productTitle = productTypeVariants(productType)
    .some((variant) => new RegExp(`\\s+${escapeRegExp(variant)}$`, 'i').test(normalizeDisplayName(product.title, '')))
    ? `${baseName} ${productType}`
    : `${baseName} ${productType}`;

  return {
    baseName,
    productType,
    productTitle: normalizeDisplayName(productTitle, `${baseName} ${productType}`),
  };
};

const normalizeTermList = (...values) => values.flatMap((value) => {
  if (Array.isArray(value)) return normalizeTermList(...value);
  return String(value || '')
    .split(/[\n,;]+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
});

const uniqueTerms = (terms) => Array.from(new Set(
  terms
    .map((term) => String(term || '').trim().toLowerCase())
    .filter(Boolean)
));

const sentenceList = (items = []) => {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
};

const formatTermDisplay = (term) => String(term || '')
  .split(/\s+/)
  .map((word, index) => {
    const upper = word.toUpperCase();
    if (['AI', 'UI', 'CSS', 'JSON', 'TTRPG', 'RPG', 'SAAS'].includes(upper)) return upper === 'SAAS' ? 'SaaS' : upper;
    if (index > 0 && ['and', 'or', 'for', 'of', 'the', 'with'].includes(word)) return word;
    return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
  })
  .join(' ');

const displayTerms = (terms = []) => terms.map(formatTermDisplay);

const productSlug = (product) => (
  slugifyFilename(product?.slug || product?.title || 'product', 'product')
);

const themeSlug = (theme, fallback = 'theme') => (
  slugifyFilename(theme?.displayThemeName || theme?.currentTheme?.name || theme?.name || fallback, fallback)
);

const themeLabel = (theme, fallback = 'Theme') => (
  humanizeName(theme?.displayThemeName || theme?.currentTheme?.name || theme?.name || fallback, fallback)
);

const THEME_MODE_ORDER = ['light', 'dark', 'pop'];

const modeLabel = (mode) => (
  mode ? `${mode[0].toUpperCase()}${mode.slice(1)}` : ''
);

const getThemeTextSource = ({ product = {}, themes = [], baseName = '' }) => [
  baseName,
  product.title,
  product.shortDescription,
  product.longDescription,
  product.description,
  product.themeNotes,
  product.tags,
  product.aestheticTags,
  product.themeTags,
  product.moodTags,
  product.useCases,
  product.useCaseTags,
  ...themes.flatMap((theme) => [
    theme?.displayThemeName,
    theme?.name,
    theme?.currentTheme?.name,
    theme?.description,
    theme?.notes,
    theme?.tags,
  ]),
].filter(Boolean).join(' ').toLowerCase();

const keywordTagRules = [
  { pattern: /\b(s[eé]ance|occult|ritual|coven|witch|tarot|oracle|arcane|spirit|haunt)/i, tags: ['occult UI', 'gothic UI', 'fantasy interface', 'TTRPG tools', 'moody dashboard', 'editorial web design'] },
  { pattern: /\b(gothic|goth|noir|shadow|midnight|grave|crypt|vampire)/i, tags: ['gothic UI', 'dark UI', 'moody dashboard', 'editorial web design'] },
  { pattern: /\b(fantasy|myth|lore|dragon|dungeon|rpg|ttrpg|tabletop)/i, tags: ['fantasy interface', 'TTRPG tools', 'game UI'] },
  { pattern: /\b(apocalypse|wasteland|doomsday|survival|horror|blood|beef)/i, tags: ['horror UI', 'game UI', 'dark UI', 'dashboard design'] },
  { pattern: /\b(dashboard|admin|crm|analytics|operations)/i, tags: ['dashboard design', 'app interface', 'SaaS UI'] },
  { pattern: /\b(editorial|magazine|portfolio|blog|publication)/i, tags: ['editorial web design', 'portfolio design'] },
  { pattern: /\b(velvet|silk|plush|jewel|luxury)/i, tags: ['moody palette', 'editorial web design'] },
];

const colorKeywordTags = [
  ['purple', 'purple palette'],
  ['violet', 'purple palette'],
  ['lavender', 'purple palette'],
  ['indigo', 'indigo palette'],
  ['blue', 'blue palette'],
  ['cobalt', 'blue palette'],
  ['cyan', 'cyan palette'],
  ['teal', 'teal palette'],
  ['green', 'green palette'],
  ['red', 'red palette'],
  ['crimson', 'red palette'],
  ['rose', 'rose palette'],
  ['pink', 'pink palette'],
  ['orange', 'orange palette'],
  ['amber', 'amber palette'],
  ['gold', 'gold palette'],
  ['black', 'dark palette'],
  ['dark', 'dark palette'],
];

const hexToHue = (hex) => {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  const hue = max === r
    ? ((g - b) / delta) % 6
    : max === g
      ? (b - r) / delta + 2
      : (r - g) / delta + 4;
  return Math.round(hue * 60 + (hue < 0 ? 360 : 0));
};

const collectThemeHexValues = (themes = []) => themes.flatMap((theme) => {
  const tokens = theme?.finalTokens || theme?.tokens || theme?.currentTheme?.tokens || {};
  const values = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    Object.values(node).forEach((value) => {
      if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
        values.push(value);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    });
  };
  visit(tokens);
  return values.slice(0, 24);
});

const deriveColorTags = (textSource, themes = []) => {
  const keywordTags = colorKeywordTags
    .filter(([keyword]) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(textSource))
    .map(([, tag]) => tag);
  const hueTags = collectThemeHexValues(themes)
    .map(hexToHue)
    .filter((hue) => hue !== null)
    .map((hue) => {
      if (hue >= 255 && hue <= 300) return 'purple palette';
      if (hue > 210 && hue < 255) return 'blue palette';
      if (hue > 170 && hue <= 210) return 'cyan palette';
      if (hue > 130 && hue <= 170) return 'green palette';
      if (hue >= 330 || hue <= 20) return 'red palette';
      if (hue > 20 && hue <= 50) return 'orange palette';
      return '';
    })
    .filter(Boolean);
  return uniqueTerms([...keywordTags, ...hueTags]).slice(0, 4);
};

const deriveNameTags = (baseName) => normalizeTermList(baseName)
  .flatMap((name) => name.split(/\s+/))
  .filter((word) => word.length > 3 && !['website', 'brand', 'color', 'palette', 'theme', 'pack', 'kit', 'light', 'dark', 'mini', 'full', 'partial', 'mixed'].includes(word))
  .slice(0, 3)
  .map((word) => `${word} theme`);

const deriveThemeTags = ({ product = {}, themes = [], baseName = '' }) => {
  const textSource = getThemeTextSource({ product, themes, baseName });
  const keywordTags = keywordTagRules.flatMap((rule) => (
    rule.pattern.test(textSource) ? rule.tags : []
  ));
  return uniqueTerms([
    ...deriveNameTags(baseName),
    ...keywordTags,
    ...deriveColorTags(textSource, themes),
  ]);
};

const getProductCopyMetadata = ({ product = {}, offering = 'individual', themes = [] }) => {
  const title = getProductTitleMetadata({ product, offering, themes });
  const suppliedAestheticTags = normalizeTermList(product.aestheticTags, product.themeTags, product.moodTags);
  const suppliedUseCaseTags = normalizeTermList(product.useCases, product.useCaseTags);
  const productTags = normalizeTags(product.tags);
  const derivedTags = deriveThemeTags({ product, themes, baseName: title.baseName });
  const themeTags = uniqueTerms([
    ...suppliedAestheticTags,
    ...suppliedUseCaseTags,
    ...derivedTags,
  ]);
  const useCaseTags = uniqueTerms([
    ...suppliedUseCaseTags,
    ...themeTags.filter((tag) => /ui|interface|dashboard|tools|design|website|app|game|ttrpg|editorial|portfolio/i.test(tag)),
  ]).slice(0, 8);
  const aestheticTags = uniqueTerms([
    ...suppliedAestheticTags,
    ...themeTags.filter((tag) => !suppliedUseCaseTags.includes(tag) && /palette|gothic|occult|fantasy|horror|dark|moody|editorial|theme/i.test(tag)),
  ]).slice(0, 8);
  return {
    ...title,
    productTags,
    themeTags,
    useCaseTags,
    aestheticTags,
    description: String(product.shortDescription || product.description || '').trim(),
    longDescription: String(product.longDescription || '').trim(),
    themeNotes: String(product.themeNotes || product.notes || '').trim(),
  };
};

const firstParagraph = (value) => String(value || '').split(/\n\s*\n/)[0]?.trim() || '';

const buildThemeOverview = ({ metadata, sourceInfo, offering }) => {
  const provided = metadata.description || firstParagraph(metadata.longDescription) || metadata.themeNotes;
  if (provided) return provided;
  if (offering === 'bundle') {
    return `${metadata.productTitle} collects coordinated Apocapalette theme kits for comparing palette directions, building storefront previews, and packaging multiple buyer-ready color systems together.`;
  }
  if (offering === 'mini') {
    const style = sentenceList(displayTerms(metadata.aestheticTags.slice(0, 2)));
    return `${metadata.productTitle} is a lightweight starter palette${style ? ` with a ${style} direction` : ''} for quick website, brand, and digital product concepts.`;
  }
  const style = sentenceList(displayTerms(metadata.aestheticTags.slice(0, 3)));
  const uses = sentenceList(displayTerms(metadata.useCaseTags.slice(0, 3)));
  return `${metadata.productTitle} is a buyer-ready color system${style ? ` with a ${style} direction` : ''}${uses ? ` for ${uses}` : ' for websites, product interfaces, and brand assets'}. It is exported from ${sourceInfo.shortDescriptor}.`;
};

const buildModeCoverageLines = (sourceInfo) => {
  const labels = sourceInfo.modes.map(modeLabel);
  const modeList = sentenceList(labels);
  const hasMultipleModes = sourceInfo.modes.length > 1;
  return [
    sourceInfo.modeLine,
    hasMultipleModes
      ? `This is a multi-mode kit with separate ${modeList} mode folders. Each mode folder contains matching CSS, JSON, Figma, Penpot, LibreOffice/OpenOffice, and preview files for that mode.`
      : `This kit includes the ${modeList || 'current'} mode folder with matching CSS, JSON, Figma, Penpot, LibreOffice/OpenOffice, and preview files.`,
    '`combined/tokens.all-modes.json` and `combined/css/variables.all-modes.css` provide all included modes in one reference layer.',
  ];
};

const buildHowToUseLines = (offering) => {
  if (offering === 'bundle') {
    return [
      '- Open the extracted product folder, then unzip each nested Theme Pack ZIP for that palette\'s files.',
      '- Each included Theme Pack ZIP contains its own README and mode files.',
      '- Use the root previews and listing docs to compare the included palettes.',
    ];
  }

  if (offering === 'mini') {
    return [
      '- Open the extracted product folder first.',
      '- Use the included CSS, JSON, and preview as a lightweight starter palette.',
      '- This mini package is smaller than a full Theme Pack.',
    ];
  }

  return [
    '- Open the extracted product folder first.',
    '- Start with `README.md`, `USAGE.txt`, and `LICENSE.txt` for the product overview, usage notes, and license terms.',
    '- Use `modes/<mode>/css/variables.css` for websites, apps, landing pages, and interface prototypes.',
    '- Use `modes/<mode>/tokens.json` or `combined/tokens.all-modes.json` as JSON token references.',
    '- Use `modes/<mode>/figma/tokens.json` for Figma token workflows and handoff.',
    '- Use `modes/<mode>/penpot/tokens.json` for Penpot token workflows and handoff.',
    '- Use `modes/<mode>/libreoffice/*.soc` for LibreOffice/OpenOffice document, drawing, and presentation color picking.',
    '- Use preview files and swatch strips as quick visual references.',
  ];
};

export const getThemeExportSourceInfo = (theme = {}) => {
  const confirmedModes = theme?.variants && typeof theme.variants === 'object'
    ? THEME_MODE_ORDER.filter((mode) => theme.variants[mode])
    : [];
  const fallbackMode = theme?.themeMode || theme?.currentTheme?.themeMode || (theme?.isDark ? 'dark' : 'light');
  const currentResolvedTokens = theme?.finalTokens || theme?.tokens || theme?.currentTheme?.tokens;
  const includesCurrentFallback = confirmedModes.length > 0
    && !confirmedModes.includes(fallbackMode)
    && currentResolvedTokens
    && typeof currentResolvedTokens === 'object';
  const modes = confirmedModes.length
    ? THEME_MODE_ORDER.filter((mode) => confirmedModes.includes(mode) || (includesCurrentFallback && mode === fallbackMode))
    : [fallbackMode];
  const isFullConfirmed = confirmedModes.length === THEME_MODE_ORDER.length;
  const isPartialConfirmed = confirmedModes.length > 0 && !isFullConfirmed;
  const isSpecDerived = confirmedModes.length === 0;
  const modeList = modes.join(', ');
  const confirmedModeList = confirmedModes.join(', ');
  const confirmedModeNoun = `mode${confirmedModes.length === 1 ? '' : 's'}`;
  const mixedDescriptor = `confirmed reviewed ${confirmedModeList} ${confirmedModeNoun} plus the current resolved ${fallbackMode} mode`;
  const folderLineForMode = (mode) => (
    includesCurrentFallback && mode === fallbackMode ? 'current resolved' : 'confirmed reviewed'
  );

  return {
    modes,
    confirmedModes,
    modeList,
    isFullConfirmed,
    isPartialConfirmed,
    isSpecDerived,
    includesCurrentFallback,
    sourceLabel: isSpecDerived
      ? 'Uses current/spec-derived mode data. Missing modes are not regenerated.'
      : includesCurrentFallback
        ? 'Includes confirmed modes plus the current resolved mode.'
      : isPartialConfirmed
        ? 'Includes confirmed reviewed modes only.'
        : 'Uses confirmed reviewed modes.',
    modeLine: isSpecDerived
      ? `Includes current/spec-derived ${modeList} mode data. Missing modes are not regenerated during export.`
      : includesCurrentFallback
        ? `Includes ${mixedDescriptor}. Missing modes are not regenerated during export.`
      : `Includes confirmed reviewed ${modeList} mode${modes.length === 1 ? '' : 's'} only. Missing modes are not regenerated during export.`,
    folderLine: isSpecDerived
      ? 'current/spec-derived'
      : 'confirmed reviewed',
    folderLineForMode,
    shortDescriptor: isSpecDerived
      ? `current/spec-derived ${modeList} mode data`
      : includesCurrentFallback
        ? mixedDescriptor
      : `confirmed reviewed ${modeList} mode${modes.length === 1 ? '' : 's'}`,
  };
};

const buildReadme = ({ product, themes, offering }) => {
  const metadata = getProductCopyMetadata({ product, offering, themes });
  const { baseName, productType, productTitle } = metadata;
  const slug = productSlug(product);
  const themeNames = themes.map((theme) => themeLabel(theme));
  const firstThemeInfo = getThemeExportSourceInfo(themes[0] || {});
  const firstThemeModes = firstThemeInfo.modes;
  const intro = buildThemeOverview({ metadata, sourceInfo: firstThemeInfo, offering });
  const modeCoverageLines = offering === 'individual' ? buildModeCoverageLines(firstThemeInfo) : [];
  const themePackLines = offering === 'mini'
    ? [
      '- `mini-palette.css` - lightweight CSS variables for the sample palette.',
      '- `mini-palette.json` - five-color JSON reference for the sample palette.',
      '- `preview/mini-palette-preview.svg` - preview artwork.',
    ]
    : offering === 'individual'
    ? [
      ...firstThemeModes.map((mode) => `- \`modes/${mode}/\` - ${firstThemeInfo.folderLineForMode(mode)} ${mode} mode tokens, CSS, design-tool files, LibreOffice palette, and previews.`),
      '- `combined/tokens.all-modes.json` - all included modes in one JSON reference.',
      '- `combined/css/variables.all-modes.css` - scoped CSS variables for all included modes.',
      '- `marketplace-preview/marketplace-cover.svg` - square product preview artwork.',
      '- `theme-pack-README.md` - technical theme-pack file guide.',
    ]
    : themes.map((theme) => {
      const info = getThemeExportSourceInfo(theme);
      return `- \`${themeSlug(theme)}-theme-pack-v1.zip\` - included ${info.shortDescriptor} theme pack ZIP`;
    });
  const insideZip = offering === 'individual'
    ? `Open the extracted \`${slug}/\` folder. The product docs are at the top level, generated assets are organized by mode, and all-mode references live in \`combined/\`.`
    : offering === 'mini'
      ? `Open the extracted \`${slug}/\` folder. The product docs are at the top level, with lightweight CSS, JSON, and preview files beside them.`
      : `Open the extracted \`${slug}/\` folder. The product docs and comparison previews are at the top level, with each included palette delivered as a nested Theme Pack ZIP.`;

  return [
    `# ${productTitle}`,
    '',
    '## Product Overview',
    '',
    intro,
    '',
    '## Product Type',
    '',
    productType,
    ...(offering === 'individual' ? [
      '',
      '## Mode Coverage',
      '',
      ...modeCoverageLines,
    ] : []),
    ...(metadata.themeTags.length ? [
      '',
      '## Theme Direction',
      '',
      `Useful direction tags: ${displayTerms(metadata.themeTags.slice(0, 8)).join(', ')}.`,
    ] : []),
    '',
    '## Source Theme Kit(s)',
    '',
    ...themeNames.map((name) => `- ${name}`),
    ...(themeNames.length ? [] : [`- ${baseName}`]),
    '',
    '## What You Get',
    '',
    '- `README.md` - product overview.',
    '- `USAGE.txt` - usage and license notes.',
    '- `LICENSE.txt` - license terms.',
    '- `SUPPORT.txt` - support contact details.',
    '- `shop-listing.md` - marketplace listing copy.',
    '- `tags.txt` - marketplace/search tags.',
    ...themePackLines,
    '',
    '## Inside the ZIP',
    '',
    insideZip,
    '',
    '## How to Use This Pack',
    '',
    ...buildHowToUseLines(offering),
    '',
    '## CSS Variables',
    '',
    offering === 'individual'
      ? 'Use `modes/<mode>/css/variables.css` for a single mode, or `combined/css/variables.all-modes.css` when you want all included modes in one CSS file.'
      : offering === 'mini'
        ? 'Use `mini-palette.css` for lightweight CSS custom properties.'
        : 'Open each nested Theme Pack ZIP and use the CSS files documented inside that kit.',
    '',
    '## JSON Tokens',
    '',
    offering === 'individual'
      ? 'Use `modes/<mode>/tokens.json` for one mode, or `combined/tokens.all-modes.json` for an all-mode reference.'
      : offering === 'mini'
        ? 'Use `mini-palette.json` as a small JSON color reference.'
        : 'Open each nested Theme Pack ZIP and use the JSON token files documented inside that kit.',
    '',
    '## Figma Tokens',
    '',
    offering === 'mini'
      ? 'This mini package does not include Figma token files.'
      : 'Use `figma/tokens.json` files inside each mode folder or nested Theme Pack ZIP for Figma token workflows.',
    '',
    '## Penpot Tokens',
    '',
    offering === 'mini'
      ? 'This mini package does not include Penpot token files.'
      : 'Use `penpot/tokens.json` files inside each mode folder or nested Theme Pack ZIP for Penpot token workflows.',
    '',
    '## LibreOffice / OpenOffice Palette',
    '',
    offering === 'mini'
      ? 'This mini package does not include LibreOffice/OpenOffice palette files.'
      : 'Use `.soc` files in each `libreoffice/` folder for LibreOffice/OpenOffice color palettes.',
    '',
    '## Preview Files',
    '',
    offering === 'bundle'
      ? 'Use the root preview files to compare the included palettes, and use nested Theme Pack previews for individual palette references.'
      : 'Use the preview SVG files as quick visual references and listing image starting points.',
    '',
    '## License Summary',
    '',
    'Personal and commercial use is allowed for finished projects. You may modify the kit assets for your own work. You may not resell, redistribute, repackage, share, or claim the kit itself as your own product. The kit is provided as-is, without warranty. See `LICENSE.txt` for the full terms.',
    '',
    '## Support',
    '',
    `For support, contact ${SUPPORT_EMAIL}.`,
    '',
    'Made with Apocapalette.',
  ].join('\n');
};

const buildUsage = ({ product, offering, themes }) => {
  const additionalTerms = String(product.usageLicense || '').trim();
  const { productTitle } = getProductTitleMetadata({ product, offering, themes });

  return [
    `${productTitle} - Usage and License Notes`,
    '',
    'What you can use this kit for:',
    '- Personal websites, blogs, landing pages, and digital products.',
    '- Commercial websites, client projects, brand assets, templates, documents, and finished designs.',
    '- Design mockups, product UI concepts, social graphics, and launch assets.',
    '',
    'What you may do:',
    '- Use the kit assets in personal and commercial finished projects.',
    '- Modify, adapt, recolor, and customize the assets for your own work.',
    '',
    'What you may not do:',
    '- Resell, redistribute, repackage, sublicense, upload, share, or claim the kit itself as your own product.',
    '- Sell or give away the raw files as a standalone palette, token pack, theme pack, or competing digital product.',
    ...(additionalTerms ? [
      '',
      'Additional usage note:',
      additionalTerms,
    ] : []),
    '',
    'Warranty:',
    'The kit is provided as-is, without warranty. Review contrast and accessibility in your final design context before publishing or sharing.',
    '',
    `For support, contact ${SUPPORT_EMAIL}.`,
  ].join('\n');
};

const buildLicense = ({ product, offering, themes }) => [
  `${getProductTitleMetadata({ product, offering, themes }).productTitle} - License Terms`,
  '',
  `Copyright (c) ${COPYRIGHT_YEAR} ${COPYRIGHT_HOLDER}. All rights reserved.`,
  '',
  'Permission is granted to use this kit in personal and commercial finished projects, including websites, apps, graphics, documents, templates, client work, and other completed designs.',
  '',
  'You may modify, adapt, recolor, and customize the included assets for your own finished projects.',
  '',
  'You may not resell, redistribute, repackage, sublicense, upload, share, or claim the kit itself as your own product. You may not sell or give away the raw files as a standalone palette, token pack, theme pack, or competing digital product.',
  '',
  'The kit is provided as-is, without warranty of any kind, express or implied. The copyright holder is not liable for any claim, damages, or other liability arising from use of the kit.',
].join('\n');

const buildSupport = ({ product, offering, themes }) => [
  `Thank you for downloading ${getProductTitleMetadata({ product, offering, themes }).productTitle}.`,
  '',
  `For support, contact: ${SUPPORT_EMAIL}`,
  '',
  'Please include your order number, platform, and a short description of the issue.',
  '',
  ACCESSIBILITY_USAGE_NOTE,
].join('\n');

const buildListingTags = (product, offering, themes = []) => {
  const metadata = getProductCopyMetadata({ product, offering, themes });
  const offeringTags = offering === 'mini'
    ? ['mini palette', 'starter palette', 'website colors', 'brand colors']
    : offering === 'bundle'
      ? ['color palette bundle', 'brand kit bundle', 'website color kits', 'design token bundle']
      : ['website color kit', 'brand color kit', 'adaptive color system', 'design tokens'];
  return Array.from(new Set([
    ...metadata.productTags,
    ...offeringTags,
    ...metadata.themeTags,
    ...metadata.useCaseTags,
    ...buildModeTags(offering, themes),
    'css variables',
    'digital product colors',
    'brand palette',
  ].map((tag) => tag.toLowerCase())));
};

const buildSuggestedUses = (offering, metadata = {}) => {
  const suppliedUses = uniqueTerms(metadata.useCaseTags || []).map((tag) => `- ${formatTermDisplay(tag)}`);
  if (offering === 'mini') {
    return [
      ...suppliedUses,
      '- Websites, blogs, and simple landing pages',
      '- Lightweight brand direction',
      '- Digital product starter concepts',
      '- Planners, templates, and social graphics',
    ];
  }

  return [
    ...suppliedUses,
    '- Websites, blogs, and landing pages',
    '- Digital products and app interfaces',
    '- Planners, templates, and brand kits',
    '- Design mockups and client concepts',
    '- Social graphics and launch assets',
  ];
};

const buildListingIncludedLines = ({ offering, themes, sourceInfo }) => {
  if (offering === 'mini') {
    return [
      '- `mini-palette.css` - lightweight CSS variables for the starter palette.',
      '- `mini-palette.json` - five-color JSON reference.',
      '- `preview/mini-palette-preview.svg` - visual preview for quick reference.',
      '- `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, and `tags.txt`.',
    ];
  }

  if (offering === 'bundle') {
    return [
      '- Multiple nested Theme Pack ZIPs, one for each included palette.',
      '- Each nested Theme Pack ZIP includes its own README and mode files.',
      '- Root preview SVGs for comparing the included palettes.',
      '- `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, and `tags.txt`.',
      ...themes.map((theme) => `- \`${themeSlug(theme)}-theme-pack-v1.zip\` - ${themeLabel(theme)} Theme Pack ZIP.`),
    ];
  }

  return [
    ...sourceInfo.modes.map((mode) => `- \`modes/${mode}/\` - ${sourceInfo.folderLineForMode(mode)} ${mode} mode files.`),
    '- CSS variables for websites, apps, landing pages, and interface prototypes.',
    '- JSON tokens plus Figma/Penpot token files for design workflows.',
    '- LibreOffice/OpenOffice palette files for document and presentation color picking.',
    '- Preview images and swatch strips for quick visual reference.',
    '- `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, and `tags.txt`.',
  ];
};

const buildListingCompatibilityLines = (offering) => {
  if (offering === 'mini') {
    return [
      '- CSS custom properties in `mini-palette.css`.',
      '- JSON color reference in `mini-palette.json`.',
      '- SVG preview artwork.',
      '- Buyer notes, license terms, support contact, and listing copy.',
    ];
  }

  if (offering === 'bundle') {
    return [
      '- Nested Theme Pack ZIP files for each included palette.',
      '- Root SVG preview assets for palette comparison.',
      '- README, usage notes, license terms, support contact, listing copy, and marketplace tags.',
      '- Full file compatibility is documented inside each nested Theme Pack ZIP.',
    ];
  }

  return [
    '- CSS custom properties for websites and apps.',
    '- JSON token files for reference and automation.',
    '- Figma/Penpot token JSON for design workflows.',
    '- LibreOffice/OpenOffice palettes for document color picking.',
    '- Preview images and swatch strips for listing images or quick QA.',
  ];
};

const buildListingAltTextLines = (title, offering) => {
  if (offering === 'mini') {
    return [
      `- ${title} mini website palette preview showing five starter colors and hex values.`,
      `- ${title} lightweight color palette sample for website and brand concepts.`,
    ];
  }

  if (offering === 'bundle') {
    return [
      `- ${title} color palette bundle preview showing multiple included theme kits.`,
      `- ${title} bundle swatch previews comparing included website and brand color kits.`,
    ];
  }

  return [
    `- ${title} website and brand color kit preview with key palette swatches and hex values.`,
    `- ${title} design token palette card showing CSS, JSON, Figma, Penpot, and LibreOffice support.`,
    `- ${title} swatch strip with primary, accent, base, and neutral colors.`,
  ];
};

const buildMarketplaceDraftLines = ({
  baseName,
  productTitle,
  productType,
  offering,
  shortDescription,
  suggestedTags,
  includedLines,
  suggestedUses,
  compatibilityLines,
  modeCoverageLines,
}) => {
  const etsyTitle = offering === 'mini'
    ? `${productTitle}, Digital Color Palette, CSS and JSON Starter Colors`
    : offering === 'bundle'
      ? `${productTitle}, Website Theme Kits, Digital Brand Color Pack`
      : `${productTitle}, Digital Palette, CSS Variables and Design Tokens`;
  const directTitle = offering === 'mini'
    ? productTitle
    : offering === 'bundle'
      ? productTitle
      : productTitle;
  const storefrontTitle = offering === 'mini'
    ? `${baseName} Starter Color Palette`
    : offering === 'bundle'
      ? productTitle
      : `${baseName} Adaptive Color Kit`;
  const etsyOpening = offering === 'mini'
    ? `${productTitle} is a lightweight digital palette for starting a website, blog, template, or brand direction.`
    : offering === 'bundle'
      ? `${productTitle} is a digital color palette bundle with multiple nested Theme Pack ZIPs for comparing and using several included theme kits.`
      : `${productTitle} is a digital ${productType.toLowerCase()} with CSS variables, JSON tokens, Figma/Penpot files, LibreOffice palettes, and preview references.`;
  const directSummary = offering === 'mini'
    ? `${shortDescription} This mini/freebie package is intentionally smaller than a full paid color kit.`
    : offering === 'bundle'
      ? `${shortDescription} Open each nested Theme Pack ZIP for that palette's complete files and README.`
      : shortDescription;
  const downloadNote = offering === 'bundle'
    ? 'Digital download: after purchase, download the bundle ZIP, then open each nested Theme Pack ZIP for the included palette files. No physical product is shipped.'
    : 'Digital download: after purchase, download the ZIP file and open the included README before using the files. No physical product is shipped.';
  const accessNote = offering === 'bundle'
    ? 'Access note: download the bundle ZIP, then open each nested Theme Pack ZIP to access the files for each included palette.'
    : 'Access note: download the ZIP file, unzip it, and start with README.md for file guidance.';

  return [
    '## Etsy Listing Copy',
    '',
    `Title: ${etsyTitle}`,
    '',
    etsyOpening,
    '',
    'Buyer-friendly bullets:',
    ...includedLines,
    ...(modeCoverageLines?.length ? ['', 'Mode and structure notes:', ...modeCoverageLines.map((line) => `- ${line}`)] : []),
    '',
    downloadNote,
    '',
    'Suggested Etsy tags:',
    ...suggestedTags.slice(0, 13).map((tag) => `- ${tag}`),
    '',
    '## Gumroad / Ko-fi Listing Copy',
    '',
    `Title: ${directTitle}`,
    '',
    directSummary,
    '',
    'What you get:',
    ...includedLines,
    '',
    'Best for:',
    ...suggestedUses,
    '',
    accessNote,
    '',
    '## Personal Storefront Listing Copy',
    '',
    `Title: ${storefrontTitle}`,
    '',
    offering === 'mini'
      ? `${productTitle} is a compact starter palette for lightweight digital projects, early brand direction, and simple website color exploration.`
      : offering === 'bundle'
        ? `${productTitle} brings multiple coordinated theme kits together as nested Theme Pack ZIPs with preview assets and seller-ready listing notes.`
        : `${productTitle} is a flexible color system for websites, product interfaces, brand assets, and design handoff workflows.`,
    '',
    'Compatibility and file summary:',
    ...compatibilityLines,
    '',
    'Support and license note: see `SUPPORT.txt` and `LICENSE.txt` for contact details, allowed uses, restrictions, and warranty terms.',
  ];
};

const buildShopListing = ({ product, offering, themes = [] }) => {
  const metadata = getProductCopyMetadata({ product, offering, themes });
  const { baseName, productType, productTitle } = metadata;
  const sourceInfo = getThemeExportSourceInfo(themes[0] || {});
  const modeCoverageLines = offering === 'individual' ? buildModeCoverageLines(sourceInfo) : [];
  const themeOverview = buildThemeOverview({ metadata, sourceInfo, offering });
  const themeDirectionLine = metadata.themeTags.length
    ? `Theme direction: ${displayTerms(metadata.themeTags.slice(0, 8)).join(', ')}.`
    : '';
  const individualShort = themeOverview;
  const individualLong = [
    themeOverview,
    ...(themeDirectionLine ? ['', themeDirectionLine] : []),
    '',
    `${sourceInfo.modeLine} Includes CSS variables, JSON tokens, Figma/Penpot files, LibreOffice palettes, previews, marketplace preview artwork, and usage notes.`,
    '',
    sourceInfo.modes.length > 1
      ? 'Use the dark, light, and pop mode folders for mode-specific implementation, the combined files for all-mode references, and the preview assets for quick QA or shop listing visuals.'
      : 'Use the mode folder for implementation, the combined files for the included-mode reference, and the preview assets for quick QA or shop listing visuals.',
  ].join('\n');
  const bundleShort = `${productTitle} includes nested Theme Pack ZIPs and root preview assets for comparing the included palettes.`;
  const bundleLong = [
    `${productTitle} includes multiple Apocapalette theme kits packaged as nested Theme Pack ZIP files.`,
    '',
    'Open each nested Theme Pack ZIP for that palette\'s README, mode files, CSS variables, JSON tokens, design-tool files, LibreOffice palettes, and previews. Use the root preview assets and listing docs to compare the included palettes while preparing your product page.',
  ].join('\n');
  const miniShort = themeOverview;
  const miniLong = [
    themeOverview,
    `${productTitle} is a small starter palette for websites, blogs, digital product concepts, and simple brand direction.`,
    '',
    'This mini/freebie package includes lightweight CSS variables, a five-color JSON reference, and preview artwork. It is smaller than a full Theme Pack and does not include full token, Figma/Penpot, or LibreOffice files.',
  ].join('\n');
  const fallbackLong = offering === 'mini'
    ? miniLong
    : offering === 'bundle'
      ? bundleLong
      : individualLong;
  const suppliedLong = String(product.longDescription || '').trim();
  const suppliedLongAddendum = offering === 'mini'
    ? [
      `${productTitle} is a small starter palette for websites, blogs, digital product concepts, and simple brand direction.`,
      'This mini/freebie package includes lightweight CSS variables, a five-color JSON reference, and preview artwork. It is smaller than a full Theme Pack and does not include full token, Figma/Penpot, or LibreOffice files.',
    ]
    : offering === 'bundle'
      ? [
        `${productTitle} includes multiple Apocapalette theme kits packaged as nested Theme Pack ZIP files.`,
        'Open each nested Theme Pack ZIP for that palette\'s README, mode files, CSS variables, JSON tokens, design-tool files, LibreOffice palettes, and previews.',
      ]
      : [
        `${sourceInfo.modeLine} Includes CSS variables, JSON tokens, Figma/Penpot files, LibreOffice palettes, previews, marketplace preview artwork, and usage notes.`,
        sourceInfo.modes.length > 1
          ? 'Use the dark, light, and pop mode folders for mode-specific implementation, the combined files for all-mode references, and the preview assets for quick QA or shop listing visuals.'
          : 'Use the mode folder for implementation, the combined files for the included-mode reference, and the preview assets for quick QA or shop listing visuals.',
      ];
  const longDescription = product.longDescription
    ? [
      suppliedLong,
      ...(themeDirectionLine ? ['', themeDirectionLine] : []),
      '',
      ...suppliedLongAddendum,
    ].join('\n')
    : fallbackLong;
  const shortDescription = product.shortDescription
    || (offering === 'mini' ? miniShort : offering === 'bundle' ? bundleShort : individualShort);
  const titleVariants = [
    `${baseName} Digital Color Palette`,
    ...(offering === 'individual' ? [`${baseName} Website Color Kit`] : []),
    ...(offering === 'bundle' ? [`${baseName} Brand Palette Bundle`] : []),
    ...(offering === 'mini' ? [`${baseName} Starter Website Palette`] : []),
  ];
  const suggestedTags = buildListingTags(product, offering, themes);
  const includedLines = buildListingIncludedLines({ offering, themes, sourceInfo });
  const suggestedUses = buildSuggestedUses(offering, metadata);
  const compatibilityLines = buildListingCompatibilityLines(offering);

  return [
    `# ${productTitle}`,
    '',
    '## Suggested Listing Title',
    '',
    productTitle,
    '',
    'Optional title variants:',
    ...titleVariants.map((variant) => `- ${variant}`),
    '',
    '## Short Description',
    '',
    shortDescription,
    '',
    '## Long Description',
    '',
    longDescription,
    ...(modeCoverageLines.length ? [
      '',
      '## Mode Structure',
      '',
      ...modeCoverageLines.map((line) => `- ${line}`),
    ] : []),
    '',
    '## What\'s Included',
    '',
    ...includedLines,
    '',
    '## Suggested Uses',
    '',
    ...suggestedUses,
    '',
    '## Compatibility / File Types',
    '',
    ...compatibilityLines,
    '',
    '## Suggested Tags',
    '',
    ...suggestedTags.map((tag) => `- ${tag}`),
    '',
    '## Suggested Image Alt Text',
    '',
    ...buildListingAltTextLines(baseName, offering),
    '',
    '## Buyer Note / Accessibility Note',
    '',
    ACCESSIBILITY_USAGE_NOTE,
    '',
    ...buildMarketplaceDraftLines({
      baseName,
      productTitle,
      productType,
      offering,
      shortDescription,
      suggestedTags,
      includedLines,
      suggestedUses,
      compatibilityLines,
      modeCoverageLines,
      sourceInfo,
    }),
    '',
    '## Suggested Price',
    '',
    product.price ? `Suggested price: ${product.price}` : 'Suggested price: set for your shop before listing.',
    '',
    '## Product Type',
    '',
    productType,
  ].join('\n');
};

const buildTags = ({ product, offering, themes }) => {
  const metadata = getProductCopyMetadata({ product, offering, themes });
  const baseTags = metadata.productTags;
  const modeTags = buildModeTags(offering, themes);
  const fullKitTags = offering === 'mini'
    ? []
    : [
      'figma tokens',
      'penpot tokens',
      'libreoffice palette',
    ];
  const tags = [
    ...baseTags,
    ...metadata.themeTags,
    ...metadata.useCaseTags,
    'website color kit',
    'brand color kit',
    'adaptive color system',
    ...modeTags,
    'design tokens',
    'css variables',
    ...fullKitTags,
    'web design palette',
    'brand kit',
  ];
  return `${Array.from(new Set(tags)).join('\n')}\n`;
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

const getThemeSwatches = (theme = {}, fallbackPalette = {}) => {
  const currentTheme = theme.currentTheme || theme;
  const tokens = currentTheme.tokens || theme.tokens || {};
  const brand = tokens.brand || {};
  const surfaces = tokens.surfaces || {};
  const cards = tokens.cards || {};
  const typography = tokens.typography || {};
  const foundation = tokens.foundation?.neutrals || {};
  return [
    brand.primary || fallbackPalette.primary || theme.baseColor || currentTheme.baseColor,
    brand.secondary || fallbackPalette.accent,
    brand.accent || fallbackPalette.accent,
    surfaces.background || fallbackPalette.background,
    cards['card-panel-surface'] || surfaces.surface || fallbackPalette.surface,
    typography['text-body'] || typography['text-strong'] || fallbackPalette.text,
    foundation['neutral-4'],
    foundation['neutral-7'],
  ].filter(Boolean).slice(0, 8).map((color) => normalizeHex(color));
};

const buildCoverSwatches = (swatches, y = 820) => swatches.slice(0, 6).map((color, index) => {
  const x = 150 + index * 150;
  return `<g>
    <rect x="${x}" y="${y}" width="118" height="118" rx="26" fill="${color}" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>
    <text x="${x + 59}" y="${y + 152}" fill="#ffffff" fill-opacity="0.82" font-family="Inter, system-ui" font-size="18" font-weight="800" text-anchor="middle">${color.toUpperCase()}</text>
  </g>`;
}).join('\n');

const buildMarketplaceCoverSvg = ({ product, offering, themes }) => {
  const { baseName, productType, productTitle } = getProductTitleMetadata({ product, offering, themes });
  const primaryTheme = themes[0] || {};
  const sourceInfo = getThemeExportSourceInfo(primaryTheme);
  const miniPalette = offering === 'mini' ? (product.miniPalette || deriveMiniPalette(primaryTheme)) : null;
  const swatches = offering === 'mini'
    ? Object.values(miniPalette).map((color) => normalizeHex(color))
    : getThemeSwatches(primaryTheme);
  const primary = swatches[0] || '#6366f1';
  const secondary = swatches[1] || '#8b5cf6';
  const accent = swatches[2] || '#22d3ee';
  const packageType = productType;
  const detailLine = offering === 'mini'
    ? 'CSS • JSON • Preview'
    : offering === 'bundle'
      ? 'Nested Theme Pack ZIPs'
      : 'CSS • JSON • Figma • Penpot • LibreOffice';
  const supportLine = offering === 'mini'
    ? 'Lightweight starter palette'
    : offering === 'bundle'
      ? `${themes.length} included kit${themes.length === 1 ? '' : 's'}`
      : `Included modes: ${sourceInfo.modes.map(modeLabel).join(' • ') || 'Current'}`;
  const themeNames = themes.map((theme) => themeLabel(theme)).slice(0, 4);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="marketplace-cover-title marketplace-cover-desc">
  <title id="marketplace-cover-title">${escapeXml(productTitle)} marketplace cover</title>
  <desc id="marketplace-cover-desc">Marketplace cover for ${escapeXml(baseName)}, a ${escapeXml(packageType)} with ${escapeXml(detailLine)}.</desc>
  <defs>
    <linearGradient id="marketplaceCoverBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="55%" stop-color="${secondary}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <filter id="marketplaceCoverShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#marketplaceCoverBg)"/>
  <rect x="72" y="72" width="1056" height="1056" rx="56" fill="#101827" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" filter="url(#marketplaceCoverShadow)"/>
  <text x="132" y="180" fill="#ffffff" fill-opacity="0.78" font-family="Inter, system-ui" font-size="26" font-weight="900" letter-spacing="3">APOCAPALETTE</text>
  <text x="132" y="285" fill="#ffffff" font-family="Inter, system-ui" font-size="76" font-weight="950">${escapeXml(baseName)}</text>
  <text x="136" y="356" fill="#ffffff" fill-opacity="0.88" font-family="Inter, system-ui" font-size="34" font-weight="850">${escapeXml(packageType)}</text>
  <rect x="132" y="430" width="936" height="156" rx="34" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
  <text x="172" y="494" fill="#ffffff" font-family="Inter, system-ui" font-size="30" font-weight="900">${escapeXml(detailLine)}</text>
  <text x="172" y="548" fill="#ffffff" fill-opacity="0.76" font-family="Inter, system-ui" font-size="24" font-weight="750">${escapeXml(supportLine)}</text>
  ${offering === 'bundle' && themeNames.length ? `<text x="132" y="675" fill="#ffffff" fill-opacity="0.86" font-family="Inter, system-ui" font-size="24" font-weight="850">${escapeXml(themeNames.join(' • '))}</text>` : ''}
  ${buildCoverSwatches(swatches)}
  <text x="600" y="1102" fill="#ffffff" fill-opacity="0.72" font-family="Inter, system-ui" font-size="22" font-weight="800" text-anchor="middle">Digital download • Preview assets • Buyer docs</text>
</svg>`;
};

const buildBundleComparisonSvg = ({ product, themes }) => {
  const { productTitle } = getProductTitleMetadata({ product, offering: 'bundle', themes });
  const displayedThemes = themes.slice(0, 6);
  const extraCount = Math.max(0, themes.length - displayedThemes.length);
  const rows = displayedThemes.map((theme, index) => {
    const y = 224 + index * 98;
    const swatches = getThemeSwatches(theme).slice(0, 6);
    const swatchRects = swatches.map((color, swatchIndex) => {
      const x = 560 + swatchIndex * 126;
      return `<rect x="${x}" y="${y}" width="96" height="56" rx="16" fill="${color}" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1"/>`;
    }).join('\n');
    const info = getThemeExportSourceInfo(theme);
    return `<g>
      <rect x="96" y="${y - 24}" width="1408" height="86" rx="26" fill="#ffffff" fill-opacity="${index % 2 === 0 ? '0.09' : '0.055'}" stroke="#ffffff" stroke-opacity="0.1"/>
      <text x="136" y="${y + 13}" fill="#ffffff" font-family="Inter, system-ui" font-size="28" font-weight="900">${escapeXml(themeLabel(theme))}</text>
      <text x="138" y="${y + 45}" fill="#ffffff" fill-opacity="0.68" font-family="Inter, system-ui" font-size="18" font-weight="750">${escapeXml(info.modes.map(modeLabel).join(' • ') || 'Current mode')}</text>
      ${swatchRects}
    </g>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bundle-comparison-title bundle-comparison-desc">
  <title id="bundle-comparison-title">${escapeXml(productTitle)} bundle comparison</title>
  <desc id="bundle-comparison-desc">Bundle Comparison preview for ${escapeXml(productTitle)}, showing included theme names and compact swatch rows.</desc>
  <defs>
    <linearGradient id="bundleComparisonBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="50%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bundleComparisonBg)"/>
  <text x="96" y="104" fill="#ffffff" fill-opacity="0.72" font-family="Inter, system-ui" font-size="22" font-weight="900" letter-spacing="3">MULTI-KIT BUNDLE</text>
  <text x="96" y="168" fill="#ffffff" font-family="Inter, system-ui" font-size="58" font-weight="950">${escapeXml(productTitle)}</text>
  <text x="98" y="208" fill="#ffffff" fill-opacity="0.72" font-family="Inter, system-ui" font-size="22" font-weight="800">Bundle Comparison • Nested Theme Pack ZIPs • ${themes.length} included kit${themes.length === 1 ? '' : 's'}</text>
  ${rows}
  ${extraCount ? `<text x="136" y="846" fill="#ffffff" fill-opacity="0.74" font-family="Inter, system-ui" font-size="24" font-weight="850">+ ${extraCount} more included kit${extraCount === 1 ? '' : 's'} in this bundle</text>` : ''}
</svg>`;
};

const addMarketplacePreviewAssets = (root, { product, themes, offering }) => {
  const previewFolder = root.folder('marketplace-preview');
  previewFolder?.file('marketplace-cover.svg', buildMarketplaceCoverSvg({ product, offering, themes }));
  if (offering === 'bundle') {
    previewFolder?.file('bundle-comparison.svg', buildBundleComparisonSvg({ product, themes }));
  }
};

const addProductDocs = (root, { product, themes, offering }) => {
  root.file('README.md', buildReadme({ product, themes, offering }));
  root.file('USAGE.txt', buildUsage({ product, themes, offering }));
  root.file('LICENSE.txt', buildLicense({ product, themes, offering }));
  root.file('SUPPORT.txt', buildSupport({ product, themes, offering }));
  root.file('shop-listing.md', buildShopListing({ product, offering, themes }));
  root.file('tags.txt', buildTags({ product, offering, themes }));
  addMarketplacePreviewAssets(root, { product, themes, offering });
};

const addThemePreviewAssets = (root, theme, options = {}) => {
  const prefix = options.prefix || '';
  root.folder('preview')?.file(`${prefix}palette-card.svg`, buildPaletteCardSvg(theme.currentTheme || theme));
  root.folder('preview')?.file(`${prefix}swatch-strip.svg`, buildStripSvg(theme.currentTheme || theme));
};

const addThemePackZip = async (root, theme) => {
  const { blob, filename } = await buildAllModeThemePackArchive(theme);
  const data = typeof blob?.arrayBuffer === 'function' ? await blob.arrayBuffer() : blob;
  root.file(filename, data);
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
    await addAllModeThemePackFiles(root, theme, { slug, readmePath: 'theme-pack-README.md' });
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
