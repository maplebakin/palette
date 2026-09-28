export const PLAYGROUND_LINK_VERSION = 1;
export const PLAYGROUND_HASH_PREFIX = '#play=';

const HARMONY_MODES = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
const THEME_MODES = ['light', 'dark', 'pop'];
const PAYLOAD_KEYS = [
  'v',
  'kitId',
  'explorationName',
  'baseColor',
  'harmony',
  'themeMode',
  'hueNudge',
  'satNudge',
  'lockedSwatches',
  'swatchOverrides',
  'isChaosMinted',
  'chaosIndex',
];

const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const normalizeColorRecord = (value) => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, color]) => /^\d+$/.test(key) && isHexColor(color)),
  );
};

const toLinkPayload = (playground = {}) => ({
  v: PLAYGROUND_LINK_VERSION,
  kitId: typeof playground.kitId === 'string' ? playground.kitId : null,
  explorationName: typeof playground.explorationName === 'string' ? playground.explorationName : '',
  baseColor: typeof playground.baseColor === 'string' ? playground.baseColor : '',
  harmony: typeof playground.harmony === 'string' ? playground.harmony : '',
  themeMode: typeof playground.themeMode === 'string' ? playground.themeMode : '',
  hueNudge: isFiniteNumber(Number(playground.hueNudge)) ? Number(playground.hueNudge) : 0,
  satNudge: isFiniteNumber(Number(playground.satNudge)) ? Number(playground.satNudge) : 0,
  lockedSwatches: normalizeColorRecord(playground.lockedSwatches),
  swatchOverrides: normalizeColorRecord(playground.swatchOverrides),
  isChaosMinted: Boolean(playground.isChaosMinted),
  chaosIndex: isFiniteNumber(Number(playground.chaosIndex)) ? Number(playground.chaosIndex) : 0,
});

const encodeBase64Url = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const encoded = typeof globalThis.btoa === 'function'
    ? globalThis.btoa(binary)
    : globalThis.Buffer
      ? globalThis.Buffer.from(binary, 'binary').toString('base64')
      : null;

  if (!encoded) throw new Error('Base64 encoding is unavailable');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeBase64Url = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  const binary = typeof globalThis.atob === 'function'
    ? globalThis.atob(padded)
    : globalThis.Buffer
      ? globalThis.Buffer.from(padded, 'base64').toString('binary')
      : null;

  if (!binary) throw new Error('Base64 decoding is unavailable');
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const isValidPayload = (payload) => (
  isRecord(payload)
  && PAYLOAD_KEYS.every((key) => Object.prototype.hasOwnProperty.call(payload, key))
  && payload.v === PLAYGROUND_LINK_VERSION
  && (payload.kitId === null || typeof payload.kitId === 'string')
  && typeof payload.explorationName === 'string'
  && isHexColor(payload.baseColor)
  && HARMONY_MODES.includes(payload.harmony)
  && THEME_MODES.includes(payload.themeMode)
  && isFiniteNumber(payload.hueNudge)
  && isFiniteNumber(payload.satNudge)
  && isRecord(payload.lockedSwatches)
  && Object.entries(payload.lockedSwatches).every(([key, color]) => /^\d+$/.test(key) && isHexColor(color))
  && isRecord(payload.swatchOverrides)
  && Object.entries(payload.swatchOverrides).every(([key, color]) => /^\d+$/.test(key) && isHexColor(color))
  && typeof payload.isChaosMinted === 'boolean'
  && Number.isInteger(payload.chaosIndex)
  && payload.chaosIndex >= 0
);

export const encodePlaygroundHash = (playground) => `${PLAYGROUND_HASH_PREFIX}${encodeBase64Url(JSON.stringify(toLinkPayload(playground)))}`;

export const decodePlaygroundHash = (hash) => {
  const match = String(hash ?? '').match(/^#play=([A-Za-z0-9_-]+)$/);
  if (!match) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(match[1]));
    return isValidPayload(payload) ? payload : null;
  } catch {
    return null;
  }
};
