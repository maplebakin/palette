import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KitGallery from './KitGallery.jsx';

describe('KitGallery', () => {
  it('shows noninteractive shop status and the in-progress forge strip', () => {
    render(<KitGallery />);

    const shopStatus = screen.getByText('Shop opening soon');
    expect(shopStatus.tagName).toBe('P');
    expect(screen.queryByRole('link', { name: /View the kit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View the kit|Shop opening soon/i })).not.toBeInTheDocument();

    const forgeStrip = screen.getByText(
      'In the forge: Ashfall Bloom and Vapor Dream. Selected community suggestions may join them.',
    );
    expect(forgeStrip.tagName).toBe('P');
    expect(forgeStrip.querySelector('a, button')).toBeNull();
  });
});
