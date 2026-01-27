import React from 'react';
import { Download, FileText, Printer, Wand2, Sparkles } from 'lucide-react';
import ColorSwatch from './ColorSwatch';
import { hexWithAlpha, pickReadableText } from '../lib/colorUtils';

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
    <div className="panel-surface print:hidden mb-10 p-4 rounded-2xl border shadow-sm backdrop-blur flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      aria-busy={isExporting}
    >
      <div>
        <p className="text-xs uppercase font-semibold panel-muted tracking-wider">Exports</p>
        <p className="text-sm panel-muted">Asset pack, PDF, and JSON exports.</p>
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
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
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
            {isExporting ? 'Building assets…' : (exportBlocked ? 'Assets unavailable' : (printMode ? 'Forge assets (print pack)' : 'Birth assets (SVG/PNG)'))}
          </button>
          {exportError && onRetryAssets && (
            <button
              type="button"
              onClick={onRetryAssets}
              className="px-3 py-2 rounded-md panel-surface-strong border text-xs font-bold hover:opacity-90"
              style={{
                borderColor: hexWithAlpha(tokens.status.warning, 0.5),
                color: tokens.status.warning,
              }}
            >
              Retry
            </button>
          )}
        </div>
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
          aria-label="Export palette as PDF"
        >
          <Printer size={16} />
          {canPrint ? 'Export PDF' : 'Print unavailable'}
        </button>
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
          onClick={onExportGeneric}
          className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
          style={{
            backgroundColor: tokens.cards['card-panel-surface'],
            color: neutralButtonTextColor || pickReadableText(tokens.cards['card-panel-surface']),
            borderColor: tokens.cards['card-panel-border'],
          }}
        >
          <Download size={14} />
          Generic JSON
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
          Style Dictionary
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
          UI Theme CSS
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
          DesignSpace Palette
        </button>
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
              Download Theme Pack
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
              Theme Pack + CMYK Print Pack
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
                Generate Listing Assets
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
      </div>
    </div>
  );
}
