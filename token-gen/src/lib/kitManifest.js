import { KITS } from '../data/kits.js';

export const KIT_FORMATS = ['ase', 'swatches', 'gpl', 'css', 'json'];
export const KIT_MODES = ['light', 'dark', 'pop'];

const asPositiveInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

const countValues = (value) => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return asPositiveInteger(value);
};

const countTints = (palette = {}) => {
  if (Number.isFinite(Number(palette.tintsPerColor))) {
    return asPositiveInteger(palette.tintsPerColor);
  }

  const tints = palette.tints;
  if (Array.isArray(tints)) return tints.length;
  if (tints && typeof tints === 'object') {
    const counts = Object.values(tints)
      .map((value) => countValues(value))
      .filter((value) => value > 0);
    if (counts.length > 0) return Math.min(...counts);
  }

  return 0;
};

const countCoreColors = (palette = {}) => {
  if (Array.isArray(palette.coreColors)) return palette.coreColors.length;
  if (Number.isFinite(Number(palette.coreColors))) return asPositiveInteger(palette.coreColors);
  if (Array.isArray(palette.colors)) return palette.colors.length;
  if (palette.colors && typeof palette.colors === 'object') return Object.keys(palette.colors).length;
  return 0;
};

const countSemanticTokens = (palette = {}, options = {}) => {
  if (Number.isFinite(Number(options.semanticTokenCount))) {
    return asPositiveInteger(options.semanticTokenCount);
  }
  if (Number.isFinite(Number(palette.semanticTokenCount))) {
    return asPositiveInteger(palette.semanticTokenCount);
  }
  return countValues(palette.semanticTokens);
};

export const derivePaletteMetrics = (palette = {}, options = {}) => {
  const coreColors = asPositiveInteger(options.coreColors, countCoreColors(palette));
  const tintsPerColor = asPositiveInteger(options.tintsPerColor, countTints(palette));
  const semanticTokenCount = countSemanticTokens(palette, options);

  return {
    coreColors,
    tintsPerColor,
    semanticTokenCount,
    totalTokens: (coreColors * tintsPerColor) + semanticTokenCount,
  };
};

const slugify = (value) => String(value || 'untitled-kit')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'untitled-kit';

const normalizeArtifactNumber = (value) => String(value ?? '').trim().padStart(4, '0');

export const buildKitManifestEntry = (palette = {}, options = {}) => {
  const name = String(options.name ?? options.displayName ?? 'Untitled Kit').trim() || 'Untitled Kit';
  const metrics = derivePaletteMetrics(palette, options);
  const price = Number.isFinite(Number(options.price)) ? Number(options.price) : 9;
  const teaserTokenCount = asPositiveInteger(options.teaserTokenCount, 12);

  return {
    id: String(options.id || slugify(name)),
    artifactNo: normalizeArtifactNumber(options.artifactNo),
    name,
    price,
    teaserTokenCount,
    totalTokens: metrics.totalTokens,
    coreColors: metrics.coreColors,
    tintsPerColor: metrics.tintsPerColor,
    formats: [...KIT_FORMATS],
    includesContrastMatrix: true,
    modes: [...KIT_MODES],
  };
};

export const getNextArtifactNumber = (kits = KITS) => {
  const highest = kits.reduce((max, kit) => {
    const value = Number.parseInt(kit?.artifactNo, 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return String(highest + 1).padStart(4, '0');
};

export const isArtifactNumberUnique = (value, kits = KITS) => {
  const normalized = normalizeArtifactNumber(value);
  return !kits.some((kit) => normalizeArtifactNumber(kit?.artifactNo) === normalized);
};

export const validateArtifactNumber = (value, kits = KITS) => {
  const normalized = normalizeArtifactNumber(value);
  if (!/^\d{4}$/.test(normalized)) {
    return { valid: false, value: normalized, message: 'Use a four-digit artifact number.' };
  }
  if (!isArtifactNumberUnique(normalized, kits)) {
    return { valid: false, value: normalized, message: 'That artifact number is already in the collection.' };
  }
  return { valid: true, value: normalized, message: '' };
};

const quoteJs = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export const formatKitManifestEntry = (entry) => `{
  id: ${quoteJs(entry.id)},
  artifactNo: ${quoteJs(entry.artifactNo)},
  name: ${quoteJs(entry.name)},
  price: ${entry.price},
  teaserTokenCount: ${entry.teaserTokenCount},
  totalTokens: ${entry.totalTokens},
  coreColors: ${entry.coreColors},
  tintsPerColor: ${entry.tintsPerColor},
  formats: [${entry.formats.map(quoteJs).join(', ')}],
  includesContrastMatrix: ${entry.includesContrastMatrix},
  modes: [${entry.modes.map(quoteJs).join(', ')}],
}`;
