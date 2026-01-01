import { addPrintMode, buildOrderedStack, generateTokens } from '../tokens.js';

const applyTokenOverrides = (baseTokens, overrides) => {
  if (!overrides || Object.keys(overrides).length === 0) return baseTokens;
  const next = typeof structuredClone === 'function'
    ? structuredClone(baseTokens)
    : JSON.parse(JSON.stringify(baseTokens));
  Object.entries(overrides).forEach(([path, value]) => {
    const parts = path.split('.');
    let current = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    current[parts[parts.length - 1]] = value;
  });
  return next;
};

export const buildTheme = (input = {}) => {
  const {
    name = 'Theme',
    baseColor = '#6366f1',
    mode = 'Monochromatic',
    themeMode = 'dark',
    isDark = themeMode === 'dark',
    printMode = false,
    apocalypseIntensity = 100,
    harmonyIntensity = 100,
    neutralCurve = 100,
    accentStrength = 100,
    popIntensity = 100,
    importedOverrides = null,
  } = input;

  const generated = generateTokens(baseColor, mode, themeMode, apocalypseIntensity, {
    harmonyIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    printMode,
  });
  const tokens = applyTokenOverrides(generated, importedOverrides);
  const finalTokens = printMode ? addPrintMode(tokens, baseColor, mode, isDark) : tokens;
  const orderedStack = buildOrderedStack(finalTokens);
  const currentTheme = {
    name,
    mode,
    themeMode,
    isDark,
    baseColor,
    tokens: finalTokens,
    printMode,
  };

  return {
    tokens,
    finalTokens,
    orderedStack,
    currentTheme,
  };
};
