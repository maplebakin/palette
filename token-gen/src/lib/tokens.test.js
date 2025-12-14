import { describe, it, expect } from 'vitest';
import { generateTokens, addPrintMode } from './tokens.js';
import { getContrastRatio, hexToHsl } from './colorUtils.js';

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
