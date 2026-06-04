import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildOverridesFromCss,
  buildPrintTokenTree,
  buildThemePackExportCopy,
  buildThemePackSelectionCopy,
  clampValue,
  getPrintTimestamps,
  getThemePackGuidance,
  inferThemeMode,
  normalizeConfirmedVariants,
  normalizeImportedPalette,
  sanitizeHexInput,
  sanitizePrefix,
  sanitizeThemeName,
  summarizeConfirmedVariants,
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
      confirmedVariants: {},
      savedAt: undefined,
      version: 1,
      variantCoverage: 'available-modes',
      availableModes: [],
      missingModes: ['light', 'dark', 'pop'],
    });
  });

  it('normalizes confirmed variant snapshots for saved palettes', () => {
    const confirmedVariants = normalizeConfirmedVariants({
      light: {
        signature: 'light-approved',
        finalTokens: { brand: { cta: '#112233' } },
        orderedStack: [{ path: 'brand.cta', value: '#112233' }],
      },
      dark: { tokens: { brand: { cta: '#ffffff' } } },
      pop: null,
    });

    expect(confirmedVariants.light.finalTokens.brand.cta).toBe('#112233');
    expect(confirmedVariants.light.orderedStack).toEqual([{ path: 'brand.cta', value: '#112233' }]);
    expect(confirmedVariants.dark.finalTokens.brand.cta).toBe('#ffffff');
    expect(summarizeConfirmedVariants(confirmedVariants)).toEqual({
      variantCoverage: 'available-modes',
      availableModes: ['light', 'dark'],
      missingModes: ['pop'],
    });

    expect(normalizeImportedPalette({
      name: 'Snapshot Theme',
      baseColor: '#112233',
      mode: 'Monochromatic',
      themeMode: 'light',
      confirmedVariants,
      savedAt: '2026-06-03T12:00:00.000Z',
      version: 2,
    }, 0)).toEqual(expect.objectContaining({
      confirmedVariants,
      savedAt: '2026-06-03T12:00:00.000Z',
      version: 2,
      variantCoverage: 'available-modes',
      availableModes: ['light', 'dark'],
      missingModes: ['pop'],
    }));
  });

  it('builds UI copy for current, partial, and full theme pack coverage', () => {
    expect(buildThemePackExportCopy({
      availableModes: ['light'],
      missingModes: ['dark', 'pop'],
      variantCoverage: 'current-mode-only',
    })).toEqual({
      exportButtonLabel: 'Download Current Mode Theme Pack',
      includedModesLabel: 'Included in this ZIP: Light',
      missingModesLabel: 'Missing modes: Dark, Pop',
      successMessage: 'Theme Pack exported. Included: Light. Missing: Dark and Pop.',
      coverageLabel: 'Current mode only',
      isFullFamily: false,
      isCurrentModeOnly: true,
      isPartialFamily: false,
    });

    expect(buildThemePackExportCopy({
      availableModes: ['light', 'dark'],
      missingModes: ['pop'],
      variantCoverage: 'available-modes',
    })).toEqual(expect.objectContaining({
      exportButtonLabel: 'Download Confirmed Modes Theme Pack',
      includedModesLabel: 'Included in this ZIP: Light, Dark',
      missingModesLabel: 'Missing modes: Pop',
      successMessage: 'Theme Pack exported. Included: Light and Dark. Missing: Pop.',
      coverageLabel: 'Partial confirmed family',
      isPartialFamily: true,
    }));

    expect(buildThemePackExportCopy({
      availableModes: ['light', 'dark', 'pop'],
      missingModes: [],
      variantCoverage: 'all-modes',
    })).toEqual(expect.objectContaining({
      exportButtonLabel: 'Download Full Theme Pack',
      includedModesLabel: 'Included in this ZIP: Light, Dark, Pop',
      missingModesLabel: 'Missing modes: none',
      successMessage: 'Full Theme Pack exported. Included: Light, Dark, and Pop.',
      coverageLabel: 'Full Light/Dark/Pop family',
      isFullFamily: true,
    }));
  });

  it('builds selected Theme Pack copy without conflating omitted and missing modes', () => {
    expect(buildThemePackSelectionCopy({
      availableModes: ['light', 'dark', 'pop'],
      missingModes: [],
    }, ['light'])).toEqual({
      selectedModes: ['light'],
      omittedModes: ['dark', 'pop'],
      canExportSelection: true,
      exportButtonLabel: 'Download Selected Mode Theme Pack',
      includedModesLabel: 'Included in this ZIP: Light',
      missingModesLabel: 'Missing modes: none',
      omittedModesLabel: 'Omitted from this ZIP: Dark, Pop',
      successMessage: 'Theme Pack exported. Included: Light. Omitted: Dark and Pop.',
    });

    expect(buildThemePackSelectionCopy({
      availableModes: ['light', 'dark'],
      missingModes: ['pop'],
    }, ['light'])).toEqual(expect.objectContaining({
      selectedModes: ['light'],
      omittedModes: ['dark'],
      missingModesLabel: 'Missing modes: Pop',
      omittedModesLabel: 'Omitted from this ZIP: Dark',
      successMessage: 'Theme Pack exported. Included: Light. Missing: Pop. Omitted: Dark.',
    }));

    expect(buildThemePackSelectionCopy({
      availableModes: ['light', 'dark', 'pop'],
      missingModes: [],
    }, ['light', 'dark', 'pop'])).toEqual(expect.objectContaining({
      omittedModes: [],
      exportButtonLabel: 'Download Full Theme Pack',
      omittedModesLabel: '',
      successMessage: 'Full Theme Pack exported. Included: Light, Dark, and Pop.',
    }));
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
