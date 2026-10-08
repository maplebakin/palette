import { describe, expect, it } from 'vitest';
import { getSeedRegeneration, GENERATION_HARMONY_INTENSITIES } from './tastingGeneration.js';

describe('regenerate from authored seed', () => {
  it.each(['#987f9d', '#7f1d1d', '#30c5d2', '#eeeeee', '#1b1324'])(
    'keeps %s as the engine seed through the full regeneration cycle',
    (baseColor) => {
      for (let regenerateCount = 0; regenerateCount < 16; regenerateCount += 1) {
        expect(getSeedRegeneration({ baseColor, regenerateCount }).baseColor).toBe(baseColor);
      }
    },
  );

  it('still changes harmony strength and eventually loops deterministically', () => {
    const strengths = GENERATION_HARMONY_INTENSITIES.map((_, regenerateCount) => (
      getSeedRegeneration({ baseColor: '#987f9d', regenerateCount }).harmonyIntensity
    ));
    expect(new Set(strengths).size).toBeGreaterThan(1);
    expect(getSeedRegeneration({ baseColor: '#987f9d', regenerateCount: 8 })).toEqual(
      getSeedRegeneration({ baseColor: '#987f9d', regenerateCount: 0 }),
    );
  });
});
