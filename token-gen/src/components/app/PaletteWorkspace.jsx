import React from 'react';
import MoodBoard from '../MoodBoard.jsx';
import ListingAssetsCanvas from '../ListingAssetsCanvas.jsx';
import ValidateStage from '../stages/ValidateStage.jsx';
import BuildStage from '../stages/BuildStage.jsx';
import PackageStage from '../stages/PackageStage.jsx';
import ExportStage from '../stages/ExportStage.jsx';
import IdentityStage from '../stages/IdentityStage.jsx';
import { StageNav } from '../stages/StageLayout.jsx';

export default function PaletteWorkspace({ controller }) {
  return (
    <>
      <div className="flex justify-center">
        <StageNav
          stages={controller.stageDefs}
          currentStage={controller.uiState.currentStage}
          onNavigate={controller.handleStageNavigate}
        />
      </div>

      <BuildStage
        headerOpen={controller.uiState.headerOpen}
        setHeaderOpen={controller.uiState.setHeaderOpen}
        chaosMenuOpen={controller.uiState.chaosMenuOpen}
        setChaosMenuOpen={controller.uiState.setChaosMenuOpen}
        randomRitual={controller.randomRitual}
        crankApocalypse={controller.crankApocalypse}
        resetPalette={controller.resetPalette}
        tokens={controller.tokens}
        mode={controller.paletteState.mode}
        setMode={controller.paletteState.setMode}
        themeMode={controller.paletteState.themeMode}
        setThemeMode={controller.paletteState.setThemeMode}
        pickerColor={controller.pickerColor}
        baseInput={controller.paletteState.baseInput}
        baseError={controller.paletteState.baseError}
        handleBaseColorChange={controller.handleBaseColorChange}
        presets={controller.presets}
        applyPreset={controller.applyPreset}
        showFineTune={controller.uiState.showFineTune}
        setShowFineTune={controller.uiState.setShowFineTune}
        harmonyIntensity={controller.paletteState.harmonyIntensity}
        neutralCurve={controller.paletteState.neutralCurve}
        accentStrength={controller.paletteState.accentStrength}
        apocalypseIntensity={controller.paletteState.apocalypseIntensity}
        popIntensity={controller.paletteState.popIntensity}
        setHarmonyIntensity={controller.paletteState.setHarmonyIntensity}
        setNeutralCurve={controller.paletteState.setNeutralCurve}
        setAccentStrength={controller.paletteState.setAccentStrength}
        setApocalypseIntensity={controller.paletteState.setApocalypseIntensity}
        setPopIntensity={controller.paletteState.setPopIntensity}
        harmonyInput={controller.paletteState.harmonyInput}
        neutralInput={controller.paletteState.neutralInput}
        accentInput={controller.paletteState.accentInput}
        apocalypseInput={controller.paletteState.apocalypseInput}
        popInput={controller.paletteState.popInput}
        setHarmonyInput={controller.paletteState.setHarmonyInput}
        setNeutralInput={controller.paletteState.setNeutralInput}
        setAccentInput={controller.paletteState.setAccentInput}
        setApocalypseInput={controller.paletteState.setApocalypseInput}
        setPopInput={controller.paletteState.setPopInput}
        debouncedHarmonyChange={controller.debouncedHarmonyChange}
        debouncedNeutralChange={controller.debouncedNeutralChange}
        debouncedAccentChange={controller.debouncedAccentChange}
        debouncedApocalypseChange={controller.debouncedApocalypseChange}
        debouncedPopChange={controller.debouncedPopChange}
        canUndo={controller.canUndo}
        canRedo={controller.canRedo}
        undo={controller.paletteState.undo}
        redo={controller.paletteState.redo}
      />

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
        orderedSwatches={controller.orderedSwatches}
        showContrast={controller.uiState.showContrast}
        setShowContrast={controller.uiState.setShowContrast}
        contrastChecks={controller.contrastChecks}
        paletteRows={controller.paletteRows}
        activeTab={controller.uiState.activeTab}
        setActiveTab={controller.uiState.setActiveTab}
        getTabId={controller.getTabId}
        tabOptions={controller.tabOptions}
        onJumpToExports={controller.handleJumpToExports}
        showExports={controller.isDev}
        isInternal={controller.isInternal}
      />

      <PackageStage
        activeTab={controller.uiState.activeTab}
        getTabId={controller.getTabId}
        printMode={controller.paletteState.printMode}
        setPrintMode={controller.paletteState.setPrintMode}
        tokens={controller.tokens}
        primaryTextColor={controller.primaryTextColor}
        printAssetPack={controller.printAssetPack}
        canvaPrintHexes={controller.canvaPrintHexes}
      />

      {controller.isDev && (
        <ExportStage
          activeTab={controller.uiState.activeTab}
          getTabId={controller.getTabId}
          exportsSectionRef={controller.exportsSectionRef}
          handleJumpToExports={controller.handleJumpToExports}
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
          exportAllAssets={controller.exportAllAssets}
          handleExportPdf={controller.handleExportPdf}
          exportJson={controller.exportJson}
          exportGenericJson={controller.exportGenericJson}
          exportFigmaTokensJson={controller.exportFigmaTokensJson}
          exportStyleDictionaryJson={controller.exportStyleDictionaryJson}
          exportCssVars={controller.exportCssVars}
          exportUiThemeCss={controller.exportUiThemeCss}
          exportWitchcraftJson={controller.exportWitchcraftJson}
          exportDesignSpacePalette={controller.exportDesignSpacePalette}
          onDownloadThemePack={controller.handleDownloadThemePack}
          onDownloadThemePackWithPrint={controller.handleDownloadThemePackWithPrint}
          onGenerateListingAssets={controller.handleGenerateListingAssets}
          displayThemeName={controller.displayThemeName}
          isInternal={controller.isInternal}
        />
      )}

      {controller.isDev && (
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
      )}
    </>
  );
}
