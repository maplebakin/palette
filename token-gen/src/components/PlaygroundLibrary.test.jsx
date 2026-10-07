import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlaygroundLibrary from './PlaygroundLibrary.jsx';

describe('PlaygroundLibrary', () => {
  it('offers browser save, share, restore, and the free sketch promise', () => {
    render(
      <PlaygroundLibrary
        savedPalettes={[]}
        selectedPaletteId=""
        saveStatus="idle"
        onSave={vi.fn()}
        onSelectedPaletteChange={vi.fn()}
        onLoad={vi.fn()}
        onCopyLink={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Keep this palette' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save in this browser' })).toBeInTheDocument();
    expect(screen.getByText(/Free to use and copy\. Want the full system with files\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the kit ↓' })).toHaveAttribute('href', '#kit-collection');
    expect(screen.getByRole('button', { name: 'Copy share link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load palette' })).toBeDisabled();
  });

  it('loads a selected saved palette and only confirms a successful save', () => {
    const onSave = vi.fn();
    const onLoad = vi.fn();
    const onSelectedPaletteChange = vi.fn();
    render(
      <PlaygroundLibrary
        savedPalettes={[{ id: 'palette-1', name: 'Ash study', savedAt: '2026-10-05T12:00:00.000Z' }]}
        selectedPaletteId="palette-1"
        saveStatus="success"
        onSave={onSave}
        onSelectedPaletteChange={onSelectedPaletteChange}
        onLoad={onLoad}
        onCopyLink={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Palette saved in this browser.');
    fireEvent.click(screen.getByRole('button', { name: 'Save in this browser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load palette' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Copy share link' })).toBeInTheDocument();
  });
});
