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
          onExportPenpotPrintTokens={controller.exportProjectPenpotPrintTokens}
          onExportDesignSpacePalettes={controller.exportDesignSpacePalettes}
          projectExportStatus={controller.projectState.projectExportStatus}
          projectExporting={controller.projectState.projectExporting}
          projectPenpotStatus={controller.projectState.projectPenpotStatus}
          projectPenpotExporting={controller.projectState.projectPenpotExporting}
        />
      </PaletteContext.Provider>
    </Suspense>
  );
}
