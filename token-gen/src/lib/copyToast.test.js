import { describe, expect, it } from 'vitest';
import { buildCopyToastMessage } from './copyToast.js';

describe('buildCopyToastMessage', () => {
  it('keeps the first copy pure delight', () => {
    expect(buildCopyToastMessage('#ff5500', 0)).toBe('Copied #FF5500.');
  });

  it('adds the kit bridge from the second copy onward', () => {
    expect(buildCopyToastMessage('#ff5500', 1)).toBe('Copied #FF5500 — the full token system lives in the kit.');
    expect(buildCopyToastMessage('#ff5500', 7)).toBe('Copied #FF5500 — the full token system lives in the kit.');
  });
});
