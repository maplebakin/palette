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

  const nextBase = randomHex();
  const nextMode = modes[Math.floor(Math.random() * modes.length)];
  const nextThemeMode = themeModes[Math.floor(Math.random() * themeModes.length)];

  return {
    baseColor: nextBase,
    mode: nextMode,
    themeMode: nextThemeMode,
    harmonyIntensity: Math.round(70 + Math.random() * 80), // 70-150
    apocalypseIntensity: Math.round(50 + Math.random() * 100), // 50-150
    neutralCurve: Math.round(80 + Math.random() * 50), // 80-130
    accentStrength: Math.round(80 + Math.random() * 50), // 80-130
    popIntensity: 100,
  };
};

/**
 * "Cranks" apocalypse mode (maxes out intensity)
 * @param {Object} currentState - Current palette spec
 * @returns {Object} Updated spec with apocalypse cranked
 */
export const crankApocalypsePalette = (currentState) => ({
  ...currentState,
  mode: 'Apocalypse',
  apocalypseIntensity: 150,
  harmonyIntensity: 120,
});
