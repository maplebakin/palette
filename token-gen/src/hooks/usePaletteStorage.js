import { useState, useCallback } from 'react';

const STORAGE_KEYS = {
  current: 'token-gen/current-palette',
  saved: 'token-gen/saved-palettes',
};

const isStorageAvailable = () => {
  try {
    const key = `__storage_test__`;
    window.localStorage.setItem(key, key);
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export function usePaletteStorage() {
  const [isAvailable] = useState(() => isStorageAvailable());
  const [isCorrupted, setIsCorrupted] = useState(false);

  const loadInitialState = useCallback(() => {
    if (!isAvailable) return { current: null, saved: [] };

    let current = null;
    let saved = [];

    try {
      const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
      if (currentRaw) {
        current = JSON.parse(currentRaw);
      }
    } catch (e) {
      console.error("Error parsing current palette from localStorage", e);
      setIsCorrupted(true);
    }

    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.saved);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) {
          saved = parsed;
        } else {
          console.error("Saved palettes from localStorage is not an array", parsed);
          setIsCorrupted(true);
        }
      }
    } catch (e) {
      console.error("Error parsing saved palettes from localStorage", e);
      setIsCorrupted(true);
    }
    
    return { current, saved };
  }, [isAvailable]);
  
  const saveCurrentPaletteState = useCallback((state) => {
    if (!isAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving current palette to localStorage", e);
      if (e.name === 'QuotaExceededError') {
        // Handle quota exceeded error
      }
    }
  }, [isAvailable]);

  const saveSavedPalettes = useCallback((palettes) => {
    if (!isAvailable) return;
    try {
      const next = palettes.slice(0, 20); // Limit to 20 saved palettes
      localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(next));
      return next;
    } catch (e) {
      console.error("Error saving palettes to localStorage", e);
      if (e.name === 'QuotaExceededError') {
        // Handle quota exceeded error
      }
      return palettes; // return original array on failure
    }
  }, [isAvailable]);

  const clearAllData = useCallback(() => {
    if (!isAvailable) return;
    try {
      localStorage.removeItem(STORAGE_KEYS.current);
      localStorage.removeItem(STORAGE_KEYS.saved);
      setIsCorrupted(false);
    } catch (e) {
      console.error("Error clearing localStorage data", e);
    }
  }, [isAvailable]);

  return {
    isAvailable,
    isCorrupted,
    loadInitialState,
    saveCurrentPaletteState,
    saveSavedPalettes,
    clearAllData,
  };
}
