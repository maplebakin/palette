export const SAVED_PLAYGROUND_PALETTES_KEY = 'apocapalette:saved-playground-palettes:v1';

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getStorage = (storage) => {
  if (storage) return storage;
  if (typeof window === 'undefined') throw new Error('Browser storage is unavailable');
  return window.localStorage;
};

const readSavedPalettes = (storage) => {
  const raw = storage.getItem(SAVED_PLAYGROUND_PALETTES_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (parsed?.version !== 1 || !Array.isArray(parsed.palettes)) return [];
  return parsed.palettes.filter((palette) => (
    isRecord(palette)
    && typeof palette.id === 'string'
    && typeof palette.name === 'string'
    && typeof palette.savedAt === 'string'
    && isRecord(palette.playground)
  ));
};

const createPaletteId = () => (
  globalThis.crypto?.randomUUID?.()
  || `saved-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

export const loadSavedPlaygroundPalettes = (storageOverride) => {
  try {
    return readSavedPalettes(getStorage(storageOverride));
  } catch {
    return [];
  }
};

export const savePlaygroundPalette = ({ playground, name }, storageOverride) => {
  if (!isRecord(playground)) throw new Error('A palette is required to save');

  try {
    const storage = getStorage(storageOverride);
    const savedPalette = {
      id: createPaletteId(),
      name: String(name || 'Saved palette').trim() || 'Saved palette',
      savedAt: new Date().toISOString(),
      playground: JSON.parse(JSON.stringify(playground)),
    };
    const palettes = [savedPalette, ...readSavedPalettes(storage)];
    storage.setItem(SAVED_PLAYGROUND_PALETTES_KEY, JSON.stringify({ version: 1, palettes }));

    if (!readSavedPalettes(storage).some(({ id }) => id === savedPalette.id)) {
      throw new Error('Saved palette could not be verified');
    }
    return savedPalette;
  } catch (error) {
    throw new Error('Could not save this palette in browser storage', { cause: error });
  }
};
