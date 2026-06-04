import React from 'react';
import { Download, FileText, Printer, Wand2, Sparkles } from 'lucide-react';
import { hexWithAlpha, pickReadableText } from '../lib/colorUtils';

const ExportGroup = ({ title, description, defaultOpen = false, children }) => (
  <details className="rounded-lg border panel-surface-soft" open={defaultOpen}>
    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold panel-text">
      {title}
    </summary>
    <div className="border-t px-3 py-3">
      {description && <p className="mb-3 text-xs panel-muted">{description}</p>}
      <div className="flex flex-wrap gap-3">
        {children}
      </div>
    </div>
  </details>
);

export default function ExportsPanel({
  tokens,
  printMode,
  isExporting,
  exportError,
  exportBlocked = false,
  ctaTextColor,
  primaryTextColor,
  neutralButtonTextColor,
  canPrint = true,
  onExportAssets,
  onExportPdf,
  onExportPenpot,
  onExportGeneric,
  onExportWitchcraft,
  onExportFigmaTokens,
  onExportStyleDictionary,
  onExportCssVars,
  onExportUiThemeCss,
  onExportDesignSpace,
  onDownloadThemePack,
  onDownloadThemePackWithPrint,
  onGenerateListingAssets,
  onRetryAssets,
  isInternal,
}) {
  return (
    <div className="panel-surface print:hidden mb-10 p-4 rounded-2xl border shadow-sm backdrop-blur flex flex-col gap-4"
      aria-busy={isExporting}
    >
      <div>
        <p className="text-xs uppercase font-semibold panel-muted tracking-wider">Dev/internal exports</p>
        <p className="text-sm panel-muted">Development tools for asset checks, PDF output, and individual JSON/CSS files. Use Package for the customer theme pack.</p>
        {exportError && (
          <p className="text-xs mt-1" role="alert" style={{ color: tokens.status.warning }}>
            {exportError}
          </p>
        )}
        {!canPrint && (
          <p className="text-xs mt-1" role="alert" style={{ color: tokens.status.warning }}>
            Print/PDF is unavailable in this browser.
          </p>
        )}
        {exportError && onRetryAssets && (
          <button
            type="button"
            onClick={onRetryAssets}
            className="mt-2 px-3 py-2 rounded-md panel-surface-strong border text-xs font-bold hover:opacity-90"
            style={{
              borderColor: hexWithAlpha(tokens.status.warning, 0.5),
              color: tokens.status.warning,
            }}
          >
            Retry
          </button>
        )}
      </div>

      <div className="space-y-3">
        <ExportGroup
          title="Asset and Preview Exports"
          description="Create visual asset packs, a printable palette reference, or a Cricut Design Space color file."
          defaultOpen
        >
          <button
            onClick={onExportAssets}
            disabled={isExporting || exportBlocked}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2 disabled:opacity-60"
            style={{
              backgroundColor: tokens.brand.primary,
              color: primaryTextColor || pickReadableText(tokens.brand.primary),
              borderColor: tokens.brand['cta-hover'],
            }}
          >
            <Wand2 size={18} />
            {isExporting ? 'Building assets…' : (exportBlocked ? 'Assets unavailable' : (printMode ? 'Forge SVG/PNG Asset Pack' : 'SVG/PNG Asset Pack'))}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!canPrint}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.cards['card-panel-surface'],
              color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
              borderColor: tokens.cards['card-panel-border'],
            }}
            aria-label="Palette PDF"
          >
            <Printer size={16} />
            {canPrint ? 'Palette PDF' : 'Print unavailable'}
          </button>
          <button
            onClick={onExportDesignSpace}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.brand.secondary || tokens.cards['card-panel-surface'],
              color: pickReadableText(tokens.brand.secondary || tokens.cards['card-panel-surface']),
              borderColor: tokens.brand['cta-hover'] || tokens.cards['card-panel-border'],
            }}
          >
            <Sparkles size={14} />
            Cricut Design Space Palette
          </button>
        </ExportGroup>

        <ExportGroup
          title="Design Tool Exports"
          description="Export Penpot-ready JSON or Figma-compatible token files for design token workflows."
        >
          <button
            onClick={onExportPenpot}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
            style={{
              backgroundColor: tokens.brand.cta,
              color: ctaTextColor || pickReadableText(tokens.brand.cta),
              borderColor: tokens.brand['cta-hover'],
            }}
          >
            <Download size={14} />
            {printMode ? 'Penpot JSON (Print)' : 'Penpot JSON'}
          </button>
          <button
            onClick={onExportFigmaTokens}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.cards['card-panel-surface'],
              color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
              borderColor: tokens.cards['card-panel-border'],
            }}
          >
            <Download size={14} />
            Figma Tokens JSON
          </button>
        </ExportGroup>

        <ExportGroup
          title="Developer Token Exports"
          description="Export implementation-ready token JSON, CSS variables, or Apocapalette app UI styles."
        >
          <button
            onClick={onExportGeneric}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.cards['card-panel-surface'],
              color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
              borderColor: tokens.cards['card-panel-border'],
            }}
          >
            <Download size={14} />
            Generic Token JSON
          </button>
          <button
            onClick={onExportStyleDictionary}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.cards['card-panel-surface'],
              color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
              borderColor: tokens.cards['card-panel-border'],
            }}
          >
            <Download size={14} />
            Style Dictionary JSON
          </button>
          <button
            onClick={onExportCssVars}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.cards['card-panel-surface'],
              color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
              borderColor: tokens.cards['card-panel-border'],
            }}
          >
            <FileText size={14} />
            CSS Variables
          </button>
          <button
            onClick={onExportUiThemeCss}
            className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
            style={{
              backgroundColor: tokens.cards['card-panel-surface'],
              color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
              borderColor: tokens.cards['card-panel-border'],
            }}
          >
            <FileText size={14} />
            Apocapalette UI Theme CSS
          </button>
        </ExportGroup>

        {(import.meta.env.DEV || isInternal) && (
          <ExportGroup
            title="Advanced / Dev Exports"
            description="Internal verification and storefront-production tools. Use Package for the customer Theme Pack."
          >
            {import.meta.env.DEV && (
              <>
                <button
                  type="button"
                  onClick={onDownloadThemePack}
                  className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
                  style={{
                    backgroundColor: tokens.cards['card-panel-surface'],
                    color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
                    borderColor: tokens.cards['card-panel-border'],
                  }}
                >
                  <Download size={14} />
                  Download Theme Pack (Dev)
                </button>
                <button
                  type="button"
                  onClick={onDownloadThemePackWithPrint}
                  className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
                  style={{
                    backgroundColor: tokens.cards['card-panel-surface'],
                    color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
                    borderColor: tokens.cards['card-panel-border'],
                  }}
                >
                  <Download size={14} />
                  Theme Pack + CMYK Print Pack (Dev)
                </button>
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={onGenerateListingAssets}
                    className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
                    style={{
                      backgroundColor: tokens.cards['card-panel-surface'],
                      color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
                      borderColor: tokens.cards['card-panel-border'],
                    }}
                  >
                    <Download size={14} />
                    Generate Listing Assets (Dev)
                  </button>
                  <span className="text-[10px] font-semibold uppercase panel-muted">DEV ONLY</span>
                </div>
              </>
            )}
            {isInternal && (
              <button
                onClick={onExportWitchcraft}
                className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
                style={{
                  backgroundColor: tokens.cards['card-panel-surface-strong'],
                  color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface-strong']),
                  borderColor: tokens.cards['card-panel-border'],
                }}
              >
                <FileText size={14} />
                Witchcraft JSON
              </button>
            )}
          </ExportGroup>
        )}
      </div>
    </div>
  );
}
