import { afterEach, describe, expect, it, vi } from 'vitest';

describe('app capabilities', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the public demo gated in dev without the explicit forge flag', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { canDownloadThemePack, canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(false);
    expect(canExport).toBe(false);
    expect(canDownloadThemePack).toBe(false);
  });

  it('treats a plain production build as a demo: no file downloads at all', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', '');

    const { canDownloadThemePack, canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(false);
    expect(canExport).toBe(false);
    expect(canDownloadThemePack).toBe(false);
  });

  it('allows an explicit private forge production build with all downloads', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_PRIVATE_FORGE', 'true');

    const { canDownloadThemePack, canExport, isPrivateForge } = await import('./capabilities.js');

    expect(isPrivateForge).toBe(true);
    expect(canExport).toBe(true);
    expect(canDownloadThemePack).toBe(true);
  });
});
