import { describe, expect, it } from 'vitest';
import { formatArtifactName } from './artifactNaming.js';
import { isCustom } from './honestyPredicate.js';

describe('isCustom honesty predicate', () => {
  it('keeps an untouched curated preset honest', () => {
    expect(isCustom({ userHasMutated: false, isChaosMinted: false })).toBe(false);
  });

  it.each([
    'lock',
    'slider nudge',
    'harmony change',
    'seed edit',
    'regenerate',
  ])('marks a single %s mutation as custom', () => {
    expect(isCustom({ userHasMutated: true, isChaosMinted: false })).toBe(true);
  });

  it('marks Chaos as custom with a new exploration identity', () => {
    expect(isCustom({ userHasMutated: false, isChaosMinted: true })).toBe(true);
    expect(formatArtifactName({ explorationName: 'Moonlit Static' })).toBe('Exploration — Moonlit Static');
    expect(formatArtifactName({ explorationName: 'Moonlit Static' })).not.toContain('Artifact No.');
  });

  it('returns to the original state after a true seed reset', () => {
    expect(isCustom({ userHasMutated: false, isChaosMinted: false })).toBe(false);
  });

  it('does not depend on color distance', () => {
    expect(isCustom({ userHasMutated: false, isChaosMinted: false, colorDistance: 0 })).toBe(false);
    expect(isCustom({ userHasMutated: false, isChaosMinted: false, colorDistance: 100 })).toBe(false);
  });
});
