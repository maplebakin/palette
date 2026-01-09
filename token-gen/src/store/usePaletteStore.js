import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Slices:
// 1. paletteSlice    - baseColor, mode, themeMode, intensities
// 2. storageSlice    - savedPalettes, saveStatus, storage flags
// 3. exportSlice     - export state, asset generation state
// 4. projectSlice    - projectEdit, project export state

const createPaletteSlice = (set, get) => ({
  // Core palette state
  baseColor: '#7b241c',
  mode: 'Monochromatic',
  themeMode: 'dark',
  printMode: false,
  customThemeName: '',
  tokenPrefix: '',
  importedOverrides: null,

  // Intensity controls (single source of truth)
  harmonyIntensity: 100,
  apocalypseIntensity: 100,
  neutralCurve: 100,
  accentStrength: 100,
  popIntensity: 100,

  // Actions
  setBaseColor: (color) => set({ baseColor: color }),
  setMode: (mode) => set({ mode }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setPrintMode: (printMode) => set({ printMode }),
  setCustomThemeName: (name) => set({ customThemeName: name }),
  setTokenPrefix: (prefix) => set({ tokenPrefix: prefix }),
  setImportedOverrides: (overrides) => set({ importedOverrides: overrides }),

  // Debounced intensity setters (with cleanup)
  setHarmonyIntensity: (value) => set({ harmonyIntensity: value }),
  setApocalypseIntensity: (value) => set({ apocalypseIntensity: value }),
  setNeutralCurve: (value) => set({ neutralCurve: value }),
  setAccentStrength: (value) => set({ accentStrength: value }),
  setPopIntensity: (value) => set({ popIntensity: value }),

  // Bulk update (for loading saved palettes)
  loadPaletteSpec: (spec) => set({
    baseColor: spec.baseColor,
    mode: spec.mode,
    themeMode: spec.themeMode,
    printMode: spec.printMode ?? false,
    customThemeName: spec.customThemeName ?? '',
    tokenPrefix: spec.tokenPrefix ?? '',
    importedOverrides: spec.importedOverrides ?? null,
    harmonyIntensity: spec.harmonyIntensity ?? 100,
    apocalypseIntensity: spec.apocalypseIntensity ?? 100,
    neutralCurve: spec.neutralCurve ?? 100,
    accentStrength: spec.accentStrength ?? 100,
    popIntensity: spec.popIntensity ?? 100,
  }),

  // Serialization
  serializePalette: () => {
    const state = get();
    return {
      id: Date.now(),
      name: state.customThemeName || `${state.mode} ${state.themeMode}`,
      baseColor: state.baseColor,
      mode: state.mode,
      themeMode: state.themeMode,
      isDark: state.themeMode === 'dark',
      printMode: state.printMode,
      customThemeName: state.customThemeName,
      harmonyIntensity: state.harmonyIntensity,
      apocalypseIntensity: state.apocalypseIntensity,
      neutralCurve: state.neutralCurve,
      accentStrength: state.accentStrength,
      popIntensity: state.popIntensity,
      tokenPrefix: state.tokenPrefix,
      importedOverrides: state.importedOverrides,
    };
  },
});

const createStorageSlice = (set, get) => ({
  savedPalettes: [],
  saveStatus: '',
  storageAvailable: null,
  storageCorrupt: false,
  storageQuotaExceeded: false,

  setSavedPalettes: (palettes) => set({ savedPalettes: palettes }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setStorageAvailable: (available) => set({ storageAvailable: available }),
  setStorageCorrupt: (corrupt) => set({ storageCorrupt: corrupt }),
  setStorageQuotaExceeded: (exceeded) => set({ storageQuotaExceeded: exceeded }),

  // Save palette to localStorage
  saveCurrentPalette: () => {
    const state = get();
    if (!state.storageAvailable || state.storageCorrupt) {
      return { success: false, error: 'Storage unavailable' };
    }
    try {
      const palette = state.serializePalette();
      const filtered = state.savedPalettes.filter(p => p.name !== palette.name);
      const updated = [palette, ...filtered].slice(0, 20);
      localStorage.setItem('token-gen/saved-palettes', JSON.stringify(updated));
      set({ savedPalettes: updated, saveStatus: 'Saved' });
      return { success: true };
    } catch (err) {
      if (err?.name === 'QuotaExceededError') {
        set({ storageQuotaExceeded: true });
      }
      return { success: false, error: err.message };
    }
  },

  // Load palette by ID
  loadSavedPalette: (id) => {
    const state = get();
    const palette = state.savedPalettes.find(p => p.id === Number(id));
    if (!palette) return { success: false, error: 'Palette not found' };
    state.loadPaletteSpec(palette);
    return { success: true };
  },

  // Clear all saved data
  clearSavedData: () => {
    try {
      localStorage.removeItem('token-gen/saved-palettes');
      localStorage.removeItem('token-gen/current-palette');
      set({
        savedPalettes: [],
        storageCorrupt: false,
        storageQuotaExceeded: false
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
});

const createExportSlice = (set) => ({
  exportError: '',
  exportBlocked: false,
  printSupported: true,
  isExportingAssets: false,
  printMeta: {},

  setExportError: (error) => set({ exportError: error }),
  setExportBlocked: (blocked) => set({ exportBlocked: blocked }),
  setPrintSupported: (supported) => set({ printSupported: supported }),
  setIsExportingAssets: (exporting) => set({ isExportingAssets: exporting }),
  setPrintMeta: (meta) => set({ printMeta: meta }),
});

const createProjectSlice = (set) => ({
  projectEdit: null,
  projectExportStatus: '',
  projectExporting: false,
  projectPenpotStatus: '',
  projectPenpotExporting: false,

  setProjectEdit: (edit) => set({ projectEdit: edit }),
  setProjectExportStatus: (status) => set({ projectExportStatus: status }),
  setProjectExporting: (exporting) => set({ projectExporting: exporting }),
  setProjectPenpotStatus: (status) => set({ projectPenpotStatus: status }),
  setProjectPenpotExporting: (exporting) => set({ projectPenpotExporting: exporting }),
});

// Combine slices
export const usePaletteStore = create(
  persist(
    (set, get) => ({
      ...createPaletteSlice(set, get),
      ...createStorageSlice(set, get),
      ...createExportSlice(set),
      ...createProjectSlice(set),
    }),
    {
      name: 'token-gen/current-palette',
      partialize: (state) => ({
        // Only persist palette generation state
        baseColor: state.baseColor,
        mode: state.mode,
        themeMode: state.themeMode,
        printMode: state.printMode,
        customThemeName: state.customThemeName,
        tokenPrefix: state.tokenPrefix,
        importedOverrides: state.importedOverrides,
        harmonyIntensity: state.harmonyIntensity,
        apocalypseIntensity: state.apocalypseIntensity,
        neutralCurve: state.neutralCurve,
        accentStrength: state.accentStrength,
        popIntensity: state.popIntensity,
      }),
    }
  )
);

// Selectors (for optimized re-renders)
export const selectPaletteSpec = (state) => ({
  baseColor: state.baseColor,
  mode: state.mode,
  themeMode: state.themeMode,
  printMode: state.printMode,
  customThemeName: state.customThemeName,
  harmonyIntensity: state.harmonyIntensity,
  apocalypseIntensity: state.apocalypseIntensity,
  neutralCurve: state.neutralCurve,
  accentStrength: state.accentStrength,
  popIntensity: state.popIntensity,
  tokenPrefix: state.tokenPrefix,
  importedOverrides: state.importedOverrides,
});

export const selectIntensities = (state) => ({
  harmonyIntensity: state.harmonyIntensity,
  apocalypseIntensity: state.apocalypseIntensity,
  neutralCurve: state.neutralCurve,
  accentStrength: state.accentStrength,
  popIntensity: state.popIntensity,
});

export const selectStorageState = (state) => ({
  savedPalettes: state.savedPalettes,
  saveStatus: state.saveStatus,
  storageAvailable: state.storageAvailable,
  storageCorrupt: state.storageCorrupt,
  storageQuotaExceeded: state.storageQuotaExceeded,
});
