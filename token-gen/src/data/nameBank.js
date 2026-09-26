export const NAME_BANK = [
  'Ashen Orchard',
  'Moonlit Static',
  'Glass Tide',
  'Velvet Comet',
  'Cinder Bloom',
  'Mothlight',
  'Blue Hour Relic',
  'Quiet Voltage',
  'Rain on Mercury',
  'Hushed Marigold',
  'Night Garden Signal',
  'Silt and Stardust',
  'Electric Lichen',
  'Afterglow Archive',
  'Soft Ruin',
  'Ember Arithmetic',
  'Clouded Orchard',
  'Tidal Lantern',
  'Feral Dawn',
  'Silver Static',
  'Pale Thunder',
  'Orchid at Midnight',
  'Lunar Moss',
  'Saffron Fog',
  'Wildflower Circuit',
  'Worn Halo',
  'Charcoal Honey',
  'Magnetic Rain',
  'Dusk Cartography',
  'Tender Eclipse',
  'Ghost Light',
  'Sunken Violet',
];

export const randomExplorationName = (random = Math.random) => {
  const rawIndex = Math.floor(random() * NAME_BANK.length);
  const index = Math.max(0, Math.min(NAME_BANK.length - 1, rawIndex));
  return NAME_BANK[index];
};
