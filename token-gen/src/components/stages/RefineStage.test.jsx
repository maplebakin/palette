import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RefineStage from './RefineStage.jsx';

const tokens = {
  brand: {
    primary: '#b0074e',
    accent: '#972b49',
  },
  status: {
    error: '#dc2626',
  },
};

const renderRefineStage = (props = {}) => render(
  <RefineStage
    showFineTune
    setShowFineTune={vi.fn()}
    harmonyIntensity={120}
    neutralCurve={110}
    accentStrength={130}
    accentHueShift={12}
    accentSaturationShift={-8}
    apocalypseIntensity={90}
    popIntensity={80}
    harmonyInput={120}
    neutralInput={110}
    accentInput={130}
    accentHueInput={12}
    accentSaturationInput={-8}
    apocalypseInput={90}
    popInput={80}
    setHarmonyInput={vi.fn()}
    setNeutralInput={vi.fn()}
    setAccentInput={vi.fn()}
    setAccentHueInput={vi.fn()}
    setAccentSaturationInput={vi.fn()}
    setApocalypseInput={vi.fn()}
    setPopInput={vi.fn()}
    debouncedHarmonyChange={vi.fn()}
    debouncedNeutralChange={vi.fn()}
    debouncedAccentChange={vi.fn()}
    debouncedAccentHueChange={vi.fn()}
    debouncedAccentSaturationChange={vi.fn()}
    debouncedApocalypseChange={vi.fn()}
    debouncedPopChange={vi.fn()}
    resetFineTuneSliders={vi.fn()}
    variantStatus={{
      variantCoverage: 'current-mode-only',
      availableModes: ['light'],
      missingModes: ['dark', 'pop'],
    }}
    themeMode="light"
    setThemeMode={vi.fn()}
    tokens={tokens}
    mode="Monochromatic"
    chaosMenuOpen={false}
    setChaosMenuOpen={vi.fn()}
    randomRitual={vi.fn()}
    crankApocalypse={vi.fn()}
    resetPalette={vi.fn()}
    {...props}
  />
);

describe('RefineStage', () => {
  it('renders a fine-tune reset button that calls the reset handler', () => {
    const resetFineTuneSliders = vi.fn();

    renderRefineStage({ resetFineTuneSliders });
    fireEvent.click(screen.getByRole('button', { name: /reset sliders/i }));

    expect(resetFineTuneSliders).toHaveBeenCalledTimes(1);
  });

  it('shows confirmed variant coverage near mode controls', () => {
    renderRefineStage();

    expect(screen.getByTestId('confirmed-variants-status')).toBeInTheDocument();
    expect(screen.getByLabelText(/light confirmed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dark missing/i)).toBeInTheDocument();
    expect(screen.getByText(/exports include confirmed modes only/i)).toBeInTheDocument();
  });

  it('renders accent hue and saturation controls', () => {
    const debouncedAccentHueChange = vi.fn();
    const debouncedAccentSaturationChange = vi.fn();

    renderRefineStage({ debouncedAccentHueChange, debouncedAccentSaturationChange });
    fireEvent.change(screen.getByLabelText(/adjust accent hue/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/adjust accent saturation/i), { target: { value: '-12' } });

    expect(screen.getByText('Accent Hue')).toBeInTheDocument();
    expect(screen.getByText('Accent Saturation')).toBeInTheDocument();
    expect(screen.getByText(/nudge buttons\/highlights warmer, cooler, softer, or stronger/i)).toBeInTheDocument();
    expect(debouncedAccentHueChange).toHaveBeenCalledWith('20');
    expect(debouncedAccentSaturationChange).toHaveBeenCalledWith('-12');
  });

  it('renders the light/dark/pop theme mode switch', () => {
    const setThemeMode = vi.fn();

    renderRefineStage({ setThemeMode });
    fireEvent.click(screen.getByRole('button', { name: /set theme mode to dark/i }));

    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });
});
