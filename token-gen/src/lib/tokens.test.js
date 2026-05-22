import { describe, it, expect } from 'vitest';
import { generateTokens, addPrintMode } from './tokens.js';
import { getContrastRatio, hexToHsl } from './colorUtils.js';

const hueDistance = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};

describe('generateTokens', () => {
  it('produces distinct brand colors per harmony mode', () => {
    const base = '#3366ff';
    const lightMono = generateTokens(base, 'Monochromatic', 'light', 100);
    const lightAnalog = generateTokens(base, 'Analogous', 'light', 100);
    const lightComp = generateTokens(base, 'Complementary', 'light', 100);
    expect(lightMono.brand.secondary).not.toBe(lightAnalog.brand.secondary);
    expect(lightAnalog.brand.secondary).not.toBe(lightComp.brand.secondary);
  });

  it('responds to neutral curve and accent strength controls', () => {
    const muted = generateTokens('#3366ff', 'Monochromatic', 'dark', 100, { neutralCurve: 80, accentStrength: 80 });
    const punchy = generateTokens('#3366ff', 'Monochromatic', 'dark', 100, { neutralCurve: 130, accentStrength: 140 });
    expect(muted.foundation.neutrals['neutral-0']).not.toBe(punchy.foundation.neutrals['neutral-0']);
    expect(muted.brand.accent).not.toBe(punchy.brand.accent);
    const mutedContrast = getContrastRatio(muted.brand.primary, muted.surfaces.background);
    const punchyContrast = getContrastRatio(punchy.brand.primary, punchy.surfaces.background);
    expect(punchyContrast).toBeGreaterThan(mutedContrast * 0.8);
  });

  it('lets harmony spread influence the brand stack', () => {
    const narrow = generateTokens('#6633ff', 'Analogous', 'light', 100, { harmonyIntensity: 60 });
    const wide = generateTokens('#6633ff', 'Analogous', 'light', 100, { harmonyIntensity: 150 });
    expect(narrow.brand.secondary).not.toBe(wide.brand.secondary);
    expect(narrow.brand.accent).not.toBe(wide.brand.accent);
  });

  it('keeps complementary blue surfaces from drifting into green', () => {
    const tokens = generateTokens('#0000ff', 'Complementary', 'light', 100);
    const surfaceHue = hexToHsl(tokens.surfaces['surface-plain']).h;
    expect(surfaceHue).toBeGreaterThan(185);
    expect(surfaceHue).toBeLessThan(260);
  });

  it('keeps tertiary yellow surfaces from turning muddy', () => {
    const tokens = generateTokens('#ffff00', 'Tertiary', 'light', 100);
    const backgroundHue = hexToHsl(tokens.surfaces.background).h;
    expect(backgroundHue).toBeGreaterThan(10);
    expect(backgroundHue).toBeLessThan(90);
  });

  it('generates vibrant pop mode backgrounds and accents', () => {
    const tokens = generateTokens('#ff00aa', 'Analogous', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(tokens.surfaces.background);
    const accentHue = hexToHsl(tokens.brand.accent).h;
    expect(bg.l).toBeGreaterThan(40);
    expect(bg.l).toBeLessThan(65);
    expect(tokens.typography['text-strong']).not.toBe('#ffffff'); // no pure white
    expect(accentHue).not.toBeCloseTo(bg.h);
  });

  it('produces darker backgrounds for dark mode', () => {
    const lightTokens = generateTokens('#3366ff', 'Monochromatic', 'light', 100);
    const darkTokens = generateTokens('#3366ff', 'Monochromatic', 'dark', 100);
    const lightBg = hexToHsl(lightTokens.surfaces.background).l;
    const darkBg = hexToHsl(darkTokens.surfaces.background).l;
    expect(darkBg).toBeLessThan(lightBg);
  });

  it('keeps dark, light, and pop variants tied to the same primary hue DNA', () => {
    const base = '#3366ff';
    const baseHue = hexToHsl(base).h;
    const variants = ['dark', 'light', 'pop'].map((themeMode) =>
      generateTokens(base, 'Analogous', themeMode, 100, { popIntensity: 130 })
    );

    variants.forEach((tokens) => {
      const primary = hexToHsl(tokens.brand.primary);
      expect(hueDistance(primary.h, baseHue)).toBeLessThanOrEqual(8);
      expect(primary.s).toBeGreaterThan(60);
    });
  });

  it('gives dark, light, and pop variants distinct surface behavior with usable text contrast', () => {
    const dark = generateTokens('#3366ff', 'Analogous', 'dark', 100);
    const light = generateTokens('#3366ff', 'Analogous', 'light', 100);
    const pop = generateTokens('#3366ff', 'Analogous', 'pop', 100, { popIntensity: 130 });

    const darkBg = hexToHsl(dark.surfaces.background);
    const lightBg = hexToHsl(light.surfaces.background);
    const popBg = hexToHsl(pop.surfaces.background);

    expect(darkBg.l).toBeLessThan(20);
    expect(lightBg.l).toBeGreaterThan(90);
    expect(popBg.l).toBeGreaterThan(40);
    expect(popBg.l).toBeLessThan(65);
    expect(popBg.l).toBeGreaterThan(darkBg.l + 25);
    expect(lightBg.l).toBeGreaterThan(popBg.l + 25);

    [dark, light, pop].forEach((tokens) => {
      expect(getContrastRatio(tokens.typography['text-body'], tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(tokens.typography['text-muted'], tokens.cards['card-panel-surface'])).toBeGreaterThanOrEqual(3.2);
    });
  });

  it('keeps pop accents hue-derived instead of falling back to neutral white or black', () => {
    const base = '#00a67d';
    const baseHue = hexToHsl(base).h;
    const tokens = generateTokens(base, 'Analogous', 'pop', 100, { popIntensity: 130 });

    ['primary', 'secondary', 'accent'].forEach((key) => {
      const color = hexToHsl(tokens.brand[key]);
      expect(color.s).toBeGreaterThan(70);
      expect(color.l).toBeGreaterThan(10);
      expect(color.l).toBeLessThan(90);
    });
    expect(hueDistance(hexToHsl(tokens.brand.primary).h, baseHue)).toBeLessThanOrEqual(8);
  });

  it.each(['#afc7d8', '#c4e6d5'])('makes soft cool pop palettes bright and chromatic while preserving hue DNA', (base) => {
    const baseHue = hexToHsl(base).h;
    const light = generateTokens(base, 'Analogous', 'light', 100, { popIntensity: 130 });
    const pop = generateTokens(base, 'Analogous', 'pop', 100, { popIntensity: 130 });

    const lightPrimary = hexToHsl(light.brand.primary);
    const popPrimary = hexToHsl(pop.brand.primary);
    const lightAccent = hexToHsl(light.brand.accent);
    const popAccent = hexToHsl(pop.brand.accent);

    expect(popPrimary.s).toBeGreaterThan(lightPrimary.s + 25);
    expect(popAccent.s).toBeGreaterThan(lightAccent.s + 20);
    expect(popPrimary.l).toBeGreaterThanOrEqual(35);
    expect(popAccent.l).toBeGreaterThanOrEqual(35);
    expect(hueDistance(popPrimary.h, baseHue)).toBeLessThanOrEqual(8);
    expect(hueDistance(popAccent.h, baseHue)).toBeLessThanOrEqual(45);
    expect(['#000000', '#ffffff']).not.toContain(pop.brand.primary.toLowerCase());
    expect(['#000000', '#ffffff']).not.toContain(pop.brand.accent.toLowerCase());
    expect(getContrastRatio(pop.typography['text-body'], pop.surfaces.background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['warm red brown', '#7b241c', 'Monochromatic'],
    ['cobalt blue', '#3366ff', 'Analogous'],
    ['gold green', '#c89b1f', 'Complementary'],
    ['leaf green', '#22c55e', 'Analogous'],
    ['magenta', '#d946ef', 'Tertiary'],
    ['acid lime', '#a7f432', 'Apocalypse'],
  ])('keeps %s pop mode distinct, usable, and hue-related', (_label, base, mode) => {
    const baseHue = hexToHsl(base).h;
    const light = generateTokens(base, mode, 'light', 100, { popIntensity: 130 });
    const dark = generateTokens(base, mode, 'dark', 100, { popIntensity: 130 });
    const pop = generateTokens(base, mode, 'pop', 100, { popIntensity: 130 });

    const popPrimary = hexToHsl(pop.brand.primary);
    const lightPrimary = hexToHsl(light.brand.primary);
    const popBg = hexToHsl(pop.surfaces.background);
    const lightBg = hexToHsl(light.surfaces.background);
    const darkBg = hexToHsl(dark.surfaces.background);

    expect(pop.brand.primary).not.toBe(light.brand.primary);
    expect(pop.surfaces.background).not.toBe(light.surfaces.background);
    expect(pop.surfaces.background).not.toBe(dark.surfaces.background);
    expect(popPrimary.s).toBeGreaterThanOrEqual(Math.min(64, lightPrimary.s));
    expect(hueDistance(popPrimary.h, baseHue)).toBeLessThanOrEqual(8);
    expect(popBg.l).toBeGreaterThan(darkBg.l + 20);
    expect(lightBg.l).toBeGreaterThan(popBg.l + 20);
    expect(getContrastRatio(pop.typography['text-body'], pop.surfaces.background)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(pop.typography['text-muted'], pop.cards['card-panel-surface'])).toBeGreaterThanOrEqual(3.2);
  });

  it('keeps generation deterministic for the same inputs', () => {
    const first = generateTokens('#3366ff', 'Complementary', 'pop', 100, {
      harmonyIntensity: 120,
      neutralCurve: 105,
      accentStrength: 110,
      popIntensity: 125,
    });
    const second = generateTokens('#3366ff', 'Complementary', 'pop', 100, {
      harmonyIntensity: 120,
      neutralCurve: 105,
      accentStrength: 110,
      popIntensity: 125,
    });

    expect(second).toEqual(first);
  });
});

describe('addPrintMode', () => {
  it('adds print-safe tokens and metadata', () => {
    const base = generateTokens('#6633ff', 'Tertiary', 'dark', 110);
    const withPrint = addPrintMode(base, '#6633ff', 'Tertiary', true);
    expect(withPrint.print['meta/base-color'].value).toBe('#6633ff');
    expect(withPrint.print['meta/harmony'].value).toBe('Tertiary');
    expect(withPrint.print['foil/gold']).toBeDefined();
    expect(withPrint.print['bleed'].value).toBe('8px');
  });
});
