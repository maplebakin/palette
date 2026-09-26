import { describe, expect, it } from 'vitest';
import { KITS } from '../data/kits.js';
import { formatArtifactName } from './artifactNaming.js';

describe('artifact naming', () => {
  it('uses the Artifact No. prefix for curated kits', () => {
    expect(formatArtifactName({ kit: KITS[0] })).toBe('Artifact No. 0417 — Nuclear Winter');
  });

  it('uses the Exploration prefix for names outside the curated kit manifest', () => {
    expect(formatArtifactName({ explorationName: 'Moonlit Static' })).toBe('Exploration — Moonlit Static');
    expect(formatArtifactName({ kit: { id: 'one-off', name: 'Moonlit Static' } })).toBe('Exploration — Moonlit Static');
  });
});
