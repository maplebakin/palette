import { useState, useCallback } from 'react';

const STORAGE_KEYS = {
  current: 'token-gen/current-project',
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

export function useProjectStorage() {
  const [isAvailable] = useState(() => isStorageAvailable());
  const [isCorrupted, setIsCorrupted] = useState(false);

  const loadInitialState = useCallback(() => {
    if (!isAvailable) return { current: null };

    let current = null;

    try {
      const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
      if (currentRaw) {
        current = JSON.parse(currentRaw);
      }
    } catch (e) {
      console.error("Error parsing current project from localStorage", e);
      setIsCorrupted(true);
    }
    
    return { current };
  }, [isAvailable]);
  
  const saveCurrentProjectState = useCallback((state) => {
    if (!isAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving current project to localStorage", e);
      if (e.name === 'QuotaExceededError') {
        // Handle quota exceeded error
      }
    }
  }, [isAvailable]);

  const clearAllData = useCallback(() => {
    if (!isAvailable) return;
    try {
      localStorage.removeItem(STORAGE_KEYS.current);
      setIsCorrupted(false);
    } catch (e) {
      console.error("Error clearing localStorage data", e);
    }
  }, [isAvailable]);

  return {
    isAvailable,
    isCorrupted,
    loadInitialState,
    saveCurrentProjectState,
    clearAllData,
  };
}