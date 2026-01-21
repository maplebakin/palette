import React, { createContext, useContext, useState, useCallback } from 'react';

/* eslint-disable react-refresh/only-export-components */
const HistoryContext = createContext(null);

import { HISTORY_ACTIONS } from './constants/historyConstants.js';

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};

export const HistoryProvider = ({ children, maxHistory = 50 }) => {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addToHistory = useCallback((state) => {
    // If we're not at the end of history, truncate everything after current index
    const newHistory = history.slice(0, currentIndex + 1);
    // Add the new state
    newHistory.push(state);
    // Limit history to maxHistory items, removing oldest if necessary
    if (newHistory.length > maxHistory) {
      newHistory.shift();
      setCurrentIndex(maxHistory - 1);
    } else {
      setCurrentIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  }, [history, currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const value = {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    currentIndex,
    historyLength: history.length,
  };

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
};

export default HistoryContext;