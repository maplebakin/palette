import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import TastingRoom from './TastingRoom.jsx';

beforeEach(() => {
  const store = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
    },
  });
  window.history.replaceState({}, '', '/');
});

describe('TastingRoom suggestion invitation', () => {
  it('hides the invitation on the initial palette and reveals it after a palette change', () => {
    render(<TastingRoom />);

    expect(screen.queryByRole('heading', { name: 'Love this palette?' })).not.toBeInTheDocument();

    const previewModes = screen.getByRole('group', { name: 'Preview mode' });
    fireEvent.click(within(previewModes).getByRole('button', { name: 'Light' }));

    expect(screen.getByRole('heading', { name: 'Love this palette?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suggest this for a finished kit' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the frozen palette preview only after the invitation is pressed', () => {
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest this for a finished kit' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Palette preview' })).toBeInTheDocument();
    expect(screen.getByLabelText(/required so I can contact you about this suggestion/i)).toHaveFocus();
  });
});
