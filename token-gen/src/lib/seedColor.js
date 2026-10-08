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

/** Interpret seed input without hashing an unfinished hexadecimal entry.
 * A leading # is an explicit request for a hex code, never a phrase.
 */
export const toSeedHex = (value) => {
  const trimmed = String(value ?? '').trim();
  const candidate = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return `#${candidate.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : null;
};

export const seedColorFromInput = (value) => {
  const hex = toSeedHex(value);
  if (hex) return hex;
  const trimmed = String(value ?? '').trim();
  if (trimmed.startsWith('#') || /^[0-9a-f]{1,6}$/i.test(trimmed)) return null;
  return phraseToSeedColor(value);
};
