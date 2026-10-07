import { hslToHex } from './colorUtils.js';

const hashPhrase = (value) => {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const phraseToSeedColor = (phrase) => {
  const normalized = String(phrase ?? '').trim();
  if (!normalized) return null;

  const hash = hashPhrase(normalized);
  const hue = hash % 360;
  const saturation = 56 + ((hash >>> 9) % 24);
  const lightness = 42 + ((hash >>> 17) % 22);
  return hslToHex(hue, saturation, lightness);
};
