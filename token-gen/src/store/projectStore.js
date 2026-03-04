import { create } from 'zustand';

const resolveUpdater = (value, current) => (
  typeof value === 'function' ? value(current) : value
);

export const useProjectStore = create((set) => ({
  projectEdit: null,
  projectExportStatus: '',
  projectExporting: false,
  projectPenpotStatus: '',
  projectPenpotExporting: false,

  setProjectEdit: (value) => set((state) => ({ projectEdit: resolveUpdater(value, state.projectEdit) })),
  setProjectExportStatus: (value) => set((state) => ({ projectExportStatus: resolveUpdater(value, state.projectExportStatus) })),
  setProjectExporting: (value) => set((state) => ({ projectExporting: resolveUpdater(value, state.projectExporting) })),
  setProjectPenpotStatus: (value) => set((state) => ({ projectPenpotStatus: resolveUpdater(value, state.projectPenpotStatus) })),
  setProjectPenpotExporting: (value) => set((state) => ({ projectPenpotExporting: resolveUpdater(value, state.projectPenpotExporting) })),
}));
