import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from './projectStore.js';

const initialState = useProjectStore.getState();

const resetStore = () => {
  useProjectStore.setState(initialState, true);
};

describe('projectStore', () => {
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

  it('creates and clears the current project edit payload', () => {
    const { result } = renderHook(() => useProjectStore());
    const edit = { sectionId: 'section-1', paletteName: 'Dawn', projectName: 'Demo' };

    act(() => {
      result.current.setProjectEdit(edit);
    });

    expect(result.current.projectEdit).toEqual(edit);

    act(() => {
      result.current.setProjectEdit(null);
    });

    expect(result.current.projectEdit).toBeNull();
  });

  it('updates project edit data with functional updaters', () => {
    const { result } = renderHook(() => useProjectStore());

    act(() => {
      result.current.setProjectEdit({ sectionId: 'section-1', paletteName: 'Initial' });
      result.current.setProjectEdit((value) => ({ ...value, paletteName: 'Updated' }));
    });

    expect(result.current.projectEdit).toEqual({
      sectionId: 'section-1',
      paletteName: 'Updated',
    });
  });

  it('tracks print and penpot export lifecycle state independently', () => {
    const { result } = renderHook(() => useProjectStore());

    act(() => {
      result.current.setProjectExportStatus('Preparing print assets');
      result.current.setProjectExporting(true);
      result.current.setProjectPenpotStatus('Building Penpot tokens');
      result.current.setProjectPenpotExporting(true);
    });

    expect(result.current.projectExportStatus).toBe('Preparing print assets');
    expect(result.current.projectExporting).toBe(true);
    expect(result.current.projectPenpotStatus).toBe('Building Penpot tokens');
    expect(result.current.projectPenpotExporting).toBe(true);
  });
});
