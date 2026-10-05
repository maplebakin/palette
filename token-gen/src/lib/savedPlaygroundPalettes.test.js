import { describe, expect, it, vi } from 'vitest';
import {
  loadSavedPlaygroundPalettes,
  savePlaygroundPalette,
  SAVED_PLAYGROUND_PALETTES_KEY,
} from './savedPlaygroundPalettes.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
  };
};

describe('saved playground palettes', () => {
  it('writes a full palette before returning a saved confirmation record', () => {
    const storage = createStorage();
    const playground = {
      baseColor: '#123456',
      harmony: 'Analogous',
      themeMode: 'pop',
      swatchOverrides: { 1: '#abcdef' },
      lockedSwatches: { 2: '#fedcba' },
      confirmedModes: { light: true, pop: true },
    };

    const saved = savePlaygroundPalette({ playground, name: 'Vapor study' }, storage);

    expect(saved).toMatchObject({ name: 'Vapor study', playground });
    expect(saved.id).toBeTruthy();
    expect(Date.parse(saved.savedAt)).not.toBeNaN();
    expect(loadSavedPlaygroundPalettes(storage)).toEqual([saved]);
    expect(storage.setItem).toHaveBeenCalledWith(
      SAVED_PLAYGROUND_PALETTES_KEY,
      expect.stringContaining('Vapor study'),
    );
  });

  it('reports a storage write failure instead of returning a saved record', () => {
    const storage = createStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => savePlaygroundPalette({ playground: { baseColor: '#123456' } }, storage))
      .toThrow('Could not save this palette in browser storage');
  });

  it('ignores malformed or unavailable stored data', () => {
    const storage = createStorage();
    storage.getItem.mockReturnValue('{bad json');
    expect(loadSavedPlaygroundPalettes(storage)).toEqual([]);
    expect(loadSavedPlaygroundPalettes({ getItem: () => { throw new Error('blocked'); } })).toEqual([]);
  });
});
