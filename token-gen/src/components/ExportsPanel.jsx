import React from 'react';
import { Download, FileText, Printer, Wand2 } from 'lucide-react';
import ColorSwatch from './ColorSwatch';
import { pickReadableText } from '../lib/colorUtils';

export default function ExportsPanel({
  tokens,
  printMode,
  isExporting,
  exportError,
  exportBlocked = false,
  ctaTextColor,
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
  onRetryAssets,
  isInternal,
}) {
  return (
    <div className="print:hidden mb-10 p-4 rounded-2xl border shadow-sm bg-white/80 dark:bg-slate-900/60 backdrop-blur flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      style={{ borderColor: tokens.cards['card-panel-border'] }}
      aria-busy={isExporting}
    >
      <div>
        <p className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-300 tracking-wider">Exports</p>
        <p className="text-sm text-slate-600 dark:text-slate-200">Asset pack, PDF, and JSON exports.</p>
        {exportError && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1" role="alert">
            {exportError}
          </p>
        )}
        {!canPrint && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1" role="alert">
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
              color: ctaTextColor || pickReadableText(tokens.brand.primary),
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
              className="px-3 py-2 rounded-md bg-white dark:bg-slate-900 border border-amber-400 text-amber-800 text-xs font-bold hover:bg-amber-50"
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
          className="px-4 py-3 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
