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

describe('PaletteWorkspace stepper', () => {
  it('shows only the active step instead of the old stacked page', () => {
    const controller = createController();
    controller.uiState.currentStage = 'Refine';
    render(<PaletteWorkspace controller={controller} />);

    expect(screen.getByTestId('refine-stage')).toBeInTheDocument();
    expect(screen.getByTestId('mood-board')).toBeInTheDocument();
    expect(screen.queryByTestId('create-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('validate-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('package-stage')).not.toBeInTheDocument();
  });

  it('navigates with the StepPager Back/Next buttons', () => {
    const controller = createController();
    const { rerender } = render(<PaletteWorkspace controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: /refine · next/i }));
    expect(controller.handleStageNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'refine', label: 'Refine' }),
    );

    controller.uiState.currentStage = 'Refine';
    rerender(<PaletteWorkspace controller={controller} />);
    fireEvent.click(screen.getByRole('button', { name: /back · create/i }));
    expect(controller.handleStageNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'create', label: 'Create' }),
    );
  });

  it('navigates with the StageNav pills', () => {
    const controller = createController();
    render(<PaletteWorkspace controller={controller} />);

    fireEvent.click(screen.getByTitle(/review stage/i));
    expect(controller.handleStageNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'review', label: 'Review' }),
    );
  });

  it('wires the share-link handler into the Review step and shows the forge CTA in the public demo', () => {
    const controller = createController({ canExport: false, canDownloadThemePack: false });
    controller.uiState.currentStage = 'Review';
    render(<PaletteWorkspace controller={controller} />);

    expect(screen.getByTestId('validate-stage')).toBeInTheDocument();
    expect(screen.getByTestId('share-link-wired')).toBeInTheDocument();
    expect(screen.getByTestId('forge-cta')).toBeInTheDocument();
  });

  it('hides every file download in the public demo build', () => {
    const controller = createController({ canExport: false, canDownloadThemePack: false });
    controller.uiState.currentStage = 'Review';
    render(<PaletteWorkspace controller={controller} />);

    expect(screen.queryByTestId('product-forge-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('export-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('listing-assets-canvas')).not.toBeInTheDocument();
    expect(screen.queryByTestId('package-stage')).not.toBeInTheDocument();
    // The demo still offers the copy-based tools.
    expect(screen.getByTestId('validate-stage')).toBeInTheDocument();
  });

  it('continues the forge flow into Package and Export steps after Review, without the public CTA', async () => {
    const controller = createController();
    controller.uiState.currentStage = 'Package';
    const { rerender } = render(<PaletteWorkspace controller={controller} />);

    expect(await screen.findByTestId('package-stage')).toBeInTheDocument();
    expect(screen.queryByTestId('forge-cta')).not.toBeInTheDocument();

    controller.uiState.currentStage = 'Export';
    rerender(<PaletteWorkspace controller={controller} />);

    const productForgeStage = await screen.findByTestId('product-forge-stage');
    const exportStage = await screen.findByTestId('export-stage');
    expect(productForgeStage.compareDocumentPosition(exportStage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Product Forge')).toBeInTheDocument();
    expect(screen.getByText('Product Package Builder')).toBeInTheDocument();
    expect(screen.getByText('1 source themes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /export product package/i }));

    expect(controller.handleExportProductPackage).toHaveBeenCalledWith({ offering: 'individual' });
  });
});
