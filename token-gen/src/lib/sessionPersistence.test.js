import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadPlaygroundSession,
  PLAYGROUND_SESSION_KEY,
  savePlaygroundSession,
} from './sessionPersistence.js';

describe('playground session persistence', () => {
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    const values = {};
    const memoryStorage = {
      getItem: (key) => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
      setItem: (key, value) => {
        values[key] = String(value);
      },
      removeItem: (key) => {
        delete values[key];
      },
      clear: () => {
        Object.keys(values).forEach((key) => delete values[key]);
      },
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: memoryStorage,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  it('round-trips playground state, custom honesty, and copy count quietly', () => {
    const playground = {
      kitId: 'ashfall-bloom',
      explorationName: '',
      baseColor: '#b86f61',
      lockedSwatches: { 0: '#ffffff' },
      themeMode: 'dark',
      userHasMutated: true,
      isChaosMinted: false,
    };

    savePlaygroundSession({ playground, isCustom: true, copyCount: 3 });

    expect(window.localStorage.getItem(PLAYGROUND_SESSION_KEY)).toContain('ashfall-bloom');
    expect(loadPlaygroundSession()).toEqual({ playground, isCustom: true, copyCount: 3 });
  });
});
