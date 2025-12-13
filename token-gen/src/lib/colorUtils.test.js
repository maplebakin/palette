import { describe, it, expect } from 'vitest';
import {
  blendHue,
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
    expect(getWCAGBadge(4.7).text).toBe('AA');
    expect(getWCAGBadge(2.5).text).toBe('FAIL');
  });

  it('blendHue averages between angles', () => {
    expect(blendHue(0, 120, 0.5)).toBe(60);
    expect(blendHue(350, 30, 0.5)).toBe(185);
  });

  it('hexWithAlpha wraps RGB channels', () => {
    expect(hexWithAlpha('#112233', 0.5)).toBe('rgba(17,34,51,0.5)');
  });
});
