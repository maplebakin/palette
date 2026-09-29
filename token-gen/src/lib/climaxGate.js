import { BUNDLE } from '../data/kits.js';

export const CLIMAX_INTEREST_STORAGE_KEY = 'apocapalette:climax-gate-interest:v1';
export const CUSTOM_PALETTE_HONEST_LINE = "This exact palette isn't for sale — it's a sketch. The kits are the finished paintings: contrast-checked, Light/Dark/Pop variants, supported.";

export const getClimaxGateTier = (source) => {
  if (source === 'vault-click') return 'detail';
  if (source === 'token-fade') return 'purchase';
  if (['multi-select', 'sticky-bar', 'see-full-kit'].includes(source)) return 'takeover';
  return null;
};

export const buildKitSpecificityLine = (manifest = {}) => {
  const tints = (Number(manifest.coreColors) || 0) * (Number(manifest.tintsPerColor) || 0);
  const formats = Array.isArray(manifest.formats) ? manifest.formats.length : 0;
  return `No. ${manifest.artifactNo} — ${manifest.coreColors} core colors, ${tints} tints, ${formats} formats`;
};

export const buildClimaxGateCopy = ({ manifest, isCustom = false } = {}) => {
  if (!manifest) return null;

  const bundleLine = `Or unlock all kits, present and future — $${BUNDLE.price}`;
  if (!isCustom) {
    return {
      title: `${manifest.name} Kit`,
      primaryCta: `Get the ${manifest.name} Kit — $${manifest.price}`,
      bridgeCopy: 'A complete palette system, ready when you are.',
      baseKitAnchor: null,
      secondaryCta: null,
      bundleLine,
    };
  }

  return {
    title: `Start with ${manifest.name}`,
    primaryCta: `Download the base ${manifest.name} Kit — $${manifest.price} for all ${manifest.totalTokens} tokens`,
    bridgeCopy: CUSTOM_PALETTE_HONEST_LINE,
    baseKitAnchor: `Download the base ${manifest.name} Kit — $${manifest.price} for all ${manifest.totalTokens} tokens`,
    secondaryCta: 'Browse kits with similar contrast profiles',
    bundleLine,
  };
};

export const buildFormatTree = (manifest = {}) => (manifest.formats || []).map((format, index) => ({
  id: `${format}-${index}`,
  label: `palette/${format}`,
  kind: index === 0 ? 'folder' : 'file',
}));

export const submitInterest = ({ email, seed }) => {
  const payload = {
    email: String(email || '').trim(),
    seed: String(seed || '').trim(),
    savedAt: new Date().toISOString(),
  };

  // TODO: replace this localStorage stub with a POST endpoint when the interest API exists.
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(CLIMAX_INTEREST_STORAGE_KEY, JSON.stringify(payload));
  }
  return payload;
};
