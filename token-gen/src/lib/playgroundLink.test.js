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
      harmony: 'Tertiary',
      themeMode: 'dark',
      hueNudge: -12,
      satNudge: 18,
      lockedSwatches: { 0: '#ffffff', 4: '#222222' },
      swatchOverrides: { 2: '#d48267' },
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

  it('silently ignores invalid and older hashes', () => {
    expect(decodePlaygroundHash('#play=not-json')).toBeNull();
    expect(decodePlaygroundHash('#play=eyJ2IjoyfQ')).toBeNull();
    expect(decodePlaygroundHash('#other=value')).toBeNull();
  });
});
