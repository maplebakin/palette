import { getContrastRatio, getWCAGBadge } from './colorUtils.js';

const CONTRAST_PAIRS = [
  { id: 'text-background', label: 'Text on background', foreground: 'text', background: 'background', minimumRatio: 4.5 },
  { id: 'muted-background', label: 'Muted text on background', foreground: 'mutedText', background: 'background', minimumRatio: 4.5 },
  { id: 'text-surface', label: 'Text on surface', foreground: 'text', background: 'surface', minimumRatio: 4.5 },
  { id: 'button-cta', label: 'Button label on CTA', foreground: 'ctaText', background: 'cta', minimumRatio: 4.5 },
  { id: 'accent-background', label: 'Accent links on background', foreground: 'accent', background: 'background', minimumRatio: 4.5 },
  { id: 'border-background', label: 'Border on background', foreground: 'border', background: 'background', minimumRatio: 3 },
];

export const buildPlaygroundContrastChecks = (roles = {}) => CONTRAST_PAIRS.map((pair) => {
  const foreground = roles[pair.foreground] || (pair.foreground === 'mutedText' ? roles.muted : null) || '#000000';
  const background = roles[pair.background] || '#ffffff';
  const ratio = getContrastRatio(foreground, background);
  return {
    ...pair,
    foreground,
    background,
    ratio,
    passes: ratio >= pair.minimumRatio,
    badge: getWCAGBadge(ratio),
  };
});
