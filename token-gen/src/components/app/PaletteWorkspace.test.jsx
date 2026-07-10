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

vi.mock('../stages/BuildStage.jsx', () => ({
  default: () => <section data-testid="build-stage">Build Stage</section>,
}));

vi.mock('../stages/ValidateStage.jsx', () => ({
  default: () => <section data-testid="validate-stage">Validate Stage</section>,
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

const tokens = {
  brand: {
    primary: '#6633ff',
  },
};

const createController = (overrides = {}) => ({
  stageDefs: [
    { id: 'identity', label: 'Create' },
    { id: 'build', label: 'Refine' },
    { id: 'validate', label: 'Review' },
    { id: 'package', label: 'Package' },
    { id: 'export', label: 'Export' },
  ],
  uiState: {
    currentStage: 'Package',
    handleStageNavigate: vi.fn(),
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
  copyShareLink: vi.fn(),
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

describe('PaletteWorkspace', () => {
  it('renders Product Forge between Package and Export when exports are available', async () => {
    const controller = createController();
    render(<PaletteWorkspace controller={controller} />);

    const packageStage = await screen.findByTestId('package-stage');
    const productForgeStage = await screen.findByTestId('product-forge-stage');
    const exportStage = await screen.findByTestId('export-stage');
    expect(packageStage.compareDocumentPosition(productForgeStage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(productForgeStage.compareDocumentPosition(exportStage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Product Forge')).toBeInTheDocument();
    expect(screen.getByText('Product Package Builder')).toBeInTheDocument();
    expect(screen.getByText('1 source themes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /export product package/i }));

    expect(controller.handleExportProductPackage).toHaveBeenCalledWith({ offering: 'individual' });
  });

  it('keeps the public Theme Pack while hiding Product Forge and broad exports', async () => {
    render(<PaletteWorkspace controller={createController({ canExport: false })} />);

    expect(screen.queryByTestId('product-forge-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('export-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('listing-assets-canvas')).not.toBeInTheDocument();
    expect(await screen.findByTestId('package-stage')).toBeInTheDocument();
  });
});
