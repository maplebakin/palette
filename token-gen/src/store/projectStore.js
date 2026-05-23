import { create } from 'zustand';

const resolveUpdater = (value, current) => (
  typeof value === 'function' ? value(current) : value
);

export const useProjectStore = create((set) => ({
  projectEdit: null,
  projectExportStatus: '',
  projectExporting: false,
  projectTokenStatus: '',
  projectTokenExporting: false,

  setProjectEdit: (value) => set((state) => ({ projectEdit: resolveUpdater(value, state.projectEdit) })),
  setProjectExportStatus: (value) => set((state) => ({ projectExportStatus: resolveUpdater(value, state.projectExportStatus) })),
  setProjectExporting: (value) => set((state) => ({ projectExporting: resolveUpdater(value, state.projectExporting) })),
  setProjectTokenStatus: (value) => set((state) => ({ projectTokenStatus: resolveUpdater(value, state.projectTokenStatus) })),
  setProjectTokenExporting: (value) => set((state) => ({ projectTokenExporting: resolveUpdater(value, state.projectTokenExporting) })),
}));
