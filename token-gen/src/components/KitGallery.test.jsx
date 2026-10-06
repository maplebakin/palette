import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KitGallery from './KitGallery.jsx';

describe('KitGallery', () => {
  it('shows one featured artifact with verified contents and noninteractive shop status', () => {
    render(<KitGallery />);

    expect(document.querySelectorAll('.kit-gallery-feature')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Artifact No. 0417 — Nuclear Winter color preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Artifact No. 0417 — Nuclear Winter' })).toBeInTheDocument();
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getByText('59 tokens per mode')).toBeInTheDocument();
    expect(screen.getByText('Light/Dark/Pop')).toBeInTheDocument();
    expect(screen.getByText('7 formats')).toBeInTheDocument();
    expect(screen.getByText('Matrix included')).toBeInTheDocument();
    expect(screen.getByText('Usage licence included')).toBeInTheDocument();

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
