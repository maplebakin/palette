import { describe, expect, it } from 'vitest';
import {
  buildClimaxGateCopy,
  buildKitSpecificityLine,
  getClimaxGateTier,
} from './climaxGate.js';

const NUCLEAR_WINTER = {
  artifactNo: '0417',
  name: 'Nuclear Winter',
  price: 9,
  totalTokens: 59,
  coreColors: 6,
  tintsPerColor: 9,
  formats: ['ase', 'swatches', 'gpl', 'css', 'json'],
};

describe('ClimaxGate branch logic', () => {
  it('builds the exact curated CTA from the manifest price', () => {
    expect(buildClimaxGateCopy({ manifest: NUCLEAR_WINTER, isCustom: false })).toEqual(expect.objectContaining({
      primaryCta: 'Get the Nuclear Winter Kit — $9',
      title: 'Nuclear Winter Kit',
    }));
  });

  it('builds the custom exploration branch and base-kit anchor', () => {
    const ashfall = { ...NUCLEAR_WINTER, artifactNo: '0418', name: 'Ashfall Bloom' };
    const copy = buildClimaxGateCopy({ manifest: ashfall, isCustom: true });

    expect(copy).toEqual(expect.objectContaining({
      title: 'Custom exploration',
      bridgeCopy: "This exact palette isn't for sale — it's a sketch. The kits are the finished paintings: contrast-checked, Light/Dark/Pop variants, supported.",
      baseKitAnchor: 'Download the base Ashfall Bloom Kit — $9 for all 59 tokens',
    }));
  });

  it('computes specificity from a fixture manifest', () => {
    expect(buildKitSpecificityLine({
      artifactNo: '0999',
      coreColors: 4,
      tintsPerColor: 5,
      formats: ['css', 'json', 'gpl'],
    })).toBe('No. 0999 — 4 core colors, 20 tints, 3 formats');
  });

  it('maps every upsell source to one gate tier', () => {
    expect(getClimaxGateTier('vault-click')).toBe('detail');
    expect(getClimaxGateTier('token-fade')).toBe('purchase');
    expect(getClimaxGateTier('multi-select')).toBe('takeover');
    expect(getClimaxGateTier('sticky-bar')).toBe('takeover');
    expect(getClimaxGateTier('see-full-kit')).toBe('takeover');
  });
});
