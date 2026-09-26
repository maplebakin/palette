import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateStage from './CreateStage.jsx';

const tokens = {
  brand: {
    primary: '#b0074e',
    accent: '#972b49',
  },
  status: {
    error: '#dc2626',
  },
};

const renderCreateStage = (props = {}) => render(
  <CreateStage
    headerOpen
    setHeaderOpen={vi.fn()}
    randomRitual={vi.fn()}
    crankApocalypse={vi.fn()}
    resetPalette={vi.fn()}
    tokens={tokens}
    mode="Monochromatic"
    setMode={vi.fn()}
    pickerColor="#ff9db8"
    baseInput="#ff9db8"
    baseError=""
    handleBaseColorChange={vi.fn()}
    flushBaseColorChange={vi.fn()}
    presets={[{ name: 'Solar Flare', base: '#f59e0b', mode: 'Analogous' }]}
    applyPreset={vi.fn()}
    {...props}
  />
);

describe('CreateStage', () => {
  it('renders the seed color picker and hex input', () => {
    renderCreateStage();

    expect(screen.getByLabelText(/choose base color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/base color hex value/i)).toHaveValue('#ff9db8');
  });

  it('renders harmony mode buttons that call setMode', () => {
    const setMode = vi.fn();

    renderCreateStage({ setMode });
    fireEvent.click(screen.getByRole('button', { name: /set harmony mode to complementary/i }));

    expect(setMode).toHaveBeenCalledWith('Complementary');
  });

  it('renders the preset selector', () => {
    const applyPreset = vi.fn();

    renderCreateStage({ applyPreset });
    fireEvent.change(screen.getByLabelText(/choose a preset palette/i), { target: { value: 'Solar Flare' } });

    expect(applyPreset).toHaveBeenCalledWith('Solar Flare');
  });

  it('shows the hex validation error when the base input is invalid', () => {
    renderCreateStage({ baseError: 'Enter a hex value like #FF00FF' });

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a hex value like #FF00FF');
  });

  it('hides the generation controls when the header is collapsed', () => {
    renderCreateStage({ headerOpen: false });

    expect(screen.queryByLabelText(/choose base color/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show controls/i })).toBeInTheDocument();
  });
});
