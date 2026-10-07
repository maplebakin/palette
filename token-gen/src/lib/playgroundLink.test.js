import { describe, expect, it } from 'vitest';
import {
  decodePlaygroundHash,
  encodePlaygroundHash,
  PLAYGROUND_HASH_PREFIX,
  PLAYGROUND_LINK_VERSION,
} from './playgroundLink.js';

describe('playground share links', () => {
  it('round-trips the versioned playground payload through a base64url hash', () => {
    const playground = {
      kitId: 'ashfall-bloom',
      explorationName: '',
      baseColor: '#b86f61',
      baseInput: '#b86f61',
      harmony: 'Tertiary',
      themeMode: 'dark',
      hueNudge: -12,
      satNudge: 18,
      lockedSwatches: { 0: '#ffffff', 4: '#222222' },
      swatchOverrides: { 2: '#d48267' },
      regenerateCount: 3,
      userHasMutated: true,
      confirmedModes: { dark: true, light: true },
      semanticPalette: true,
      modeStates: {
        dark: {
          lockedSwatches: { 0: '#ffffff', 4: '#222222' },
          swatchOverrides: { 2: '#d48267' },
          regenerateCount: 3,
        },
        light: {
          lockedSwatches: { 1: '#eeeeee' },
          swatchOverrides: { 3: '#abc123' },
          regenerateCount: 1,
        },
      },
      isChaosMinted: false,
      chaosIndex: 0,
    };

    const hash = encodePlaygroundHash(playground);

    expect(hash.startsWith(PLAYGROUND_HASH_PREFIX)).toBe(true);
    expect(hash).toMatch(/^#play=[A-Za-z0-9_-]+$/);
    expect(decodePlaygroundHash(hash)).toEqual({
      v: PLAYGROUND_LINK_VERSION,
      ...playground,
    });
  });

  it('continues to read existing version 1 links without the expanded state fields', () => {
    const legacyPayload = {
      v: PLAYGROUND_LINK_VERSION,
      kitId: 'vapor-dream',
      explorationName: '',
      baseColor: '#ff8b94',
      harmony: 'Tertiary',
      themeMode: 'pop',
      hueNudge: 0,
      satNudge: 0,
      lockedSwatches: { 0: '#112233' },
      swatchOverrides: { 2: '#445566' },
      isChaosMinted: false,
      chaosIndex: 0,
    };
    const encoded = btoa(JSON.stringify(legacyPayload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodePlaygroundHash(`${PLAYGROUND_HASH_PREFIX}${encoded}`)).toEqual(legacyPayload);
  });

  it('silently ignores invalid and older hashes', () => {
    expect(decodePlaygroundHash('#play=not-json')).toBeNull();
    expect(decodePlaygroundHash('#play=eyJ2IjoyfQ')).toBeNull();
    expect(decodePlaygroundHash('#other=value')).toBeNull();
  });
});
