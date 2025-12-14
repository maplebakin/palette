import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePaletteStorage } from './usePaletteStorage';
import { useNotification } from '../context/NotificationContext';
import { generateTokens } from '../lib/tokens';

const clampValue = (val, min, max) => Math.min(max, Math.max(min, Number(val)));

const sanitizeColorInput = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const match = value.match(/#[0-9a-fA-F]{3,8}/);
  if (match) {
    const hex = match[0];
    if (hex.length === 4 || hex.length === 7 || hex.length === 9) return hex;
    if (hex.length > 7) return hex.slice(0, 7);
  }
  return fallback;
};

const presets = [
  { name: 'Midnight Indigo', base: '#6366f1', mode: 'Monochromatic', dark: true },
  { name: 'Solar Flare', base: '#f59e0b', mode: 'Analogous', dark: false },
  { name: 'Beef Ritual', base: '#beefbe', mode: 'Monochromatic', dark: true },
  { name: 'Corporate Compliance', base: '#000000', mode: 'Monochromatic', dark: true },
];

export function usePaletteState() {
  const { notify } = useNotification();
  const storage = usePaletteStorage();
  const initialLoad = useMemo(() => {
    const { current, saved } = storage.loadInitialState();
    const baseState = current && typeof current === 'object' ? current : {};
    return {
      baseColor: sanitizeColorInput(baseState.baseColor, '#6366f1'),
      mode: baseState.mode || 'Monochromatic',
      isDark: Boolean(baseState.isDark),
      printMode: Boolean(baseState.printMode),
      customThemeName: baseState.customThemeName || '',
      harmonyIntensity: baseState.harmonyIntensity ?? 100,
      apocalypseIntensity: baseState.apocalypseIntensity ?? 100,
      neutralCurve: baseState.neutralCurve ?? 100,
      accentStrength: baseState.accentStrength ?? 100,
      tokenPrefix: baseState.tokenPrefix || '',
      savedPalettes: Array.isArray(saved) ? saved : [],
    };
  }, [storage]);

  const [baseColor, setBaseColor] = useState(initialLoad.baseColor);
  const [mode, setMode] = useState(initialLoad.mode);
  const [isDark, setIsDark] = useState(initialLoad.isDark);
  const [printMode, setPrintMode] = useState(initialLoad.printMode);
  const [customThemeName, setCustomThemeName] = useState(initialLoad.customThemeName);
  const [harmonyIntensity, setHarmonyIntensity] = useState(initialLoad.harmonyIntensity);
  const [apocalypseIntensity, setApocalypseIntensity] = useState(initialLoad.apocalypseIntensity);
  const [neutralCurve, setNeutralCurve] = useState(initialLoad.neutralCurve);
  const [accentStrength, setAccentStrength] = useState(initialLoad.accentStrength);
  const [tokenPrefix, setTokenPrefix] = useState(initialLoad.tokenPrefix);
  const [savedPalettes, setSavedPalettes] = useState(initialLoad.savedPalettes);

  const applySavedPalette = useCallback((payload, showNotification = true) => {
    if (!payload || typeof payload !== 'object') return;
    const sanitized = sanitizeColorInput(payload.baseColor, '#6366f1');
    setBaseColor(sanitized);
    setMode(payload.mode || 'Monochromatic');
    setIsDark(Boolean(payload.isDark));
    setPrintMode(Boolean(payload.printMode));
    setCustomThemeName(payload.customThemeName || '');
    setHarmonyIntensity(payload.harmonyIntensity ?? 100);
    setApocalypseIntensity(payload.apocalypseIntensity ?? 100);
    setNeutralCurve(payload.neutralCurve ?? 100);
    setAccentStrength(payload.accentStrength ?? 100);
    setTokenPrefix(payload.tokenPrefix || '');
    if (showNotification) {
      notify(`Loaded "${payload.name || 'palette'}"`, 'success');
    }
  }, [notify]);

  const paletteState = useMemo(() => ({
    baseColor,
    mode,
    isDark,
    printMode,
    customThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    tokenPrefix,
  }), [baseColor, mode, isDark, printMode, customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, tokenPrefix]);

  const saveCurrentPaletteState = storage.saveCurrentPaletteState;

  useEffect(() => {
    saveCurrentPaletteState(paletteState);
  }, [paletteState, saveCurrentPaletteState]);
  
  const saveCurrentPalette = useCallback(() => {
    if (!storage.isAvailable) {
      notify('Saving is unavailable; storage is blocked', 'warn');
      return;
    }
    const autoThemeName = `${mode} ${isDark ? 'Dark' : 'Light'}`;
    const displayThemeName = customThemeName || autoThemeName;

    const payload = {
      ...paletteState,
      id: Date.now(),
      name: displayThemeName,
    };

    setSavedPalettes(prev => storage.saveSavedPalettes([payload, ...prev.filter(p => p.name !== payload.name)]));
    notify('Palette saved to this browser', 'success');
  }, [storage, paletteState, mode, isDark, customThemeName, notify]);

  const loadSavedPalette = useCallback((id) => {
    if (!id) return;
    const numericId = Number(id);
    const target = savedPalettes.find((item) => item.id === numericId);
    if (!target) {
      notify('Saved palette not found', 'warn');
      return;
    }
    applySavedPalette(target);
  }, [savedPalettes, applySavedPalette, notify]);

  const clearSavedData = useCallback(() => {
    storage.clearAllData();
    setSavedPalettes([]);
    notify('Saved data cleared', 'success');
  }, [storage, notify]);

  const applyPreset = useCallback((presetName) => {
    const p = presets.find((x) => x.name === presetName);
    if (!p) return;
    setBaseColor(p.base);
    setMode(p.mode);
    setIsDark(p.dark);
    setCustomThemeName(p.name);
    setHarmonyIntensity(100);
    setNeutralCurve(100);
    setAccentStrength(100);
    setApocalypseIntensity(100);
    notify(`Preset "${p.name}" applied`, 'success');
  }, [notify]);

  const randomize = useCallback(() => {
    const hues = ['#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
    const nextBase = hues[Math.floor(Math.random() * hues.length)];
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const nextDark = Math.random() > 0.5;

    setBaseColor(nextBase);
    setMode(nextMode);
    setIsDark(nextDark);
    setHarmonyIntensity(Math.round(70 + Math.random() * 80));
    setNeutralCurve(Math.round(80 + Math.random() * 50));
    setAccentStrength(Math.round(80 + Math.random() * 50));

    if (nextMode === 'Apocalypse') {
      setApocalypseIntensity(Math.round(50 + Math.random() * 100));
    }
  }, []);
  
  const tokens = useMemo(
    () => generateTokens(baseColor, mode, isDark ? 'dark' : 'light', apocalypseIntensity, {
      harmonyIntensity,
      neutralCurve,
      accentStrength,
    }),
    [baseColor, mode, isDark, apocalypseIntensity, harmonyIntensity, neutralCurve, accentStrength]
  );
  
  return {
    ...paletteState,
    setBaseColor,
    setMode,
    setIsDark,
    setPrintMode,
    setCustomThemeName,
    setHarmonyIntensity: (v) => setHarmonyIntensity(clampValue(v, 50, 160)),
    setApocalypseIntensity: (v) => setApocalypseIntensity(clampValue(v, 20, 150)),
    setNeutralCurve: (v) => setNeutralCurve(clampValue(v, 60, 140)),
    setAccentStrength: (v) => setAccentStrength(clampValue(v, 60, 140)),
    setTokenPrefix,
    savedPalettes,
    saveCurrentPalette,
    loadSavedPalette,
    clearSavedData,
    storage,
    tokens,
    applyPreset,
    randomize,
  };
}
