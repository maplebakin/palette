import { hexToHsl, hslToHex, getContrastRatio } from './colorUtils.js';

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

const READABLE_ROLES = new Set(['text', 'heading', 'muted', 'accent']);

// Keep the suggested hue, but choose the nearest readable lightness for text-facing roles.
const readableColor = (hue, saturation, preferredLightness, background, minRatio = 4.5) => {
  const candidate = hslToHex(hue, saturation, preferredLightness);
  if (getContrastRatio(candidate, background) >= minRatio) return candidate;
  let closest = null;
  let distance = Infinity;
  for (let lightness = 0; lightness <= 100; lightness += 1) {
    const color = hslToHex(hue, saturation, lightness);
    if (getContrastRatio(color, background) < minRatio) continue;
    const delta = Math.abs(lightness - preferredLightness);
    if (delta < distance) {
      closest = color;
      distance = delta;
    }
  }
  return closest || candidate;
};

// Approximate visual proximity using circular hue and perceptually important tone differences.
const colorDistance = (a, b) => {
  const hueGap = Math.abs(((a.h - b.h + 540) % 360) - 180);
  const hueWeight = Math.min(a.s, b.s) < 15 ? 0.1 : 0.65;
  return Math.hypot(hueGap * hueWeight, (a.s - b.s) * 0.45, (a.l - b.l) * 1.2);
};

const wrapHue = (hue) => ((hue % 360) + 360) % 360;

export const getContextualMoodSuggestions = ({ seedColor, roleColor, harmony, roleId, backgroundColor, existingSwatches = [] }) => {
  const seed = hexToHsl(seedColor);
  const role = hexToHsl(roleColor || seedColor);
  const anchor = role.s < 18 ? seed : role;
  const counterpoint = counterpointFor(anchor.h);

  const occupied = existingSwatches
    .filter(({ id, color }) => id !== roleId && /^#[0-9a-f]{6}$/i.test(color || ''))
    .map(({ color }) => hexToHsl(color));

  return suggestionsForHarmony(harmony, counterpoint).map((suggestion, index) => {
    const source = suggestion.source === 'seed' ? seed : anchor;
    const hue = ((source.h + (suggestion.offset || 0)) % 360 + 360) % 360;
    const saturation = clamp(source.s + (suggestion.saturationShift || 0), 22, 92);
    const lightness = clamp(source.l + (suggestion.lightnessShift || 0), 30, 78);
    const mustBeReadable = READABLE_ROLES.has(roleId) && /^#[0-9a-f]{6}$/i.test(backgroundColor || '');
    const resolveColor = (nextHue) => mustBeReadable
      ? readableColor(nextHue, saturation, lightness, backgroundColor)
      : hslToHex(nextHue, saturation, lightness);
    // Try nearby variations only when a candidate looks too much like an existing swatch.
    // Keep changes small so the selected harmony remains recognizable.
    const options = [0, -12, 12, -24, 24].map((offset) => {
      const color = resolveColor(wrapHue(hue + offset));
      const hsl = hexToHsl(color);
      const nearest = occupied.length
        ? Math.min(...occupied.map((existing) => colorDistance(hsl, existing)))
        : Infinity;
      return { color, nearest };
    });
    const best = options[0].nearest >= 18 ? options[0]
      : options.reduce((winner, option) => option.nearest > winner.nearest ? option : winner);
    occupied.push(hexToHsl(best.color));
    return {
      id: `${suggestion.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
      label: suggestion.label,
      color: best.color,
    };
  });
};
