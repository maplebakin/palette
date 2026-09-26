import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForgeCta, { FORGE_KIT_URL } from './ForgeCta.jsx';

describe('ForgeCta', () => {
  it('renders the demo-limits message with the configurable kit URL', () => {
    render(<ForgeCta />);

    expect(screen.getByText(/this demo makes palettes\. the forge makes products\./i)).toBeInTheDocument();
    expect(screen.getByText(/\.ase/i)).toBeInTheDocument();
    expect(screen.getByText(/procreate/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /get the full theme kit/i });
    expect(link).toHaveAttribute('href', FORGE_KIT_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('defaults the kit URL to an obvious placeholder Maddie must replace', () => {
    expect(FORGE_KIT_URL).toContain('example.com');
  });
});
