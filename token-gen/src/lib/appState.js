import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  normalizeHex,
} from './colorUtils.js';
import { orderedSwatchSpec } from './tokens.js';
import { nestTokens } from './theme/paths.js';
import { canExport } from './capabilities.js';

export const STORAGE_KEYS = {
  current: 'token-gen/current-palette',
  saved: 'token-gen/saved-palettes',
};

const BASE_STAGE_DEFS = [
  { id: 'identity', label: 'Create' },
  { id: 'build', label: 'Refine' },
  { id: 'validate', label: 'Review' },
];
const privatePrintTab = ['Print', 'assets'].join(' ');
const privateExportLabel = ['Ex', 'port'].join('');
const privateExportsTab = ['Ex', 'ports'].join('');

export const STAGE_DEFS = canExport
  ? [
    ...BASE_STAGE_DEFS,
    { id: 'package', label: 'Package', tab: privatePrintTab },
    { id: 'export', label: privateExportLabel, tab: privateExportsTab },
  ]
  : BASE_STAGE_DEFS;

export const PRESETS = [
  { name: 'Midnight Indigo', base: '#6366f1', mode: 'Monochromatic', dark: true },
  { name: 'Beef Ritual', base: '#7b241c', mode: 'Monochromatic', dark: true },
  { name: 'Solar Flare', base: '#f59e0b', mode: 'Analogous', dark: false },
  { name: 'Terracotta Sunrise', base: '#e2725b', mode: 'Analogous', dark: false },
  { name: 'Vapor Dream', base: '#ff8b94', mode: 'Tertiary', dark: false },
  { name: 'Nuclear Winter', base: '#a7f432', mode: 'Apocalypse', dark: true },
  { name: 'Corporate Compliance', base: '#000000', mode: 'Monochromatic', dark: true },
];

export const clampValue = (val, min, max) => Math.min(max, Math.max(min, Number(val)));

export const adjustHexLuminance = (hex, delta) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clampValue(l + delta, 2, 98));
};

export const sanitizeHexInput = (value, fallback = null) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) return fallback;
  let hex = match[1].toLowerCase();
  if (hex.length === 8) hex = hex.slice(0, 6);
  return `#${hex}`;
};

export const sanitizeThemeName = (value, fallback = '') => {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean || fallback;
};

export const sanitizePrefix = (value) => {
  if (typeof value !== "string") return '';
  return value.replace(/[^a-z0-9_.-]/gi, '').slice(0, 32);
};

export const getPrintTimestamps = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return { date, dateTime: `${date} ${time}` };
};

export const THEME_PACK_GUIDANCE = {
  Monochromatic: {
    best: 'Calm product UI, editorial systems',
    not: 'High-energy multi-brand palettes',
  },
  Analogous: {
    best: 'Warm storytelling, immersive UI',
    not: 'Strictly neutral enterprise systems',
  },
  Complementary: {
    best: 'Bold CTA contrast, marketing',
    not: 'Subtle, low-contrast brands',
  },
  Tertiary: {
    best: 'Playful multi-accent products',
    not: 'Minimal single-accent systems',
  },
  Apocalypse: {
    best: 'Experimental visuals, game UI',
    not: 'Conservative enterprise apps',
  },
};

export const getThemePackGuidance = (modeValue) => (
  THEME_PACK_GUIDANCE[modeValue] ?? {
    best: 'Product UI and brand systems',
    not: 'Single-use experiments',
  }
);

const TOKEN_VAR_MAP = new Map(
  orderedSwatchSpec.reduce((acc, { path, fallbackPath }) => {
    const key = path.replace(/\./g, '-');
    if (!acc.has(key)) acc.set(key, path);
    if (fallbackPath) {
      const fallbackKey = fallbackPath.replace(/\./g, '-');
      if (!acc.has(fallbackKey)) acc.set(fallbackKey, fallbackPath);
    }
    return acc;
  }, new Map())
);

export const parseCssVariables = (cssText) => {
  const vars = new Map();
  if (typeof cssText !== "string") return vars;
  const pattern = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
  let match = null;
  while ((match = pattern.exec(cssText)) !== null) {
    vars.set(match[1].trim(), match[2].trim());
  }
  return vars;
};

export const resolveCssVar = (varName) => {
  let bestKey = null;
  let bestPath = null;
  TOKEN_VAR_MAP.forEach((path, key) => {
    if (varName === key || varName.endsWith(`-${key}`)) {
      if (!bestKey || key.length > bestKey.length) {
        bestKey = key;
        bestPath = path;
      }
    }
  });
  if (!bestKey) return null;
  const rawPrefix = varName.slice(0, varName.length - bestKey.length);
  const prefix = rawPrefix.endsWith('-') ? rawPrefix.slice(0, -1) : rawPrefix;
  return { path: bestPath, prefix: prefix || '' };
};

export const buildOverridesFromCss = (cssText) => {
  const vars = parseCssVariables(cssText);
  const overrides = {};
  const prefixCounts = new Map();
  vars.forEach((value, name) => {
    const resolved = resolveCssVar(name);
    if (!resolved) return;
    overrides[resolved.path] = value;
    if (resolved.prefix) {
      prefixCounts.set(resolved.prefix, (prefixCounts.get(resolved.prefix) ?? 0) + 1);
    }
  });
  let detectedPrefix = '';
  let highest = 0;
  prefixCounts.forEach((count, prefix) => {
    if (count > highest) {
      highest = count;
      detectedPrefix = prefix;
    }
  });
  return { overrides, prefix: detectedPrefix };
};

export const inferThemeMode = (value) => {
  if (typeof value !== "string") return null;
  const clean = normalizeHex(value, '');
  if (!clean) return null;
  const { r, g, b } = hexToRgb(clean);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma < 0.45 ? 'dark' : 'light';
};

const SAVED_VARIANT_MODES = ['light', 'dark', 'pop'];
const MODE_LABELS = {
  light: 'Light',
  dark: 'Dark',
  pop: 'Pop',
};

const formatModeList = (modes = []) => (
  modes
    .map((mode) => MODE_LABELS[mode] || mode)
    .filter(Boolean)
    .join(', ')
);

const formatSentenceModeList = (modes = []) => {
  const labels = modes.map((mode) => MODE_LABELS[mode] || mode).filter(Boolean);
  if (labels.length <= 2) return labels.join(' and ');
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export const summarizeConfirmedVariants = (confirmedVariants = {}) => {
  const availableModes = SAVED_VARIANT_MODES.filter((mode) => {
    const variant = confirmedVariants?.[mode];
    return variant?.finalTokens && typeof variant.finalTokens === 'object';
  });
  return {
    variantCoverage: availableModes.length === SAVED_VARIANT_MODES.length ? 'all-modes' : 'available-modes',
    availableModes,
    missingModes: SAVED_VARIANT_MODES.filter((mode) => !availableModes.includes(mode)),
  };
};

export const buildThemePackExportCopy = ({
  availableModes = [],
  missingModes = SAVED_VARIANT_MODES,
  variantCoverage,
} = {}) => {
  const safeAvailableModes = SAVED_VARIANT_MODES.filter((mode) => availableModes.includes(mode));
  const safeMissingModes = SAVED_VARIANT_MODES.filter((mode) => missingModes.includes(mode));
  const isFullFamily = safeAvailableModes.length === SAVED_VARIANT_MODES.length || variantCoverage === 'all-modes';
  const isCurrentModeOnly = !isFullFamily && safeAvailableModes.length <= 1;
  const isPartialFamily = !isFullFamily && safeAvailableModes.length > 1;
  const includedModes = formatModeList(safeAvailableModes) || 'Current mode';
  const includedSentenceModes = formatSentenceModeList(safeAvailableModes) || 'Current mode';
  const missingModesText = formatModeList(safeMissingModes);
  const missingSentenceModes = formatSentenceModeList(safeMissingModes);

  return {
    exportButtonLabel: isFullFamily
      ? 'Download Full Theme Pack'
      : isPartialFamily
        ? 'Download Confirmed Modes Theme Pack'
        : 'Download Current Mode Theme Pack',
    includedModesLabel: `Included in this ZIP: ${includedModes}`,
    missingModesLabel: safeMissingModes.length ? `Missing modes: ${missingModesText}` : 'Missing modes: none',
    successMessage: isFullFamily
      ? `Full Theme Pack exported. Included: ${includedSentenceModes}.`
      : safeMissingModes.length
        ? `Theme Pack exported. Included: ${includedSentenceModes}. Missing: ${missingSentenceModes}.`
        : `Theme Pack exported. Included: ${includedSentenceModes}.`,
    coverageLabel: isFullFamily
      ? 'Full Light/Dark/Pop family'
      : isPartialFamily
        ? 'Partial confirmed family'
        : 'Current mode only',
    isFullFamily,
    isCurrentModeOnly,
    isPartialFamily,
  };
};

export const buildThemePackSelectionCopy = ({
  availableModes = [],
  missingModes = SAVED_VARIANT_MODES,
} = {}, selectedModes = availableModes) => {
  const safeAvailableModes = SAVED_VARIANT_MODES.filter((mode) => availableModes.includes(mode));
  const safeSelectedModes = safeAvailableModes.filter((mode) => selectedModes.includes(mode));
  const safeMissingModes = SAVED_VARIANT_MODES.filter((mode) => missingModes.includes(mode));
  const omittedModes = safeAvailableModes.filter((mode) => !safeSelectedModes.includes(mode));
  const includedModesText = formatModeList(safeSelectedModes) || 'None';
  const includedSentenceModes = formatSentenceModeList(safeSelectedModes);
  const missingModesText = formatModeList(safeMissingModes);
  const missingSentenceModes = formatSentenceModeList(safeMissingModes);
  const omittedModesText = formatModeList(omittedModes);
  const allExportableSelected = safeSelectedModes.length === safeAvailableModes.length;
  const defaultCopy = buildThemePackExportCopy({
    availableModes: safeAvailableModes,
    missingModes: safeMissingModes,
  });

  return {
    selectedModes: safeSelectedModes,
    omittedModes,
    canExportSelection: safeSelectedModes.length > 0,
    exportButtonLabel: allExportableSelected
      ? defaultCopy.exportButtonLabel
      : safeSelectedModes.length > 1
        ? 'Download Selected Modes Theme Pack'
        : 'Download Selected Mode Theme Pack',
    includedModesLabel: `Included in this ZIP: ${includedModesText}`,
    missingModesLabel: safeMissingModes.length ? `Missing modes: ${missingModesText}` : 'Missing modes: none',
    omittedModesLabel: omittedModes.length ? `Omitted from this ZIP: ${omittedModesText}` : '',
    successMessage: allExportableSelected
      ? defaultCopy.successMessage
      : safeSelectedModes.length > 0
      ? `Theme Pack exported. Included: ${includedSentenceModes}.${safeMissingModes.length ? ` Missing: ${missingSentenceModes}.` : ''}${omittedModes.length ? ` Omitted: ${formatSentenceModeList(omittedModes)}.` : ''}`
      : '',
  };
};

export const normalizeConfirmedVariants = (confirmedVariants = {}) => {
  if (!confirmedVariants || typeof confirmedVariants !== 'object' || Array.isArray(confirmedVariants)) return {};
  return SAVED_VARIANT_MODES.reduce((acc, mode) => {
    const variant = confirmedVariants[mode];
    const finalTokens = variant?.finalTokens || variant?.tokens || variant?.currentTheme?.tokens;
    if (!finalTokens || typeof finalTokens !== 'object' || Array.isArray(finalTokens)) return acc;
    acc[mode] = {
      signature: typeof variant.signature === 'string' ? variant.signature : `${mode}-saved`,
      finalTokens,
      ...(Array.isArray(variant.orderedStack) ? { orderedStack: variant.orderedStack } : {}),
      ...(variant.currentTheme && typeof variant.currentTheme === 'object' ? { currentTheme: variant.currentTheme } : {}),
    };
    return acc;
  }, {});
};

export const normalizeImportedPalette = (palette, index) => {
  if (!palette || typeof palette !== 'object') return null;
  const base = sanitizeHexInput(palette.baseColor, null);
  const modeName = typeof palette.mode === 'string' ? palette.mode : '';
  if (!base || !modeName) return null;
  const theme = ['light', 'dark', 'pop'].includes(palette.themeMode)
    ? palette.themeMode
    : (palette.isDark ? 'dark' : 'light');
  const confirmedVariants = normalizeConfirmedVariants(palette.confirmedVariants);
  const variantMeta = summarizeConfirmedVariants(confirmedVariants);
  return {
    id: Number.isFinite(palette.id) ? palette.id : Date.now() + index,
    name: sanitizeThemeName(palette.name || `Imported ${index + 1}`, `Imported ${index + 1}`),
    baseColor: base,
    mode: modeName,
    themeMode: theme,
    isDark: theme === 'dark',
    printMode: Boolean(palette.printMode),
    customThemeName: sanitizeThemeName(palette.customThemeName || '', ''),
    harmonyIntensity: clampValue(palette.harmonyIntensity ?? 100, 50, 160),
    apocalypseIntensity: clampValue(palette.apocalypseIntensity ?? 100, 0, 200),
    neutralCurve: clampValue(palette.neutralCurve ?? 100, 60, 140),
    accentStrength: clampValue(palette.accentStrength ?? 100, 60, 140),
    popIntensity: clampValue(palette.popIntensity ?? 100, 60, 140),
    tokenPrefix: sanitizePrefix(palette.tokenPrefix || ''),
    importedOverrides: palette.importedOverrides ?? null,
    confirmedVariants,
    savedAt: typeof palette.savedAt === 'string' ? palette.savedAt : undefined,
    version: palette.version || 1,
    variantCoverage: palette.variantCoverage || variantMeta.variantCoverage,
    availableModes: Array.isArray(palette.availableModes) ? palette.availableModes : variantMeta.availableModes,
    missingModes: Array.isArray(palette.missingModes) ? palette.missingModes : variantMeta.missingModes,
  };
};

export const buildPrintTokenTree = (printTokenSet) => {
  if (!printTokenSet || typeof printTokenSet !== 'object') return null;
  const root = {};
  Object.entries(printTokenSet).forEach(([key, token]) => {
    if (!key) return;
    if (key === 'description' || key.startsWith('meta/')) return;
    const tokenValue = token && typeof token === 'object' && 'value' in token ? token.value : token;
    if (tokenValue == null) return;
    const segments = String(key).split('/').map((segment) => segment.trim()).filter(Boolean);
    if (!segments.length) return;
    const payload = token && typeof token === 'object' && 'type' in token && 'value' in token
      ? token
      : tokenValue;
    nestTokens(root, segments, payload);
  });
  return Object.keys(root).length ? root : null;
};
