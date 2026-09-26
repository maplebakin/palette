import { describe, expect, it } from 'vitest';
import { BUNDLE, KITS } from './kits.js';

const requiredFields = [
  'id',
  'artifactNo',
  'name',
  'price',
  'teaserTokenCount',
  'totalTokens',
  'coreColors',
  'tintsPerColor',
  'formats',
  'includesContrastMatrix',
  'modes',
];

describe('kit manifest', () => {
  it('contains the three launch kits with the complete manifest shape', () => {
    expect(KITS.map((kit) => kit.name)).toEqual([
      'Nuclear Winter',
      'Ashfall Bloom',
      'Vapor Dream',
    ]);

    KITS.forEach((kit) => {
      requiredFields.forEach((field) => {
        expect(kit).toHaveProperty(field);
      });
      expect(typeof kit.price).toBe('number');
      expect(kit.teaserTokenCount).toBe(12);
      expect(kit.totalTokens).toBe(59);
      expect(kit.coreColors).toBe(6);
      expect(kit.tintsPerColor).toBe(9);
      expect(kit.formats).toEqual(['ase', 'swatches', 'gpl', 'css', 'json']);
      expect(kit.includesContrastMatrix).toBe(true);
      expect(kit.modes).toEqual(['light', 'dark', 'pop']);
    });
  });

  it('defines the future-proof bundle offer', () => {
    expect(BUNDLE).toEqual({
      price: 39,
      blurb: 'All kits, present and future.',
    });
  });
});
