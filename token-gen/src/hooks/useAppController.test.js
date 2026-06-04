import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAppController from './useAppController.js';
import { useExportStore } from '../store/exportStore.js';
import { usePaletteStore } from '../store/paletteStore.js';
import { useProjectStore } from '../store/projectStore.js';
import { useUiStore } from '../store/uiStore.js';

const workflowExportMocks = vi.hoisted(() => ({
  downloadAllModeThemePackArchive: vi.fn(async () => undefined),
}));

vi.mock('../lib/exports/workflowExports.js', () => workflowExportMocks);

const initialPaletteState = usePaletteStore.getState();
const initialUiState = useUiStore.getState();
const initialExportState = useExportStore.getState();
const initialProjectState = useProjectStore.getState();

const resetStores = () => {
  usePaletteStore.setState(initialPaletteState, true);
  useUiStore.setState(initialUiState, true);
  useExportStore.setState(initialExportState, true);
  useProjectStore.setState(initialProjectState, true);
};

const installStorageMock = () => {
  const storage = new Map();
  const localStorageMock = {
    getItem: vi.fn((key) => storage.get(key) ?? null),
    setItem: vi.fn((key, value) => storage.set(key, String(value))),
    removeItem: vi.fn((key) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
  return localStorageMock;
};

describe('useAppController Theme Pack export wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
    installStorageMock();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('passes confirmedVariants and current resolved fallback data to all-mode Theme Pack export', async () => {
    const lightSnapshot = {
      signature: 'light-approved',
      finalTokens: {
        brand: { cta: '#112233' },
        surfaces: { background: '#ffffff' },
      },
      orderedStack: [{ path: 'brand.cta', value: '#112233' }],
      currentTheme: {
        name: 'Stored Light',
        mode: 'Monochromatic',
        themeMode: 'light',
        isDark: false,
        baseColor: '#6633ff',
        tokens: {
          brand: { cta: '#112233' },
          surfaces: { background: '#ffffff' },
        },
      },
    };

    act(() => {
      usePaletteStore.setState({
        baseColor: '#6633ff',
        baseInput: '#6633ff',
        mode: 'Monochromatic',
        themeMode: 'dark',
        printMode: false,
        customThemeName: 'Export Wiring',
        confirmedVariants: {
          light: lightSnapshot,
        },
      });
    });

    const { result } = renderHook(() => useAppController());

    await waitFor(() => {
      expect(result.current.paletteState.confirmedVariants.dark).toBeTruthy();
    });

    const confirmedVariants = result.current.paletteState.confirmedVariants;

    let exported;
    await act(async () => {
      exported = await result.current.handleDownloadThemePack();
    });

    expect(exported).toBe(true);
    expect(workflowExportMocks.downloadAllModeThemePackArchive).toHaveBeenCalledTimes(1);
    expect(workflowExportMocks.downloadAllModeThemePackArchive.mock.calls[0]).toHaveLength(1);
    const exportArg = workflowExportMocks.downloadAllModeThemePackArchive.mock.calls[0][0];

    expect(exportArg.variants).toBe(confirmedVariants);
    expect(exportArg.variants.light).toBe(lightSnapshot);
    expect(exportArg.variants.dark.finalTokens).toBe(result.current.finalTokens);
    expect(exportArg.variants.pop).toBeUndefined();
    expect(Object.keys(exportArg.variants).sort()).toEqual(['dark', 'light']);

    expect(exportArg.finalTokens).toBe(result.current.finalTokens);
    expect(exportArg.currentTheme).toBe(result.current.currentTheme);
    expect(exportArg.themeMaster.finalTokens).toBe(result.current.finalTokens);
    expect(exportArg.themeMaster.currentTheme).toBe(result.current.currentTheme);
    expect(exportArg.displayThemeName).toBe('Export Wiring');
    expect(exportArg.themeMode).toBe('dark');
    expect(exportArg.baseColor).toBe('#6633FF');
  });

  it('passes selected Theme Pack modes as serializer options', async () => {
    act(() => {
      usePaletteStore.setState({
        baseColor: '#6633ff',
        baseInput: '#6633ff',
        mode: 'Monochromatic',
        themeMode: 'dark',
        printMode: false,
        customThemeName: 'Selected Export',
        confirmedVariants: {},
      });
    });

    const { result } = renderHook(() => useAppController());

    await waitFor(() => {
      expect(result.current.paletteState.confirmedVariants.dark).toBeTruthy();
    });

    let exported;
    await act(async () => {
      exported = await result.current.handleDownloadThemePack(['dark']);
    });

    expect(exported).toBe(true);
    expect(workflowExportMocks.downloadAllModeThemePackArchive).toHaveBeenCalledTimes(1);
    expect(workflowExportMocks.downloadAllModeThemePackArchive.mock.calls[0][1]).toEqual({
      selectedModes: ['dark'],
    });
  });

  it('returns false when Theme Pack export fails', async () => {
    workflowExportMocks.downloadAllModeThemePackArchive.mockRejectedValueOnce(new Error('download failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAppController());

    let exported;
    await act(async () => {
      exported = await result.current.handleDownloadThemePack(['dark']);
    });

    expect(exported).toBe(false);
    expect(workflowExportMocks.downloadAllModeThemePackArchive).toHaveBeenCalledWith(
      expect.any(Object),
      { selectedModes: ['dark'] }
    );
    expect(consoleError).toHaveBeenCalledWith('Theme pack export failed', expect.any(Error));
  });
});
