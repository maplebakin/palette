import { describe, expect, it } from 'vitest';
import { BUNDLE, INSPIRATION_SEEDS, IN_THE_FORGE, KITS, KIT_SEEDS } from './kits.js';

const requiredFields = [
  'id',
  'artifactNo',
  'name',
  'tagline',
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
  it('lists only finished kits with the complete manifest shape', () => {
    expect(KITS.map((kit) => kit.name)).toEqual(['Nuclear Winter']);

    KITS.forEach((kit) => {
      requiredFields.forEach((field) => {
        expect(kit).toHaveProperty(field);
      });
      expect(typeof kit.price).toBe('number');
      expect(kit.teaserTokenCount).toBe(12);
      expect(kit.totalTokens).toBe(59);
      expect(kit.coreColors).toBe(6);
      expect(kit.tintsPerColor).toBe(9);
      expect(kit.formats).toEqual(['ase', 'swatches', 'gpl', 'css', 'json', 'figma-tokens', 'tailwind']);
      expect(kit.includesContrastMatrix).toBe(true);
      expect(kit.modes).toEqual(['light', 'dark', 'pop']);
    });
  });

  it('keeps unfinished palettes out of the purchasable kit list', () => {
    const finishedIds = new Set(KITS.map((kit) => kit.id));
    IN_THE_FORGE.forEach(({ id }) => {
      expect(finishedIds.has(id)).toBe(false);
      expect(KIT_SEEDS[id]).toBeDefined();
    });
  });

  it('offers every seed as playground inspiration', () => {
    INSPIRATION_SEEDS.forEach(({ id, name }) => {
      expect(KIT_SEEDS[id]).toBeDefined();
      expect(typeof name).toBe('string');
    });
  });

  it('defines the future bundle offer without advertising it yet', () => {
    expect(BUNDLE).toEqual({
      price: 39,
      blurb: 'All available kits.',
    });
  });
});
