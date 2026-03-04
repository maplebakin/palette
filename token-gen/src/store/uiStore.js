import { create } from 'zustand';

const resolveUpdater = (value, current) => (
  typeof value === 'function' ? value(current) : value
);

export const useUiStore = create((set) => ({
  view: 'palette',
  currentStage: 'Identity',
  activeTab: 'Quick view',
  showContrast: true,
  showFineTune: false,
  headerOpen: true,
  chaosMenuOpen: false,
  overflowOpen: false,

  setView: (value) => set((state) => ({ view: resolveUpdater(value, state.view) })),
  setCurrentStage: (value) => set((state) => ({ currentStage: resolveUpdater(value, state.currentStage) })),
  setActiveTab: (value) => set((state) => ({ activeTab: resolveUpdater(value, state.activeTab) })),
  setShowContrast: (value) => set((state) => ({ showContrast: resolveUpdater(value, state.showContrast) })),
  setShowFineTune: (value) => set((state) => ({ showFineTune: resolveUpdater(value, state.showFineTune) })),
  setHeaderOpen: (value) => set((state) => ({ headerOpen: resolveUpdater(value, state.headerOpen) })),
  setChaosMenuOpen: (value) => set((state) => ({ chaosMenuOpen: resolveUpdater(value, state.chaosMenuOpen) })),
  setOverflowOpen: (value) => set((state) => ({ overflowOpen: resolveUpdater(value, state.overflowOpen) })),
}));
