const COLOR_REGEX = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(|hsla?\()/i;
const DIMENSION_REGEX = /(px|rem|em|vh|vw|%)$/i;

const normalizeKey = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const isColorLike = (type, value) => {
  if (type === 'color') return true;
  if (typeof value !== 'string') return false;
  return COLOR_REGEX.test(value.trim());
};

const isDimensionLike = (type, value) => {
  if (type === 'dimension') return true;
  if (typeof value !== 'string') return false;
  return DIMENSION_REGEX.test(value.trim());
};

const isOpacityLike = (type, value) => {
  if (type === 'opacity') return true;
  if (typeof value === 'number') return value >= 0 && value <= 1;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
  }
  return false;
};

const assignNested = (root, segments, value) => {
  let node = root;
  segments.forEach((segment, index) => {
    if (!segment) return;
    if (index === segments.length - 1) {
      node[segment] = value;
      return;
    }
    if (!node[segment] || typeof node[segment] !== 'object' || Array.isArray(node[segment])) {
      node[segment] = {};
    }
    node = node[segment];
  });
};

export const toPenpotTokens = (themeObj = {}) => {
  if (!themeObj || typeof themeObj !== 'object') return {};
  const output = {};

  Object.entries(themeObj).forEach(([groupName, groupTokens]) => {
    const groupKey = String(groupName || '').toLowerCase();
    if (groupKey === 'meta' || groupKey === 'handoff') return;
    if (!groupTokens || typeof groupTokens !== 'object' || Array.isArray(groupTokens)) return;

    const groupOutput = {};
    Object.entries(groupTokens).forEach(([tokenName, token]) => {
      const isTokenObject = token && typeof token === 'object' && !Array.isArray(token);
      const tokenType = isTokenObject && 'type' in token ? token.type : null;
      const tokenValue = isTokenObject && 'value' in token ? token.value : token;
      if (tokenValue == null) return;

      const normalizedName = normalizeKey(tokenName);
      if (groupKey === 'aliases' && !isColorLike(tokenType, tokenValue)) return;
      if (groupKey === 'glass') {
        const allowedGlass = isColorLike(tokenType, tokenValue)
          || (normalizedName === 'glassblur' && isDimensionLike(tokenType, tokenValue))
          || (normalizedName === 'glassnoiseopacity' && isOpacityLike(tokenType, tokenValue));
        if (!allowedGlass) return;
      }

      const segments = String(tokenName).split('.').map((segment) => segment.trim()).filter(Boolean);
      if (!segments.length) return;
      assignNested(groupOutput, segments, tokenValue);
    });

    if (Object.keys(groupOutput).length) {
      output[groupName] = groupOutput;
    }
  });

  return output;
};
