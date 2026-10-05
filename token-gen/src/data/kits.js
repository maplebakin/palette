export const KITS = [
  {
    id: 'nuclear-winter',
    artifactNo: '0417',
    name: 'Nuclear Winter',
    tagline: 'Oxblood and ash, made into a colour system for darker worlds.',
    price: 9,
    teaserTokenCount: 12,
    totalTokens: 59,
    coreColors: 6,
    tintsPerColor: 9,
    formats: ['ase', 'swatches', 'gpl', 'css', 'json', 'figma-tokens', 'tailwind'],
    includesContrastMatrix: true,
    modes: ['light', 'dark', 'pop'],
  },
];

// Palettes genuinely in progress in the forge. Named on the public page only
// in the "In the forge" strip — never as purchasable cards.
export const IN_THE_FORGE = [
  { id: 'ashfall-bloom', name: 'Ashfall Bloom' },
  { id: 'vapor-dream', name: 'Vapor Dream' },
];

// Starting points for the public playground, labelled as inspiration —
// separately from finished kits. Selecting one loads its seed into the
// generator; unfinished palettes never carry prices or Buy buttons.
export const INSPIRATION_SEEDS = [
  { id: 'nuclear-winter', name: 'Nuclear Winter' },
  { id: 'ashfall-bloom', name: 'Ashfall Bloom' },
  { id: 'vapor-dream', name: 'Vapor Dream' },
];

export const BUNDLE = {
  price: 39,
  blurb: 'All available kits.',
};

// Seeds stay separate from the storefront manifest so the public listing shape
// remains focused on what a kit contains and costs.
export const KIT_SEEDS = {
  'nuclear-winter': { baseColor: '#7f1d1d', mode: 'Apocalypse', themeMode: 'dark' },
  'ashfall-bloom': { baseColor: '#b86f61', mode: 'Analogous', themeMode: 'dark' },
  'vapor-dream': { baseColor: '#ff8b94', mode: 'Tertiary', themeMode: 'pop' },
};
