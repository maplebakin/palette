import React, { Suspense } from 'react';
import ProjectView from '../ProjectView.jsx';
import { PaletteContext } from '../../context/PaletteContext.jsx';

export default function ProjectWorkspace({ controller }) {
  return (
    <Suspense fallback={<div className="p-4 rounded-lg border panel-surface-soft text-sm">Loading Project...</div>}>
      <PaletteContext.Provider value={controller.paletteSnapshot}>
        <ProjectView
          onImportCss={controller.handleCssImport}
          onOpenPalette={controller.openProjectPalette}
          onDownloadPrintAssets={controller.exportProjectPrintAssets}
          onExportTokenPrintTokens={controller.exportProjectTokenPrintTokens}
          onExportDesignPalettes={controller.exportDesignPalettes}
          projectExportStatus={controller.projectState.projectExportStatus}
          projectExporting={controller.projectState.projectExporting}
          projectTokenStatus={controller.projectState.projectTokenStatus}
          projectTokenExporting={controller.projectState.projectTokenExporting}
          isDev={controller.isDev}
          canExport={controller.canExport}
          tokens={controller.tokens}
          primaryTextColor={controller.primaryTextColor}
          productExportThemes={controller.productExportThemes}
          onExportProductPackage={controller.canExport ? controller.handleExportProductPackage : undefined}
          onDownloadThemePack={controller.canExport ? controller.handleDownloadThemePack : undefined}
        />
      </PaletteContext.Provider>
    </Suspense>
  );
}
