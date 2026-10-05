import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SuggestKitInvitation from './SuggestKitInvitation.jsx';

describe('SuggestKitInvitation', () => {
  it('stays hidden until the visitor modifies the palette', () => {
    const { rerender } = render(<SuggestKitInvitation visible={false} onSuggest={vi.fn()} />);

    expect(screen.queryByText('Love this palette?')).not.toBeInTheDocument();

    rerender(<SuggestKitInvitation visible onSuggest={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Love this palette?' })).toBeInTheDocument();
    expect(screen.getByText('Suggest it for a finished kit. You design it, I finish it — reviewed by hand, contrast-checked, and packaged for use.')).toBeInTheDocument();
    expect(screen.getByText("I read every suggestion and finish the ones that want making, as time allows. If your suggestion becomes a kit, you'll be first to know and get a copy free for calling it. I can't finish every suggestion.")).toBeInTheDocument();
    expect(screen.getByText('Finished kits are based on your palette. I may adjust colours for contrast and coherence.')).toBeInTheDocument();
  });

  it('only opens the dialog when the visitor presses the invitation button', () => {
    const onSuggest = vi.fn();
    render(<SuggestKitInvitation visible onSuggest={onSuggest} />);

    expect(onSuggest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest this for a finished kit' }));
    expect(onSuggest).toHaveBeenCalledOnce();
  });
});
