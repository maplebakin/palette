import { describe, expect, it } from 'vitest';
import { STAGE_DEFS } from './appState.js';

describe('stage definitions', () => {
  it('keeps Product Forge out of Palette Creator stage navigation', () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(STAGE_DEFS).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'product-forge' }),
    ]));
    expect(STAGE_DEFS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'export', label: 'Export' }),
    ]));
  });
});
