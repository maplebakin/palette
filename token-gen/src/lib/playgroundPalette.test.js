import { describe, expect, it } from 'vitest';
import { hexToHsl, getContrastRatio } from './colorUtils.js';
import {
  buildSemanticPaletteSwatches,
  getContextualMoodSuggestions,
  SEMANTIC_PALETTE_ROLES,
} from './playgroundPalette.js';

describe('playground semantic palette', () => {
  it('defines the seven generated roles in their stable display order', () => {
    expect(SEMANTIC_PALETTE_ROLES.map(({ name }) => name)).toEqual([
      'Background', 'Surface', 'Text', 'Heading', 'Muted', 'Accent', 'CTA',
    ]);
    expect(buildSemanticPaletteSwatches({
      surfaces: { background: '#101010' },
      cards: { 'card-panel-surface': '#202020' },
      typography: { 'text-body': '#303030', heading: '#404040', 'text-muted': '#505050' },
      brand: { accent: '#606060', cta: '#707070' },
    }).map(({ color }) => color)).toEqual([
      '#101010', '#202020', '#303030', '#404040', '#505050', '#606060', '#707070',
    ]);
  });

  it('wraps suggestions across both ends of the hue wheel', () => {
    const nearRedEnd = getContextualMoodSuggestions({
      seedColor: '#ff0033',
      roleColor: '#ff0033',
      harmony: 'Analogous',
    });
    const firstNeighborHue = hexToHsl(nearRedEnd[0].color).h;
    // A +24-degree neighbor beyond 360 must land near 12, not clamp at 360.
    expect(firstNeighborHue).toBeGreaterThan(0);
    expect(firstNeighborHue).toBeLessThan(40);

    const nearZero = getContextualMoodSuggestions({
      seedColor: '#ff3300',
      roleColor: '#ff3300',
      harmony: 'Analogous',
    });
    const secondNeighborHue = hexToHsl(nearZero[1].color).h;
    // A negative hue must wrap to the violet-red end of the wheel.
    expect(secondNeighborHue).toBeGreaterThan(300);
    expect(secondNeighborHue).toBeLessThan(360);
  });

  it('keeps text-facing suggestions readable against the current background', () => {
    for (const backgroundColor of ['#111827', '#f8fafc']) {
      for (const roleId of ['text', 'heading', 'muted', 'accent']) {
        const suggestions = getContextualMoodSuggestions({
          seedColor: '#a74d7e',
          roleColor: '#a74d7e',
          harmony: 'Analogous',
          roleId,
          backgroundColor,
        });
        expect(suggestions.every(({ color }) => getContrastRatio(color, backgroundColor) >= 4.5)).toBe(true);
      }
    }
  });

  it('does not constrain decorative accent suggestions when no background is supplied', () => {
    const suggestions = getContextualMoodSuggestions({ seedColor: '#a74d7e', roleColor: '#a74d7e', harmony: 'Analogous', roleId: 'accent' });
    expect(suggestions).toHaveLength(4);
  });

  it('avoids repeats of existing swatches while preserving readable text suggestions', () => {
    const input = {
      seedColor: '#bb5577', roleColor: '#bb5577', harmony: 'Analogous',
      roleId: 'text', backgroundColor: '#111827',
    };
    const baseline = getContextualMoodSuggestions(input);
    const occupied = baseline.map(({ color }, index) => ({ id: `other-${index}`, color }));
    const diverse = getContextualMoodSuggestions({ ...input, existingSwatches: occupied });
    expect(diverse).toHaveLength(4);
    expect(diverse.map(({ color }) => color)).not.toEqual(baseline.map(({ color }) => color));
    expect(diverse.every(({ color }) => getContrastRatio(color, input.backgroundColor) >= 4.5)).toBe(true);
  });

  it('offers harmony-aware colors around the seed and current role color', () => {
    const analogous = getContextualMoodSuggestions({
      seedColor: '#7f1d1d',
      roleColor: '#aa3333',
      harmony: 'Analogous',
    });
    const tertiary = getContextualMoodSuggestions({
      seedColor: '#7f1d1d',
      roleColor: '#aa3333',
      harmony: 'Tertiary',
    });

    expect(analogous).toHaveLength(4);
    expect(analogous.map(({ label }) => label)).toContain('Split complement');
    expect(analogous.every(({ color }) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
    expect(tertiary[0].label).toBe('Tertiary partner');
    expect(tertiary.map(({ color }) => color)).not.toEqual(analogous.map(({ color }) => color));
    const seedHue = hexToHsl('#7f1d1d').h;
    expect(analogous.every(({ color }) => {
      const hue = hexToHsl(color).h;
      const separation = Math.abs(((hue - seedHue + 540) % 360) - 180);
      return Math.abs(separation - 180) > 2;
    })).toBe(true);
  });
});
