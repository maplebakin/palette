import { describe, expect, it, vi } from 'vitest';
import { generateRolePalette, hexToHsl, hslToHex, hexToOklch, oklchToHex, solveContrast } from './core-math.js';
import { generateTokens } from './tokens.js';
import { buildTheme } from './theme/engine.js';

const SEEDS = [
  '#000000', '#ffffff', '#808080', '#c7c7c7', '#222222', '#ffccdd',
  '#d6eaff', '#c8e6c9', '#fff0ba', '#a78bfa', '#ff00ff', '#00ffff',
  '#00ff00', '#ff3300', '#ccff00', '#111827', '#3b1238', '#123b2a',
  '#663300', '#b88265', '#e0ac69', '#ff0000', '#0000ff', '#ffff00',
];
const HARMONIES = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
const THEMES = ['light', 'dark', 'pop'];
// Independent WCAG calculation: acceptance is measured on the delivered 8-bit colours.
const luminance = hex => {
  const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const paletteFromTokens = tokens => ({
  background: tokens.surfaces.background, surface: tokens.cards['card-panel-surface'],
  text: tokens.typography['text-body'], heading: tokens.typography.heading,
  muted: tokens.typography['text-muted'], accent: tokens.brand.accent,
  cta: tokens.actions.primary, ctaText: tokens.actions['primary-foreground'],
});
const assertReadable = palette => {
  for (const field of ['background', 'surface']) {
    expect(contrast(palette.text, palette[field])).toBeGreaterThanOrEqual(7);
    expect(contrast(palette.heading, palette[field])).toBeGreaterThanOrEqual(7);
    expect(contrast(palette.muted, palette[field])).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(palette.accent, palette.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(palette.ctaText, palette.cta)).toBeGreaterThanOrEqual(4.5);
};

describe('seed-relative OKLCH generation', () => {
  it('wraps hue at the red seam in the legacy HSL helpers', () => {
    expect(hexToHsl('#ff0001').h).toBe(0);
    for (const degrees of [-720, -360, 0, 360, 720]) {
      expect(hslToHex(degrees, 100, 50)).toBe('#ff0000');
    }
    expect(hslToHex(-120, 100, 50)).toBe('#0000ff');
    expect(hslToHex(480, 100, 50)).toBe('#00ff00');
  });

  it.each(HARMONIES.flatMap(harmony => THEMES.flatMap(theme => SEEDS.map(seed => [seed, harmony, theme]))))(
    '%s × %s × %s meets every floor and is deterministic through the live generator', (seed, harmony, theme) => {
      const options = { harmonyIntensity: 110, neutralCurve: 100, accentStrength: 100 };
      const tokens = generateTokens(seed, harmony, theme, 100, options);
      assertReadable(paletteFromTokens(tokens));
      const core = generateRolePalette(seed, harmony, theme, 100, options);
      assertReadable(core);
      expect(paletteFromTokens(tokens)).toEqual(Object.fromEntries(Object.keys(paletteFromTokens(tokens)).map(key => [key, core[key]])));
      expect(generateTokens(seed, harmony, theme, 100, options)).toEqual(tokens);
    },
  );

  it.each(HARMONIES.flatMap(harmony => THEMES.map(theme => [harmony, theme])))('%s × %s has at least eight distinct rounded background lightnesses', (harmony, theme) => {
    const lightnesses = SEEDS.map(seed => Math.round(hexToOklch(generateTokens(seed, harmony, theme).surfaces.background).l * 100));
    expect(new Set(lightnesses).size).toBeGreaterThanOrEqual(8);
  });

  it.each(THEMES)('%s derives foreground lightness from the seed and its surfaces', theme => {
    const palettes = SEEDS.map(seed => generateRolePalette(seed, 'Analogous', theme));
    for (const role of ['text', 'heading', 'muted']) {
      expect(new Set(palettes.map(palette => Math.round(hexToOklch(palette[role]).l * 100))).size).toBeGreaterThan(1);
    }
  });

  it('keeps floors at slider extremes without randomness', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Random generation'); });
    try {
      for (const harmony of HARMONIES) for (const theme of THEMES) for (const seed of SEEDS) {
        for (const value of [0, 200]) {
          const options = { harmonyIntensity: value, neutralCurve: value, accentStrength: value, popIntensity: value, accentHueShift: value - 100, accentSaturationShift: value - 100 };
          assertReadable(paletteFromTokens(generateTokens(seed, harmony, theme, value, options)));
        }
      }
    } finally { random.mockRestore(); }
  });

  it('round trips sRGB seeds and reduces out-of-gamut chroma while retaining hue and lightness', () => {
    for (const seed of SEEDS) expect(oklchToHex(hexToOklch(seed))).toBe(seed);
    const input = { l: 0.6, c: 0.8, h: 140 };
    const mapped = hexToOklch(oklchToHex(input));
    expect(mapped.c).toBeLessThan(input.c);
    expect(mapped.l).toBeCloseTo(input.l, 2);
    expect(mapped.h).toBeCloseTo(input.h, 0);
  });

  it('keeps grey fields neutral, vivid fields tinted, and complementary fields in the seed family', () => {
    const neutral = generateRolePalette('#808080', 'Complementary', 'light');
    const vivid = generateRolePalette('#ff0000', 'Complementary', 'light');
    expect(hexToOklch(neutral.background).c).toBeLessThan(0.001);
    expect(hexToOklch(vivid.background).c).toBeGreaterThan(0.02);
    expect(Math.abs(hexToOklch(vivid.surface).h - hexToOklch('#ff0000').h)).toBeLessThan(2); // 8-bit quantization at low chroma
    expect(hexToOklch(vivid.muted).c).toBeGreaterThan(0.005);
  });

  it('rejects incompatible contrast constraints rather than returning a failing colour', () => {
    expect(() => solveContrast({ l: 0.5, c: 0.4, h: 90 }, ['#000000', '#ffffff'], 7)).toThrow('Cannot meet');
  });

  it('does not rederive explicit saved role values or locked overrides', () => {
    const importedOverrides = { 'surfaces.background': '#123456', 'cards.card-panel-surface': '#345678', 'typography.text-body': '#abcdef', 'typography.heading': '#fedcba', 'typography.text-muted': '#aabbcc', 'brand.accent': '#cc0099', 'brand.cta': '#991133' };
    for (const seed of ['#ff0000', '#00ff00']) {
      const theme = buildTheme({ baseColor: seed, importedOverrides });
      for (const [path, value] of Object.entries(importedOverrides)) expect(path.split('.').reduce((node, key) => node[key], theme.tokens)).toBe(value);
    }
  });
});
