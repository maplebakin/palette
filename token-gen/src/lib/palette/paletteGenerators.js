/**
 * Generates random palette parameters
 * @returns {Object} Random palette spec
 */
export const generateRandomPalette = () => {
  const randomHex = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
  const themeModes = ['light', 'dark', 'pop'];

  return {
    baseColor: randomHex(),
    mode: modes[Math.floor(Math.random() * modes.length)],
    themeMode: themeModes[Math.floor(Math.random() * themeModes.length)],
    harmonyIntensity: 70 + Math.floor(Math.random() * 60), // 70-130
    apocalypseIntensity: 80 + Math.floor(Math.random() * 40), // 80-120
    neutralCurve: 90 + Math.floor(Math.random() * 20), // 90-110
    accentStrength: 90 + Math.floor(Math.random() * 20), // 90-110
    popIntensity: 100,
  };
};

/**
 * "Cranked" apocalypse mode (maxes out intensity)
 * @param {Object} currentState - Current palette spec
 * @returns {Object} Updated spec with apocalypse cranked
 */
export const crankApocalypsePalette = (currentState) => ({
  ...currentState,
  mode: 'Apocalypse',
  apocalypseIntensity: 150,
  harmonyIntensity: 120,
});