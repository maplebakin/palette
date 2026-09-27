import { describe, expect, it } from 'vitest';
import { STICKY_DELAY_MS, shouldShowStickyBar } from './stickyBar.js';

describe('shouldShowStickyBar', () => {
  it('requires both the engagement delay and a qualifying palette action', () => {
    expect(shouldShowStickyBar({ elapsedMs: STICKY_DELAY_MS - 1, hasModeConfirmation: true })).toBe(false);
    expect(shouldShowStickyBar({ elapsedMs: STICKY_DELAY_MS, hasModeConfirmation: false, copyCount: 0 })).toBe(false);
    expect(shouldShowStickyBar({ elapsedMs: STICKY_DELAY_MS, hasModeConfirmation: true })).toBe(true);
    expect(shouldShowStickyBar({ elapsedMs: STICKY_DELAY_MS, copyCount: 1 })).toBe(true);
  });
});
