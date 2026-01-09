import { useMemo } from 'react';
import { usePaletteStore } from '../store/usePaletteStore';
import { useTokenStore } from '../store/useTokenStore';
import {
  getContrastRatio,
  hexToHsl,
  hexWithAlpha,
  pickReadableText,
} from '../lib/colorUtils';

const clampValue = (val, min, max) => Math.min(max, Math.max(min, Number(val)));
const adjustHexLuminance = (hex, delta) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clampValue(l + delta, 2, 98));
};
const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (300 <= h && h < 360) {
        r = c;
        g = 0;
        b = x;
    }
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);

    if (r.length === 1) r = '0' + r;
    if (g.length === 1) g = '0' + g;
    if (b.length === 1) b = '0' + b;

    return '#' + r + g + b;
};

/**
 * Computes UI theme CSS variables for app chrome based on current palette and token store.
 * @returns {{uiTheme: object, themeClass: string}} An object containing the UI theme variables and the theme class name.
 */
export const useUITheme = () => {
  const tokens = useTokenStore((state) => state.tokens);
  const finalTokens = useTokenStore((state) => state.finalTokens);
  const themeMode = usePaletteStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';

  const uiTheme = useMemo(() => {
    // Safety fallbacks when tokens aren't ready yet
    if (!tokens || !finalTokens) {
      const fallbackBg = isDark ? '#0f172a' : '#ffffff';
      return {
        '--page-background': fallbackBg,
        '--page-background-image': `linear-gradient(180deg, ${fallbackBg} 0%, ${fallbackBg} 100%)`,
        '--page-background-size': 'auto',
        '--page-background-position': '0 0',
        '--panel-bg': isDark ? '#1e293b' : '#f8fafc',
        '--panel-bg-soft': isDark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(248, 250, 252, 0.86)',
        '--panel-bg-strong': isDark ? '#334155' : '#e2e8f0',
        '--panel-bg-ghost': isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.94)',
        '--panel-border': isDark ? '#475569' : '#cbd5e1',
        '--panel-text': isDark ? '#f1f5f9' : '#1e293b',
        '--panel-muted': isDark ? '#94a3b8' : '#64748b',
        '--panel-text-strong': isDark ? '#f8fafc' : '#0f172a',
        '--panel-muted-strong': isDark ? '#94a3b8' : '#64748b',
        '--panel-text-soft': isDark ? '#f1f5f9' : '#1e293b',
        '--panel-muted-soft': isDark ? '#94a3b8' : '#64748b',
        '--panel-accent': '#6366f1',
        '--panel-accent-strong': '#6366f1',
        '--panel-accent-text': '#ffffff',
        '--panel-chip-bg': isDark ? '#334155' : '#e2e8f0',
        '--panel-chip-border': isDark ? '#475569' : '#cbd5e1',
        '--panel-chip-text': isDark ? '#f1f5f9' : '#1e293b',
        '--panel-shadow': isDark ? '0 22px 60px -48px rgba(99, 102, 241, 0.45)' : '0 22px 60px -48px rgba(99, 102, 241, 0.35)',
        '--status-success': '#10b981',
        '--status-success-text': '#ffffff',
        '--status-success-border': 'rgba(16, 185, 129, 0.45)',
        '--status-warning': '#f59e0b',
        '--status-warning-text': '#ffffff',
        '--status-warning-border': 'rgba(245, 158, 11, 0.45)',
        '--status-error': '#ef4444',
        '--status-error-text': '#ffffff',
        '--status-error-border': 'rgba(239, 68, 68, 0.45)',
        '--status-info': '#3b82f6',
        '--status-info-text': '#ffffff',
        '--status-info-border': 'rgba(59, 130, 246, 0.45)',
        // Typography fallbacks
        '--text-primary': isDark ? '#f8fafc' : '#0f172a',
        '--text-body': isDark ? '#e2e8f0' : '#1e293b',
        '--text-muted': isDark ? '#94a3b8' : '#64748b',
        '--text-strong': isDark ? '#ffffff' : '#000000',
        '--heading': isDark ? '#f8fafc' : '#0f172a',
      };
    }

    const pageBackground = finalTokens.surfaces['page-background']
      || finalTokens.surfaces.background
      || tokens.surfaces['page-background'];
    const backgroundImage = [
      `radial-gradient(circle at 16% 14%, ${hexWithAlpha(tokens.brand.primary, 0.12)}, transparent 28%)`,
      `radial-gradient(circle at 82% 8%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.1)}, transparent 30%)`,
      `linear-gradient(180deg, ${hexWithAlpha(tokens.surfaces['background'], 0.75)} 0%, ${hexWithAlpha(pageBackground, 0.9)} 42%, ${pageBackground} 100%)`,
    ].join(', ');
    const backgroundSize = '140% 140%, 120% 120%, auto';
    const backgroundPosition = '0 0, 100% 0, 0 0';
    const ctaBase = tokens.brand.cta || tokens.brand.primary; // Derived here
    const ctaTextColor = pickReadableText(ctaBase); // Derived here

    const panelBase = tokens.cards['card-panel-surface'];
    const panelStrong = tokens.cards['card-panel-surface-strong'] || panelBase;
    const panelSoft = hexWithAlpha(panelBase, isDark ? 0.72 : 0.86);
    const panelGhost = hexWithAlpha(tokens.surfaces['background'], isDark ? 0.82 : 0.94);
    const panelBorder = tokens.cards['card-panel-border'];
    const panelText = tokens.textPalette?.['text-secondary'] || tokens.typography['text-strong'];
    const panelMuted = tokens.textPalette?.['text-tertiary'] || tokens.typography['text-muted'];
    const panelTextStrong = pickReadableText(panelStrong);
    const panelMutedStrong = getContrastRatio(panelMuted, panelStrong) >= 3.2
      ? panelMuted
      : hexWithAlpha(panelTextStrong, 0.72);
    const panelTextSoft = pickReadableText(panelSoft);
    const panelMutedSoft = getContrastRatio(panelMuted, panelSoft) >= 3.2
      ? panelMuted
      : hexWithAlpha(panelTextSoft, 0.72);
    const chipMinContrast = themeMode === 'pop' ? 1.6 : 1.25;
    const panelChipBase = tokens.cards['card-tag-bg'] || panelBase;
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
    const panelChipTextBase = tokens.cards['card-tag-text'] || panelText;
    const panelChipText = getContrastRatio(panelChipTextBase, panelChip) >= 4.5
      ? panelChipTextBase
      : pickReadableText(panelChip);
    const panelChipBorderBase = tokens.cards['card-tag-border'] || panelBorder;
    const panelChipBorder = getContrastRatio(panelChipBorderBase, panelChip) >= chipMinContrast
      ? panelChipBorderBase
      : hexWithAlpha(panelChipText, 0.35);
    const statusSuccess = tokens.status.success;
    const statusWarning = tokens.status.warning;
    const statusError = tokens.status.error;
    const statusInfo = tokens.status.info;
    const statusSuccessText = pickReadableText(statusSuccess);
    const statusWarningText = pickReadableText(statusWarning);
    const statusErrorText = pickReadableText(statusError);
    const statusInfoText = pickReadableText(statusInfo);

    return {
      '--page-background': pageBackground,
      '--page-background-image': backgroundImage,
      '--page-background-size': backgroundSize,
      '--page-background-position': backgroundPosition,
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
      '--panel-accent': tokens.brand.primary,
      '--panel-accent-strong': tokens.brand.cta || tokens.brand.primary,
      '--panel-accent-text': ctaTextColor,
      '--panel-chip-bg': panelChip,
      '--panel-chip-border': panelChipBorder,
      '--panel-chip-text': panelChipText,
      '--panel-shadow': `0 22px 60px -48px ${hexWithAlpha(tokens.brand.primary, 0.45)}`,
      '--status-success': statusSuccess,
      '--status-success-text': statusSuccessText,
      '--status-success-border': hexWithAlpha(statusSuccess, 0.45),
      '--status-warning': statusWarning,
      '--status-warning-text': statusWarningText,
      '--status-warning-border': hexWithAlpha(statusWarning, 0.45),
      '--status-error': statusError,
      '--status-error-text': statusErrorText,
      '--status-error-border': hexWithAlpha(statusError, 0.45),
      '--status-info': statusInfo,
      '--status-info-text': statusInfoText,
      '--status-info-border': hexWithAlpha(statusInfo, 0.45),
      // Typography variables
      '--text-primary': tokens.typography?.['text-strong'] || tokens.typography?.heading || panelText,
      '--text-body': tokens.typography?.['text-body'] || panelText,
      '--text-muted': tokens.typography?.['text-muted'] || panelMuted,
      '--text-strong': tokens.typography?.['text-strong'] || panelTextStrong,
      '--heading': tokens.typography?.heading || tokens.typography?.['text-strong'] || panelTextStrong,
    };
  }, [tokens, finalTokens, isDark, themeMode]); // Dependencies

  const themeClass = useMemo(() => {
    // This logic is duplicated from getThemeClassName in themeStyles.js
    // For now, inline it. If getThemeClassName needs tokens, it's a circular dep
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'pop') return 'pop';
    return 'light';
  }, [themeMode]);

  return { uiTheme, themeClass };
};
