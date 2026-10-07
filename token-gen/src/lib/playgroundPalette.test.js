import { describe, expect, it } from 'vitest';
import { hexToHsl } from './colorUtils.js';
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
