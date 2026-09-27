import { describe, expect, it } from 'vitest';
import { buildVaultCards } from './vaultMetadata.js';

describe('buildVaultCards', () => {
  it('exposes metadata on hover without rendering file contents', () => {
    const cards = buildVaultCards({
      formats: ['ase', 'css', 'json'],
      coreColors: 6,
      tintsPerColor: 9,
    });

    expect(cards).toEqual([
      expect.objectContaining({ label: '.ase', metadata: '6 core colors · 9 tints per color' }),
      expect.objectContaining({ label: 'CSS', metadata: 'Semantic token names' }),
      expect.objectContaining({ label: 'JSON', metadata: 'Machine-readable token map' }),
    ]);
    expect(cards.every((card) => !('contents' in card))).toBe(true);
    expect(JSON.stringify(cards)).not.toMatch(/--[a-z]|#[0-9a-f]{3,8}/i);
  });
});
