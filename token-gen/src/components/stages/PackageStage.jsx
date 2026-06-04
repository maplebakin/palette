import React, { useEffect, useRef, useState } from 'react';
import { Download, Palette, Printer } from 'lucide-react';
import ColorSwatch from '../ColorSwatch';
import ConfirmedVariantsStatus from '../ConfirmedVariantsStatus.jsx';
import { StageSection } from './StageLayout';
import { buildThemePackSelectionCopy } from '../../lib/appState.js';

const THEME_PACK_MODES = ['light', 'dark', 'pop'];
const MODE_LABELS = {
  light: 'Light',
  dark: 'Dark',
  pop: 'Pop',
};

const PackageStage = ({
  getTabId,
  printMode,
  setPrintMode,
  tokens,
  primaryTextColor,
  printAssetPack,
  canvaPrintHexes,
  onDownloadThemePack,
  canExport = Boolean(onDownloadThemePack),
  variantStatus,
}) => {
  const availableModes = variantStatus?.availableModes || [];
  const missingModes = variantStatus?.missingModes || THEME_PACK_MODES.filter((mode) => !availableModes.includes(mode));
  const [selectedModes, setSelectedModes] = useState(() => [...availableModes]);
  const [exportSuccessMessage, setExportSuccessMessage] = useState('');
  const previousAvailableModes = useRef(availableModes);
  const exportCopy = buildThemePackSelectionCopy({ availableModes, missingModes }, selectedModes);
  const coverageKey = `${availableModes.join('|')}|${missingModes.join('|')}`;
  const selectionKey = selectedModes.join('|');

  useEffect(() => {
    const previousAvailable = previousAvailableModes.current;
    setSelectedModes((currentSelected) => THEME_PACK_MODES.filter((mode) => (
      availableModes.includes(mode)
      && (currentSelected.includes(mode) || !previousAvailable.includes(mode))
    )));
    previousAvailableModes.current = availableModes;
    setExportSuccessMessage('');
  }, [coverageKey]);

  useEffect(() => {
    setExportSuccessMessage('');
  }, [selectionKey]);

  if (!canExport) return null;

  const handleThemePackClick = async () => {
    setExportSuccessMessage('');
    await onDownloadThemePack(exportCopy.selectedModes);
    setExportSuccessMessage(exportCopy.successMessage);
  };

  const toggleSelectedMode = (mode) => {
    setSelectedModes((current) => (
      current.includes(mode)
        ? current.filter((selectedMode) => selectedMode !== mode)
        : THEME_PACK_MODES.filter((candidate) => current.includes(candidate) || candidate === mode)
    ));
  };

  return (
  <StageSection
    id="package"
    title="Package"
    subtitle="Prepare the customer-ready theme pack and optional print assets."
    collapsible
  >
    <section
      id="tab-panel-2"
      role="tabpanel"
      aria-labelledby={getTabId('Print assets')}
      className="space-y-4"
    >
      <>
        <div className="flex flex-wrap items-start gap-3 px-3 py-2 rounded-lg panel-surface-strong border">
          <label className="flex items-center gap-2 text-xs font-semibold panel-muted">
            <input
              type="checkbox"
              checked={printMode}
              onChange={(e) => setPrintMode(e.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: tokens.brand.accent }}
              aria-label="Toggle print mode"
            />
            Print
          </label>
          {onDownloadThemePack && (
            <div className="flex min-w-[240px] flex-1 flex-col gap-1">
              <button
                type="button"
                onClick={handleThemePackClick}
                disabled={!exportCopy.canExportSelection}
                className="flex w-fit items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold hover:-translate-y-[1px] transition shadow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                style={{
                  backgroundColor: tokens.brand.primary,
                  color: primaryTextColor,
                  boxShadow: `0 12px 30px -20px ${tokens.brand.primary}`,
                }}
              >
                <Download size={14} />
                <span>{exportCopy.exportButtonLabel}</span>
              </button>
              <p className="max-w-2xl text-xs panel-muted">
                Main product export. Creates a customer-ready ZIP with CSS variables, JSON tokens, Figma, Penpot, LibreOffice palette files, README, and previews.
              </p>
              <fieldset className="mt-2 max-w-2xl rounded-lg border panel-surface-soft p-3">
                <legend className="px-1 text-xs font-bold panel-text">Choose modes to include</legend>
                <div className="flex flex-wrap gap-3">
                  {THEME_PACK_MODES.map((mode) => {
                    const available = availableModes.includes(mode);
                    return (
                      <label key={mode} className={`flex items-center gap-2 text-xs font-semibold ${available ? 'panel-text' : 'panel-muted'}`}>
                        <input
                          type="checkbox"
                          checked={available && selectedModes.includes(mode)}
                          disabled={!available}
                          onChange={() => toggleSelectedMode(mode)}
                          className="h-4 w-4"
                          style={{ accentColor: tokens.brand.accent }}
                          aria-label={`${MODE_LABELS[mode]} — ${available ? 'Available' : 'Missing'}`}
                        />
                        <span>{MODE_LABELS[mode]} — {available ? 'Available' : 'Missing'}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs panel-muted">
                  Only available reviewed modes can be exported. Missing modes are not regenerated.
                </p>
              </fieldset>
              <div className="max-w-2xl space-y-0.5 text-xs panel-muted">
                <p className="font-semibold panel-text">{exportCopy.includedModesLabel}</p>
                {missingModes.length > 0 && (
                  <p>{exportCopy.missingModesLabel}</p>
                )}
                {exportCopy.omittedModesLabel && <p>{exportCopy.omittedModesLabel}</p>}
              </div>
              {variantStatus && (
                <ConfirmedVariantsStatus {...variantStatus} className="mt-2 max-w-2xl" />
              )}
              {exportSuccessMessage && (
                <p className="mt-2 max-w-2xl rounded-lg border panel-surface-soft px-3 py-2 text-xs font-bold panel-text" role="status">
                  {exportSuccessMessage}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          {printMode ? (
            <div
              className="print:hidden p-6 rounded-2xl border shadow-sm panel-surface-soft backdrop-blur-sm"
              style={{
                borderColor: tokens.cards["card-panel-border"],
                boxShadow: `0 12px 40px -24px ${tokens.brand.primary}`,
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold panel-text">
                    <Printer size={16} />
                    <span>Print asset pack preview</span>
                  </div>
                  <p className="text-sm panel-muted">
                    With Print Mode enabled, exports stay CMYK-safe and add foil + ink tokens. The tarball will include:
                  </p>
                  <div className="space-y-2">
                    {printAssetPack.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-start gap-3 p-3 rounded-lg border panel-surface-soft shadow-sm"
                      >
                        <div className="mt-0.5" style={{ color: tokens.brand.accent }}>
                          <item.icon size={14} />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold panel-text">{item.name}</div>
                          <div className="text-xs font-mono panel-muted uppercase tracking-wider">{item.files}</div>
                          <div className="text-xs panel-muted">{item.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold panel-text">
                    <Palette size={16} />
                    <span>Brand hex set for Canva</span>
                  </div>
                  <p className="text-sm panel-muted">
                    Click any swatch to copy the print-tuned hex values for quick brand kits in Canva.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Print hex swatches">
                    {canvaPrintHexes.map(({ name, color }) => (
                      <ColorSwatch key={name} name={name} color={color} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border shadow-sm panel-surface-soft text-sm">
              <p className="font-semibold mb-2">Enable Print Mode to unlock the asset pack preview.</p>
              <p className="panel-muted mb-4">
                We’ll tune tokens for CMYK-safe values and add foil + ink layers before exporting.
              </p>
              <button
                type="button"
                onClick={() => setPrintMode(true)}
                className="px-4 py-2 rounded-lg text-xs font-bold hover:-translate-y-[1px] transition shadow"
                style={{
                  backgroundColor: tokens.brand.primary,
                  color: primaryTextColor,
                  boxShadow: `0 12px 30px -20px ${tokens.brand.primary}`,
                }}
              >
                Turn on Print Mode
              </button>
            </div>
          )}
        </div>
      </>
    </section>
  </StageSection>
  );
};

export default PackageStage;
