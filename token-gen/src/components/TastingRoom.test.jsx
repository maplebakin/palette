import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TastingRoom from './TastingRoom.jsx';
import { decodePlaygroundHash, encodePlaygroundHash } from '../lib/playgroundLink.js';
import { SAVED_PLAYGROUND_PALETTES_KEY } from '../lib/savedPlaygroundPalettes.js';

let localStore;
let failSavedPaletteWrites;

beforeEach(() => {
  localStore = new Map();
  failSavedPaletteWrites = false;
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => {
        if (failSavedPaletteWrites && key === SAVED_PLAYGROUND_PALETTES_KEY) throw new Error('quota');
        localStore.set(key, String(value));
      },
    },
  });
  window.history.replaceState({}, '', '/');
});

describe('TastingRoom suggestion invitation', () => {
  it('keeps the hero stable and shows the current palette status by the controls', () => {
    render(<TastingRoom />);

    expect(screen.getByText('LIVE PALETTE PLAYGROUND')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Make a palette worth keeping.' })).toBeInTheDocument();
    expect(screen.getByText('Generate a sketch here. Ship with a finished 59-token kit — Light, Dark, Pop, seven production formats — from $9.')).toBeInTheDocument();

    const controls = screen.getByRole('complementary', { name: 'Playground controls' });
    expect(within(controls).getByText('Nuclear Winter seed', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nuclear Winter seed' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));
    expect(within(controls).getByText('Custom exploration · inspired by Nuclear Winter', { selector: 'p' })).toBeInTheDocument();
  });

  it('places the palette and core controls before preview, share/save, tokens, contrast, and the shelf', () => {
    render(<TastingRoom />);

    expect(within(screen.getByRole('group', { name: 'Current palette swatches' })).getAllByRole('button')).toHaveLength(8);
    expect(screen.getByLabelText('Seed color hex')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Harmony mode' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Preview mode' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));

    const main = document.getElementById('tasting-main');
    const orderedBlocks = [
      main.querySelector('.playground-generator-panel'),
      main.querySelector('.playground-preview'),
      main.querySelector('.playground-handoff-row'),
      main.querySelector('.playground-library'),
      main.querySelector('.playground-token-inspector'),
      main.querySelector('.playground-accessibility'),
      main.querySelector('#kit-collection'),
      main.querySelector('[aria-label="How Apocapalette works"]'),
    ];
    const positions = orderedBlocks.map((block) => Array.from(main.children).indexOf(block));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('hides the invitation on the initial palette and reveals it after a palette change', () => {
    render(<TastingRoom />);

    expect(screen.queryByRole('heading', { name: 'Love this palette?' })).not.toBeInTheDocument();
    expect(screen.getByText('Save in this browser')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));

    expect(screen.getByRole('heading', { name: 'Love this palette?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suggest this for a finished kit' })).toBeInTheDocument();
    expect(screen.getByText('Share this sketch')).toBeInTheDocument();
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

  it('edits an individual swatch, copies curated token values, and keeps edits across disclosure toggles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<TastingRoom />);

    const advanced = screen.getByText('Advanced refinement');
    fireEvent.click(advanced);
    const primaryEditor = screen.getByLabelText('Edit Primary swatch color');
    fireEvent.change(primaryEditor, { target: { value: '#123abc' } });
    expect(screen.getAllByRole('button', { name: 'Copy Primary swatch #123abc' }).length).toBeGreaterThan(0);

    fireEvent.click(advanced);
    expect(screen.queryByLabelText('Edit Primary swatch color')).not.toBeVisible();
    fireEvent.click(advanced);
    expect(screen.getByLabelText('Edit Primary swatch color')).toHaveValue('#123abc');

    const tokenInspector = screen.getByRole('region', { name: 'Sketch token inspector' });
    fireEvent.click(within(tokenInspector).getByText('Tokens'));
    const copyToken = screen.getByRole('button', { name: 'Copy --brand-primary value #123abc' });
    fireEvent.click(copyToken);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenLastCalledWith('#123abc');
    expect(screen.getByRole('status')).toHaveTextContent(/^Copied brand\.primary:/);

    fireEvent.change(screen.getByLabelText('Edit Accent swatch color'), { target: { value: '#654321' } });
    expect(document.querySelector('.playground-hero-colorfield').style.background).toContain('rgb(101, 67, 33)');
  });

  it('shows a mood board that follows harmony, mode, swatch edits, locks, and regeneration', () => {
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mood' }));

    const moodBoard = screen.getByRole('region', { name: 'Mood board sketch preview' });
    expect(within(moodBoard).getByText('Apocalypse · dark')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Preview mode' })).getByRole('button', { name: 'Light' }));
    expect(within(moodBoard).getByText('Analogous · light')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Advanced refinement'));
    fireEvent.change(screen.getByLabelText('Edit Primary swatch color'), { target: { value: '#2468ac' } });
    expect(within(moodBoard).getByText('#2468AC')).toBeInTheDocument();

    const primaryLocks = screen.getAllByRole('button', { name: 'Lock Primary swatch' });
    fireEvent.click(primaryLocks[primaryLocks.length - 1]);
    expect(within(moodBoard).getByText('Locked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate unlocked' }));
    expect(within(moodBoard).getByText('#2468AC')).toBeInTheDocument();
    expect(within(moodBoard).getAllByText('Unlocked').length).toBeGreaterThan(0);
  });

  it('keeps each confirmed mode sketch in a share link and restores it in a fresh render', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { unmount } = render(<TastingRoom />);
    fireEvent.click(screen.getByText('Advanced refinement'));
    fireEvent.change(screen.getByLabelText('Edit Primary swatch color'), { target: { value: '#123abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    fireEvent.change(screen.getByLabelText('Edit Primary swatch color'), { target: { value: '#abcdef' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Preview mode' })).getByRole('button', { name: /Dark/ }));

    expect(screen.getByLabelText('Edit Primary swatch color')).toHaveValue('#123abc');
    fireEvent.click(screen.getByRole('button', { name: 'Copy link to this palette' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());

    const shareUrl = new URL(writeText.mock.lastCall[0]);
    const linkedPayload = decodePlaygroundHash(shareUrl.hash);
    expect(linkedPayload.modeStates).toMatchObject({
      dark: { swatchOverrides: { 0: '#123abc' } },
      light: { swatchOverrides: { 0: '#abcdef' } },
    });

    unmount();
    window.history.replaceState({}, '', `/${shareUrl.hash}`);
    render(<TastingRoom />);
    fireEvent.click(screen.getByText('Advanced refinement'));
    expect(screen.getByLabelText('Edit Primary swatch color')).toHaveValue('#123abc');
    fireEvent.click(within(screen.getByRole('group', { name: 'Preview mode' })).getByRole('button', { name: /Light/ }));
    expect(screen.getByLabelText('Edit Primary swatch color')).toHaveValue('#abcdef');
  });

  it('saves only after browser storage succeeds and can load the saved sketch', async () => {
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Save palette' }));

    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent('Palette saved in this browser.');
    const saved = JSON.parse(localStore.get(SAVED_PLAYGROUND_PALETTES_KEY));
    expect(saved.palettes).toHaveLength(1);
    expect(saved.palettes[0].playground.baseColor).toBe('#7f1d1d');

    fireEvent.click(screen.getByRole('button', { name: 'Tertiary' }));
    fireEvent.change(screen.getByLabelText('Load a saved palette'), { target: { value: saved.palettes[0].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Load palette' }));
    expect(screen.getByRole('button', { name: 'Apocalypse' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a save failure without a success confirmation', () => {
    failSavedPaletteWrites = true;
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Save palette' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Couldn\'t save this palette.');
    expect(screen.queryByText('Palette saved in this browser.')).not.toBeInTheDocument();
  });

  it('restores edits, locks, overrides, and confirmed modes from a fresh share link', () => {
    const linkedState = {
      kitId: 'nuclear-winter',
      explorationName: '',
      baseColor: '#7f1d1d',
      baseInput: '#7f1d1d',
      harmony: 'Tertiary',
      themeMode: 'light',
      hueNudge: 11,
      satNudge: -8,
      lockedSwatches: { 0: '#123456' },
      swatchOverrides: { 1: '#abcdef' },
      regenerateCount: 4,
      userHasMutated: true,
      isChaosMinted: false,
      chaosIndex: 0,
      confirmedModes: { dark: true, light: true },
    };
    window.history.replaceState({}, '', `/${encodePlaygroundHash(linkedState)}`);
    render(<TastingRoom />);

    expect(screen.getByLabelText('Seed color hex')).toHaveValue('#7f1d1d');
    expect(screen.getByRole('button', { name: 'Tertiary' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Unlock Primary swatch' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Advanced refinement'));
    expect(screen.getAllByLabelText(/Edit .* swatch color/).map((input) => input.value)).toContain('#abcdef');
    expect(screen.getByRole('button', { name: /^Light/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Save palette' }));
    const saved = JSON.parse(localStore.get(SAVED_PLAYGROUND_PALETTES_KEY)).palettes[0].playground;
    expect(saved).toMatchObject({
      hueNudge: 11,
      satNudge: -8,
      lockedSwatches: { 0: '#123456' },
      swatchOverrides: { 1: '#abcdef' },
      regenerateCount: 4,
      confirmedModes: { dark: true, light: true },
    });
  });

  it('keeps downloads out of the public playground UI', () => {
    render(<TastingRoom />);

    expect(screen.queryByRole('button', { name: /download|export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /download|export/i })).not.toBeInTheDocument();
  });
});
