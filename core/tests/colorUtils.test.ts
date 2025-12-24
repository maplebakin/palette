import { describe, it, expect } from 'vitest';
import { oklch, parse } from 'culori';
import {
  createHarmony,
  adjustLuminance,
  adjustChroma,
  adjustHue,
  isValidHex,
  parseColor,
  colorToHex,
} from '../src/colorUtils';

describe('colorUtils', () => {
  const baseColor = parse('#007bff')!;

  describe('isValidHex', () => {
    it('should return true for valid hex codes', () => {
      expect(isValidHex('#fff')).toBe(true);
      expect(isValidHex('#007bff')).toBe(true);
      expect(isValidHex('Ff0000')).toBe(true);
    });

    it('should return false for invalid hex codes', () => {
      expect(isValidHex('007bf')).toBe(false);
      expect(isValidHex('#ggg')).toBe(false);
      expect(isValidHex(null as any)).toBe(false);
      expect(isValidHex(undefined as any)).toBe(false);
    });
  });

  describe('parseColor', () => {
    it('should parse a valid hex string', () => {
        const color = parseColor('#ff0000');
        expect(color).not.toBeNull();
        expect(colorToHex(color!)).toBe('#ff0000');
    });

    it('should return null for an invalid hex string', () => {
        expect(parseColor('invalid')).toBeNull();
    });
  });

  describe('createHarmony', () => {
    it('should create a complementary harmony', () => {
      const harmony = createHarmony(baseColor, { mode: 'complementary' });
      expect(harmony.length).toBe(2);
      const baseHue = oklch(baseColor)!.h;
      const complementaryHue = oklch(harmony[1])!.h;
      expect(complementaryHue).toBeCloseTo((baseHue! + 180) % 360, 0);
    });

    it('should create an analogous harmony', () => {
      const harmony = createHarmony(baseColor, { mode: 'analogous' });
      expect(harmony.length).toBe(3);
    });

    it('should reverse hues when reverse is true', () => {
        const harmony = createHarmony(baseColor, { mode: 'analogous' });
        const reversedHarmony = createHarmony(baseColor, { mode: 'analogous', reverse: true });
        expect(oklch(harmony[0])!.h).toBe(oklch(reversedHarmony[2])!.h);
    });
  });

  describe('adjustLuminance', () => {
    it('should increase luminance', () => {
      const originalL = oklch(baseColor)!.l;
      const adjusted = adjustLuminance(baseColor, 1.2);
      expect(oklch(adjusted)!.l).toBeGreaterThan(originalL);
    });
    it('should decrease luminance', () => {
      const originalL = oklch(baseColor)!.l;
      const adjusted = adjustLuminance(baseColor, 0.8);
      expect(oklch(adjusted)!.l).toBeLessThan(originalL);
    });
  });

  describe('adjustChroma', () => {
    it('should increase chroma', () => {
      const originalC = oklch(baseColor)!.c;
      const adjusted = adjustChroma(baseColor, 1.2);
      expect(oklch(adjusted)!.c).toBeGreaterThan(originalC);
    });
    it('should decrease chroma', () => {
      const originalC = oklch(baseColor)!.c;
      const adjusted = adjustChroma(baseColor, 0.8);
      expect(oklch(adjusted)!.c).toBeLessThan(originalC);
    });
  });

  describe('adjustHue', () => {
    it('should adjust hue correctly', () => {
        const originalH = oklch(baseColor)!.h || 0;
        const adjusted = adjustHue(baseColor, 30);
        expect(oklch(adjusted)!.h).toBeCloseTo((originalH + 30) % 360, 0);
    });
  });
});
