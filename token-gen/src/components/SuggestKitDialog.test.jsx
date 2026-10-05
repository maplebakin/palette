import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SuggestKitDialog from './SuggestKitDialog.jsx';

const capture = {
  playground: {
    kitId: 'nuclear-winter',
    explorationName: '',
    baseColor: '#7f1d1d',
    baseInput: '#7f1d1d',
    harmony: 'Analogous',
    themeMode: 'dark',
    hueNudge: 3,
    satNudge: -2,
    lockedSwatches: { 1: '#445566' },
    swatchOverrides: { 0: '#112233' },
    regenerateCount: 1,
    userHasMutated: true,
    isChaosMinted: false,
    chaosIndex: 0,
    confirmedModes: { dark: true },
  },
  finalRenderedPalette: [
    { order: 1, role: 'Primary', value: '#112233', locked: false },
    { order: 2, role: 'Secondary', value: '#445566', locked: true },
  ],
  shareLink: 'https://example.test/#play=palette',
};

const DialogHarness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open suggestion</button>
      <SuggestKitDialog open={open} capture={capture} onRequestClose={() => setOpen(false)} />
    </>
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SuggestKitDialog', () => {
  it('previews the captured values, focuses on open, traps focus, and restores focus on Escape', () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open suggestion' });
    trigger.focus();
    fireEvent.click(trigger);

    const email = screen.getByLabelText(/required so I can contact you about this suggestion/i);
    expect(email).toHaveFocus();
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type', 'email');
    expect(screen.getByText(/1\. Primary/)).toBeInTheDocument();
    expect(screen.getByText('#112233')).toBeInTheDocument();
    expect(screen.getByText('#445566')).toBeInTheDocument();
    const credit = screen.getByRole('checkbox', { name: 'Credit me if this becomes a kit.' });
    expect(credit).not.toBeChecked();
    expect(screen.queryByLabelText('Name or handle for public credit')).not.toBeInTheDocument();

    fireEvent.click(credit);
    expect(screen.getByLabelText('Name or handle for public credit')).toBeRequired();

    const dialog = screen.getByRole('dialog');
    const closeButton = screen.getByRole('button', { name: 'Close suggestion form' });
    const submitButton = screen.getByRole('button', { name: 'Send suggestion' });
    submitButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(submitButton).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the form and frozen preview through a failed POST retry', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });
    vi.stubGlobal('fetch', fetchImpl);
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open suggestion' }));

    const email = screen.getByLabelText(/required so I can contact you about this suggestion/i);
    const note = screen.getByLabelText('Note (optional)');
    const credit = screen.getByRole('checkbox', { name: 'Credit me if this becomes a kit.' });
    fireEvent.change(email, { target: { value: 'maker@example.test' } });
    fireEvent.change(note, { target: { value: 'A palette for quiet mornings.' } });
    fireEvent.click(credit);
    fireEvent.change(screen.getByLabelText('Name or handle for public credit'), { target: { value: 'Maddie' } });

    const submit = screen.getByRole('button', { name: 'Send suggestion' });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('That didn\'t send. Your palette and form are still here — try again.');
    expect(email).toHaveValue('maker@example.test');
    expect(note).toHaveValue('A palette for quiet mornings.');
    expect(credit).toBeChecked();
    expect(screen.getByLabelText('Name or handle for public credit')).toHaveValue('Maddie');

    fireEvent.click(submit);
    expect(await screen.findByRole('status')).toHaveTextContent('Suggestion sent. If I choose it for a finished kit, I\'ll email you. Your palette is still here to keep playing with.');
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const requests = fetchImpl.mock.calls.map(([, request]) => new URLSearchParams(request.body));
    const firstSnapshot = JSON.parse(requests[0].get('snapshot'));
    const retriedSnapshot = JSON.parse(requests[1].get('snapshot'));
    expect(requests[0].get('form-name')).toBe('kit-suggestion');
    expect(requests[0].get('email')).toBe('maker@example.test');
    expect(requests[0].get('note')).toBe('A palette for quiet mornings.');
    expect(requests[0].get('credit-opt-in')).toBe('yes');
    expect(requests[0].get('credit-name')).toBe('Maddie');
    expect(firstSnapshot).toEqual(retriedSnapshot);
    expect(firstSnapshot.finalRenderedPalette).toEqual(capture.finalRenderedPalette);
    expect(firstSnapshot.shareLink).toBe(capture.shareLink);
    expect(requests[0].get('snapshot')).not.toContain('maker@example.test');
  });

  it('does not send an invalid required email', () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal('fetch', fetchImpl);
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open suggestion' }));
    const email = screen.getByLabelText(/required so I can contact you about this suggestion/i);
    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));

    expect(email.checkValidity()).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
