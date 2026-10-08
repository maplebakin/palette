// Regeneration varies the strength of the selected harmony without secretly
// replacing the authored seed. The seed field, mood suggestions and generated
// surface/role palette must all agree on their original hue reference.
export const GENERATION_HARMONY_INTENSITIES = Object.freeze([100, 114, 86, 126, 94, 108, 78, 120]);

export const getSeedRegeneration = (state = {}) => {
  const count = Number.isSafeInteger(state.regenerateCount) && state.regenerateCount >= 0
    ? state.regenerateCount
    : 0;
  return {
    baseColor: state.baseColor,
    harmonyIntensity: GENERATION_HARMONY_INTENSITIES[count % GENERATION_HARMONY_INTENSITIES.length],
  };
};
