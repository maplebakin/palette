import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlaygroundLibrary from './PlaygroundLibrary.jsx';

describe('PlaygroundLibrary', () => {
  it('shows the exact local-save disclosure beside the save action', () => {
    render(
      <PlaygroundLibrary
        savedPalettes={[]}
        selectedPaletteId=""
        saveStatus="idle"
        onSave={vi.fn()}
        onSelectedPaletteChange={vi.fn()}
        onLoad={vi.fn()}
        onCopyLink={vi.fn()}
        showShareLink
      />,
    );

    expect(screen.getByText('Save in this browser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save palette' })).toBeInTheDocument();
    expect(screen.getByText("Saved palettes stay in this browser. They won't sync across devices, and clearing browser data can remove them. Keep a share link if you want to return elsewhere.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link to this palette' })).toBeInTheDocument();
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
        showShareLink={false}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Palette saved in this browser.');
    fireEvent.click(screen.getByRole('button', { name: 'Save palette' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load palette' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Copy link to this palette' })).not.toBeInTheDocument();
  });
});
