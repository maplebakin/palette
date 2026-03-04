import { create } from 'zustand';
import { getPrintTimestamps } from '../lib/appState.js';

const resolveUpdater = (value, current) => (
  typeof value === 'function' ? value(current) : value
);

export const useExportStore = create((set) => ({
  exportError: '',
  exportBlocked: false,
  printSupported: true,
  isExportingAssets: false,
  printMeta: getPrintTimestamps(),

  setExportError: (value) => set((state) => ({ exportError: resolveUpdater(value, state.exportError) })),
  setExportBlocked: (value) => set((state) => ({ exportBlocked: resolveUpdater(value, state.exportBlocked) })),
  setPrintSupported: (value) => set((state) => ({ printSupported: resolveUpdater(value, state.printSupported) })),
  setIsExportingAssets: (value) => set((state) => ({ isExportingAssets: resolveUpdater(value, state.isExportingAssets) })),
  setPrintMeta: (value) => set((state) => ({ printMeta: resolveUpdater(value, state.printMeta) })),
}));
