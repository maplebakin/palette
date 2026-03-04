import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePaletteStore } from './paletteStore.js';

const initialState = usePaletteStore.getState();

const resetStore = () => {
  usePaletteStore.setState(initialState, true);
};

describe('paletteStore', () => {
  beforeEach(() => {
    act(() => {
      resetStore();
    });
  });

  afterEach(() => {
    act(() => {
      resetStore();
    });
  });

  it('updates palette state with direct values and functional updaters', () => {
    const { result } = renderHook(() => usePaletteStore());

    act(() => {
      result.current.setBaseColor('#112233');
      result.current.setMode('Analogous');
      result.current.setThemeMode('light');
      result.current.setPrintMode(true);
      result.current.setTokenPrefix('demo');
      result.current.setHarmonyIntensity((value) => value + 12);
    });

    expect(result.current.baseColor).toBe('#112233');
    expect(result.current.mode).toBe('Analogous');
    expect(result.current.themeMode).toBe('light');
    expect(result.current.printMode).toBe(true);
    expect(result.current.tokenPrefix).toBe('demo');
    expect(result.current.harmonyIntensity).toBe(112);
  });

  it('applies a saved palette and sanitizes imported values', () => {
    const { result } = renderHook(() => usePaletteStore());

    act(() => {
      result.current.applySavedPalette({
        baseColor: 'abc',
        mode: 'Apocalypse',
        isDark: true,
        printMode: 1,
        customThemeName: ' Theme<> Name ',
        harmonyIntensity: 140,
        apocalypseIntensity: 130,
        neutralCurve: 90,
        accentStrength: 110,
        popIntensity: 120,
        tokenPrefix: 'demo prefix!*',
        importedOverrides: { 'brand.primary': '#123456' },
      });
    });

    expect(result.current.baseColor).toBe('#abc');
    expect(result.current.baseInput).toBe('#abc');
    expect(result.current.baseError).toBe('');
    expect(result.current.themeMode).toBe('dark');
    expect(result.current.printMode).toBe(true);
    expect(result.current.customThemeName).toBe('Theme Name');
    expect(result.current.tokenPrefix).toBe('demoprefix');
    expect(result.current.importedOverrides).toEqual({ 'brand.primary': '#123456' });
    expect(result.current.harmonyInput).toBe(140);
    expect(result.current.apocalypseInput).toBe(130);
    expect(result.current.neutralInput).toBe(90);
    expect(result.current.accentInput).toBe(110);
    expect(result.current.popInput).toBe(120);
  });

  it('captures history snapshots and supports undo/redo', () => {
    const { result } = renderHook(() => usePaletteStore());
    const first = result.current.captureHistoryState();

    act(() => {
      result.current.pushHistoryState(first);
      result.current.applySavedPalette({
        baseColor: '#445566',
        mode: 'Complementary',
        themeMode: 'light',
        customThemeName: 'Second',
      });
      result.current.pushHistoryState(result.current.captureHistoryState());
      result.current.undo();
    });

    expect(result.current.baseColor).toBe('#7b241c');
    expect(result.current.mode).toBe('Monochromatic');
    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.redo();
    });

    expect(result.current.baseColor).toBe('#445566');
    expect(result.current.mode).toBe('Complementary');
    expect(result.current.themeMode).toBe('light');
    expect(result.current.customThemeName).toBe('Second');
    expect(result.current.currentIndex).toBe(1);
  });

  it('resets palette values back to defaults without clearing saved palettes', () => {
    const { result } = renderHook(() => usePaletteStore());

    act(() => {
      result.current.setSavedPalettes([{ id: 1, name: 'Saved' }]);
      result.current.setBaseColor('#ffffff');
      result.current.setMode('Tertiary');
      result.current.setThemeMode('pop');
      result.current.setPrintMode(true);
      result.current.setCustomThemeName('Changed');
      result.current.resetPaletteState();
    });

    expect(result.current.baseColor).toBe('#7b241c');
    expect(result.current.mode).toBe('Monochromatic');
    expect(result.current.themeMode).toBe('dark');
    expect(result.current.printMode).toBe(false);
    expect(result.current.customThemeName).toBe('');
    expect(result.current.savedPalettes).toEqual([{ id: 1, name: 'Saved' }]);
  });
});
