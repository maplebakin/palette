import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BuildStage from './BuildStage.jsx';

const tokens = {
  brand: {
    primary: '#b0074e',
    accent: '#972b49',
  },
  status: {
    error: '#dc2626',
  },
};

const renderBuildStage = (props = {}) => render(
  <BuildStage
    headerOpen
    setHeaderOpen={vi.fn()}
    chaosMenuOpen={false}
    setChaosMenuOpen={vi.fn()}
    randomRitual={vi.fn()}
    crankApocalypse={vi.fn()}
    resetPalette={vi.fn()}
    tokens={tokens}
    mode="Monochromatic"
    setMode={vi.fn()}
    themeMode="light"
    setThemeMode={vi.fn()}
    pickerColor="#ff9db8"
    baseInput="#ff9db8"
    baseError=""
    handleBaseColorChange={vi.fn()}
    flushBaseColorChange={vi.fn()}
    presets={[]}
    applyPreset={vi.fn()}
    showFineTune
    setShowFineTune={vi.fn()}
    harmonyIntensity={120}
    neutralCurve={110}
    accentStrength={130}
    apocalypseIntensity={90}
    popIntensity={80}
    harmonyInput={120}
    neutralInput={110}
    accentInput={130}
    apocalypseInput={90}
    popInput={80}
    setHarmonyInput={vi.fn()}
    setNeutralInput={vi.fn()}
    setAccentInput={vi.fn()}
    setApocalypseInput={vi.fn()}
    setPopInput={vi.fn()}
    debouncedHarmonyChange={vi.fn()}
    debouncedNeutralChange={vi.fn()}
    debouncedAccentChange={vi.fn()}
    debouncedApocalypseChange={vi.fn()}
    debouncedPopChange={vi.fn()}
    resetFineTuneSliders={vi.fn()}
    {...props}
  />
);

describe('BuildStage', () => {
  it('renders a fine-tune reset button that calls the reset handler', () => {
    const resetFineTuneSliders = vi.fn();

    renderBuildStage({ resetFineTuneSliders });
    fireEvent.click(screen.getByRole('button', { name: /reset sliders/i }));

    expect(resetFineTuneSliders).toHaveBeenCalledTimes(1);
  });
});
