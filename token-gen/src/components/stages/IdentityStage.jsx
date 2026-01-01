import React from 'react';
import { Palette, Save, FolderOpen, Download, Upload } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary.jsx';
import SectionFallback from '../SectionFallback.jsx';
import { hexWithAlpha, pickReadableText } from '../../lib/colorUtils';

const IdentityStage = ({
  tokens,
  primaryTextColor,
  headerBackground,
  headerGlowA,
  headerGlowB,
  isDark,
  view,
  setView,
  saveCurrentPalette,
  savedPalettes,
  loadSavedPalette,
  exportSavedPalettes,
  importSavedPalettes,
  triggerSavedPalettesImport,
  savedPaletteInputRef,
  storageAvailable,
  storageCorrupt,
  storageQuotaExceeded,
  clearSavedData,
  customThemeName,
  setCustomThemeName,
  autoThemeName,
  tokenPrefix,
  setTokenPrefix,
  saveStatus,
  importedOverrides,
  sanitizeThemeName,
  sanitizePrefix,
  projectEdit,
  onSaveProjectPalette,
  onSaveProjectPaletteAsNew,
  onCancelProjectEdit,
}) => (
  <>
    {(storageAvailable === false || storageCorrupt) && (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 py-3 mb-2 rounded-lg border flex items-center justify-between gap-3"
        role="status"
        aria-live="polite"
        style={{
          borderColor: hexWithAlpha(tokens.status.warning, 0.45),
          backgroundColor: hexWithAlpha(tokens.status.warning, 0.12),
          color: tokens.status.warning,
        }}
      >
        <div className="text-sm font-semibold">
          {storageCorrupt ? 'Saved palettes look corrupted. Save/load is disabled.' : 'Local storage is blocked; saving is disabled.'}
          {storageQuotaExceeded && ' Storage quota exceeded; clear saved data to re-enable saving.'}
        </div>
        <button
          type="button"
          onClick={clearSavedData}
          className="px-3 py-1.5 rounded-md text-xs font-bold hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
          style={{
            backgroundColor: tokens.status.warning,
            color: pickReadableText(tokens.status.warning),
          }}
        >
          Clear saved data
        </button>
      </div>
    )}

    <header
      id="identity"
      className="md:sticky md:top-0 z-30 backdrop-blur-md border-b"
      style={{
        backgroundColor: headerBackground,
        backgroundImage: `linear-gradient(120deg, ${headerGlowA}, transparent 45%), linear-gradient(240deg, ${headerGlowB}, transparent 50%)`,
        borderColor: tokens.surfaces["surface-plain-border"],
        boxShadow: isDark ? '0 12px 38px -28px rgba(0,0,0,0.8)' : '0 12px 32px -28px rgba(15,23,42,0.25)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Header" reset={reset} message={message} />}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3">
                  <div
                    className="p-2 rounded-lg shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${tokens.brand["gradient-start"]} 0%, ${tokens.brand.secondary} 50%, ${tokens.brand["gradient-end"]} 100%)`,
                      boxShadow: `0 10px 30px -10px ${tokens.brand.primary}99`,
                    }}
                  >
                    <Palette className="drop-shadow-sm" size={24} style={{ color: primaryTextColor }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.3em] panel-muted">Welcome to</p>
                    <h1 className="text-2xl font-black" style={{ color: tokens.typography['heading'] }}>Apocapalette</h1>
                    <p className="text-xs panel-muted font-medium">Spin the chaos wheel, keep the pretty bits.</p>
                    {projectEdit && (
                      <p className="text-[11px] panel-muted">
                        Editing project palette: {projectEdit.paletteName} (Project: {projectEdit.projectName})
                      </p>
                    )}
                  </div>
                  <div className="relative flex flex-wrap items-center gap-2 lg:ml-4">
                    <button
                      type="button"
                      onClick={() => setView(v => v === 'palette' ? 'project' : 'palette')}
                      className="px-3 py-2 rounded-full text-[11px] font-bold shadow-md hover:-translate-y-[1px] active:scale-95 transition border panel-surface-strong"
                    >
                      {view === 'palette' ? 'Project View' : 'Palette Creator'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 w-full lg:w-auto">
                <div className="w-full">
                  <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 -mx-2 px-2 lg:flex-wrap lg:overflow-visible lg:pb-0 lg:px-0 lg:mx-0">
                    <button
                      type="button"
                      onClick={saveCurrentPalette}
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold hover:opacity-90 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2 shrink-0 whitespace-nowrap"
                      style={{
                        backgroundColor: tokens.brand.primary,
                        color: primaryTextColor,
                        boxShadow: `0 12px 30px -20px ${tokens.brand.primary}`,
                      }}
                      aria-label="Save current palette to browser"
                      disabled={storageAvailable !== true || storageCorrupt || storageQuotaExceeded}
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full panel-surface-strong text-xs font-bold border shrink-0 min-w-[180px]">
                      <FolderOpen size={14} className="panel-muted" aria-hidden />
                      <select
                        onChange={(e) => { loadSavedPalette(e.target.value); e.target.value = ''; }}
                        className="bg-transparent outline-none text-xs"
                        defaultValue=""
                        aria-label="Load a saved palette"
                        disabled={storageAvailable !== true || storageCorrupt}
                      >
                        <option value="" disabled>Load saved…</option>
                        {savedPalettes.map((palette) => (
                          <option key={palette.id} value={palette.id}>
                            {palette.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={exportSavedPalettes}
                      className="flex items-center gap-2 px-3 py-2 rounded-full panel-surface-strong text-xs font-bold border shrink-0 whitespace-nowrap hover:opacity-90 disabled:opacity-60"
                      disabled={savedPalettes.length === 0}
                      title={savedPalettes.length === 0 ? 'No saved palettes to export' : 'Export saved palettes'}
                    >
                      <Download size={14} />
                      Export saved
                    </button>
                    <button
                      type="button"
                      onClick={triggerSavedPalettesImport}
                      className="flex items-center gap-2 px-3 py-2 rounded-full panel-surface-strong text-xs font-bold border shrink-0 whitespace-nowrap hover:opacity-90"
                      title="Import saved palettes"
                    >
                      <Upload size={14} />
                      Import saved
                    </button>
                    <input
                      ref={savedPaletteInputRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={importSavedPalettes}
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                  </div>
                  {projectEdit && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onSaveProjectPalette}
                        className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold hover:opacity-90 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2 shrink-0 whitespace-nowrap"
                        style={{
                          backgroundColor: tokens.brand.primary,
                          color: primaryTextColor,
                          boxShadow: `0 12px 30px -20px ${tokens.brand.primary}`,
                        }}
                        aria-label="Save changes to project palette"
                        disabled={!onSaveProjectPalette}
                      >
                        <Save size={14} />
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={onSaveProjectPaletteAsNew}
                        className="flex items-center gap-2 px-3 py-2 rounded-full panel-surface-strong text-xs font-bold border shrink-0 whitespace-nowrap hover:opacity-90 disabled:opacity-60"
                        disabled={!onSaveProjectPaletteAsNew}
                      >
                        <Save size={14} />
                        Save as new
                      </button>
                      <button
                        type="button"
                        onClick={onCancelProjectEdit}
                        className="flex items-center gap-2 px-3 py-2 rounded-full panel-surface-strong text-xs font-bold border shrink-0 whitespace-nowrap hover:opacity-90 disabled:opacity-60"
                        disabled={!onCancelProjectEdit}
                      >
                        Cancel / Close
                      </button>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <div
                    className="flex flex-wrap gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm"
                  >
                    <label className="flex-1 min-w-[180px] flex flex-col text-xs font-semibold panel-muted">
                      <span className="sr-only">Theme name</span>
                      <input
                        type="text"
                        value={customThemeName}
                        onChange={(e) => setCustomThemeName(sanitizeThemeName(e.target.value, ''))}
                        placeholder={autoThemeName}
                        className="px-3 py-2 rounded-lg panel-surface-strong text-sm border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
                        aria-label="Theme name"
                        maxLength={60}
                      />
                    </label>
                    <label className="flex-1 min-w-[160px] flex flex-col text-xs font-semibold panel-muted">
                      <span className="sr-only">Token prefix</span>
                      <input
                        type="text"
                        value={tokenPrefix}
                        onChange={(e) => setTokenPrefix(sanitizePrefix(e.target.value))}
                        placeholder="Prefix"
                        className="px-3 py-2 rounded-lg panel-surface-strong text-sm border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
                        aria-label="Token prefix"
                        maxLength={32}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold panel-muted">
                  {saveStatus && (
                    <span role="status" aria-live="polite">{saveStatus}</span>
                  )}
                  {importedOverrides && Object.keys(importedOverrides).length > 0 && (
                    <span role="status" style={{ color: tokens.status.success }}>
                      Imported theme active
                    </span>
                  )}
                  {storageAvailable === false && (
                    <span role="alert" style={{ color: tokens.status.warning }}>
                      Saving disabled (storage blocked)
                    </span>
                  )}
                  {storageQuotaExceeded && (
                    <span role="alert" style={{ color: tokens.status.warning }}>
                      Storage quota exceeded — clear saved data to resume saving
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </header>
  </>
);

export default IdentityStage;
