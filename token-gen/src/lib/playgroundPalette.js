import { hexToHsl, hslToHex } from './colorUtils.js';

export const SEMANTIC_PALETTE_ROLES = [
  { id: 'background', name: 'Background', path: 'surfaces.background' },
  { id: 'surface', name: 'Surface', path: 'cards.card-panel-surface' },
  { id: 'text', name: 'Text', path: 'typography.text-body' },
  { id: 'heading', name: 'Heading', path: 'typography.heading' },
  { id: 'muted', name: 'Muted', path: 'typography.text-muted' },
  { id: 'accent', name: 'Accent', path: 'brand.accent' },
  { id: 'cta', name: 'CTA', path: 'brand.cta' },
];

const readToken = (tokens, path) => path.split('.').reduce((value, key) => value?.[key], tokens);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const buildSemanticPaletteSwatches = (tokens = {}) => SEMANTIC_PALETTE_ROLES.map((role) => ({
  ...role,
  color: readToken(tokens, role.path),
}));

const counterpointFor = (hue) => {
  const isWarm = hue <= 80 || hue >= 320;
  return {
    label: isWarm ? 'Cool counterpoint' : 'Warm counterpoint',
    offset: isWarm ? 112 : -112,
  };
};

const suggestionsForHarmony = (harmony, counterpoint) => {
  const counter = { ...counterpoint, source: 'anchor', saturationShift: 8, lightnessShift: -2 };
  switch (harmony) {
    case 'Monochromatic':
      return [
        { label: 'Supporting tone', source: 'anchor', offset: 0, saturationShift: -14, lightnessShift: 16 },
        { label: 'Analogous neighbor', source: 'seed', offset: 26, saturationShift: 3, lightnessShift: 2 },
        { label: 'Split complement', source: 'seed', offset: 150, saturationShift: 2, lightnessShift: -4 },
        counter,
      ];
    case 'Complementary':
      return [
        { label: 'Near-complement support', source: 'seed', offset: 166, saturationShift: 4, lightnessShift: -3 },
        { label: 'Split-complement support', source: 'seed', offset: 145, saturationShift: -2, lightnessShift: 8 },
        { label: 'Analogous neighbor', source: 'seed', offset: 30, saturationShift: 3, lightnessShift: 3 },
        counter,
      ];
    case 'Tertiary':
      return [
        { label: 'Tertiary partner', source: 'seed', offset: 120, saturationShift: 4, lightnessShift: 0 },
        { label: 'Split-complement support', source: 'seed', offset: 150, saturationShift: -2, lightnessShift: 7 },
        { label: 'Analogous neighbor', source: 'anchor', offset: 28, saturationShift: 2, lightnessShift: 3 },
        counter,
      ];
    case 'Apocalypse':
      return [
        { label: 'Split-complement color', source: 'seed', offset: 150, saturationShift: 5, lightnessShift: 1 },
        { label: 'Tertiary counterpoint', source: 'seed', offset: 118, saturationShift: -2, lightnessShift: 8 },
        { label: 'Analogous support', source: 'anchor', offset: -30, saturationShift: 2, lightnessShift: 4 },
        counter,
      ];
    case 'Analogous':
    default:
      return [
        { label: 'Analogous neighbor', source: 'seed', offset: 24, saturationShift: 3, lightnessShift: 2 },
        { label: 'Second analogous neighbor', source: 'seed', offset: -34, saturationShift: -3, lightnessShift: 7 },
        { label: 'Split complement', source: 'seed', offset: 150, saturationShift: 1, lightnessShift: -4 },
        counter,
      ];
  }
};

export const getContextualMoodSuggestions = ({ seedColor, roleColor, harmony }) => {
  const seed = hexToHsl(seedColor);
  const role = hexToHsl(roleColor || seedColor);
  const anchor = role.s < 18 ? seed : role;
  const counterpoint = counterpointFor(anchor.h);

  return suggestionsForHarmony(harmony, counterpoint).map((suggestion, index) => {
    const source = suggestion.source === 'seed' ? seed : anchor;
    return {
      id: `${suggestion.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
      label: suggestion.label,
      color: hslToHex(
        ((source.h + (suggestion.offset || 0)) % 360 + 360) % 360,
        clamp(source.s + (suggestion.saturationShift || 0), 22, 92),
        clamp(source.l + (suggestion.lightnessShift || 0), 30, 78),
      ),
    };
  });
};
