import { describe, expect, it } from 'vitest';
import { KITS } from '../data/kits.js';
import {
  buildKitManifestEntry,
  getNextArtifactNumber,
  isArtifactNumberUnique,
  validateArtifactNumber,
} from './kitManifest.js';

describe('kit manifest builder', () => {
  it('computes totals from an unusual palette shape', () => {
    const palette = {
      coreColors: ['#111111', '#222222', '#333333'],
      tints: {
        ink: ['#111111', '#444444', '#777777', '#aaaaaa'],
        ember: ['#222222', '#555555', '#888888', '#bbbbbb'],
        moss: ['#333333', '#666666', '#999999', '#cccccc'],
      },
      semanticTokens: ['surface', 'text'],
    };

    const entry = buildKitManifestEntry(palette, {
      name: 'Odd Geometry',
      artifactNo: '0991',
      price: 13,
      teaserTokenCount: 5,
    });

    expect(entry).toMatchObject({
      id: 'odd-geometry',
      artifactNo: '0991',
      name: 'Odd Geometry',
      price: 13,
      teaserTokenCount: 5,
      coreColors: 3,
      tintsPerColor: 4,
      totalTokens: 14,
      formats: ['ase', 'swatches', 'gpl', 'css', 'json'],
      includesContrastMatrix: true,
      modes: ['light', 'dark', 'pop'],
    });
  });

  it('suggests the next artifact number and validates uniqueness against the manifest', () => {
    const fixtureKits = [
      { artifactNo: '0417' },
      { artifactNo: '0421' },
    ];

    expect(getNextArtifactNumber(fixtureKits)).toBe('0422');
    expect(isArtifactNumberUnique('0422', fixtureKits)).toBe(true);
    expect(isArtifactNumberUnique('0421', fixtureKits)).toBe(false);
    expect(validateArtifactNumber('0421', fixtureKits)).toMatchObject({
      valid: false,
      message: 'That artifact number is already in the collection.',
    });
    expect(validateArtifactNumber('0422', fixtureKits)).toMatchObject({ valid: true });
  });

  it('uses the real collection when no fixture is supplied', () => {
    expect(getNextArtifactNumber(KITS)).toBe('0420');
  });
});
