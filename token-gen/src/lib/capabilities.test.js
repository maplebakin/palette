import { afterEach, describe, expect, it, vi } from 'vitest';

describe('app capabilities', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enables the private forge in dev while keeping the Theme Pack public', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { canDownloadThemePack, canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(true);
    expect(canExport).toBe(true);
    expect(canDownloadThemePack).toBe(true);
  });

  it('keeps the vetted Theme Pack public while broad exports stay private in production', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { canDownloadThemePack, canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(false);
    expect(canExport).toBe(false);
    expect(canDownloadThemePack).toBe(true);
  });

  it('allows an explicit private forge production build', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', 'true');

    const { canDownloadThemePack, canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(true);
    expect(canExport).toBe(true);
    expect(canDownloadThemePack).toBe(true);
  });
});
