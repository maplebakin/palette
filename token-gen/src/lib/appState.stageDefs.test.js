import { describe, expect, it } from 'vitest';
import { STAGE_DEFS } from './appState.js';

describe('stage definitions', () => {
  it('includes Product Forge as a dev-only navigation stage in test/dev mode', () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(STAGE_DEFS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'product-forge', label: 'Product Forge' }),
    ]));
  });
});
