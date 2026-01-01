import { flattenTokens, nestTokens } from './theme/paths.js';

// Token payload builders for downstream tools.
const getPenpotType = (name, value) => {
  if (typeof value === 'number') return 'number';
  const val = String(value);
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val) || /^rgba?\(/i.test(val) || /^hsla?\(/i.test(val)) return 'color';
  if (/shadow/i.test(name)) return 'string';
  if (/(px|rem|em|vh|vw|%)$/i.test(val)) return 'dimension';
  if (/opacity/i.test(name)) return 'opacity';
  return 'string';
};

const clean = (segment) => {
  const stripped = segment.replace(/[^a-zA-Z0-9]+/g, '');
  return stripped || 'token';
};

export const buildWitchcraftPayload = (tokens, themeName, mode, isDark) => {
  const slug = themeName.toLowerCase().replace(/\s+/g, '-');
  const settings = {
    primary: tokens.brand.primary,
    accent: tokens.brand.accent,
    background: tokens.surfaces.background,
    textPrimary: tokens.textPalette['text-primary'],
    textHeading: tokens.typography.heading,
    textMuted: tokens.typography['text-muted'],
    fontSerif: 'Literata',
    fontScript: 'Parisienne',
  };

  return {
    label: themeName,
    slug,
    mode: isDark ? 'midnight' : 'dawn',
    category: 'custom',
    settings,
  };
};

export const buildPenpotPayload = (tokens, orderedHandoff = [], meta = null, options = {}) => {
  const flat = flattenTokens(tokens);
  const namingRoot = options.namingPrefix ? clean(options.namingPrefix) : '';
  const payload = flat.reduce((sets, { name, value }) => {
    const [rawSet, ...rest] = name.split('/');
    const setName = clean(rawSet);
    const tokenSegments = rest.length ? rest : [rawSet];
    const tokenName = tokenSegments.map(clean).join('.');
    const prefixedName = namingRoot ? `${namingRoot}.${tokenName}` : tokenName;
    if (!sets[setName]) sets[setName] = {};
    const explicitType = value && typeof value === 'object' && 'type' in value ? value.type : null;
    const tokenValue = value && typeof value === 'object' && 'value' in value ? value.value : value;
    sets[setName][prefixedName] = { type: explicitType ?? getPenpotType(name, tokenValue), value: tokenValue };
    return sets;
  }, {});

  if (orderedHandoff.length) {
    payload.handoff = orderedHandoff.reduce((acc, item, idx) => {
      const key = `${String(idx + 1).padStart(2, '0')}-${clean(item.name)}`;
      const handoffName = namingRoot ? `${namingRoot}.${clean(item.name)}` : clean(item.name);
      acc[key] = {
        type: getPenpotType(item.name, item.value),
        value: item.value,
        name: handoffName,
        source: item.path,
      };
      return acc;
    }, {});
  }

  if (meta) {
    const metaSet = payload.meta ?? {};
    Object.entries(meta).forEach(([key, val]) => {
      metaSet[clean(key)] = { type: getPenpotType(key, val), value: val };
    });
    payload.meta = metaSet;
  }

  return payload;
};

export const buildGenericPayload = (tokens, meta = {}) => {
  const clone = JSON.parse(JSON.stringify(tokens));
  const swatches = {};
  const named = tokens.named ?? {};
  const map = [
    { from: 'color-midnight', to: 'swatch-deep' },
    { from: 'color-night', to: 'swatch-night' },
    { from: 'color-dusk', to: 'swatch-dusk' },
    { from: 'color-ink', to: 'swatch-ink' },
    { from: 'color-amethyst', to: 'swatch-accent-1' },
    { from: 'color-iris', to: 'swatch-accent-2' },
    { from: 'color-gold', to: 'swatch-accent-3' },
    { from: 'color-rune', to: 'swatch-light-1' },
    { from: 'color-fog', to: 'swatch-light-2' },
  ];
  map.forEach(({ from, to }) => {
    if (named[from]) swatches[to] = named[from];
  });

  delete clone.named;
  if (clone.dawn) {
    clone.lightOverrides = clone.dawn;
    delete clone.dawn;
  }

  return {
    ...clone,
    swatches,
    meta: {
      schema: 'generic-token-pack-v1',
      ...meta,
    },
  };
};

const buildTokensPayload = (tokens, options = {}) => {
  const prefix = options.namingPrefix ? clean(options.namingPrefix) : '';
  const root = {};
  flattenTokens(tokens).forEach(({ name, value }) => {
    const segments = name.split('/').map(clean);
    const typedValue = value && typeof value === 'object' && 'value' in value ? value.value : value;
    const type = value && typeof value === 'object' && 'type' in value ? value.type : getPenpotType(name, typedValue);
    const finalSegments = prefix ? [prefix, ...segments] : segments;
    nestTokens(root, finalSegments, { value: typedValue, type });
  });
  return root;
};

export const buildFigmaTokensPayload = (tokens, options = {}) => buildTokensPayload(tokens, options);

export const buildStyleDictionaryPayload = (tokens, options = {}) => buildTokensPayload(tokens, options);
