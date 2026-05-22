import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductForgeStage from './ProductForgeStage.jsx';

const tokens = {
  brand: {
    primary: '#8b2f24',
  },
};

const renderProductForgeStage = (props = {}) => render(
  <ProductForgeStage
    isDev
    tokens={tokens}
    primaryTextColor="#ffffff"
    productExportThemes={[{ id: 'current', label: 'Current Theme', miniPalette: {} }]}
    onExportProductPackage={vi.fn()}
    onDownloadThemePack={vi.fn()}
    {...props}
  />
);

describe('ProductForgeStage', () => {
  it('renders the dev-only project manager product forge panel with product builder controls', async () => {
    renderProductForgeStage();

    expect(screen.getByTestId('product-forge-stage')).toBeInTheDocument();
    expect(screen.getByText('Project Manager')).toBeInTheDocument();
    expect(screen.getAllByText('Product Forge')).toHaveLength(2);
    expect(screen.getByText('Saved Kits')).toBeInTheDocument();
    expect(screen.getByText('Individual Theme Kit')).toBeInTheDocument();
    expect(screen.getByText('Creator Trio / Multi-Kit Bundle')).toBeInTheDocument();
    expect(screen.getByText('Mini Website Palette')).toBeInTheDocument();
    expect(screen.getByText('Available Export Kits')).toBeInTheDocument();
    expect(screen.getByText('Current Theme')).toBeInTheDocument();
    expect(screen.getByText('Bundle Builder')).toBeInTheDocument();
    expect(screen.getByText('Mini Palette Freebies')).toBeInTheDocument();
    expect(screen.getByText('Product Library / Ready to Upload')).toBeInTheDocument();
    expect(screen.getByText(/products\/<product-slug>\//i)).toBeInTheDocument();
    expect(await screen.findByTestId('product-export-builder')).toBeInTheDocument();
  });

  it('does not render when dev mode is disabled', () => {
    renderProductForgeStage({ isDev: false });

    expect(screen.queryByTestId('product-forge-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-export-builder')).not.toBeInTheDocument();
  });
});
