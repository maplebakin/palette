import { create } from 'zustand';
import {
  sanitizeHexInput,
  sanitizePrefix,
  sanitizeThemeName,
} from '../lib/appState.js';

const resolveUpdater = (value, current) => (
  typeof value === 'function' ? value(current) : value
);

const MAX_HISTORY = 50;

const applyHistoryState = (state, payload) => ({
  ...state,
  baseColor: payload.baseColor,
  baseInput: payload.baseInput,
  baseError: payload.baseError,
  mode: payload.mode,
  themeMode: payload.themeMode,
  printMode: payload.printMode,
  customThemeName: payload.customThemeName,
  harmonyIntensity: payload.harmonyIntensity,
  apocalypseIntensity: payload.apocalypseIntensity,
  neutralCurve: payload.neutralCurve,
  accentStrength: payload.accentStrength,
  popIntensity: payload.popIntensity,
  tokenPrefix: payload.tokenPrefix,
  importedOverrides: payload.importedOverrides,
});

export const usePaletteStore = create((set, get) => ({
  baseColor: '#7b241c',
  baseInput: '#7b241c',
  baseError: '',
  mode: 'Monochromatic',
  themeMode: 'dark',
  printMode: false,
  customThemeName: '',
  importedOverrides: null,
  harmonyIntensity: 100,
  apocalypseIntensity: 100,
  neutralCurve: 100,
  accentStrength: 100,
  popIntensity: 100,
  harmonyInput: 100,
  neutralInput: 100,
  accentInput: 100,
  apocalypseInput: 100,
  popInput: 100,
  tokenPrefix: '',
  savedPalettes: [],
  saveStatus: '',
  storageAvailable: null,
  storageCorrupt: false,
  storageQuotaExceeded: false,
  history: [],
  currentIndex: -1,

  setBaseColor: (value) => set((state) => ({ baseColor: resolveUpdater(value, state.baseColor) })),
  setBaseInput: (value) => set((state) => ({ baseInput: resolveUpdater(value, state.baseInput) })),
  setBaseError: (value) => set((state) => ({ baseError: resolveUpdater(value, state.baseError) })),
  setMode: (value) => set((state) => ({ mode: resolveUpdater(value, state.mode) })),
  setThemeMode: (value) => set((state) => ({ themeMode: resolveUpdater(value, state.themeMode) })),
  setPrintMode: (value) => set((state) => ({ printMode: resolveUpdater(value, state.printMode) })),
  setCustomThemeName: (value) => set((state) => ({ customThemeName: resolveUpdater(value, state.customThemeName) })),
  setImportedOverrides: (value) => set((state) => ({ importedOverrides: resolveUpdater(value, state.importedOverrides) })),
  setHarmonyIntensity: (value) => set((state) => ({ harmonyIntensity: resolveUpdater(value, state.harmonyIntensity) })),
  setApocalypseIntensity: (value) => set((state) => ({ apocalypseIntensity: resolveUpdater(value, state.apocalypseIntensity) })),
  setNeutralCurve: (value) => set((state) => ({ neutralCurve: resolveUpdater(value, state.neutralCurve) })),
  setAccentStrength: (value) => set((state) => ({ accentStrength: resolveUpdater(value, state.accentStrength) })),
  setPopIntensity: (value) => set((state) => ({ popIntensity: resolveUpdater(value, state.popIntensity) })),
  setHarmonyInput: (value) => set((state) => ({ harmonyInput: resolveUpdater(value, state.harmonyInput) })),
  setNeutralInput: (value) => set((state) => ({ neutralInput: resolveUpdater(value, state.neutralInput) })),
  setAccentInput: (value) => set((state) => ({ accentInput: resolveUpdater(value, state.accentInput) })),
  setApocalypseInput: (value) => set((state) => ({ apocalypseInput: resolveUpdater(value, state.apocalypseInput) })),
  setPopInput: (value) => set((state) => ({ popInput: resolveUpdater(value, state.popInput) })),
  setTokenPrefix: (value) => set((state) => ({ tokenPrefix: resolveUpdater(value, state.tokenPrefix) })),
  setSavedPalettes: (value) => set((state) => ({ savedPalettes: resolveUpdater(value, state.savedPalettes) })),
  setSaveStatus: (value) => set((state) => ({ saveStatus: resolveUpdater(value, state.saveStatus) })),
  setStorageAvailable: (value) => set((state) => ({ storageAvailable: resolveUpdater(value, state.storageAvailable) })),
  setStorageCorrupt: (value) => set((state) => ({ storageCorrupt: resolveUpdater(value, state.storageCorrupt) })),
  setStorageQuotaExceeded: (value) => set((state) => ({ storageQuotaExceeded: resolveUpdater(value, state.storageQuotaExceeded) })),

  applySavedPalette: (payload) => set((state) => {
    if (!payload || typeof payload !== 'object') return state;
    const sanitized = sanitizeHexInput(payload.baseColor, '#6366f1');
    const savedThemeMode = payload.themeMode || (payload.isDark ? 'dark' : 'light');
    const savedOverrides = payload.importedOverrides;
    return {
      ...state,
      baseColor: sanitized,
      baseInput: sanitized,
      baseError: '',
      mode: payload.mode || 'Monochromatic',
      themeMode: savedThemeMode,
      printMode: Boolean(payload.printMode),
      customThemeName: sanitizeThemeName(payload.customThemeName || '', ''),
      harmonyIntensity: payload.harmonyIntensity ?? 100,
      apocalypseIntensity: payload.apocalypseIntensity ?? 100,
      neutralCurve: payload.neutralCurve ?? 100,
      accentStrength: payload.accentStrength ?? 100,
      popIntensity: payload.popIntensity ?? 100,
      harmonyInput: payload.harmonyIntensity ?? 100,
      apocalypseInput: payload.apocalypseIntensity ?? 100,
      neutralInput: payload.neutralCurve ?? 100,
      accentInput: payload.accentStrength ?? 100,
      popInput: payload.popIntensity ?? 100,
      tokenPrefix: sanitizePrefix(payload.tokenPrefix || ''),
      importedOverrides: savedOverrides && typeof savedOverrides === 'object' ? savedOverrides : null,
    };
  }),

  resetPaletteState: () => set((state) => ({
    ...state,
    baseColor: '#7b241c',
    mode: 'Monochromatic',
    themeMode: 'dark',
    printMode: false,
    customThemeName: '',
    harmonyIntensity: 100,
    apocalypseIntensity: 100,
    neutralCurve: 100,
    accentStrength: 100,
    popIntensity: 100,
    tokenPrefix: '',
    importedOverrides: null,
  })),

  captureHistoryState: () => {
    const state = get();
    return {
      baseColor: state.baseColor,
      baseInput: state.baseInput,
      baseError: state.baseError,
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
    };
  },

  pushHistoryState: (nextState) => set((state) => {
    const currentHistory = state.history.slice(0, state.currentIndex + 1);
    currentHistory.push(nextState);
    if (currentHistory.length > MAX_HISTORY) {
      currentHistory.shift();
      return {
        history: currentHistory,
        currentIndex: MAX_HISTORY - 1,
      };
    }
    return {
      history: currentHistory,
      currentIndex: currentHistory.length - 1,
    };
  }),

  undo: () => set((state) => {
    if (state.currentIndex <= 0) return state;
    const prevState = state.history[state.currentIndex - 1];
    if (!prevState) return state;
    return applyHistoryState({
      ...state,
      currentIndex: state.currentIndex - 1,
    }, prevState);
  }),

  redo: () => set((state) => {
    if (state.currentIndex >= state.history.length - 1) return state;
    const nextState = state.history[state.currentIndex + 1];
    if (!nextState) return state;
    return applyHistoryState({
      ...state,
      currentIndex: state.currentIndex + 1,
    }, nextState);
  }),
}));
