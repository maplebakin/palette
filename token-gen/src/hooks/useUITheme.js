import { useMemo } from 'react';
import { useTokenStore } from '../store/useTokenStore.js';
import { usePaletteStore } from '../store/usePaletteStore.js';
import { hexWithAlpha, pickReadableText, getContrastRatio, hexToHsl } from '../lib/colorUtils.js';

/**
 * Adjusts hex luminance
 * @param {string} hex - Hex color
 * @param {number} delta - Luminance delta
 * @returns {string} Adjusted hex color
 */
const adjustHexLuminance = (hex, delta) => {
  const { h, s, l } = hexToHsl(hex);
  const clampValue = (val, min, max) => Math.min(max, Math.max(min, Number(val)));
  return hslToHex(h, s, clampValue(l + delta, 2, 98));
};

/**
 * Converts HSL to hex
 * @param {number} h - Hue
 * @param {number} s - Saturation
 * @param {number} l - Lightness
 * @returns {string} Hex color
 */
const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Computes UI theme CSS variables for app chrome
 * @returns {Object} CSS variable object and class names
 */
export const useUITheme = () => {
  const tokens = useTokenStore((state) => state.tokens);
  const themeMode = usePaletteStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';

  const uiTheme = useMemo(() => {
    if (!tokens) return {};

    const pageBackground = tokens.surfaces?.background || '#0b1021';
    const backgroundImage = [
      `radial-gradient(circle at 16% 14%, ${hexWithAlpha(tokens.brand?.primary || '#6366f1', 0.12)}, transparent 28%)`,
      `radial-gradient(circle at 82% 8%, ${hexWithAlpha(tokens.brand?.accent || tokens.brand?.secondary || tokens.brand?.primary || '#8b5cf6', 0.1)}, transparent 30%)`,
      `linear-gradient(180deg, ${hexWithAlpha(tokens.surfaces?.['background'] || '#0b1021', 0.75)} 0%, ${hexWithAlpha(pageBackground, 0.9)} 42%, ${pageBackground} 100%)`,
    ].join(', ');

    const panelBase = tokens.cards?.['card-panel-surface'] || '#1f2937';
    const panelStrong = tokens.cards?.['card-panel-surface-strong'] || panelBase;
    const panelSoft = hexWithAlpha(panelBase, isDark ? 0.72 : 0.86);
    const panelGhost = hexWithAlpha(tokens.surfaces?.['background'] || '#0b1021', isDark ? 0.82 : 0.94);
    const panelBorder = tokens.cards?.['card-panel-border'] || '#374151';
    const panelText = tokens.textPalette?.['text-secondary'] || tokens.typography?.['text-strong'] || '#f8fafc';
    const panelMuted = tokens.textPalette?.['text-tertiary'] || tokens.typography?.['text-muted'] || '#94a3b8';
    const panelTextStrong = pickReadableText(panelStrong);
    const panelMutedStrong = getContrastRatio(panelMuted, panelStrong) >= 3.2
      ? panelMuted
      : hexWithAlpha(panelTextStrong, 0.72);
    const panelTextSoft = pickReadableText(panelSoft);
    const panelMutedSoft = getContrastRatio(panelMuted, panelSoft) >= 3.2
      ? panelMuted
      : hexWithAlpha(panelTextSoft, 0.72);

    const chipMinContrast = themeMode === 'pop' ? 1.6 : 1.25;
    const panelChipBase = tokens.cards?.['card-tag-bg'] || panelBase;
    const panelChipReference = getContrastRatio(panelChipBase, panelStrong) < getContrastRatio(panelChipBase, panelBase)
      ? panelStrong
      : panelBase;
    let panelChip = panelChipBase;
    if (getContrastRatio(panelChip, panelChipReference) < chipMinContrast) {
      const referenceL = hexToHsl(panelChipReference).l;
      const delta = referenceL > 50 ? -12 : 12;
      const adjusted = adjustHexLuminance(panelChipBase, delta);
      const boosted = adjustHexLuminance(panelChipBase, delta * 2);
      if (getContrastRatio(adjusted, panelChipReference) >= chipMinContrast) {
        panelChip = adjusted;
      } else if (getContrastRatio(boosted, panelChipReference) >= chipMinContrast) {
        panelChip = boosted;
      } else {
        panelChip = pickReadableText(panelChipReference, '#111827', '#f8fafc');
      }
    }

    const panelChipTextBase = tokens.cards?.['card-tag-text'] || panelText;
    const panelChipText = getContrastRatio(panelChipTextBase, panelChip) >= 4.5
      ? panelChipTextBase
      : pickReadableText(panelChip);

    const panelChipBorderBase = tokens.cards?.['card-tag-border'] || panelBorder;
    const panelChipBorder = getContrastRatio(panelChipBorderBase, panelChip) >= chipMinContrast
      ? panelChipBorderBase
      : hexWithAlpha(panelChipText, 0.35);

    return {
      '--page-background': pageBackground,
      '--page-background-image': backgroundImage,
      '--page-background-size': '140% 140%, 120% 120%, auto',
      '--page-background-position': '0 0, 100% 0, 0 0',
      '--panel-bg': panelBase,
      '--panel-bg-soft': panelSoft,
      '--panel-bg-strong': panelStrong,
      '--panel-bg-ghost': panelGhost,
      '--panel-border': panelBorder,
      '--panel-text': panelText,
      '--panel-muted': panelMuted,
      '--panel-text-strong': panelTextStrong,
      '--panel-muted-strong': panelMutedStrong,
      '--panel-text-soft': panelTextSoft,
      '--panel-muted-soft': panelMutedSoft,
      '--panel-accent': tokens.brand?.primary || '#6366f1',
      '--panel-accent-strong': tokens.brand?.cta || tokens.brand?.primary || '#6366f1',
      '--panel-accent-text': pickReadableText(tokens.brand?.cta || tokens.brand?.primary || '#6366f1'),
      '--panel-chip-bg': panelChip,
      '--panel-chip-border': panelChipBorder,
      '--panel-chip-text': panelChipText,
      '--panel-shadow': `0 22px 60px -48px ${hexWithAlpha(tokens.brand?.primary || '#6366f1', 0.45)}`,
      '--status-success': tokens.status?.success || '#10b981',
      '--status-success-text': pickReadableText(tokens.status?.success || '#10b981'),
      '--status-success-border': hexWithAlpha(tokens.status?.success || '#10b981', 0.45),
      '--status-warning': tokens.status?.warning || '#f59e0b',
      '--status-warning-text': pickReadableText(tokens.status?.warning || '#f59e0b'),
      '--status-warning-border': hexWithAlpha(tokens.status?.warning || '#f59e0b', 0.45),
      '--status-error': tokens.status?.error || '#ef4444',
      '--status-error-text': pickReadableText(tokens.status?.error || '#ef4444'),
      '--status-error-border': hexWithAlpha(tokens.status?.error || '#ef4444', 0.45),
      '--status-info': tokens.status?.info || '#3b82f6',
      '--status-info-text': pickReadableText(tokens.status?.info || '#3b82f6'),
      '--status-info-border': hexWithAlpha(tokens.status?.info || '#3b82f6', 0.45),
      '--text-primary': tokens.typography?.['text-strong'] || tokens.typography?.heading || panelTextStrong,
      '--text-body': tokens.typography?.['text-body'] || panelText,
      '--text-muted': tokens.typography?.['text-muted'] || panelMuted,
      '--text-strong': tokens.typography?.['text-strong'] || panelTextStrong,
      '--heading': tokens.typography?.heading || tokens.typography?.['text-strong'] || panelTextStrong,
    };
  }, [tokens, isDark, themeMode]);

  const themeClass = isDark ? 'dark' : 'light';

  return { uiTheme, themeClass };
};