import { describe, it, expect } from 'vitest';
import {
  blendHue,
  blendColorsPerceptual,
  hexToOklch,
  getContrastRatio,
  getWCAGBadge,
  hexToHsl,
  hslToHex,
  hexWithAlpha,
  normalizeHex,
} from './colorUtils.js';

describe('colorUtils', () => {
  it('hexToHsl handles black and white', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 });
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 });
  });

  it('hslToHex round-trips primary hues', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('normalizeHex expands shorthand and guards invalid input', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('#aabbcc')).toBe('#aabbcc');
    expect(normalizeHex('oops', '#111827')).toBe('#111827');
  });

  it('contrast ratio and badges align with WCAG thresholds', () => {
    const ratio = getContrastRatio('#ffffff', '#000000');
    expect(ratio).toBeGreaterThan(20.9);
    const badge = getWCAGBadge(ratio);
    expect(badge.text).toBe('AAA');
    expect(badge.label).toBe('AAA');
    expect(getWCAGBadge(4.7).text).toBe('AA');
    expect(getWCAGBadge(4.7).label).toBe('AA');
    expect(getWCAGBadge(4.29).text).toBe('AA18');
    expect(getWCAGBadge(4.29).label).toBe('Large text only');
    expect(getWCAGBadge(2.5).text).toBe('FAIL');
    expect(getWCAGBadge(2.5).label).toBe('Fail');
  });

  it('blendHue follows the shortest hue path', () => {
    expect(blendHue(0, 120, 0.5)).toBe(60);
    expect(blendHue(350, 20, 0.5)).toBeCloseTo(0);
    expect(blendHue(240, -210, 0.5)).toBeCloseTo(315);
  });

  it('keeps chromatic hue when blending from neutral gray', () => {
    const violet = '#7651cc';
    const midFromGray = blendColorsPerceptual('#808080', violet, 0.5);
    const midToGray = blendColorsPerceptual(violet, '#808080', 0.5);
    const targetHue = hexToOklch(violet).h;
    for (const color of [midFromGray, midToGray]) {
      const delta = Math.abs(((hexToOklch(color).h - targetHue + 540) % 360) - 180);
      expect(delta).toBeLessThan(12);
    }
    expect(midFromGray).toBe(midToGray);
  });

  it('keeps blend endpoints unchanged', () => {
    expect(blendColorsPerceptual('#808080', '#7651cc', 0)).toBe('#808080');
    expect(blendColorsPerceptual('#808080', '#7651cc', 1)).toBe('#7651cc');
  });

  it('preserves exact blend endpoints and clamps out-of-range weights', () => {
    const a = '#123456';
    const b = '#f7d6e0';
    expect(blendColorsPerceptual(a, b, 0)).toBe(a);
    expect(blendColorsPerceptual(a, b, 1)).toBe(b);
    expect(blendColorsPerceptual(a, b, -50)).toBe(a);
    expect(blendColorsPerceptual(a, b, 50)).toBe(b);
    expect(blendColorsPerceptual(a, b, Number.NaN)).toBe(a);
    expect(blendColorsPerceptual(a, b, Infinity)).toBe(a);
    expect(blendColorsPerceptual('#ABC', b, 0)).toBe('#aabbcc');
  });

  it('hexWithAlpha wraps RGB channels', () => {
    expect(hexWithAlpha('#112233', 0.5)).toBe('rgba(17,34,51,0.5)');
  });
});
