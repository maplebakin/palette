import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
    {...props}
  />
);

describe('PackageStage', () => {
  it('renders an optional theme pack download button', () => {
    const onDownloadThemePack = vi.fn();

    renderPackageStage({ onDownloadThemePack });
    fireEvent.click(screen.getByRole('button', { name: /download theme pack/i }));

    expect(onDownloadThemePack).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/main product export/i)).toBeInTheDocument();
    expect(screen.getByText(/customer-ready ZIP with CSS variables, JSON tokens, Figma, Penpot, LibreOffice palette files, README, and previews/i)).toBeInTheDocument();
  });

  it('does not render the theme pack button without a handler', () => {
    renderPackageStage();

    expect(screen.queryByRole('button', { name: /download theme pack/i })).not.toBeInTheDocument();
  });

  it('hides theme pack downloads when export capability is disabled', () => {
    const onDownloadThemePack = vi.fn();

    const { container } = renderPackageStage({ canExport: false, onDownloadThemePack });

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /download theme pack/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/print asset pack preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/turn on print mode/i)).not.toBeInTheDocument();
  });
});
