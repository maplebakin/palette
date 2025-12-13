import { describe, it, expect } from 'vitest';
import { buildGenericPayload, buildPenpotPayload, buildWitchcraftPayload, buildFigmaTokensPayload, buildStyleDictionaryPayload } from './payloads.js';
import { generateTokens, buildOrderedStack } from './tokens.js';

const sampleTokens = () => generateTokens('#6633ff', 'Monochromatic', true, 100);

describe('payload builders', () => {
  it('buildPenpotPayload applies naming prefixes', () => {
    const tokens = sampleTokens();
    const handoff = buildOrderedStack(tokens).slice(0, 2);
    const payload = buildPenpotPayload(tokens, handoff, { themeName: 'Demo' }, { namingPrefix: 'demo' });
    expect(payload.brand['demo.primary'].value).toBe(tokens.brand.primary);
    const firstHandoffKey = Object.keys(payload.handoff)[0];
    expect(payload.handoff[firstHandoffKey].name).toContain('demo.');
  });

  it('buildGenericPayload reshapes meta and swatches', () => {
    const tokens = sampleTokens();
    const payload = buildGenericPayload(tokens, { themeName: 'Generic Demo' });
    expect(payload.meta.schema).toBe('generic-token-pack-v1');
    expect(payload.meta.themeName).toBe('Generic Demo');
    expect(payload.swatches['swatch-deep']).toBeDefined();
    expect(payload.lightOverrides).toBeDefined();
  });

  it('buildWitchcraftPayload captures mode and settings', () => {
    const tokens = sampleTokens();
    const payload = buildWitchcraftPayload(tokens, 'Witch Demo', 'Tertiary', true);
    expect(payload.slug).toBe('witch-demo');
    expect(payload.mode).toBe('midnight');
    expect(payload.settings.primary).toBe(tokens.brand.primary);
  });

  it('buildFigmaTokensPayload nests values with prefixes', () => {
    const tokens = sampleTokens();
    const payload = buildFigmaTokensPayload(tokens, { namingPrefix: 'fig' });
    expect(payload.fig.brand.primary.value).toBe(tokens.brand.primary);
    expect(payload.fig.brand.primary.type).toBe('color');
  });

  it('buildStyleDictionaryPayload nests values with prefixes', () => {
    const tokens = sampleTokens();
    const payload = buildStyleDictionaryPayload(tokens, { namingPrefix: 'sd' });
    expect(payload.sd.brand.primary.value).toBe(tokens.brand.primary);
    expect(payload.sd.brand.primary.type).toBe('color');
  });
});
