import { describe, expect, it } from 'vitest';
import { phraseToSeedColor, seedColorFromInput, toSeedHex } from './seedColor.js';

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

describe('seed input interpretation', () => {
  it('does not treat partial or malformed #hex as a phrase', () => {
    for (const value of ['#', '#1', '#12', '#1234', '#abcde', '#ggg']) {
      expect(seedColorFromInput(value)).toBeNull();
    }
  });

  it('accepts complete short and long hex codes and unprefixed paste', () => {
    expect(seedColorFromInput('#abc')).toBe('#aabbcc');
    expect(seedColorFromInput('#aabbcc')).toBe('#aabbcc');
    expect(toSeedHex('aabbcc')).toBe('#aabbcc');
  });

  it('preserves deterministic phrase-based inspiration', () => {
    expect(seedColorFromInput('winter orchard')).toBe(phraseToSeedColor('winter orchard'));
  });
});
