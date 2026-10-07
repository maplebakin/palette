import { describe, expect, it } from 'vitest';
import { phraseToSeedColor } from './seedColor.js';

describe('phraseToSeedColor', () => {
  it('returns the same valid seed for the same phrase and trims surrounding whitespace', () => {
    expect(phraseToSeedColor('  winter orchard  ')).toBe(phraseToSeedColor('winter orchard'));
    expect(phraseToSeedColor('winter orchard')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('maps different phrases to different seeds', () => {
    expect(phraseToSeedColor('winter orchard')).not.toBe(phraseToSeedColor('summer orchard'));
    expect(phraseToSeedColor('   ')).toBeNull();
  });
});
