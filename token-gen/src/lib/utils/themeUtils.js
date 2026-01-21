const THEME_PACK_GUIDANCE = {
  Monochromatic: {
    best: 'Calm product UI, editorial systems',
    not: 'High-energy multi-brand palettes',
  },
  Analogous: {
    best: 'Warm storytelling, immersive UI',
    not: 'Strictly neutral enterprise systems',
  },
  Complementary: {
    best: 'Bold CTA contrast, marketing',
    not: 'Subtle, low-contrast brands',
  },
  Tertiary: {
    best: 'Playful multi-accent products',
    not: 'Minimal single-accent systems',
  },
  Apocalypse: {
    best: 'Experimental visuals, game UI',
    not: 'Conservative enterprise apps',
  },
};
export const getThemePackGuidance = (modeValue) => (
  THEME_PACK_GUIDANCE[modeValue] ?? {
    best: 'Product UI and brand systems',
    not: 'Single-use experiments',
  }
);
