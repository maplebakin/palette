import React, { createContext, useContext, useState, useCallback } from 'react';

/* eslint-disable react-refresh/only-export-components */
const MoodBoardContext = createContext(null);

import { MOOD_BOARD_ACTIONS } from './constants/moodBoardConstants.js';

export const useMoodBoard = () => {
  const context = useContext(MoodBoardContext);
  if (!context) {
    throw new Error('useMoodBoard must be used within a MoodBoardProvider');
  }
  return context;
};

export const MoodBoardProvider = ({ children }) => {
  const [savedMoodBoards, setSavedMoodBoards] = useState(() => {
    // Load saved mood boards from localStorage on initialization
    try {
      const saved = localStorage.getItem('token-gen/saved-moodboards');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load saved mood boards from localStorage', error);
      return [];
    }
  });

  const saveMoodBoard = useCallback((moodBoardData) => {
    const newMoodBoard = {
      id: `moodboard-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...moodBoardData,
    };

    setSavedMoodBoards(prev => {
      const updated = [newMoodBoard, ...prev.slice(0, 19)]; // Keep only the 20 most recent
      try {
        localStorage.setItem('token-gen/saved-moodboards', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save mood board to localStorage', error);
      }
      return updated;
    });

    return newMoodBoard;
  }, []);

  const deleteMoodBoard = useCallback((id) => {
    setSavedMoodBoards(prev => {
      const updated = prev.filter(board => board.id !== id);
      try {
        localStorage.setItem('token-gen/saved-moodboards', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to delete mood board from localStorage', error);
      }
      return updated;
    });
  }, []);

  const updateMoodBoard = useCallback((id, updates) => {
    setSavedMoodBoards(prev => {
      const updated = prev.map(board => 
        board.id === id 
          ? { ...board, ...updates, updatedAt: new Date().toISOString() } 
          : board
      );
      try {
        localStorage.setItem('token-gen/saved-moodboards', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update mood board in localStorage', error);
      }
      return updated;
    });
  }, []);

  const clearAllMoodBoards = useCallback(() => {
    setSavedMoodBoards([]);
    try {
      localStorage.removeItem('token-gen/saved-moodboards');
    } catch (error) {
      console.error('Failed to clear mood boards from localStorage', error);
    }
  }, []);

  const value = {
    savedMoodBoards,
    saveMoodBoard,
    deleteMoodBoard,
    updateMoodBoard,
    clearAllMoodBoards,
  };

  return (
    <MoodBoardContext.Provider value={value}>
      {children}
    </MoodBoardContext.Provider>
  );
};

export default MoodBoardContext;