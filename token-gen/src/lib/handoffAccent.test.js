import { describe, expect, it } from 'vitest';
import {
  HANDOFF_DARK_INK,
  HANDOFF_WARM_WHITE,
  resolveHandoffAccent,
  resolveOnAccentText,
} from './handoffAccent.js';

describe('handoff accent resolution', () => {
  it('prefers the theme accent, then primary, then the base color', () => {
    expect(resolveHandoffAccent({
      theme: { tokens: { brand: { accent: '#112233', primary: '#445566' } } },
      baseColor: '#778899',
    })).toBe('#112233');

    expect(resolveHandoffAccent({
      theme: { tokens: { brand: { accent: 'transparent', primary: '#445566' } } },
      baseColor: '#778899',
    })).toBe('#445566');

    expect(resolveHandoffAccent({
      theme: { tokens: { brand: { accent: '#123', primary: 'rgb(1, 2, 3)' } } },
      baseColor: '#778899',
    })).toBe('#778899');
  });

  it('returns null when every candidate is invalid', () => {
    expect(resolveHandoffAccent({
      theme: { tokens: { brand: { accent: '#123', primary: 'nope' } } },
      baseColor: '#fff',
    })).toBeNull();
  });

  it('chooses dark ink for light accents and warm white for dark accents', () => {
    expect(resolveOnAccentText('#f5efe5')).toBe(HANDOFF_DARK_INK);
    expect(resolveOnAccentText('#211d19')).toBe(HANDOFF_WARM_WHITE);
    expect(resolveOnAccentText('invalid')).toBeNull();
  });
});
