import React from 'react';
import { Palette, Printer } from 'lucide-react';
import ColorSwatch from '../ColorSwatch';
import { StageSection } from './StageLayout';

const PackageStage = ({
  getTabId,
  printMode,
  setPrintMode,
  tokens,
  primaryTextColor,
  printAssetPack,
  canvaPrintHexes,
}) => (
  <StageSection id="package" title="Package" subtitle="Print mode gates the asset pack preview and CMYK-safe values." collapsible>
    <section
      id="tab-panel-2"
      role="tabpanel"
      aria-labelledby={getTabId('Print assets')}
      className="space-y-4"
    >
      <>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
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
                          {item.icon}
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
              <p className="panel-muted mb-4">We’ll tune tokens for CMYK-safe values and add foil + ink layers before exporting.</p>
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

export default PackageStage;
