import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PackageStage from './PackageStage.jsx';

const tokens = {
  brand: {
    primary: '#8b2f24',
    accent: '#8ff4ff',
  },
  cards: {
    'card-panel-border': '#334155',
  },
};

const renderPackageStage = (props = {}) => render(
  <PackageStage
    getTabId={() => 'tab-print'}
    printMode={false}
    setPrintMode={vi.fn()}
    tokens={tokens}
    primaryTextColor="#ffffff"
    printAssetPack={[]}
    canvaPrintHexes={[]}
    variantStatus={{
      variantCoverage: 'all-modes',
      availableModes: ['light', 'dark', 'pop'],
      missingModes: [],
    }}
    {...props}
  />
);

describe('PackageStage', () => {
  it('renders an optional theme pack download button', async () => {
    const onDownloadThemePack = vi.fn(async () => undefined);

    renderPackageStage({ onDownloadThemePack });
    fireEvent.click(screen.getByRole('button', { name: /download full theme pack/i }));

    await waitFor(() => {
      expect(onDownloadThemePack).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/main product export/i)).toBeInTheDocument();
    expect(screen.getByText(/customer-ready ZIP with CSS variables, JSON tokens, Figma, Penpot, LibreOffice palette files, README, and previews/i)).toBeInTheDocument();
  });

  it('selects all exportable modes by default and disables missing modes', () => {
    renderPackageStage({
      onDownloadThemePack: vi.fn(),
      variantStatus: {
        variantCoverage: 'available-modes',
        availableModes: ['light', 'dark'],
        missingModes: ['pop'],
      },
    });

    expect(screen.getByRole('checkbox', { name: /light.*available/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /dark.*available/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /pop.*missing/i })).toBeDisabled();
    expect(screen.getByText(/only available reviewed modes can be exported/i)).toBeInTheDocument();
  });

  it('passes selected modes to export and shows omitted modes separately', async () => {
    const onDownloadThemePack = vi.fn(async () => undefined);
    renderPackageStage({ onDownloadThemePack });

    fireEvent.click(screen.getByRole('checkbox', { name: /pop.*available/i }));

    expect(screen.getByText(/included in this zip: light, dark/i)).toBeInTheDocument();
    expect(screen.getByText(/omitted from this zip: pop/i)).toBeInTheDocument();
    expect(screen.queryByText(/missing modes: pop/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /download selected modes theme pack/i }));

    await waitFor(() => {
      expect(onDownloadThemePack).toHaveBeenCalledWith(['light', 'dark']);
      expect(screen.getByRole('status')).toHaveTextContent('Theme Pack exported. Included: Light and Dark. Omitted: Pop.');
    });
  });

  it('disables Theme Pack export when every available mode is deselected', () => {
    renderPackageStage({
      onDownloadThemePack: vi.fn(),
      variantStatus: {
        variantCoverage: 'available-modes',
        availableModes: ['light', 'dark'],
        missingModes: ['pop'],
      },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /light.*available/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /dark.*available/i }));

    expect(screen.getByText(/included in this zip: none/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download selected mode theme pack/i })).toBeDisabled();
  });

  it('does not show a Theme Pack success message before export', () => {
    renderPackageStage({ onDownloadThemePack: vi.fn() });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/theme pack exported/i)).not.toBeInTheDocument();
  });

  it('shows current-mode-only export copy and button label', () => {
    renderPackageStage({
      onDownloadThemePack: vi.fn(),
      variantStatus: {
        variantCoverage: 'current-mode-only',
        availableModes: ['light'],
        missingModes: ['dark', 'pop'],
      },
    });

    expect(screen.getByRole('button', { name: /download current mode theme pack/i })).toBeInTheDocument();
    expect(screen.getByText(/included in this zip: light/i)).toBeInTheDocument();
    expect(screen.getByText(/missing modes: dark, pop/i)).toBeInTheDocument();
  });

  it('shows current-mode-only success after export', async () => {
    renderPackageStage({
      onDownloadThemePack: vi.fn(async () => undefined),
      variantStatus: {
        variantCoverage: 'current-mode-only',
        availableModes: ['dark'],
        missingModes: ['light', 'pop'],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /download current mode theme pack/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Theme Pack exported. Included: Dark. Missing: Light and Pop.');
    });
  });

  it('shows partial-family export copy and button label', () => {
    renderPackageStage({
      onDownloadThemePack: vi.fn(),
      variantStatus: {
        variantCoverage: 'available-modes',
        availableModes: ['light', 'dark'],
        missingModes: ['pop'],
      },
    });

    expect(screen.getByRole('button', { name: /download confirmed modes theme pack/i })).toBeInTheDocument();
    expect(screen.getByText(/included in this zip: light, dark/i)).toBeInTheDocument();
    expect(screen.getByText(/missing modes: pop/i)).toBeInTheDocument();
  });

  it('shows partial-family success after export', async () => {
    renderPackageStage({
      onDownloadThemePack: vi.fn(async () => undefined),
      variantStatus: {
        variantCoverage: 'available-modes',
        availableModes: ['light', 'dark'],
        missingModes: ['pop'],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /download confirmed modes theme pack/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Theme Pack exported. Included: Light and Dark. Missing: Pop.');
    });
  });

  it('shows full-family confirmed variant coverage with the theme pack action', () => {
    renderPackageStage({ onDownloadThemePack: vi.fn() });

    expect(screen.getByRole('button', { name: /download full theme pack/i })).toBeInTheDocument();
    expect(screen.getByText(/included in this zip: light, dark, pop/i)).toBeInTheDocument();
    expect(screen.queryByText(/missing modes:/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('confirmed-variants-status')).toBeInTheDocument();
    expect(screen.getByTestId('variant-coverage-label')).toHaveTextContent(/full family ready/i);
    expect(screen.getByText(/review each mode once to unlock a full light\/dark\/pop theme pack/i)).toBeInTheDocument();
  });

  it('shows full-family success after export', async () => {
    renderPackageStage({ onDownloadThemePack: vi.fn(async () => undefined) });

    fireEvent.click(screen.getByRole('button', { name: /download full theme pack/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Full Theme Pack exported. Included: Light, Dark, and Pop.');
    });
  });

  it('clears export success when coverage changes', async () => {
    const { rerender } = renderPackageStage({
      onDownloadThemePack: vi.fn(async () => undefined),
      variantStatus: {
        variantCoverage: 'available-modes',
        availableModes: ['light', 'dark'],
        missingModes: ['pop'],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /download confirmed modes theme pack/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/included: light and dark/i);
    });

    rerender(
      <PackageStage
        getTabId={() => 'tab-print'}
        printMode={false}
        setPrintMode={vi.fn()}
        tokens={tokens}
        primaryTextColor="#ffffff"
        printAssetPack={[]}
        canvaPrintHexes={[]}
        onDownloadThemePack={vi.fn(async () => undefined)}
        variantStatus={{
          variantCoverage: 'all-modes',
          availableModes: ['light', 'dark', 'pop'],
          missingModes: [],
        }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('reconciles selection when exportable modes change', async () => {
    const onDownloadThemePack = vi.fn(async () => undefined);
    const { rerender } = renderPackageStage({
      onDownloadThemePack,
      variantStatus: {
        variantCoverage: 'available-modes',
        availableModes: ['light', 'dark'],
        missingModes: ['pop'],
      },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /dark.*available/i }));
    expect(screen.getByText(/omitted from this zip: dark/i)).toBeInTheDocument();

    rerender(
      <PackageStage
        getTabId={() => 'tab-print'}
        printMode={false}
        setPrintMode={vi.fn()}
        tokens={tokens}
        primaryTextColor="#ffffff"
        printAssetPack={[]}
        canvaPrintHexes={[]}
        onDownloadThemePack={onDownloadThemePack}
        variantStatus={{
          variantCoverage: 'all-modes',
          availableModes: ['light', 'dark', 'pop'],
          missingModes: [],
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /light.*available/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /dark.*available/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /pop.*available/i })).toBeChecked();
    });

    rerender(
      <PackageStage
        getTabId={() => 'tab-print'}
        printMode={false}
        setPrintMode={vi.fn()}
        tokens={tokens}
        primaryTextColor="#ffffff"
        printAssetPack={[]}
        canvaPrintHexes={[]}
        onDownloadThemePack={onDownloadThemePack}
        variantStatus={{
          variantCoverage: 'available-modes',
          availableModes: ['dark', 'pop'],
          missingModes: ['light'],
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /light.*missing/i })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: /dark.*available/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /pop.*available/i })).toBeChecked();
      expect(screen.getByText(/included in this zip: pop/i)).toBeInTheDocument();
    });
  });

  it('does not render the theme pack button without a handler', () => {
    renderPackageStage();

    expect(screen.queryByRole('button', { name: /download theme pack/i })).not.toBeInTheDocument();
  });

  it('hides theme pack downloads when export capability is disabled', () => {
    const onDownloadThemePack = vi.fn();

    const { container } = renderPackageStage({ canExport: false, onDownloadThemePack });

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /download .* theme pack/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/print asset pack preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/turn on print mode/i)).not.toBeInTheDocument();
  });
});
