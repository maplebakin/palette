import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaygroundMoodBoard from './PlaygroundMoodBoard.jsx';

const roles = {
  surface: '#eeeeee',
  text: '#222222',
  background: '#ffffff',
  border: '#cccccc',
  accent: '#aa0000',
  secondaryAction: '#00aa00',
};

const swatches = [
  { name: 'Primary', color: '#123456', locked: false },
  { name: 'Accent', color: '#abcdef', locked: true },
  { name: 'Background', color: '#fedcba', locked: false },
];

describe('PlaygroundMoodBoard', () => {
  it('renders a sketch-only mood study from the live palette values', () => {
    const { container, rerender } = render(
      <PlaygroundMoodBoard roles={roles} swatches={swatches} harmony="Analogous" themeMode="dark" />,
    );

    expect(screen.getByRole('region', { name: 'Mood board sketch preview' })).toBeInTheDocument();
    expect(screen.getByText('Analogous · dark')).toBeInTheDocument();
    expect(screen.getByText('#123456')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(container.querySelector('.playground-mood-color-field').style.background)
      .toContain('rgb(18, 52, 86)');

    rerender(
      <PlaygroundMoodBoard
        roles={roles}
        swatches={[{ ...swatches[0], color: '#654321', locked: true }, ...swatches.slice(1)]}
        harmony="Tertiary"
        themeMode="light"
      />,
    );

    expect(screen.getByText('Tertiary · light')).toBeInTheDocument();
    expect(screen.getByText('#654321')).toBeInTheDocument();
    expect(container.querySelector('.playground-mood-color-field').style.background)
      .toContain('rgb(101, 67, 33)');
    expect(screen.getAllByText('Locked')).toHaveLength(2);
  });
});
