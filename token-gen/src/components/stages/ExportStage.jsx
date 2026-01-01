import React, { lazy, Suspense } from 'react';
import { Download, Link as LinkIcon } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary.jsx';
import SectionFallback from '../SectionFallback.jsx';
import { StageSection } from './StageLayout';

const ExportsPanel = lazy(() => import('../ExportsPanel'));

const ExportStage = ({
  activeTab,
  getTabId,
  exportsSectionRef,
  handleJumpToExports,
  copyShareLink,
  overflowOpen,
  setOverflowOpen,
  tokens,
  ctaTextColor,
  primaryTextColor,
  finalTokens,
  printMode,
  isExportingAssets,
  exportError,
  exportBlocked,
  printSupported,
  neutralButtonText,
  exportAllAssets,
  handleExportPdf,
  exportJson,
  exportGenericJson,
  exportFigmaTokensJson,
  exportStyleDictionaryJson,
  exportCssVars,
  exportUiThemeCss,
  exportWitchcraftJson,
  onDownloadThemePack,
  onDownloadThemePackWithPrint,
  onGenerateListingAssets,
  displayThemeName,
  isInternal,
}) => (
  <StageSection id="export" title="Export" subtitle="Ship your palette in the format you need." collapsible>
    <section
      ref={exportsSectionRef}
      id="tab-panel-3"
      role="tabpanel"
      aria-labelledby={getTabId('Exports')}
      className="space-y-4"
    >
      <>
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 -mx-2 px-2 lg:flex-wrap lg:overflow-visible lg:pb-0 lg:px-0 lg:mx-0">
          <button
            type="button"
            onClick={activeTab === 'Exports' ? undefined : handleJumpToExports}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:-translate-y-[1px] active:scale-95 transition border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2 shrink-0 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundImage: `linear-gradient(120deg, ${tokens.brand.primary} 0%, ${tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary} 100%)`,
              color: primaryTextColor,
              borderColor: tokens.brand['cta-hover'] || tokens.brand.primary,
              boxShadow: `0 18px 35px -22px ${tokens.brand.primary}`,
            }}
            aria-label="Jump to exports"
            disabled={activeTab === 'Exports'}
          >
            <Download size={14} />
            Exports
          </button>
          <button
            type="button"
            onClick={copyShareLink}
          className="flex items-center gap-2 px-3 py-2 rounded-full panel-surface-strong text-xs font-bold border hover:opacity-90 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2 shrink-0 whitespace-nowrap"
            title="Copy a shareable link to this palette"
          >
            <LinkIcon size={14} />
            Copy share link
          </button>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOverflowOpen((v) => !v)}
              className="px-3 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
              style={{ borderColor: tokens.cards["card-panel-border"] }}
              aria-expanded={overflowOpen}
              aria-haspopup="true"
              title="More actions"
            >
              ⋮
            </button>
            {overflowOpen && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-xl border panel-surface-soft shadow-xl z-30"
              >
                <a
                  href="docs/README.md"
                  className="block px-3 py-2 text-xs font-bold panel-text hover:opacity-80 rounded-t-xl"
                >
                  Docs
                </a>
                <button
                  type="button"
                  onClick={() => { setOverflowOpen(false); copyShareLink(); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:opacity-80 rounded-b-xl"
                >
                  Copy share link
                </button>
              </div>
            )}
          </div>
        </div>
        <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Exports" reset={reset} message={message} />}>
          <Suspense fallback={<div className="p-4 rounded-lg border panel-surface-soft text-sm">Loading exports…</div>}>
            <ExportsPanel
              tokens={finalTokens}
              printMode={printMode}
              isExporting={isExportingAssets}
              exportError={exportError}
              exportBlocked={exportBlocked}
              canPrint={printSupported}
              ctaTextColor={ctaTextColor}
              primaryTextColor={primaryTextColor}
              neutralButtonTextColor={neutralButtonText}
              onExportAssets={exportAllAssets}
              onRetryAssets={exportAllAssets}
              onExportPdf={handleExportPdf}
              onExportPenpot={() => exportJson(displayThemeName, printMode ? '-PRINT' : '')}
              onExportGeneric={exportGenericJson}
              onExportFigmaTokens={exportFigmaTokensJson}
              onExportStyleDictionary={exportStyleDictionaryJson}
              onExportCssVars={exportCssVars}
              onExportUiThemeCss={exportUiThemeCss}
              onExportWitchcraft={exportWitchcraftJson}
              onDownloadThemePack={onDownloadThemePack}
              onDownloadThemePackWithPrint={onDownloadThemePackWithPrint}
              onGenerateListingAssets={onGenerateListingAssets}
              isInternal={isInternal}
            />
          </Suspense>
        </ErrorBoundary>
      </>
    </section>
  </StageSection>
);

export default ExportStage;
