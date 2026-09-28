import { getContrastRatio, getLuminance } from './colorUtils.js';

export const HANDOFF_DARK_INK = '#211d19';
export const HANDOFF_WARM_WHITE = '#f5efe5';

const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export const resolveHandoffAccent = ({ theme, baseColor } = {}) => (
  [theme?.tokens?.brand?.accent, theme?.tokens?.brand?.primary, baseColor]
    .find((candidate) => isHexColor(candidate)) || null
);

export const resolveOnAccentText = (accentHex) => {
  if (!isHexColor(accentHex)) return null;

  const accentLuminance = getLuminance(accentHex);
  const firstChoice = accentLuminance >= 0.5 ? HANDOFF_DARK_INK : HANDOFF_WARM_WHITE;
  const secondChoice = firstChoice === HANDOFF_DARK_INK ? HANDOFF_WARM_WHITE : HANDOFF_DARK_INK;
  const firstContrast = getContrastRatio(firstChoice, accentHex);
  const secondContrast = getContrastRatio(secondChoice, accentHex);

  return firstContrast >= secondContrast ? firstChoice : secondChoice;
};
