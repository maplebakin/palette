import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  normalizeHex,
} from './colorUtils.js';
import { orderedSwatchSpec } from './tokens.js';
import { nestTokens } from './theme/paths.js';

export const STORAGE_KEYS = {
  current: 'token-gen/current-palette',
  saved: 'token-gen/saved-palettes',
};

export const STAGE_DEFS = [
  { id: 'identity', label: 'Identity' },
  { id: 'build', label: 'Build' },
  { id: 'validate', label: 'Validate' },
  { id: 'package', label: 'Package', tab: 'Print assets' },
  { id: 'export', label: 'Export', tab: 'Exports' },
];

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

export const normalizeImportedPalette = (palette, index) => {
  if (!palette || typeof palette !== 'object') return null;
  const base = sanitizeHexInput(palette.baseColor, null);
  const modeName = typeof palette.mode === 'string' ? palette.mode : '';
  if (!base || !modeName) return null;
  const theme = ['light', 'dark', 'pop'].includes(palette.themeMode)
    ? palette.themeMode
    : (palette.isDark ? 'dark' : 'light');
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
