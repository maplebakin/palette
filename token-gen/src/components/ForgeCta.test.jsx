import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ForgeCta, { FORGE_KIT_URL } from './ForgeCta.jsx';

describe('ForgeCta', () => {
  it('renders the demo-limits message with the configurable kit URL', () => {
    render(<ForgeCta />);

    expect(screen.getByText(/this demo makes palettes\. the forge makes products\./i)).toBeInTheDocument();
    expect(screen.getByText(/\.ase/i)).toBeInTheDocument();
    expect(screen.getByText(/procreate/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /get the full theme kit/i })).toBeInTheDocument();
  });

  it('routes the full-kit request through the shared gate', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<ForgeCta />);

    fireEvent.click(screen.getByRole('button', { name: /get the full theme kit/i }));
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'apocapalette:request-gate',
      detail: { source: 'see-full-kit' },
    }));
    dispatchSpy.mockRestore();
  });

  it('defaults the kit URL to an obvious placeholder Maddie must replace', () => {
    expect(FORGE_KIT_URL).toContain('example.com');
  });
});
