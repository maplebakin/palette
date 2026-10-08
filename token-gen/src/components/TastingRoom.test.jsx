import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TastingRoom from './TastingRoom.jsx';
import { decodePlaygroundHash, encodePlaygroundHash } from '../lib/playgroundLink.js';
import { SAVED_PLAYGROUND_PALETTES_KEY } from '../lib/savedPlaygroundPalettes.js';
import { phraseToSeedColor } from '../lib/seedColor.js';

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

describe('TastingRoom creator-first layout', () => {
  it('starts with a generated seed and names the free seven-role creator', () => {
    render(<TastingRoom />);

    expect(screen.getByRole('heading', { level: 1, name: 'Make a palette worth keeping.' })).toBeInTheDocument();
    expect(screen.getByText('Apocapalette · The Tasting Room')).toBeInTheDocument();
    expect(screen.getByText("Pick a seed color. Get seven roles. See them on a real page, then check they're readable.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your seven roles' })).toBeInTheDocument();

    const controls = screen.getByRole('complementary', { name: 'Playground controls' });
    expect(within(controls).getByText('Nuclear Winter seed', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nuclear Winter seed' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));
    expect(within(controls).getByText('Custom exploration · inspired by Nuclear Winter', { selector: 'p' })).toBeInTheDocument();
  });

  it('keeps the creator first, then follows save, readability, implementation, and kit order', () => {
    render(<TastingRoom />);

    const generatedRoles = within(screen.getByRole('group', { name: 'Generated semantic palette' }))
      .getAllByLabelText(/Edit .* role color/);
    expect(generatedRoles).toHaveLength(7);
    expect(generatedRoles.every(({ value }) => /^#[0-9a-f]{6}$/i.test(value))).toBe(true);
    expect(screen.getByLabelText('Seed color hex or phrase')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Color relationship' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    expect(screen.getByText('Press Space to regenerate. Locked roles stay put. Everything else is rebuilt from your seed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save in this browser' })).toBeInTheDocument();
    expect(screen.getByText('Advanced options')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));

    const main = document.querySelector('.playground-page-content');
    const creatorConsole = main.querySelector('.playground-console');
    const controls = creatorConsole.querySelector('.playground-controls');
    const workspace = creatorConsole.querySelector('.playground-creator-workspace');
    const consoleChildren = Array.from(creatorConsole.children);
    const followup = main.querySelector('.playground-followup-grid');
    const library = main.querySelector('.playground-library');
    const suggestion = main.querySelector('.playground-suggestion-row');
    const followupChildren = Array.from(followup.children);
    const topLevel = Array.from(main.children);

    expect(main.querySelector('.playground-page-header').nextElementSibling).toBe(creatorConsole);
    expect(consoleChildren).toEqual([controls, workspace]);
    expect(workspace.querySelector('.playground-generator-panel').nextElementSibling).toBe(workspace.querySelector('.playground-preview'));
    expect(followupChildren).toEqual([
      followup.querySelector('.playground-accessibility'),
      followup.querySelector('.playground-code-export'),
    ]);
    expect(topLevel.indexOf(creatorConsole)).toBeLessThan(topLevel.indexOf(followup));
    expect(topLevel.indexOf(creatorConsole)).toBeLessThan(topLevel.indexOf(library));
    expect(topLevel.indexOf(library)).toBeLessThan(topLevel.indexOf(suggestion));
    expect(topLevel.indexOf(suggestion)).toBeLessThan(topLevel.indexOf(followup));
    expect(topLevel.indexOf(followup)).toBeLessThan(topLevel.indexOf(main.querySelector('#kit-collection')));
    expect(screen.getByRole('heading', { name: 'Save or share this palette' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How readable is this palette?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Use it in your project' })).toBeInTheDocument();
    expect(screen.getByLabelText('Colour-vision simulator')).toBeInTheDocument();
  });

  it('shows a clear failure when a contrast pairing misses its target', () => {
    render(<TastingRoom />);
    fireEvent.change(screen.getByLabelText('Edit Background role color'), { target: { value: '#111111' } });
    fireEvent.change(screen.getByLabelText('Edit Text role color'), { target: { value: '#111111' } });

    const textPair = Array.from(document.querySelectorAll('.playground-contrast-card'))
      .find((card) => card.querySelector('h3')?.textContent === 'Text on background');
    expect(textPair.querySelector('.playground-contrast-badge')).toHaveTextContent('Fail');
    expect(textPair).toHaveTextContent('1.00:1');
    expect(document.querySelector('.playground-contrast-summary')).toHaveTextContent(/need(s)? adjustment/);
  });

  it('uses a deterministic phrase seed and restores its generated palette on a fresh render', () => {
    const { unmount } = render(<TastingRoom />);
    const seedInput = screen.getByLabelText('Seed color hex or phrase');
    fireEvent.change(seedInput, { target: { value: 'winter orchard' } });
    const firstSeed = screen.getByLabelText('Seed color swatch').value;
    const firstPalette = screen.getAllByLabelText(/Edit .* role color/).map(({ value }) => value);
    expect(seedInput).toHaveValue('winter orchard');

    unmount();
    render(<TastingRoom />);

    expect(screen.getByLabelText('Seed color swatch')).toHaveValue(firstSeed);
    expect(screen.getAllByLabelText(/Edit .* role color/).map(({ value }) => value)).toEqual(firstPalette);
  });

  it('regenerates with Space but ignores Space while the seed field is being edited', () => {
    render(<TastingRoom />);
    const background = screen.getByLabelText('Edit Background role color');
    const accent = screen.getByLabelText('Edit Accent role color');
    const lockedBackground = background.value;
    const originalAccent = accent.value;

    fireEvent.click(screen.getByRole('button', { name: 'Lock Background role' }));
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });

    expect(screen.getByLabelText('Edit Background role color')).toHaveValue(lockedBackground);
    expect(screen.getByLabelText('Edit Accent role color').value).not.toBe(originalAccent);

    const seedInput = screen.getByLabelText('Seed color hex or phrase');
    fireEvent.change(seedInput, { target: { value: 'typing should not regenerate' } });
    const paletteWhileTyping = screen.getAllByLabelText(/Edit .* role color/).map(({ value }) => value);
    fireEvent.keyDown(seedInput, { code: 'Space', key: ' ' });
    expect(screen.getAllByLabelText(/Edit .* role color/).map(({ value }) => value)).toEqual(paletteWhileTyping);
  });

  it('keeps fine tuning behind Advanced options and applies its controls when opened', () => {
    render(<TastingRoom />);
    const advancedOptions = screen.getByText('Advanced options');
    const disclosure = advancedOptions.closest('details');
    const initialAccent = screen.getByLabelText('Edit Accent role color').value;

    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(advancedOptions);
    expect(disclosure).toHaveAttribute('open');

    fireEvent.change(screen.getByLabelText('Hue shift'), { target: { value: '18' } });
    expect(screen.getByLabelText('Hue shift')).toHaveValue('18');
    expect(screen.getByLabelText('Edit Accent role color').value).not.toBe(initialAccent);
  });

  it('surprises with a new seed and rebuilds the palette from it', () => {
    const randomBytes = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((bytes) => {
      bytes.set([0x12, 0x34, 0x56]);
      return bytes;
    });
    render(<TastingRoom />);

    fireEvent.click(screen.getByRole('button', { name: 'Surprise me' }));
    randomBytes.mockRestore();

    expect(screen.getByLabelText('Seed color hex or phrase')).toHaveValue('#123456');
    expect(screen.getByLabelText('Seed color swatch')).toHaveValue('#123456');
    expect(screen.getAllByLabelText(/Edit .* role color/)).toHaveLength(7);
    expect(document.querySelector('.playground-palette-status')).toHaveTextContent('Exploration — Surprise palette');
  });

  it('hides the invitation on the initial palette and reveals it after a palette change', () => {
    render(<TastingRoom />);

    expect(screen.queryByRole('heading', { name: 'Love this palette?' })).not.toBeInTheDocument();
    expect(screen.getByText('Save in this browser')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));

    expect(screen.getByRole('heading', { name: 'Love this palette?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suggest this for a finished kit' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your palette is yours.' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copy share link' })).toHaveLength(1);
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

  it('edits a semantic role, copies the seven-role sketch code, and keeps fine tuning separate', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<TastingRoom />);

    const accentEditor = screen.getByLabelText('Edit Accent role color');
    fireEvent.change(accentEditor, { target: { value: '#123abc' } });
    expect(screen.getByRole('button', { name: 'Copy Accent role color #123ABC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Accent for Mood suggestions' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = JSON.parse(writeText.mock.lastCall[0]);
    expect(copied.colors.accent).toBe('#123abc');
    expect(copied.colors.border).toMatch(/^#[0-9a-f]{6}$/);
    expect(copied.colors['cta-text']).toMatch(/^#[0-9a-f]{6}$/);
    expect(Object.keys(copied.colors)).toHaveLength(9);
    expect(screen.getByRole('status')).toHaveTextContent('Palette code copied.');
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent('Copied');

    fireEvent.change(screen.getByLabelText('Edit Accent role color'), { target: { value: '#654321' } });
    expect(document.querySelector('.playground-hero-colorfield').style.background).toContain('rgb(101, 67, 33)');
  });

  it('confirms individual hex copies only after a successful clipboard write', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<TastingRoom />);

    const hex = screen.getByLabelText('Edit Accent role color').value;
    fireEvent.click(screen.getByRole('button', { name: `Copy Accent role color ${hex.toUpperCase()}` }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(hex));
    expect(await screen.findByRole('status')).toHaveTextContent(`Copied ${hex.toUpperCase()}`);
  });

  it('does not claim a hex was copied when the browser rejects clipboard access', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<TastingRoom />);

    const hex = screen.getByLabelText('Edit Accent role color').value;
    fireEvent.click(screen.getByRole('button', { name: `Copy Accent role color ${hex.toUpperCase()}` }));
    expect(await screen.findByRole('status')).toHaveTextContent('Could not copy. Please try again.');
    expect(screen.queryByText(`Copied ${hex.toUpperCase()}.`)).not.toBeInTheDocument();
  });

  it.each(['Copy code', 'Copy share link'])('does not show success when %s is rejected by the clipboard', async (action) => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
    });
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('button', { name: action }));

    expect(await screen.findByRole('status')).toHaveTextContent('Could not copy. Please try again.');
    expect(screen.getByRole('button', { name: action })).toHaveTextContent(action);
    expect(document.querySelector('.is-copied')).not.toBeInTheDocument();
  });

  it('regenerates from the seed while keeping locked roles and re-deriving unlocked roles', () => {
    render(<TastingRoom />);
    const backgroundEditor = screen.getByLabelText('Edit Background role color');
    const accentEditor = screen.getByLabelText('Edit Accent role color');
    const lockedBackground = backgroundEditor.value;
    const previousAccent = accentEditor.value;

    fireEvent.click(screen.getByRole('button', { name: 'Lock Background role' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(screen.getByLabelText('Edit Background role color')).toHaveValue(lockedBackground);
    expect(screen.getByLabelText('Edit Accent role color').value).not.toBe(previousAccent);
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
  });

  it('applies semantic role edits to the live scene and keeps every color copyable', () => {
    render(<TastingRoom />);
    fireEvent.change(screen.getByLabelText('Edit Background role color'), { target: { value: '#123456' } });
    fireEvent.change(screen.getByLabelText('Edit Heading role color'), { target: { value: '#654321' } });
    fireEvent.change(screen.getByLabelText('Edit CTA role color'), { target: { value: '#abcdef' } });

    expect(document.querySelector('.playground-hero-colorfield').style.getPropertyValue('--artifact-ink')).toBe('#123456');
    expect(screen.getByRole('heading', { name: 'Explore the collection.' })).toHaveStyle({ color: '#654321' });
    expect(screen.getByRole('button', { name: 'Browse the edit' })).toHaveStyle({ backgroundColor: '#abcdef' });
    expect(screen.getByRole('button', { name: 'Copy CTA role color #ABCDEF' })).toBeInTheDocument();
  });

  it('shows a mood board that follows harmony, mode, swatch edits, locks, and regeneration', () => {
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mood' }));

    const moodBoard = screen.getByRole('region', { name: 'Mood board sketch preview' });
    expect(within(moodBoard).getByText('Apocalypse · dark')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Theme' })).getByRole('button', { name: 'Light' }));
    expect(within(moodBoard).getByText('Analogous · light')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Edit Accent role color'), { target: { value: '#2468ac' } });
    expect(within(moodBoard).getByText('#2468AC')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lock Accent role' }));
    expect(within(moodBoard).getByText('Locked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(within(moodBoard).getByText('#2468AC')).toBeInTheDocument();
    expect(within(moodBoard).getAllByText('Unlocked').length).toBeGreaterThan(0);
  });

  it('applies a Mood suggestion to the selected role and defaults to Accent', () => {
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mood' }));

    const accentSuggestion = screen.getAllByRole('button', { name: /Apply .* to Accent/ })[0];
    const suggestedAccent = accentSuggestion.getAttribute('aria-label').match(/(#[0-9A-F]{6}) to Accent$/)[1].toLowerCase();
    fireEvent.click(accentSuggestion);
    expect(screen.getByLabelText('Edit Accent role color')).toHaveValue(suggestedAccent);

    fireEvent.change(screen.getByLabelText('Mood suggestions role'), { target: { value: 'background' } });
    const backgroundSuggestion = screen.getAllByRole('button', { name: /Apply .* to Background/ })[0];
    const suggestedBackground = backgroundSuggestion.getAttribute('aria-label').match(/(#[0-9A-F]{6}) to Background$/)[1].toLowerCase();
    fireEvent.click(backgroundSuggestion);
    expect(screen.getByLabelText('Edit Background role color')).toHaveValue(suggestedBackground);
  });

  it('keeps each confirmed mode sketch in a share link and restores it in a fresh render', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { unmount } = render(<TastingRoom />);
    fireEvent.change(screen.getByLabelText('Seed color hex or phrase'), { target: { value: 'winter orchard' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lock Background role' }));
    fireEvent.change(screen.getByLabelText('Edit Accent role color'), { target: { value: '#123abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    fireEvent.change(screen.getByLabelText('Edit Accent role color'), { target: { value: '#abcdef' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Theme' })).getByRole('button', { name: /Dark/ }));

    expect(screen.getByLabelText('Edit Accent role color')).toHaveValue('#123abc');
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());

    const shareUrl = new URL(writeText.mock.lastCall[0]);
    const linkedPayload = decodePlaygroundHash(shareUrl.hash);
    expect(linkedPayload.baseColor).toBe(phraseToSeedColor('winter orchard'));
    expect(linkedPayload.baseInput).toBe('winter orchard');
    expect(linkedPayload.modeStates).toMatchObject({
      dark: { lockedSwatches: { 0: expect.any(String) }, swatchOverrides: { 5: '#123abc' } },
      light: { lockedSwatches: { 0: expect.any(String) }, swatchOverrides: { 5: '#abcdef' } },
    });

    unmount();
    window.history.replaceState({}, '', `/${shareUrl.hash}`);
    render(<TastingRoom />);
    expect(screen.getByLabelText('Seed color hex or phrase')).toHaveValue('winter orchard');
    expect(screen.getByLabelText('Edit Accent role color')).toHaveValue('#123abc');
    expect(screen.getByRole('button', { name: 'Unlock Background role' })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Theme' })).getByRole('button', { name: /Light/ }));
    expect(screen.getByLabelText('Edit Accent role color')).toHaveValue('#abcdef');
  });

  it('saves only after browser storage succeeds and can load the saved sketch', async () => {
    render(<TastingRoom />);
    fireEvent.change(screen.getByLabelText('Edit Accent role color'), { target: { value: '#123abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lock Background role' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save in this browser' }));

    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent('Saved in this browser — it stays after refresh.');
    const saved = JSON.parse(localStore.get(SAVED_PLAYGROUND_PALETTES_KEY));
    expect(saved.palettes).toHaveLength(1);
    expect(saved.palettes[0].playground.baseColor).toBe('#7f1d1d');
    expect(saved.palettes[0].playground.swatchOverrides).toMatchObject({ 5: '#123abc' });
    expect(saved.palettes[0].playground.lockedSwatches).toHaveProperty('0');

    fireEvent.click(screen.getByRole('button', { name: 'Tertiary' }));
    fireEvent.change(screen.getByLabelText('Load a saved palette'), { target: { value: saved.palettes[0].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Load palette' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved in this browser — it stays after refresh.');
    expect(screen.getByRole('button', { name: 'Apocalypse' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Edit Accent role color')).toHaveValue('#123abc');
    expect(screen.getByRole('button', { name: 'Unlock Background role' })).toBeInTheDocument();
  });

  it('shows a save failure without a success confirmation', () => {
    failSavedPaletteWrites = true;
    render(<TastingRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Save in this browser' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Couldn\'t save this palette.');
    expect(screen.queryByText('Saved in this browser — it stays after refresh.')).not.toBeInTheDocument();
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

    expect(screen.getByLabelText('Seed color hex or phrase')).toHaveValue('#7f1d1d');
    expect(screen.getByRole('button', { name: 'Tertiary' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Unlock CTA role' }).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Edit .* role color/).map((input) => input.value)).toContain('#abcdef');
    expect(screen.getByRole('button', { name: /^Light/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Save in this browser' }));
    const saved = JSON.parse(localStore.get(SAVED_PLAYGROUND_PALETTES_KEY)).palettes[0].playground;
    expect(saved).toMatchObject({
      hueNudge: 11,
      satNudge: -8,
      lockedSwatches: { 6: '#123456' },
      swatchOverrides: { 5: '#abcdef' },
      semanticPalette: true,
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
