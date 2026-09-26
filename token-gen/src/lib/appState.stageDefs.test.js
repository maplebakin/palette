import { afterEach, describe, expect, it, vi } from 'vitest';

describe('stage definitions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps Product Forge out of Palette Creator stage navigation in private forge mode', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);

    const { STAGE_DEFS } = await import('./appState.js');

    expect(STAGE_DEFS).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'product-forge' }),
    ]));
    expect(STAGE_DEFS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create', label: 'Create' }),
      expect.objectContaining({ id: 'refine', label: 'Refine' }),
      expect.objectContaining({ id: 'review', label: 'Review' }),
      expect.objectContaining({ id: 'export', label: 'Export' }),
      expect.objectContaining({ id: 'package', label: 'Package', tab: 'Package' }),
    ]));
  });

  it('excludes the Package and Export stages from the public demo build', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { STAGE_DEFS } = await import('./appState.js');

    expect(STAGE_DEFS).toEqual([
      expect.objectContaining({ id: 'create', label: 'Create' }),
      expect.objectContaining({ id: 'refine', label: 'Refine' }),
      expect.objectContaining({ id: 'review', label: 'Review' }),
    ]);
    expect(STAGE_DEFS).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'export' }),
      expect.objectContaining({ id: 'package' }),
    ]));
  });
});
