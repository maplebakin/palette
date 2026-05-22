import { describe, it, expect } from 'vitest';
import { buildSectionSnapshotFromPalette, normalizeProject, DEFAULT_PROJECT_SETTINGS } from './projectUtils';

describe('projectUtils normalizeProject', () => {
  it('fills missing settings with defaults', () => {
    const project = { schemaVersion: 1, projectName: 'Test', sections: [] };
    const normalized = normalizeProject(project);
    expect(normalized.settings).toEqual(DEFAULT_PROJECT_SETTINGS);
  });

  it('accepts palettes as sections input', () => {
    const project = {
      palettes: [
        { id: 'one', label: 'Section One', baseHex: '#fff' },
      ],
    };
    const normalized = normalizeProject(project);
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0].label).toBe('Section One');
    expect(normalized.sections[0].baseHex).toBe('#ffffff');
  });

  it('captures palette identity and token data for reopening/exporting project kits', () => {
    const snapshot = buildSectionSnapshotFromPalette({
      name: 'Neon Orchard',
      baseColor: '#22c55e',
      mode: 'Analogous',
      themeMode: 'light',
      printMode: true,
      customThemeName: 'Neon Orchard',
      harmonyIntensity: 118,
      apocalypseIntensity: 12,
      neutralCurve: 86,
      accentStrength: 132,
      popIntensity: 125,
      tokenPrefix: 'orchard',
      finalTokens: {
        brand: {
          primary: '#22c55e',
          secondary: '#84cc16',
          accent: '#f97316',
        },
        surfaces: {
          background: '#f8fafc',
        },
        cards: {
          'card-panel-surface': '#ffffff',
        },
        typography: {
          'text-body': '#0f172a',
          'text-muted': '#475569',
        },
        foundation: {
          neutrals: {
            'neutral-9': '#0f172a',
          },
          status: {
            warning: '#f59e0b',
          },
        },
      },
      orderedStack: [
        { name: 'Primary', value: '#22c55e' },
        { name: 'Accent', value: '#f97316' },
      ],
    });

    expect(snapshot).toMatchObject({
      baseHex: '#22c55e',
      mode: 'analogous',
      paletteSpec: {
        baseColor: '#22c55e',
        mode: 'Analogous',
        themeMode: 'light',
        printMode: true,
        customThemeName: 'Neon Orchard',
        harmonyIntensity: 118,
        tokenPrefix: 'orchard',
      },
    });
    expect(snapshot.tokenSet.brand.primary).toBe('#22c55e');
    expect(snapshot.tokens).toMatchObject({
      background: '#f8fafc',
      primary: '#22c55e',
      accent: '#f97316',
      text: '#0f172a',
    });
    expect(snapshot.colors).toEqual([
      { name: 'Primary', hex: '#22c55e' },
      { name: 'Accent', hex: '#f97316' },
    ]);
  });
});
