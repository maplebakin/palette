import { orderedSwatchSpec } from '../tokens';
import { hexToRgb, normalizeHex } from '../colorUtils';

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
  if (typeof cssText !== 'string') return vars;
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
  if (typeof value !== 'string') return null;
  const clean = normalizeHex(value, '');
  if (!clean) return null;
  const { r, g, b } = hexToRgb(clean);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma < 0.45 ? 'dark' : 'light';
};
