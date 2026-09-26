import { describe, expect, it } from 'vitest';
import { getTokenTeaser } from './tokenTeaser.js';

describe('getTokenTeaser', () => {
  it('uses the manifest counts at render time for the visible teaser and fade count', () => {
    const tokens = Array.from({ length: 8 }, (_, index) => ({ name: `Token ${index + 1}` }));

    expect(getTokenTeaser(tokens, { teaserTokenCount: 3, totalTokens: 11 })).toEqual({
      tokens: tokens.slice(0, 3),
      moreCount: 8,
    });
    expect(getTokenTeaser(tokens, { teaserTokenCount: 5, totalTokens: 7 })).toEqual({
      tokens: tokens.slice(0, 5),
      moreCount: 2,
    });
  });
});
