import { buildTheme } from '../theme/engine.js';
import { readPath } from '../theme/paths.js';
import { pickReadableText } from '../colorUtils.js';

export function generateDesignSpacePalette(seedColor, options = {}) {
  const {
    name = 'Apocapalette Theme',
    mode = 'Monochromatic',
    themeMode = 'light',
  } = options;

  const { finalTokens } = buildTheme({
    baseColor: seedColor,
    mode,
    themeMode,
  });

  const get = (path, fallback = '#888888') => readPath(finalTokens, path) ?? fallback;
  const isDark = themeMode === 'dark';

  const palette = {
    canvasBackground: isDark ? get('surfaces.background') : get('dawn.surface-base'),
    panelBackground: isDark ? get('surfaces.surface-plain') : get('dawn.surface-card'),
    surfaceBackground: isDark ? get('surfaces.page-background') : get('dawn.surface-elevated'),
    textPrimary: isDark ? get('textPalette.text-primary') : get('dawn.text-strong'),
    textSecondary: isDark ? get('textPalette.text-secondary') : get('dawn.text-body'),
    textOnBrand: get('brand.primary'),
    brandPrimary: get('brand.primary'),
    brandSecondary: get('brand.secondary'),
    brandAccent: get('brand.accent'),
    interactiveDefault: get('brand.cta'),
    interactiveHover: get('brand.cta-hover'),
    interactiveActive: get('foundation.accents.accent-ink'),
    statusSuccess: get('status.success'),
    statusWarning: get('status.warning'),
    statusError: get('status.error'),
    neutralBorder: isDark ? get('borders.border-subtle') : get('dawn.border-subtle'),
    neutralDivider: isDark ? get('cards.card-panel-border-soft') : get('dawn.border-strong'),
    neutralDisabled: get('textPalette.text-disabled'),
    neutralShadow100: get('glass.glass-shadow-soft'),
    neutralShadow200: get('glass.glass-shadow-strong'),
    name,
    mode: isDark ? 'dark' : 'light',
  };

  const lightCandidate = isDark ? get('textPalette.text-primary') : get('dawn.surface-base');
  const darkCandidate = isDark ? get('surfaces.background') : get('dawn.text-strong');
  palette.textOnBrand = pickReadableText(palette.brandPrimary, lightCandidate, darkCandidate);

  return palette;
}

export function generateDesignSpacePaletteDark(seedColor, options = {}) {
  return generateDesignSpacePalette(seedColor, { ...options, themeMode: 'dark' });
}
