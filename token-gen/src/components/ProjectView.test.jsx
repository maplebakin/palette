import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectView from './ProjectView.jsx';
import { PaletteContext } from '../context/PaletteContext.jsx';
import { ProjectContext } from '../context/ProjectContext.jsx';

const tokens = {
  brand: {
    primary: '#6633ff',
  },
};

const capturedSection = {
  id: 'section-1',
  label: 'Launch Kit',
  baseHex: '#6633ff',
  mode: 'Analogous',
  kind: 'theme',
  colors: [{ hex: '#6633ff' }, { hex: '#22d3ee' }],
  tokens: { primary: '#6633ff' },
  paletteSpec: {
    baseColor: '#6633ff',
    mode: 'Analogous',
    themeMode: 'dark',
  },
};

const projectValue = {
  project: {
    schemaVersion: 1,
    sections: [capturedSection],
    moodBoards: [
      {
        id: 'mood-1',
        title: 'Launch Mood',
        createdAt: '2026-01-01T00:00:00.000Z',
        clusters: [{ slots: [{ color: '#6633ff' }] }],
      },
    ],
  },
  projectName: 'Launch Project',
  settings: {},
  sections: [capturedSection],
  setProjectName: vi.fn(),
  addSection: vi.fn(),
  updateSection: vi.fn(),
  removeSection: vi.fn(),
  capturePalette: vi.fn(),
  updateMoodBoard: vi.fn(),
  removeMoodBoard: vi.fn(),
  loadProject: vi.fn(),
  createNewProject: vi.fn(),
};

const renderProjectView = (props = {}) => render(
  <ProjectContext.Provider value={projectValue}>
    <PaletteContext.Provider value={{}}>
      <ProjectView
        isDev={false}
        canExport={false}
        tokens={tokens}
        primaryTextColor="#ffffff"
        productExportThemes={[]}
        {...props}
      />
    </PaletteContext.Provider>
  </ProjectContext.Provider>
);

describe('ProjectView export capability gating', () => {
  it('keeps public Project Manager focused on saved kits without export controls', () => {
    renderProjectView();

    expect(screen.getByText('Project Manager')).toBeInTheDocument();
    expect(screen.getByText('Saved Kits')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Launch Kit')).toBeInTheDocument();
    expect(screen.queryByText('Product Forge')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /build print pack/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export project .* penpot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export all mood boards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /build design palette files/i })).not.toBeInTheDocument();
  });

  it('renders private forge product and export controls when enabled', async () => {
    renderProjectView({
      isDev: true,
      canExport: true,
      productExportThemes: [{ id: 'current', label: 'Current Theme', miniPalette: {} }],
      onExportProductPackage: vi.fn(),
      onDownloadThemePack: vi.fn(),
    });

    expect(await screen.findByTestId('product-forge-stage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /build print pack/i })).toBeInTheDocument();
  });
});
