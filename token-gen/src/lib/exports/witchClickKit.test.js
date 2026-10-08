import { webcrypto, createHash } from 'node:crypto';
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { buildWitchClickKit, buildWitchClickKitArchive, WITCHCLICK_ROLES, WITCHCLICK_CONTRAST_PAIRS } from './witchClickKit.js';

vi.stubGlobal('crypto', webcrypto);
const fixture = () => ({ displayThemeName: 'Fixture Palette', variants: {
  dark: { finalTokens: { surfaces: { background: '#000000' }, typography: { 'text-body': '#ffffff' }, status: { success: '#00ff00' }, spoon: { low: '#123456' }, entity: { 'entity-card-heading': '#abcdef' } } },
  light: { finalTokens: { surfaces: { background: '#ffffff' }, typography: { 'text-body': '#000000' }, status: { success: '#00ff00' }, spoon: { low: '#654321' } } },
  pop: { finalTokens: { surfaces: { background: '#ff0000' } } },
} });
const role = (kit, id) => kit.manifest.roles.find(item => item.id === id);

describe('WitchClick export target', () => {
  it('copies the complete role and pair contract with separate mode mappings and literal CSS', async () => {
    const kit = await buildWitchClickKit(fixture());
    expect(kit.manifest).toMatchObject({ schemaVersion: '1.0.0', contractVersion: '1.0.0', kitId: 'apocapalette.fixture-palette', version: '1.0.0', cssFile: 'kit.css', namespace: '--wc-kit-', supportedModes: ['midnight', 'dawn'] });
    expect(WITCHCLICK_ROLES).toHaveLength(76);
    expect(WITCHCLICK_CONTRAST_PAIRS).toHaveLength(60);
    expect(new Set(WITCHCLICK_ROLES.map(item => item.id)).size).toBe(76);
    expect(role(kit, 'surface.base').modes.midnight.value).toBe('#000000');
    expect(role(kit, 'surface.base').modes.dawn.value).toBe('#ffffff');
    expect(kit.css).toContain('.wc-kit-fixture-palette[data-wc-kit-mode="midnight"]');
    expect(kit.css).toContain('.wc-kit-fixture-palette[data-wc-kit-mode="dawn"]');
    expect(kit.css).not.toContain('#ff0000');
    expect([...kit.css.matchAll(/(--[\w-]+):/g)].every(match => match[1].startsWith('--wc-kit-'))).toBe(true);
    expect(kit.css).not.toMatch(/@import|url\(|\b(?:body|html)\s*\{|font-family|blur\(/);
    expect(kit.manifest.integrity).toEqual({ algorithm: 'SHA-256', sha256: createHash('sha256').update(kit.css).digest('hex') });
    expect(kit.manifest.contrasts.find(pair => pair.mode === 'midnight' && pair.foregroundRole === 'text.body' && pair.backgroundRole === 'surface.base').ratio).toBe(21);
    expect(kit.manifest.contrasts.length + kit.manifest.missingContrastPairs.length).toBe(120);
  });

  it('records per-mode missing roles and never replaces spoons with status colours', async () => {
    const kit = await buildWitchClickKit(fixture());
    expect(role(kit, 'entity.heading').status).toBe('missing');
    expect(role(kit, 'entity.heading').modes.midnight.status).toBe('present');
    expect(role(kit, 'entity.heading').modes.dawn.status).toBe('missing');
    expect(role(kit, 'entity.heading').modes.dawn.reason).toContain('entity.heading');
    expect(role(kit, 'spoon.low').modes.midnight.value).toBe('#123456');
    expect(role(kit, 'spoon.medium').status).toBe('missing');
    expect(role(kit, 'status.success.foreground').status).toBe('missing');
    expect(kit.manifest.roles.some(item => item.requirement === 'required' && item.status === 'missing')).toBe(true);
    expect(role(kit, 'entity.icon')).toMatchObject({ requirement: 'optional', classification: 'COMPONENT/DATA-OWNED' });
  });

  it('respects candidate priority, skips recipes/noncolours, and accepts explicit effort and status pairs', async () => {
    const theme = fixture();
    for (const variant of Object.values(theme.variants)) {
      variant.finalTokens.surfaces.panel = 'rgba(1,2,3,0.4)';
      variant.finalTokens.cards = { 'card-panel-surface': '#102030' };
      variant.finalTokens.typography ||= {};
      variant.finalTokens.typography['text-body'] = { type: 'color', value: '#112233' };
      variant.finalTokens.effort = { medium: '#123abc' };
      variant.finalTokens.status = { 'success-foreground': '#ffffff', 'success-background': '#000000' };
      variant.finalTokens.focus = { base: 'blur(10px)', ring: 'color-mix(in srgb, red, blue)' };
    }
    const kit = await buildWitchClickKit(theme);
    expect(role(kit, 'surface.panel').modes.dawn.value).toBe('#102030');
    expect(role(kit, 'text.body').modes.dawn.value).toBe('#112233');
    expect(role(kit, 'spoon.medium').modes.dawn.value).toBe('#123abc');
    expect(role(kit, 'focus.base').status).toBe('missing');
    expect(kit.manifest.contrasts.find(pair => pair.foregroundRole === 'status.success.foreground').ratio).toBe(21);
  });

  it('rejects unconfirmed variants, Pop substitution and unsafe versions', async () => {
    const theme = fixture(); delete theme.variants.light;
    theme.finalTokens = { surfaces: { background: '#fff' } }; theme.themeMode = 'light';
    await expect(buildWitchClickKit(theme)).rejects.toThrow('Confirm both Dark and Light');
    await expect(buildWitchClickKit(fixture(), { version: '../oops' })).rejects.toThrow('version');
    await expect(buildWitchClickKit(fixture(), { version: '01.0.0' })).rejects.toThrow('version');
  });

  it('can cover every role only from explicit colour sources, retaining the contract requirements', async () => {
    const finalTokens = {};
    for (const definition of WITCHCLICK_ROLES) {
      const parts = definition.candidates[0].split('.');
      let node = finalTokens;
      for (const part of parts.slice(0, -1)) node = node[part] ||= {};
      node[parts.at(-1)] = '#123456';
    }
    const kit = await buildWitchClickKit({ displayThemeName: '9'.repeat(300), variants: { dark: { finalTokens }, light: { finalTokens } } });
    expect(kit.manifest.kitId.length).toBeLessThanOrEqual(100);
    expect(kit.manifest.kitId).toMatch(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
    expect(kit.manifest.roles.every(item => item.status === item.requirement)).toBe(true);
    expect(kit.manifest.contrasts).toHaveLength(120);
    expect(kit.manifest.missingContrastPairs).toEqual([]);
  });

  it('packages exactly two root files with byte-identical CSS and a versioned filename', async () => {
    const kit = await buildWitchClickKitArchive(fixture(), { version: '2.3.4', type: 'uint8array' });
    const zip = await JSZip.loadAsync(kit.blob);
    expect(Object.keys(zip.files).sort()).toEqual(['kit.css', 'manifest.json']);
    expect(await zip.file('kit.css').async('string')).toBe(kit.css);
    expect(JSON.parse(await zip.file('manifest.json').async('string'))).toEqual(kit.manifest);
    expect(kit.filename).toBe('fixture-palette-2.3.4-witchclick-kit.zip');
  });
});
