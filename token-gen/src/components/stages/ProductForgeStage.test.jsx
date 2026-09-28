import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductForgeStage, {
  AvailableThemeKits,
  ProductExportBuilderBlock,
  ProductLibraryNote,
} from './ProductForgeStage.jsx';

vi.hoisted(() => {
  vi.stubEnv('VITE_PRIVATE_FORGE', 'true');
});

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
    productExportThemes={[
      { id: 'current', label: 'Current Theme', themeMode: 'dark', miniPalette: {} },
      {
        id: 'saved-1',
        label: 'Saved Partial',
        themeMode: 'light',
        variants: {
          light: { finalTokens: { brand: { cta: '#112233' } } },
        },
        miniPalette: {},
      },
      {
        id: 'project-1',
        label: 'Project Full',
        themeMode: 'pop',
        variants: {
          light: { finalTokens: { brand: { cta: '#112233' } } },
          dark: { finalTokens: { brand: { cta: '#eeeeee' } } },
          pop: { finalTokens: { brand: { cta: '#ff00aa' } } },
        },
        miniPalette: {},
      },
      {
        id: 'project-2',
        label: 'Project Mixed',
        themeMode: 'dark',
        currentTheme: {
          themeMode: 'dark',
          tokens: { brand: { cta: '#eeeeee' } },
        },
        variants: {
          light: { finalTokens: { brand: { cta: '#112233' } } },
        },
        miniPalette: {},
      },
    ]}
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
    expect(screen.getByText('Multi-Kit Bundle')).toBeInTheDocument();
    expect(screen.queryByText(/Creator Trio/i)).not.toBeInTheDocument();
    expect(screen.getByText('Mini Website Palette')).toBeInTheDocument();
    expect(screen.getAllByText(/buyer docs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/marketplace preview SVGs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/license\/support/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/listing docs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/shop-listing\.md/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Available Theme Kits')).toBeInTheDocument();
    expect(screen.getByText('Current Theme')).toBeInTheDocument();
    expect(screen.getByText(/uses current\/spec-derived mode data/i)).toBeInTheDocument();
    expect(screen.getByText(/includes confirmed reviewed modes only/i)).toBeInTheDocument();
    expect(screen.getByText(/uses confirmed reviewed modes/i)).toBeInTheDocument();
    expect(screen.getByText(/includes confirmed modes plus the current resolved mode/i)).toBeInTheDocument();
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

  it('exposes the packaging pieces without the retired workflow cards', async () => {
    render(
      <>
        <AvailableThemeKits productExportThemes={[{ id: 'current', label: 'Current Theme' }]} />
        <ProductExportBuilderBlock
          isDev
          productExportThemes={[{ id: 'current', label: 'Current Theme' }]}
          onExportProductPackage={vi.fn()}
          tokens={tokens}
          primaryTextColor="#ffffff"
        />
        <ProductLibraryNote />
      </>,
    );

    expect(screen.getByTestId('available-theme-kits')).toBeInTheDocument();
    expect(screen.getByTestId('product-library-note')).toBeInTheDocument();
    expect(await screen.findByTestId('product-export-builder')).toBeInTheDocument();
    expect(screen.getByLabelText('Offering type')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Website & Brand Color Kit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Multi-Kit Bundle' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mini Website Palette / Freebie' })).toBeInTheDocument();
    expect(screen.queryByText('Saved Kits')).not.toBeInTheDocument();
    expect(screen.queryByText('Bundles / Freebies')).not.toBeInTheDocument();
    expect(screen.queryByText(/Package one saved theme kit with buyer docs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Combine saved kits into one seller bundle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Export a lightweight starter palette/i)).not.toBeInTheDocument();
  });
});
