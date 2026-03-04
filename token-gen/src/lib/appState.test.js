import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildOverridesFromCss,
  buildPrintTokenTree,
  clampValue,
  getPrintTimestamps,
  getThemePackGuidance,
  inferThemeMode,
  normalizeImportedPalette,
  sanitizeHexInput,
  sanitizePrefix,
  sanitizeThemeName,
} from './appState.js';

describe('appState helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T09:07:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sanitizes palette input values and clamps numeric ranges', () => {
    expect(sanitizeHexInput(' 112233 ')).toBe('#112233');
    expect(sanitizeHexInput('#abcdef11')).toBe('#abcdef');
    expect(sanitizeHexInput('nope', '#123456')).toBe('#123456');
    expect(clampValue(240, 0, 200)).toBe(200);
    expect(clampValue(-10, 0, 200)).toBe(0);
  });

  it('sanitizes theme names and token prefixes for storage-safe values', () => {
    expect(sanitizeThemeName('  Demo<> Theme   Name  ', 'Fallback')).toBe('Demo Theme Name');
    expect(sanitizeThemeName('', 'Fallback')).toBe('Fallback');
    expect(sanitizePrefix(' demo prefix!*._- ')).toBe('demoprefix._-');
  });

  it('extracts matching overrides and the most common prefix from CSS variables', () => {
    const css = `
      :root {
        --demo-brand-primary: #112233;
        --demo-brand-secondary: #445566;
        --demo-typography-text-strong: #ffffff;
        --other-token: 12px;
      }
    `;

    expect(buildOverridesFromCss(css)).toEqual({
      overrides: {
        'brand.primary': '#112233',
        'brand.secondary': '#445566',
        'typography.text-strong': '#ffffff',
      },
      prefix: 'demo',
    });
  });

  it('infers theme mode and normalizes imported palettes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(4242);

    expect(inferThemeMode('#111111')).toBe('dark');
    expect(inferThemeMode('#f8fafc')).toBe('light');

    expect(normalizeImportedPalette({
      name: ' Imported<> ',
      baseColor: 'abc',
      mode: 'Analogous',
      isDark: true,
      harmonyIntensity: 180,
      apocalypseIntensity: -5,
      neutralCurve: 200,
      accentStrength: 40,
      popIntensity: 141,
      tokenPrefix: 'demo prefix!*',
    }, 3)).toEqual({
      id: 4245,
      name: 'Imported',
      baseColor: '#abc',
      mode: 'Analogous',
      themeMode: 'dark',
      isDark: true,
      printMode: false,
      customThemeName: '',
      harmonyIntensity: 160,
      apocalypseIntensity: 0,
      neutralCurve: 140,
      accentStrength: 60,
      popIntensity: 140,
      tokenPrefix: 'demoprefix',
      importedOverrides: null,
    });
  });

  it('returns formatted print timestamps and fallback theme pack guidance', () => {
    const timestamps = getPrintTimestamps();

    expect(timestamps.date).toBe('2026-03-03');
    expect(timestamps.dateTime).toMatch(/^2026-03-03 \d{2}:\d{2}$/);
    expect(getThemePackGuidance('Unknown')).toEqual({
      best: 'Product UI and brand systems',
      not: 'Single-use experiments',
    });
  });

  it('nests printable tokens and ignores metadata keys', () => {
    expect(buildPrintTokenTree({
      'brand/primary': { value: '#123456', type: 'color' },
      'typography/text-body': '#eeeeee',
      description: 'ignore me',
      'meta/source': 'ignore this too',
    })).toEqual({
      brand: {
        primary: { value: '#123456', type: 'color' },
      },
      typography: {
        'text-body': '#eeeeee',
      },
    });
  });
});
