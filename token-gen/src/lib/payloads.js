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

const flattenTokens = (obj, prefix = []) => {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const path = [...prefix, key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('type' in val && 'value' in val) {
        return acc.concat({ name: path.join('/'), value: val });
      }
      return acc.concat(flattenTokens(val, path));
    }
    return acc.concat({ name: path.join('/'), value: val });
  }, []);
};

export const buildWitchcraftPayload = (tokens, themeName, mode, isDark) => {
  const slug = themeName.toLowerCase().replace(/\s+/g, '-');
  const settings = {
    primary: tokens.brand.primary,
    accent: tokens.brand.accent,
    background: tokens.surfaces.background,
    fontSerif: 'Literata',
    fontScript: 'Parisienne',
    textPrimary: tokens.textPalette['text-primary'],
    textHeading: tokens.typography.heading,
    textMuted: tokens.typography['text-muted'],
    fontHeading: 'Cinzel',
    fontAccent: 'Cormorant Garamond',
    colorMidnight: tokens.named['color-midnight'],
    colorNight: tokens.named['color-night'],
    colorIris: tokens.named['color-iris'],
    colorAmethyst: tokens.named['color-amethyst'],
    colorDusk: tokens.named['color-dusk'],
    colorGold: tokens.named['color-gold'],
    colorRune: tokens.named['color-rune'],
    colorFog: tokens.named['color-fog'],
    colorInk: tokens.named['color-ink'],
    surfacePlain: tokens.surfaces['surface-plain'],
    cardPanelSurface: tokens.cards['card-panel-surface'],
    cardPanelSurfaceStrong: tokens.cards['card-panel-surface-strong'],
    cardPanelBorder: tokens.cards['card-panel-border'],
    cardPanelBorderStrong: tokens.cards['card-panel-border-strong'],
    cardPanelBorderSoft: tokens.cards['card-panel-border-soft'],
    glassSurface: tokens.glass['glass-surface'],
    glassSurfaceStrong: tokens.glass['glass-surface-strong'],
    glassCard: tokens.glass['glass-surface'],
    glassHover: tokens.glass['glass-hover'],
    glassBorder: tokens.glass['glass-border'],
    glassBorderStrong: tokens.glass['glass-border-strong'],
    glassHighlight: tokens.glass['glass-highlight'],
    glassGlow: tokens.glass['glass-glow'],
    glassShadowSoft: tokens.glass['glass-shadow-soft'],
    glassShadowStrong: tokens.glass['glass-shadow-strong'],
    glassBlur: tokens.glass['glass-blur'],
    glassNoiseOpacity: tokens.glass['glass-noise-opacity'],
    textSecondary: tokens.textPalette['text-secondary'],
    textTertiary: tokens.textPalette['text-tertiary'],
    textStrong: tokens.typography['text-strong'],
    textBody: tokens.typography['text-body'],
    textSubtle: tokens.typography['text-muted'],
    textAccent: tokens.typography['text-accent'],
    textAccentStrong: tokens.typography['text-accent-strong'],
    inkBody: tokens.named['color-ink'],
    inkStrong: tokens.named['color-midnight'],
    inkMuted: tokens.named['color-dusk'],
    linkColor: tokens.brand['link-color'],
    cardBadgeBg: tokens.cards['card-tag-bg'],
    cardBadgeBorder: tokens.cards['card-tag-border'],
    cardBadgeText: tokens.cards['card-tag-text'],
    cardTagBg: tokens.cards['card-tag-bg'],
    cardTagBorder: tokens.cards['card-tag-border'],
    cardTagText: tokens.cards['card-tag-text'],
    focusRingColor: tokens.brand['focus-ring'],
    cardFocusOutline: tokens.brand['focus-ring'],
    success: tokens.status.success,
    warning: tokens.status.warning,
    error: tokens.status.error,
    info: tokens.status.info,
    headerBackground: tokens.surfaces['header-background'],
    headerBorder: tokens.surfaces['surface-plain-border'],
    headerText: tokens.typography['text-strong'],
    headerTextHover: tokens.typography['text-accent'],
    footerBackground: tokens.cards['card-panel-surface-strong'],
    footerBorder: tokens.cards['card-panel-border'],
    footerText: tokens.typography['footer-text'],
    footerTextMuted: tokens.typography['footer-text-muted'],
  };

  return {
    label: themeName,
    slug,
    mode: isDark ? 'midnight' : 'daylight',
    category: 'custom',
    settings,
  };
};

const nestPath = (root, segments, payload) => {
  let node = root;
  segments.forEach((segment, idx) => {
    if (idx === segments.length - 1) {
      node[segment] = payload;
    } else {
      node[segment] = node[segment] || {};
      node = node[segment];
    }
  });
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

export const buildFigmaTokensPayload = (tokens, options = {}) => {
  const prefix = options.namingPrefix ? clean(options.namingPrefix) : '';
  const root = {};
  flattenTokens(tokens).forEach(({ name, value }) => {
    const segments = name.split('/').map(clean);
    const typedValue = value && typeof value === 'object' && 'value' in value ? value.value : value;
    const type = value && typeof value === 'object' && 'type' in value ? value.type : getPenpotType(name, typedValue);
    const finalSegments = prefix ? [prefix, ...segments] : segments;
    nestPath(root, finalSegments, { value: typedValue, type });
  });
  return root;
};

export const buildStyleDictionaryPayload = (tokens, options = {}) => {
  const prefix = options.namingPrefix ? clean(options.namingPrefix) : '';
  const root = {};
  flattenTokens(tokens).forEach(({ name, value }) => {
    const segments = name.split('/').map(clean);
    const typedValue = value && typeof value === 'object' && 'value' in value ? value.value : value;
    const type = value && typeof value === 'object' && 'type' in value ? value.type : getPenpotType(name, typedValue);
    const finalSegments = prefix ? [prefix, ...segments] : segments;
    nestPath(root, finalSegments, { value: typedValue, type });
  });
  return root;
};
