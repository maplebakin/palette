import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExportStore } from './exportStore.js';

const initialState = useExportStore.getState();

const resetStore = () => {
  useExportStore.setState(initialState, true);
};

describe('exportStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:34:00Z'));
    act(() => {
      resetStore();
    });
  });

  afterEach(() => {
    act(() => {
      resetStore();
    });
    vi.useRealTimers();
  });

  it('starts with export-ready defaults and a print timestamp payload', () => {
    const { result } = renderHook(() => useExportStore());

    expect(result.current.exportError).toBe('');
    expect(result.current.exportBlocked).toBe(false);
    expect(result.current.printSupported).toBe(true);
    expect(result.current.isExportingAssets).toBe(false);
    expect(result.current.printMeta.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.printMeta.dateTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(result.current.printMeta.dateTime.startsWith(result.current.printMeta.date)).toBe(true);
  });

  it('tracks export state transitions through setters', () => {
    const { result } = renderHook(() => useExportStore());

    act(() => {
      result.current.setExportError('Blocked by browser');
      result.current.setExportBlocked(true);
      result.current.setPrintSupported(false);
      result.current.setIsExportingAssets(true);
      result.current.setPrintMeta({ date: '2026-03-04', dateTime: '2026-03-04 09:15' });
    });

    expect(result.current.exportError).toBe('Blocked by browser');
    expect(result.current.exportBlocked).toBe(true);
    expect(result.current.printSupported).toBe(false);
    expect(result.current.isExportingAssets).toBe(true);
    expect(result.current.printMeta).toEqual({
      date: '2026-03-04',
      dateTime: '2026-03-04 09:15',
    });
  });

  it('supports functional updates for export flags', () => {
    const { result } = renderHook(() => useExportStore());

    act(() => {
      result.current.setExportBlocked((value) => !value);
      result.current.setIsExportingAssets((value) => !value);
    });

    expect(result.current.exportBlocked).toBe(true);
    expect(result.current.isExportingAssets).toBe(true);
  });
});
