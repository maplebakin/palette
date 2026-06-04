import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExportStage from './ExportStage.jsx';

vi.mock('../ExportsPanel', () => ({
  default: () => <div>Exports panel</div>,
}));

const tokens = {
  brand: {
    primary: '#8b2f24',
    accent: '#38bdf8',
    'cta-hover': '#0369a1',
  },
  cards: {
    'card-panel-border': '#334155',
  },
};

describe('ExportStage', () => {
  it('gives the overflow control a useful accessible name', () => {
    render(
      <ExportStage
        activeTab="Exports"
        getTabId={() => 'exports-tab'}
        exportsSectionRef={{ current: null }}
        handleJumpToExports={vi.fn()}
        copyShareLink={vi.fn()}
        overflowOpen={false}
        setOverflowOpen={vi.fn()}
        tokens={tokens}
        finalTokens={tokens}
        printMode={false}
        isExportingAssets={false}
        printSupported
      />
    );

    expect(screen.getByRole('button', { name: 'More export actions' })).toHaveAttribute('aria-expanded', 'false');
  });
});
