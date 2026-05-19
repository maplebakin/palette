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
  });

  it('does not render the theme pack button without a handler', () => {
    renderPackageStage();

    expect(screen.queryByRole('button', { name: /download theme pack/i })).not.toBeInTheDocument();
  });
});
