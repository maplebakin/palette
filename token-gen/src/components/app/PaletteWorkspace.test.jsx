import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PaletteWorkspace from './PaletteWorkspace.jsx';

vi.mock('../../lib/capabilities.js', () => ({
  canDownloadThemePack: true,
  isPrivateForge: true,
}));

vi.mock('../MoodBoard.jsx', () => ({
  default: () => <section data-testid="mood-board">Mood Board</section>,
}));

vi.mock('../ListingAssetsCanvas.jsx', () => ({
  default: () => <div data-testid="listing-assets-canvas" />,
}));

vi.mock('../stages/CreateStage.jsx', () => ({
  default: () => <section data-testid="create-stage">Create Stage</section>,
}));

vi.mock('../stages/RefineStage.jsx', () => ({
  default: () => <section data-testid="refine-stage">Refine Stage</section>,
}));

vi.mock('../stages/ValidateStage.jsx', () => ({
  default: ({ copyShareLink }) => (
    <section data-testid="validate-stage">
      Validate Stage
      {copyShareLink && <span data-testid="share-link-wired">share link wired</span>}
    </section>
  ),
}));

vi.mock('../ForgeCta.jsx', () => ({
  default: () => <section data-testid="forge-cta">Forge CTA</section>,
}));

vi.mock('../stages/PackageStage.jsx', () => ({
  default: () => <section data-testid="package-stage">Package Stage</section>,
}));

vi.mock('../stages/ProductForgeStage.jsx', () => ({
  default: ({ productExportThemes = [], onExportProductPackage }) => (
    <section data-testid="product-forge-stage">
      <h2>Product Forge</h2>
      <p>Product Package Builder</p>
      <p>{productExportThemes.length} source themes</p>
      <button type="button" onClick={() => onExportProductPackage?.({ offering: 'individual' })}>
        Export Product Package
      </button>
    </section>
  ),
}));

vi.mock('../stages/ExportStage.jsx', () => ({
  default: () => <section data-testid="export-stage">Export Stage</section>,
}));

vi.mock('../stages/PublishStage.jsx', () => ({
  default: () => <section data-testid="publish-stage">Publish Stage</section>,
}));

const tokens = {
  brand: {
    primary: '#6633ff',
  },
};

const STEPS = [
  { id: 'create', label: 'Create' },
  { id: 'refine', label: 'Refine' },
  { id: 'review', label: 'Review' },
  { id: 'package', label: 'Package' },
  { id: 'export', label: 'Export' },
];

const createController = (overrides = {}) => ({
  stageDefs: STEPS,
  uiState: {
    currentStage: 'Create',
    headerOpen: true,
    setHeaderOpen: vi.fn(),
    chaosMenuOpen: false,
    setChaosMenuOpen: vi.fn(),
    showFineTune: false,
    setShowFineTune: vi.fn(),
    activeTab: 'Quick view',
    setActiveTab: vi.fn(),
    overflowOpen: false,
    setOverflowOpen: vi.fn(),
  },
  handleStageNavigate: vi.fn(),
  randomRitual: vi.fn(),
  crankApocalypse: vi.fn(),
  resetPalette: vi.fn(),
  tokens,
  paletteState: {
    mode: 'Analogous',
    setMode: vi.fn(),
    themeMode: 'light',
    setThemeMode: vi.fn(),
    baseColor: '#6633ff',
    baseInput: '#6633ff',
    baseError: '',
    printMode: false,
    setPrintMode: vi.fn(),
    harmonyIntensity: 100,
    neutralCurve: 100,
    accentStrength: 100,
    apocalypseIntensity: 100,
    popIntensity: 100,
    harmonyInput: '100',
    neutralInput: '100',
    accentInput: '100',
    apocalypseInput: '100',
    popInput: '100',
    setHarmonyIntensity: vi.fn(),
    setNeutralCurve: vi.fn(),
    setAccentStrength: vi.fn(),
    setApocalypseIntensity: vi.fn(),
    setPopIntensity: vi.fn(),
    setHarmonyInput: vi.fn(),
    setNeutralInput: vi.fn(),
    setAccentInput: vi.fn(),
    setApocalypseInput: vi.fn(),
    setPopInput: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  },
  pickerColor: '#6633ff',
  handleBaseColorChange: vi.fn(),
  flushBaseColorChange: vi.fn(),
  presets: [],
  applyPreset: vi.fn(),
  debouncedHarmonyChange: vi.fn(),
  debouncedNeutralChange: vi.fn(),
  debouncedAccentChange: vi.fn(),
  debouncedApocalypseChange: vi.fn(),
  debouncedPopChange: vi.fn(),
  resetFineTuneSliders: vi.fn(),
  confirmedVariantStatus: {
    availableModes: ['light'],
    missingModes: ['dark', 'pop'],
  },
  canUndo: false,
  canRedo: false,
  projectContext: null,
  applyMoodBoardSpec: vi.fn(),
  saveMoodBoardDraft: vi.fn(),
  canExport: true,
  canDownloadThemePack: true,
  exportSingleMoodBoardFromProject: vi.fn(),
  exportAllMoodBoardsFromProject: vi.fn(),
  displayThemeName: 'Launch Theme',
  isDark: false,
  primaryTextColor: '#ffffff',
  ctaTextColor: '#ffffff',
  quickEssentials: [],
  copyAllEssentials: vi.fn(),
  copyEssentialsList: vi.fn(),
  copyHexValue: vi.fn(),
  copyShareLink: vi.fn(),
  orderedSwatches: [],
  getTabId: (tab) => `tab-${tab.toLowerCase().replace(/\s+/g, '-')}`,
  handleJumpToFileTools: vi.fn(),
  isInternal: true,
  printAssetPack: [],
  canvaPrintHexes: [],
  handleDownloadThemePack: vi.fn(),
  productExportThemes: [{ id: 'current', label: 'Current Theme', miniPalette: {} }],
  handleExportProductPackage: vi.fn(),
  exportsSectionRef: { current: null },
  finalTokens: tokens,
  exportState: {
    isExportingAssets: false,
    exportError: '',
    exportBlocked: false,
    printSupported: true,
  },
  neutralButtonText: '#111827',
  exportAllAssets: vi.fn(),
  handleExportPdf: vi.fn(),
  exportJson: vi.fn(),
  exportGenericJson: vi.fn(),
  exportFigmaTokensJson: vi.fn(),
  exportStyleDictionaryJson: vi.fn(),
  exportCssVars: vi.fn(),
  exportUiThemeCss: vi.fn(),
  exportWitchcraftJson: vi.fn(),
  exportDesignPalette: vi.fn(),
  handleDownloadThemePackWithPrint: vi.fn(),
  handleGenerateListingAssets: vi.fn(),
  listingCoverRef: { current: null },
  listingSwatchRef: { current: null },
  listingSnippetRef: { current: null },
  ...overrides,
});

describe('PaletteWorkspace private pipeline', () => {
  it('renders every forge stage together on one visible page', async () => {
    const controller = createController();
    render(<PaletteWorkspace controller={controller} />);

    expect(screen.getByTestId('create-stage')).toBeInTheDocument();
    expect(screen.getByTestId('refine-stage')).toBeInTheDocument();
    expect(screen.getByTestId('mood-board')).toBeInTheDocument();
    expect(screen.getByTestId('validate-stage')).toBeInTheDocument();
    expect(await screen.findByTestId('package-stage')).toBeInTheDocument();
    expect(await screen.findByTestId('product-forge-stage')).toBeInTheDocument();
    expect(await screen.findByTestId('export-stage')).toBeInTheDocument();
    expect(screen.getByTestId('publish-stage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('moves the current rail state when a section is selected', () => {
    const controller = createController();
    render(<PaletteWorkspace controller={controller} />);

    const reviewRailItem = screen.getByRole('button', { name: 'Review' });
    fireEvent.click(reviewRailItem);

    expect(reviewRailItem).toHaveAttribute('aria-current', 'step');
  });

  it('keeps the public controller path free of forge sections and downloads', () => {
    const controller = createController({ canExport: false, canDownloadThemePack: false });
    render(<PaletteWorkspace controller={controller} />);

    expect(screen.getByTestId('validate-stage')).toBeInTheDocument();
    expect(screen.getByTestId('share-link-wired')).toBeInTheDocument();
    expect(screen.getByTestId('forge-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('product-forge-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('export-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('package-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('publish-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('listing-assets-canvas')).not.toBeInTheDocument();
  });

  it('keeps product package export wired inside the visible Export section', async () => {
    const controller = createController();
    render(<PaletteWorkspace controller={controller} />);

    await screen.findByTestId('product-forge-stage');
    fireEvent.click(screen.getByRole('button', { name: /export product package/i }));

    expect(controller.handleExportProductPackage).toHaveBeenCalledWith({ offering: 'individual' });
  });
});
