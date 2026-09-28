import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MoodBoard from '../MoodBoard.jsx';
import ListingAssetsCanvas from '../ListingAssetsCanvas.jsx';
import ValidateStage from '../stages/ValidateStage.jsx';
import CreateStage from '../stages/CreateStage.jsx';
import RefineStage from '../stages/RefineStage.jsx';
import ForgeCta from '../ForgeCta.jsx';
import PipelineRail from './PipelineRail.jsx';
import PublishStage from '../stages/PublishStage.jsx';
import { PIPELINE_STAGES, derivePipelineRailStatuses } from '../../lib/forgePipeline.js';

const PackageStage = lazy(() => import('../stages/PackageStage.jsx'));
const ProductForgeStage = lazy(() => import('../stages/ProductForgeStage.jsx'));
const ExportStage = lazy(() => import('../stages/ExportStage.jsx'));

const CORE_BRAND_KEYS = ['primary', 'secondary', 'accent', 'accent-strong', 'cta', 'cta-hover'];

const buildPublishPalette = (tokens = {}) => {
  const coreColors = CORE_BRAND_KEYS
    .map((key) => tokens.brand?.[key])
    .filter((value) => typeof value === 'string' && value.trim());
  const tints = Object.entries(tokens.foundation?.neutrals || {})
    .filter(([key]) => key !== 'neutral-0')
    .map(([, value]) => value)
    .filter((value) => typeof value === 'string' && value.trim());
  const semanticTokens = [
    tokens.actions?.primary,
    tokens.actions?.secondary,
    tokens.typography?.heading,
    tokens.typography?.['text-body'],
    tokens.surfaces?.background,
  ].filter((value) => typeof value === 'string' && value.trim());

  return {
    coreColors,
    tints: { neutral: tints },
    semanticTokens,
  };
};

const ReviewStage = ({ controller }) => (
  <ValidateStage
    tokens={controller.tokens}
    displayThemeName={controller.displayThemeName}
    baseColor={controller.paletteState.baseColor}
    mode={controller.paletteState.mode}
    themeMode={controller.paletteState.themeMode}
    isDark={controller.isDark}
    primaryTextColor={controller.primaryTextColor}
    quickEssentials={controller.quickEssentials}
    copyAllEssentials={controller.copyAllEssentials}
    copyEssentialsList={controller.copyEssentialsList}
    copyHexValue={controller.copyHexValue}
    copyShareLink={controller.copyShareLink}
    orderedSwatches={controller.orderedSwatches}
    showContrast={controller.uiState.showContrast}
    setShowContrast={controller.uiState.setShowContrast}
    contrastChecks={controller.contrastChecks}
    paletteRows={controller.paletteRows}
    activeTab={controller.uiState.activeTab}
    setActiveTab={controller.uiState.setActiveTab}
    getTabId={controller.getTabId}
    tabOptions={controller.tabOptions}
    onJumpToFileTools={controller.handleJumpToFileTools}
    showFileTools={controller.canExport}
    isInternal={controller.isInternal}
  />
);

const LoadingStage = ({ label }) => (
  <div className="rounded-2xl border panel-surface-soft p-5 text-sm panel-muted">
    Loading {label}…
  </div>
);

// The public tasting-room is selected by AppShell before this private workspace
// is rendered. Keep this fallback gated as well so a public controller cannot
// accidentally mount the forge pipeline.
const PublicWorkspaceFallback = ({ controller }) => (
  <>
    <ReviewStage controller={controller} />
    <ForgeCta />
  </>
);

export default function PaletteWorkspace({ controller }) {
  const [currentSection, setCurrentSection] = useState('create');
  const [visitedStages, setVisitedStages] = useState({ create: true });
  const [exportDownloaded, setExportDownloaded] = useState(false);
  const [manifestGenerated, setManifestGenerated] = useState(false);
  const sectionRefs = useRef({});

  const setSectionRef = useCallback((id) => (node) => {
    if (node) {
      sectionRefs.current[id] = node;
    } else {
      delete sectionRefs.current[id];
    }
  }, []);

  const handleRailNavigate = useCallback((id) => {
    setCurrentSection(id);
    setVisitedStages((current) => ({ ...current, [id]: true }));
    sectionRefs.current[id]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const updateFromScroll = () => {
      const measurements = PIPELINE_STAGES
        .map(({ id }) => ({ id, node: sectionRefs.current[id] }))
        .filter(({ node }) => node)
        .map(({ id, node }) => {
          const rect = node.getBoundingClientRect();
          return { id, top: rect.top, height: rect.height };
        });

      if (measurements.length === 0) return;

      // jsdom has no layout box. Leave the initial Create state intact there;
      // browsers update this from the real section positions.
      const hasLayout = measurements.some(({ top, height }) => top !== 0 || height !== 0);
      if (!hasLayout) return;

      const anchor = Math.max(96, window.innerHeight * 0.34);
      const current = measurements.reduce((selected, measurement) => (
        measurement.top <= anchor ? measurement : selected
      ), measurements[0]);
      const passed = measurements.filter(({ top }) => top <= anchor).map(({ id }) => id);

      setCurrentSection(current.id);
      setVisitedStages((previous) => {
        const next = { ...previous, create: true };
        let changed = next.create !== previous.create;
        passed.forEach((id) => {
          if (!next[id]) {
            next[id] = true;
            changed = true;
          }
        });
        return changed ? next : previous;
      });
    };

    updateFromScroll();
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('resize', updateFromScroll);
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(updateFromScroll)
      : null;
    Object.values(sectionRefs.current).forEach((node) => resizeObserver?.observe(node));

    return () => {
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('resize', updateFromScroll);
      resizeObserver?.disconnect();
    };
  }, []);

  const markExportDownloaded = useCallback(() => {
    setExportDownloaded(true);
  }, []);
  const wrapDownload = useCallback((handler) => (...args) => {
    markExportDownloaded();
    return handler?.(...args);
  }, [markExportDownloaded]);
  const exportHandlers = useMemo(() => ({
    exportAllAssets: wrapDownload(controller.exportAllAssets),
    handleExportPdf: wrapDownload(controller.handleExportPdf),
    exportJson: wrapDownload(controller.exportJson),
    exportGenericJson: wrapDownload(controller.exportGenericJson),
    exportFigmaTokensJson: wrapDownload(controller.exportFigmaTokensJson),
    exportStyleDictionaryJson: wrapDownload(controller.exportStyleDictionaryJson),
    exportCssVars: wrapDownload(controller.exportCssVars),
    exportUiThemeCss: wrapDownload(controller.exportUiThemeCss),
    exportWitchcraftJson: wrapDownload(controller.exportWitchcraftJson),
    exportDesignPalette: wrapDownload(controller.exportDesignPalette),
    onDownloadThemePack: wrapDownload(controller.handleDownloadThemePack),
    onDownloadThemePackWithPrint: wrapDownload(controller.handleDownloadThemePackWithPrint),
    onGenerateListingAssets: wrapDownload(controller.handleGenerateListingAssets),
    onExportProductPackage: wrapDownload(controller.handleExportProductPackage),
  }), [
    controller.exportAllAssets,
    controller.exportCssVars,
    controller.exportDesignPalette,
    controller.exportFigmaTokensJson,
    controller.exportGenericJson,
    controller.exportJson,
    controller.exportStyleDictionaryJson,
    controller.exportUiThemeCss,
    controller.exportWitchcraftJson,
    controller.handleDownloadThemePack,
    controller.handleDownloadThemePackWithPrint,
    controller.handleExportPdf,
    controller.handleExportProductPackage,
    controller.handleGenerateListingAssets,
    wrapDownload,
  ]);

  const publishPalette = useMemo(() => buildPublishPalette(controller.tokens), [controller.tokens]);
  const handleManifestGenerated = useCallback(() => {
    setManifestGenerated(true);
  }, []);
  const packageReady = Boolean(visitedStages.package && controller.printAssetPack);
  const railStatuses = useMemo(() => derivePipelineRailStatuses({
    currentStage: currentSection,
    paletteExists: Boolean(controller.tokens),
    refineVisited: Boolean(visitedStages.refine),
    reviewVisited: Boolean(visitedStages.review),
    packageReady,
    exportDownloaded,
    manifestGenerated,
  }), [
    controller.tokens,
    currentSection,
    exportDownloaded,
    manifestGenerated,
    packageReady,
    visitedStages.refine,
    visitedStages.review,
  ]);

  if (!controller.canExport) {
    return <PublicWorkspaceFallback controller={controller} />;
  }

  return (
    <>
      <div className="forge-pipeline-shell">
        <PipelineRail stages={railStatuses} onNavigate={handleRailNavigate} />
        <div className="forge-pipeline-content">
          <div ref={setSectionRef('create')} className="forge-pipeline-section" data-pipeline-stage="create">
            <CreateStage
              headerOpen={controller.uiState.headerOpen}
              setHeaderOpen={controller.uiState.setHeaderOpen}
              randomRitual={controller.randomRitual}
              crankApocalypse={controller.crankApocalypse}
              resetPalette={controller.resetPalette}
              tokens={controller.tokens}
              mode={controller.paletteState.mode}
              setMode={controller.paletteState.setMode}
              pickerColor={controller.pickerColor}
              baseInput={controller.paletteState.baseInput}
              baseError={controller.paletteState.baseError}
              handleBaseColorChange={controller.handleBaseColorChange}
              flushBaseColorChange={controller.flushBaseColorChange}
              presets={controller.presets}
              applyPreset={controller.applyPreset}
            />
          </div>

          <div ref={setSectionRef('refine')} className="forge-pipeline-section" data-pipeline-stage="refine">
            <RefineStage
              showFineTune={controller.uiState.showFineTune}
              setShowFineTune={controller.uiState.setShowFineTune}
              harmonyIntensity={controller.paletteState.harmonyIntensity}
              neutralCurve={controller.paletteState.neutralCurve}
              accentStrength={controller.paletteState.accentStrength}
              accentHueShift={controller.paletteState.accentHueShift}
              accentSaturationShift={controller.paletteState.accentSaturationShift}
              apocalypseIntensity={controller.paletteState.apocalypseIntensity}
              popIntensity={controller.paletteState.popIntensity}
              harmonyInput={controller.paletteState.harmonyInput}
              neutralInput={controller.paletteState.neutralInput}
              accentInput={controller.paletteState.accentInput}
              accentHueInput={controller.paletteState.accentHueInput}
              accentSaturationInput={controller.paletteState.accentSaturationInput}
              apocalypseInput={controller.paletteState.apocalypseInput}
              popInput={controller.paletteState.popInput}
              setHarmonyInput={controller.paletteState.setHarmonyInput}
              setNeutralInput={controller.paletteState.setNeutralInput}
              setAccentInput={controller.paletteState.setAccentInput}
              setAccentHueInput={controller.paletteState.setAccentHueInput}
              setAccentSaturationInput={controller.paletteState.setAccentSaturationInput}
              setApocalypseInput={controller.paletteState.setApocalypseInput}
              setPopInput={controller.paletteState.setPopInput}
              debouncedHarmonyChange={controller.debouncedHarmonyChange}
              debouncedNeutralChange={controller.debouncedNeutralChange}
              debouncedAccentChange={controller.debouncedAccentChange}
              debouncedAccentHueChange={controller.debouncedAccentHueChange}
              debouncedAccentSaturationChange={controller.debouncedAccentSaturationChange}
              debouncedApocalypseChange={controller.debouncedApocalypseChange}
              debouncedPopChange={controller.debouncedPopChange}
              resetFineTuneSliders={controller.resetFineTuneSliders}
              variantStatus={controller.confirmedVariantStatus}
              themeMode={controller.paletteState.themeMode}
              setThemeMode={controller.paletteState.setThemeMode}
              tokens={controller.tokens}
              mode={controller.paletteState.mode}
              chaosMenuOpen={controller.uiState.chaosMenuOpen}
              setChaosMenuOpen={controller.uiState.setChaosMenuOpen}
              randomRitual={controller.randomRitual}
              crankApocalypse={controller.crankApocalypse}
              resetPalette={controller.resetPalette}
            />
            <div className="forge-pipeline-companion">
              <MoodBoard
                tokens={controller.tokens}
                baseColor={controller.paletteState.baseColor}
                onApplyPaletteSpec={controller.applyMoodBoardSpec}
                onSaveDraft={controller.saveMoodBoardDraft}
                copyHexValue={controller.copyHexValue}
                canSaveDraft={Boolean(controller.projectContext)}
                onExportSingleMoodBoard={controller.exportSingleMoodBoardFromProject}
                onExportAllMoodBoards={controller.exportAllMoodBoardsFromProject}
              />
            </div>
          </div>

          <div ref={setSectionRef('review')} className="forge-pipeline-section" data-pipeline-stage="review">
            <ReviewStage controller={controller} />
          </div>

          <div ref={setSectionRef('package')} className="forge-pipeline-section" data-pipeline-stage="package">
            <Suspense fallback={<LoadingStage label="Package" />}>
              <PackageStage
                activeTab={controller.uiState.activeTab}
                getTabId={controller.getTabId}
                printMode={controller.paletteState.printMode}
                setPrintMode={controller.paletteState.setPrintMode}
                tokens={controller.tokens}
                primaryTextColor={controller.primaryTextColor}
                printAssetPack={controller.printAssetPack}
                canvaPrintHexes={controller.canvaPrintHexes}
                onDownloadThemePack={exportHandlers.onDownloadThemePack}
                canExport={controller.canDownloadThemePack}
                showPrintTools={controller.canExport}
                variantStatus={controller.confirmedVariantStatus}
              />
            </Suspense>
          </div>

          <div ref={setSectionRef('export')} className="forge-pipeline-section" data-pipeline-stage="export">
            <Suspense fallback={<LoadingStage label="Product Forge" />}>
              <ProductForgeStage
                isDev={controller.canExport}
                tokens={controller.tokens}
                primaryTextColor={controller.primaryTextColor}
                productExportThemes={controller.productExportThemes}
                onExportProductPackage={exportHandlers.onExportProductPackage}
                onDownloadThemePack={exportHandlers.onDownloadThemePack}
              />
            </Suspense>
            <Suspense fallback={<LoadingStage label="Export" />}>
              <ExportStage
                activeTab={controller.uiState.activeTab}
                getTabId={controller.getTabId}
                exportsSectionRef={controller.exportsSectionRef}
                handleJumpToExports={controller.handleJumpToFileTools}
                copyShareLink={controller.copyShareLink}
                overflowOpen={controller.uiState.overflowOpen}
                setOverflowOpen={controller.uiState.setOverflowOpen}
                tokens={controller.tokens}
                ctaTextColor={controller.ctaTextColor}
                primaryTextColor={controller.primaryTextColor}
                finalTokens={controller.finalTokens}
                printMode={controller.paletteState.printMode}
                isExportingAssets={controller.exportState.isExportingAssets}
                exportError={controller.exportState.exportError}
                exportBlocked={controller.exportState.exportBlocked}
                printSupported={controller.exportState.printSupported}
                neutralButtonText={controller.neutralButtonText}
                exportAllAssets={exportHandlers.exportAllAssets}
                handleExportPdf={exportHandlers.handleExportPdf}
                exportJson={exportHandlers.exportJson}
                exportGenericJson={exportHandlers.exportGenericJson}
                exportFigmaTokensJson={exportHandlers.exportFigmaTokensJson}
                exportStyleDictionaryJson={exportHandlers.exportStyleDictionaryJson}
                exportCssVars={exportHandlers.exportCssVars}
                exportUiThemeCss={exportHandlers.exportUiThemeCss}
                exportWitchcraftJson={exportHandlers.exportWitchcraftJson}
                exportDesignPalette={exportHandlers.exportDesignPalette}
                onDownloadThemePack={exportHandlers.onDownloadThemePack}
                onDownloadThemePackWithPrint={exportHandlers.onDownloadThemePackWithPrint}
                onGenerateListingAssets={exportHandlers.onGenerateListingAssets}
                displayThemeName={controller.displayThemeName}
                isInternal={controller.isInternal}
              />
            </Suspense>
          </div>

          <div ref={setSectionRef('publish')} className="forge-pipeline-section" data-pipeline-stage="publish">
            <PublishStage palette={publishPalette} onManifestGenerated={handleManifestGenerated} />
          </div>
        </div>
      </div>

      <ListingAssetsCanvas
        tokens={controller.tokens}
        baseColor={controller.paletteState.baseColor}
        mode={controller.paletteState.mode}
        themeMode={controller.paletteState.themeMode}
        displayThemeName={controller.displayThemeName}
        coverRef={controller.listingCoverRef}
        swatchRef={controller.listingSwatchRef}
        snippetRef={controller.listingSnippetRef}
      />
    </>
  );
}
