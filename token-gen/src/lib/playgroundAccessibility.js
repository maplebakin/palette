import { getContrastRatio, getWCAGBadge } from './colorUtils.js';

const CONTRAST_PAIRS = [
  { id: 'body-background', label: 'Body text on background', foreground: 'text', background: 'background' },
  { id: 'action-button', label: 'Action label on button', foreground: 'ctaForeground', background: 'cta' },
  { id: 'muted-surface', label: 'Muted text on surface', foreground: 'mutedText', background: 'surface' },
];

export const buildPlaygroundContrastChecks = (roles = {}) => CONTRAST_PAIRS.map((pair) => {
  const foreground = roles[pair.foreground] || '#000000';
  const background = roles[pair.background] || '#ffffff';
  const ratio = getContrastRatio(foreground, background);
  return {
    ...pair,
    foreground,
    background,
    ratio,
    badge: getWCAGBadge(ratio),
  };
});
