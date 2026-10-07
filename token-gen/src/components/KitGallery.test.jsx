import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KitGallery from './KitGallery.jsx';

describe('KitGallery', () => {
  it('shows the free sketch beside the finished kit and a noninteractive shop status', () => {
    render(<KitGallery />);

    expect(document.querySelectorAll('.kit-gallery-feature')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'From sketch to system' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free palette creator' })).toBeInTheDocument();
    expect(screen.getByText('Free · No account')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nuclear Winter color preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuclear Winter' })).toBeInTheDocument();
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getByText('59 semantic tokens per mode in Light/Dark/Pop')).toBeInTheDocument();
    expect(screen.getByText('6 core colours with 9 tints each')).toBeInTheDocument();
    expect(screen.getByText('ASE, Procreate swatches, GPL, CSS, JSON, Tokens Studio JSON, Tailwind v3 snippet')).toBeInTheDocument();
    expect(screen.getByText('Contrast matrix with measured WCAG ratios')).toBeInTheDocument();
    expect(screen.getByText('Usage licence included')).toBeInTheDocument();

    const shopStatus = screen.getByText('Shop opening soon');
    expect(shopStatus.tagName).toBe('P');
    expect(screen.queryByRole('link', { name: /View the kit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View the kit|Shop opening soon/i })).not.toBeInTheDocument();
  });
});
