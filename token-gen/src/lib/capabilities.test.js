import { afterEach, describe, expect, it, vi } from 'vitest';

describe('app capabilities', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enables private forge exports in dev', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(true);
    expect(canExport).toBe(true);
  });

  it('disables exports for launched production play builds by default', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(false);
    expect(canExport).toBe(false);
  });

  it('allows an explicit private forge production build', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', 'true');

    const { canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(true);
    expect(canExport).toBe(true);
  });
});
