import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
