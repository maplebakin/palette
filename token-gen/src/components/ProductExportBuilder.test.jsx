import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductExportBuilder from './ProductExportBuilder.jsx';

const tokens = {
  brand: {
    primary: '#6633ff',
  },
};

const themes = [
  {
    id: 'current',
    label: 'Current Theme',
    miniPalette: {
      background: '#101827',
      text: '#f8fafc',
      primary: '#6633ff',
      accent: '#22d3ee',
      surface: '#172033',
    },
  },
  {
    id: 'saved-1',
    label: 'Saved Cobalt',
    miniPalette: {
      background: '#020617',
      text: '#e2e8f0',
      primary: '#2563eb',
      accent: '#38bdf8',
      surface: '#0f172a',
    },
  },
  {
    id: 'project-launch',
    label: 'Project Launch',
    miniPalette: {
      background: '#f8fafc',
      text: '#0f172a',
      primary: '#16a34a',
      accent: '#f97316',
      surface: '#ffffff',
    },
  },
];

const renderBuilder = (props = {}) => {
  const onExport = vi.fn();
  render(
    <ProductExportBuilder
      isDev
      themes={themes}
      onExport={onExport}
      tokens={tokens}
      primaryTextColor="#ffffff"
      {...props}
    />
  );
  return { onExport };
};

describe('ProductExportBuilder', () => {
  it('renders seller-ready product package builder copy', () => {
    renderBuilder();

    expect(screen.getByText('Product Package Builder')).toBeInTheDocument();
    expect(screen.queryByText(/DEV ONLY/i)).not.toBeInTheDocument();
    expect(screen.getByText(/buyer docs, listing copy, license\/support notes, and marketplace preview SVGs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Product filename slug/i)).toBeInTheDocument();
    expect(screen.getByText('Used for the downloaded ZIP/folder name.')).toBeInTheDocument();
  });

  it('summarizes included files for individual theme kits', () => {
    renderBuilder();

    const summary = within(screen.getByTestId('included-package-summary'));
    expect(summary.getByText('Included in this package')).toBeInTheDocument();
    expect(summary.getByText(/README\.md, USAGE\.txt, LICENSE\.txt, SUPPORT\.txt/i)).toBeInTheDocument();
    expect(summary.getByText(/shop-listing\.md and tags\.txt/i)).toBeInTheDocument();
    expect(summary.getByText(/marketplace-preview\/marketplace-cover\.svg/i)).toBeInTheDocument();
    expect(summary.getByText(/mode files and previews/i)).toBeInTheDocument();
    expect(summary.getByText(/CSS, JSON, Figma\/Penpot tokens, and LibreOffice palettes/i)).toBeInTheDocument();
  });

  it('summarizes bundle package contents', () => {
    renderBuilder();

    fireEvent.change(screen.getByLabelText(/offering type/i), { target: { value: 'bundle' } });

    const summary = within(screen.getByTestId('included-package-summary'));
    expect(summary.getByText(/Nested Theme Pack ZIPs/i)).toBeInTheDocument();
    expect(summary.getByText(/bundle-comparison\.svg/i)).toBeInTheDocument();
    expect(summary.getByText(/Root preview assets/i)).toBeInTheDocument();
  });

  it('summarizes mini package contents without full kit extras', () => {
    renderBuilder();

    fireEvent.change(screen.getByLabelText(/offering type/i), { target: { value: 'mini' } });

    const summaryElement = screen.getByTestId('included-package-summary');
    const summary = within(summaryElement);
    expect(summary.getByText(/Mini CSS and mini JSON files/i)).toBeInTheDocument();
    expect(summary.getByText(/SVG preview/i)).toBeInTheDocument();
    expect(summary.getByText(/Lightweight starter palette, not a full Theme Pack/i)).toBeInTheDocument();
    expect(summary.queryByText(/Figma/i)).not.toBeInTheDocument();
    expect(summary.queryByText(/Penpot/i)).not.toBeInTheDocument();
    expect(summary.queryByText(/LibreOffice/i)).not.toBeInTheDocument();
    expect(summaryElement).not.toHaveTextContent(/full Theme Pack contents/i);
  });

  it('allows bundle exports to select multiple saved/project kits', () => {
    const { onExport } = renderBuilder();

    fireEvent.change(screen.getByLabelText(/offering type/i), { target: { value: 'bundle' } });
    fireEvent.click(screen.getByLabelText('Saved Cobalt'));
    fireEvent.click(screen.getByLabelText('Project Launch'));
    fireEvent.click(screen.getByRole('button', { name: /export product package/i }));

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      offering: 'bundle',
      selectedThemeIds: ['current', 'saved-1', 'project-launch'],
    }));
  });

  it('limits mini palette exports to one selected source kit', () => {
    const { onExport } = renderBuilder();

    fireEvent.change(screen.getByLabelText(/offering type/i), { target: { value: 'mini' } });
    fireEvent.click(screen.getByLabelText('Saved Cobalt'));
    fireEvent.click(screen.getByRole('button', { name: /export product package/i }));

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      offering: 'mini',
      selectedThemeIds: ['saved-1'],
      product: expect.objectContaining({
        miniPalette: expect.objectContaining({
          primary: '#2563eb',
          accent: '#38bdf8',
        }),
      }),
    }));
  });

  it('does not render product packaging controls outside dev mode', () => {
    renderBuilder({ isDev: false });

    expect(screen.queryByTestId('product-export-builder')).not.toBeInTheDocument();
  });
});
