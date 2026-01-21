import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { buildTheme } from '../lib/theme/engine.js';
import { usePaletteStore, selectPaletteSpec } from './usePaletteStore.js';
import React from 'react';

export const useTokenStore = create((set) => ({
  // Computed theme
  tokens: null,
  finalTokens: null,
  orderedStack: null,
  currentTheme: null,

  // Recompute tokens from palette spec
  computeTokens: (paletteSpec) => {
    const themeMaster = buildTheme({
      name: paletteSpec.customThemeName || `${paletteSpec.mode} ${paletteSpec.themeMode}`,
      baseColor: paletteSpec.baseColor,
      mode: paletteSpec.mode,
      themeMode: paletteSpec.themeMode,
      isDark: paletteSpec.themeMode === 'dark',
      printMode: paletteSpec.printMode,
      apocalypseIntensity: paletteSpec.apocalypseIntensity,
      harmonyIntensity: paletteSpec.harmonyIntensity,
      neutralCurve: paletteSpec.neutralCurve,
      accentStrength: paletteSpec.accentStrength,
      popIntensity: paletteSpec.popIntensity,
      importedOverrides: paletteSpec.importedOverrides,
    });

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
  const paletteSpec = usePaletteStore(useShallow(selectPaletteSpec));
  const computeTokens = useTokenStore((state) => state.computeTokens);

  React.useEffect(() => {
    computeTokens(paletteSpec);
  }, [paletteSpec, computeTokens]);
};