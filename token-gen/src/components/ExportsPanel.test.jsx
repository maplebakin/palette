import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExportsPanel from './ExportsPanel.jsx';

const tokens = {
  brand: {
    primary: '#8b2f24',
    secondary: '#a78bfa',
    accent: '#38bdf8',
    cta: '#0ea5e9',
    'cta-hover': '#0369a1',
  },
  cards: {
    'card-panel-surface': '#172033',
    'card-panel-surface-strong': '#101827',
    'card-panel-border': '#334155',
  },
  status: {
    warning: '#f59e0b',
  },
};

const buildHandlers = () => ({
  onExportAssets: vi.fn(),
  onExportPdf: vi.fn(),
  onExportPenpot: vi.fn(),
  onExportGeneric: vi.fn(),
  onExportWitchcraft: vi.fn(),
  onExportFigmaTokens: vi.fn(),
  onExportStyleDictionary: vi.fn(),
  onExportCssVars: vi.fn(),
  onExportUiThemeCss: vi.fn(),
  onExportDesignSpace: vi.fn(),
  onDownloadThemePack: vi.fn(),
  onDownloadThemePackWithPrint: vi.fn(),
  onGenerateListingAssets: vi.fn(),
  onRetryAssets: vi.fn(),
});

const renderPanel = (props = {}) => {
  const handlers = buildHandlers();
  render(
    <ExportsPanel
      tokens={tokens}
      printMode={false}
      isExporting={false}
      canPrint
      ctaTextColor="#ffffff"
      primaryTextColor="#ffffff"
      neutralButtonTextColor="#ffffff"
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

const groupFor = (name) => screen.getByText(name).closest('details');

describe('ExportsPanel', () => {
  it('renders semantic export groups with only asset previews open by default', () => {
    renderPanel();

    expect(groupFor('Asset and Preview Exports')).toHaveAttribute('open');
    expect(groupFor('Design Tool Exports')).not.toHaveAttribute('open');
    expect(groupFor('Developer Token Exports')).not.toHaveAttribute('open');
    expect(groupFor('Advanced / Dev Exports')).not.toHaveAttribute('open');
  });

  it('keeps every export action wired to its existing handler', () => {
    const handlers = renderPanel({ isInternal: true });
    fireEvent.click(screen.getByText('Design Tool Exports'));
    fireEvent.click(screen.getByText('Developer Token Exports'));
    fireEvent.click(screen.getByText('Advanced / Dev Exports'));

    [
      ['SVG/PNG Asset Pack', handlers.onExportAssets],
      ['Palette PDF', handlers.onExportPdf],
      ['Cricut Design Space Palette', handlers.onExportDesignSpace],
      ['Penpot JSON', handlers.onExportPenpot],
      ['Figma Tokens JSON', handlers.onExportFigmaTokens],
      ['Generic Token JSON', handlers.onExportGeneric],
      ['Style Dictionary JSON', handlers.onExportStyleDictionary],
      ['CSS Variables', handlers.onExportCssVars],
      ['Apocapalette UI Theme CSS', handlers.onExportUiThemeCss],
      ['Download Theme Pack (Dev)', handlers.onDownloadThemePack],
      ['Theme Pack + CMYK Print Pack (Dev)', handlers.onDownloadThemePackWithPrint],
      ['Generate Listing Assets (Dev)', handlers.onGenerateListingAssets],
      ['Witchcraft JSON', handlers.onExportWitchcraft],
    ].forEach(([name, handler]) => {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps advanced Theme Pack actions in the Advanced group and gates Witchcraft by internal access', () => {
    const { rerender } = render(
      <ExportsPanel
        tokens={tokens}
        printMode={false}
        isExporting={false}
        canPrint
        {...buildHandlers()}
      />
    );

    const advanced = groupFor('Advanced / Dev Exports');
    fireEvent.click(screen.getByText('Advanced / Dev Exports'));
    expect(within(advanced).getByRole('button', { name: 'Download Theme Pack (Dev)' })).toBeInTheDocument();
    expect(within(advanced).getByRole('button', { name: 'Theme Pack + CMYK Print Pack (Dev)' })).toBeInTheDocument();
    expect(within(advanced).getByRole('button', { name: 'Generate Listing Assets (Dev)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Witchcraft JSON' })).not.toBeInTheDocument();

    rerender(
      <ExportsPanel
        tokens={tokens}
        printMode={false}
        isExporting={false}
        canPrint
        isInternal
        {...buildHandlers()}
      />
    );

    expect(within(groupFor('Advanced / Dev Exports')).getByRole('button', { name: 'Witchcraft JSON' })).toBeInTheDocument();
  });

  it('keeps export errors, Retry, and print availability visible outside groups', () => {
    const handlers = renderPanel({
      exportError: 'Asset rendering failed',
      canPrint: false,
    });

    expect(screen.getByText('Asset rendering failed').closest('details')).toBeNull();
    expect(screen.getByText('Print/PDF is unavailable in this browser.')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry.closest('details')).toBeNull();
    fireEvent.click(retry);
    expect(handlers.onRetryAssets).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Palette PDF' })).toBeDisabled();
  });

  it('preserves asset loading and blocked states', () => {
    const { rerender } = render(
      <ExportsPanel
        tokens={tokens}
        printMode={false}
        isExporting
        canPrint
        {...buildHandlers()}
      />
    );

    expect(screen.getByRole('button', { name: 'Building assets…' })).toBeDisabled();

    rerender(
      <ExportsPanel
        tokens={tokens}
        printMode={false}
        isExporting={false}
        exportBlocked
        canPrint
        {...buildHandlers()}
      />
    );

    expect(screen.getByRole('button', { name: 'Assets unavailable' })).toBeDisabled();
  });

  it('explains the purpose of each export group', () => {
    renderPanel();

    expect(screen.getByText(/cricut design space color file/i)).toBeInTheDocument();
    expect(screen.getByText(/penpot-ready json or figma-compatible token files/i)).toBeInTheDocument();
    expect(screen.getByText(/implementation-ready token json, css variables, or apocapalette app ui styles/i)).toBeInTheDocument();
    expect(screen.getByText(/internal verification and storefront-production tools/i)).toBeInTheDocument();
  });

  it('uses the print-specific asset pack label when print mode is enabled', () => {
    renderPanel({ printMode: true });

    expect(screen.getByRole('button', { name: 'Forge SVG/PNG Asset Pack' })).toBeInTheDocument();
  });
});
