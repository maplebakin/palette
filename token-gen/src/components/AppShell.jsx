import React from 'react';
import { MoodBoardProvider } from '../context/MoodBoardContext.jsx';
import useAppController from '../hooks/useAppController.js';
import PaletteWorkspace from './app/PaletteWorkspace.jsx';
import ProjectWorkspace from './app/ProjectWorkspace.jsx';
import PrintHeader from './app/PrintHeader.jsx';
import CollapsedQuickBar from './app/CollapsedQuickBar.jsx';
import FloatingActions from './app/FloatingActions.jsx';
import IdentityStage from './stages/IdentityStage.jsx';

export default function AppShell() {
  const controller = useAppController();

  return (
    <div className="min-h-screen transition-colors duration-500 app-theme">
      <MoodBoardProvider>
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 px-3 py-2 rounded"
            style={{ backgroundColor: controller.tokens.brand.primary, color: controller.primaryTextColor }}
          >
            Skip to content
          </a>

          <PrintHeader
            tokens={controller.tokens}
            displayThemeName={controller.displayThemeName}
            baseColor={controller.paletteState.baseColor}
            mode={controller.paletteState.mode}
            printMeta={controller.exportState.printMeta}
          />

          <IdentityStage
            tokens={controller.tokens}
            primaryTextColor={controller.primaryTextColor}
            headerBackground={controller.headerBackground}
            headerGlowA={controller.headerGlowA}
            headerGlowB={controller.headerGlowB}
            isDark={controller.isDark}
            view={controller.uiState.view}
            setView={controller.uiState.setView}
            saveCurrentPalette={controller.saveCurrentPalette}
            savedPalettes={controller.paletteState.savedPalettes}
            loadSavedPalette={controller.loadSavedPalette}
            exportSavedPalettes={controller.exportSavedPalettes}
            importSavedPalettes={controller.importSavedPalettes}
            triggerSavedPalettesImport={controller.triggerSavedPalettesImport}
            savedPaletteInputRef={controller.savedPaletteInputRef}
            storageAvailable={controller.paletteState.storageAvailable}
            storageCorrupt={controller.paletteState.storageCorrupt}
            storageQuotaExceeded={controller.paletteState.storageQuotaExceeded}
            clearSavedData={controller.clearSavedData}
            customThemeName={controller.paletteState.customThemeName}
            setCustomThemeName={controller.paletteState.setCustomThemeName}
            autoThemeName={controller.autoThemeName}
            tokenPrefix={controller.paletteState.tokenPrefix}
            setTokenPrefix={controller.paletteState.setTokenPrefix}
            saveStatus={controller.paletteState.saveStatus}
            importedOverrides={controller.paletteState.importedOverrides}
            sanitizeThemeName={controller.sanitizeThemeName}
            sanitizePrefix={controller.sanitizePrefix}
            projectEdit={controller.projectState.projectEdit}
            onSaveProjectPalette={() => controller.saveProjectPalette()}
            onSaveProjectPaletteAsNew={() => controller.saveProjectPalette({ asNew: true })}
            onCancelProjectEdit={controller.cancelProjectEdit}
          />

          <CollapsedQuickBar
            headerOpen={controller.uiState.headerOpen}
            quickBarBottom={controller.quickBarBottom}
            pickerColor={controller.pickerColor}
            handleBaseColorChange={controller.handleBaseColorChange}
            baseInput={controller.paletteState.baseInput}
            baseError={controller.paletteState.baseError}
            tokens={controller.tokens}
            mode={controller.paletteState.mode}
            setMode={controller.paletteState.setMode}
            themeMode={controller.paletteState.themeMode}
            setThemeMode={controller.paletteState.setThemeMode}
          />

          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-28 md:pb-12 space-y-10">
            {controller.uiState.view === 'project'
              ? <ProjectWorkspace controller={controller} />
              : <PaletteWorkspace controller={controller} />}
          </main>

          <FloatingActions randomRitual={controller.randomRitual} />
        </>
      </MoodBoardProvider>
    </div>
  );
}
