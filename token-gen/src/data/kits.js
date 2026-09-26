export const KITS = [
  {
    id: 'nuclear-winter',
    artifactNo: '0417',
    name: 'Nuclear Winter',
    price: 9,
    teaserTokenCount: 12,
    totalTokens: 59,
    coreColors: 6,
    tintsPerColor: 9,
    formats: ['ase', 'swatches', 'gpl', 'css', 'json'],
    includesContrastMatrix: true,
    modes: ['light', 'dark', 'pop'],
  },
  {
    id: 'ashfall-bloom',
    artifactNo: '0418',
    name: 'Ashfall Bloom',
    price: 9,
    teaserTokenCount: 12,
    totalTokens: 59,
    coreColors: 6,
    tintsPerColor: 9,
    formats: ['ase', 'swatches', 'gpl', 'css', 'json'],
    includesContrastMatrix: true,
    modes: ['light', 'dark', 'pop'],
  },
  {
    id: 'vapor-dream',
    artifactNo: '0419',
    name: 'Vapor Dream',
    price: 9,
    teaserTokenCount: 12,
    totalTokens: 59,
    coreColors: 6,
    tintsPerColor: 9,
    formats: ['ase', 'swatches', 'gpl', 'css', 'json'],
    includesContrastMatrix: true,
    modes: ['light', 'dark', 'pop'],
  },
];

export const BUNDLE = {
  price: 39,
  blurb: 'All kits, present and future.',
};

// Seeds stay separate from the storefront manifest so the public listing shape
// remains focused on what a kit contains and costs.
export const KIT_SEEDS = {
  'nuclear-winter': { baseColor: '#a7f432', mode: 'Apocalypse', themeMode: 'dark' },
  'ashfall-bloom': { baseColor: '#b86f61', mode: 'Analogous', themeMode: 'dark' },
  'vapor-dream': { baseColor: '#ff8b94', mode: 'Tertiary', themeMode: 'pop' },
};
