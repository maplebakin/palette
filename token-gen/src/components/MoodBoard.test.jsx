import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MoodBoard from './MoodBoard.jsx';
import { MoodBoardProvider } from '../context/MoodBoardContext.jsx';

vi.mock('../context/MoodBoardContext.jsx', () => ({
  MoodBoardProvider: ({ children }) => children,
  useMoodBoard: () => ({
    savedMoodBoards: [],
    saveMoodBoard: vi.fn(),
    deleteMoodBoard: vi.fn(),
  }),
}));

const tokens = {
  brand: {
    primary: '#b46e78',
    secondary: '#65483f',
    accent: '#ba8580',
    cta: '#8f594f',
  },
};

const currentSwatches = [
  { name: 'Primary', color: '#a34f61' },
  { name: 'Background', color: '#211b1b' },
  { name: 'Heading', color: '#f3e9dc' },
];

const renderMoodBoard = (overrides = {}) => {
  const props = {
    tokens,
    baseColor: '#a34f61',
    currentSwatches,
    onApplyPaletteSpec: vi.fn(),
    copyHexValue: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(
      <MoodBoardProvider>
        <MoodBoard {...props} />
      </MoodBoardProvider>,
    ),
  };
};

const openMoodBoard = () => {
  const toggle = screen.getByRole('button', { name: 'Mood Board' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
};

describe('private MoodBoard', () => {
  it('opens as a secondary tool with current palette context and explicit suggestion actions', () => {
    const { props } = renderMoodBoard();

    expect(screen.getByText('Advanced tools')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate unlocked colour suggestions' })).not.toBeInTheDocument();

    openMoodBoard();
    expect(screen.getByText('Current palette')).toBeInTheDocument();
    expect(document.querySelector('.forge-mood-board-seed code')).toHaveTextContent('#a34f61');
    expect(screen.getByText('#A34F61')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Current palette colours' })).toBeInTheDocument();
    expect(screen.getByText('Suggested colours')).toBeInTheDocument();
    expect(screen.getByText('No mood board yet. Generate to explore color families.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate unlocked colour suggestions' }));
    const smokyGroup = screen.getByRole('group', { name: /Smoky/ });
    const candidate = within(smokyGroup).getAllByRole('button', { name: /Use .* as the new palette seed/ })[1];
    const candidateHex = candidate.getAttribute('aria-label').match(/Use (#[0-9A-F]{6})/i)[1];

    fireEvent.click(candidate);
    expect(props.onApplyPaletteSpec).toHaveBeenCalledWith(expect.objectContaining({ baseColor: candidateHex }));

    const copyButton = within(smokyGroup).getAllByRole('button', { name: /Copy #[0-9A-F]{6} from Smoky/ })[0];
    fireEvent.click(copyButton);
    expect(props.copyHexValue).toHaveBeenCalledWith(expect.stringMatching(/^#[0-9A-F]{6}$/i), expect.stringMatching(/^Smoky /));
    expect(screen.getByRole('group', { name: /Bright/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Deep/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Warm Drift/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Cool Drift/ })).toBeInTheDocument();
  });

  it('keeps locked samples during suggestion regeneration and follows a changed palette seed', () => {
    const { rerender, container } = renderMoodBoard();
    openMoodBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate unlocked colour suggestions' }));

    const smokyGroup = screen.getByRole('group', { name: /Smoky/ });
    const lockButton = within(smokyGroup).getAllByRole('button', { name: 'Lock Smoky anchor suggestion' })[0];
    const getLockedSample = () => within(screen.getByRole('group', { name: /Smoky/ }))
      .getByRole('button', { name: 'Unlock Smoky anchor suggestion' })
      .closest('.forge-mood-board-colour')
      .querySelector('.forge-mood-board-swatch');
    const lockedColor = lockButton.closest('.forge-mood-board-colour').querySelector('.forge-mood-board-swatch').style.backgroundColor;
    fireEvent.click(lockButton);
    expect(within(smokyGroup).getByRole('button', { name: 'Unlock Smoky anchor suggestion' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate unlocked colour suggestions' }));
    expect(getLockedSample().style.backgroundColor).toBe(lockedColor);

    const nextBaseColor = '#cc755a';
    rerender(
      <MoodBoardProvider>
        <MoodBoard
          tokens={tokens}
          baseColor={nextBaseColor}
          currentSwatches={[{ name: 'Primary', color: nextBaseColor }, ...currentSwatches.slice(1)]}
          onApplyPaletteSpec={vi.fn()}
        />
      </MoodBoardProvider>,
    );

    expect(container.querySelector('.forge-mood-board-seed code')).toHaveTextContent(nextBaseColor);
    expect(within(screen.getByRole('group', { name: /Smoky/ })).getByRole('button', {
      name: `Use ${nextBaseColor} as the new palette seed; replaces the current palette`,
    })).toBeInTheDocument();
    expect(getLockedSample().style.backgroundColor).toBe(lockedColor);
  });
});
