import { create } from 'zustand';
import { buildTheme } from '../lib/theme/engine.js';
import { usePaletteStore, selectPaletteSpec } from './usePaletteStore.js';
import React from 'react';

const buildThemeFromSpec = (paletteSpec) => buildTheme({
  name: paletteSpec.customThemeName || `${paletteSpec.mode} ${paletteSpec.themeMode}`,
  baseColor: paletteSpec.baseColor,
  mode: paletteSpec.mode,
  themeMode: paletteSpec.themeMode,
  isDark: paletteSpec.themeMode === 'dark',
  printMode: paletteSpec.printMode,
  harmonyIntensity: paletteSpec.harmonyIntensity,
  apocalypseIntensity: paletteSpec.apocalypseIntensity,
  neutralCurve: paletteSpec.neutralCurve,
  accentStrength: paletteSpec.accentStrength,
  popIntensity: paletteSpec.popIntensity,
  importedOverrides: paletteSpec.importedOverrides,
});

const initialSpec = selectPaletteSpec(usePaletteStore.getState());
const initialTheme = buildThemeFromSpec(initialSpec);

export const useTokenStore = create((set) => ({
  // Computed theme
  tokens: initialTheme.tokens,
  finalTokens: initialTheme.finalTokens,
  orderedStack: initialTheme.orderedStack,
  currentTheme: initialTheme.currentTheme,

  // Recompute tokens from palette spec
  computeTokens: (paletteSpec) => {
    const themeMaster = buildThemeFromSpec(paletteSpec);

    set({
      tokens: themeMaster.tokens,
      finalTokens: themeMaster.finalTokens,
      orderedStack: themeMaster.orderedStack,
      currentTheme: themeMaster.currentTheme,
    });
  },
}));

// Hook to auto-compute tokens when palette changes
export const useTokenComputation = () => {
  const baseColor = usePaletteStore((state) => state.baseColor);
  const mode = usePaletteStore((state) => state.mode);
  const themeMode = usePaletteStore((state) => state.themeMode);
  const printMode = usePaletteStore((state) => state.printMode);
  const customThemeName = usePaletteStore((state) => state.customThemeName);
  const harmonyIntensity = usePaletteStore((state) => state.harmonyIntensity);
  const apocalypseIntensity = usePaletteStore((state) => state.apocalypseIntensity);
  const neutralCurve = usePaletteStore((state) => state.neutralCurve);
  const accentStrength = usePaletteStore((state) => state.accentStrength);
  const popIntensity = usePaletteStore((state) => state.popIntensity);
  const importedOverrides = usePaletteStore((state) => state.importedOverrides);
  const computeTokens = useTokenStore((state) => state.computeTokens);

  const paletteSpec = React.useMemo(() => ({
    baseColor,
    mode,
    themeMode,
    printMode,
    customThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    importedOverrides,
  }), [
    baseColor,
    mode,
    themeMode,
    printMode,
    customThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    importedOverrides,
  ]);

  React.useEffect(() => {
    computeTokens(paletteSpec);
  }, [paletteSpec, computeTokens]);
};
