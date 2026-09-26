import React from 'react';
import { Shuffle, Flame, Sun, Moon, Palette, RotateCcw } from 'lucide-react';
import ConfirmedVariantsStatus from '../ConfirmedVariantsStatus.jsx';
import { StageSection } from './StageLayout';

// Step 2 of the demo stepper: fine-tune sliders, light/dark/pop switch,
// and the chaos menu. Split out of BuildStage (which previously rendered
// Create + Refine stacked); the seed-color / harmony / preset controls
// now live in CreateStage.
const RefineStage = ({
  showFineTune,
  setShowFineTune,
  harmonyIntensity,
  neutralCurve,
  accentStrength,
  accentHueShift,
  accentSaturationShift,
  apocalypseIntensity,
  popIntensity,
  harmonyInput,
  neutralInput,
  accentInput,
  accentHueInput,
  accentSaturationInput,
  apocalypseInput,
  popInput,
  setHarmonyInput,
  setNeutralInput,
  setAccentInput,
  setAccentHueInput,
  setAccentSaturationInput,
  setApocalypseInput,
  setPopInput,
  debouncedHarmonyChange,
  debouncedNeutralChange,
  debouncedAccentChange,
  debouncedAccentHueChange,
  debouncedAccentSaturationChange,
  debouncedApocalypseChange,
  debouncedPopChange,
  resetFineTuneSliders = () => {},
  variantStatus,
  themeMode,
  setThemeMode,
  tokens,
  mode,
  chaosMenuOpen,
  setChaosMenuOpen,
  randomRitual,
  crankApocalypse,
  resetPalette,
}) => (
  <StageSection id="refine" title="Refine" subtitle="Nudge the sliders, flip the modes, and find the version that feels right.">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFineTune((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-xs font-bold px-3 py-2 rounded-lg border panel-surface-soft hover:opacity-90 transition"
          >
            Fine-tune sliders
            <span className="text-[10px]">{showFineTune ? '▲' : '▼'}</span>
          </button>
          {showFineTune && (
            <div className="mt-3 grid grid-cols-1 gap-3 text-xs rounded-lg border panel-surface-soft p-3 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold panel-muted">Fine-tune values</span>
                <button
                  type="button"
                  onClick={resetFineTuneSliders}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
                >
                  <RotateCcw size={13} />
                  Reset sliders
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                <span className="text-xs font-bold panel-muted">Harmony spread</span>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={harmonyIntensity}
                  onChange={(e) => debouncedHarmonyChange(e.target.value)}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                  aria-label="Adjust harmony spread"
                  aria-valuemin={50}
                  aria-valuemax={160}
                  aria-valuenow={harmonyIntensity}
                />
                <input
                  type="number"
                  min="50"
                  max="160"
                  value={harmonyInput}
                  onChange={(e) => setHarmonyInput(e.target.value)}
                  className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                  aria-label="Enter harmony spread value"
                />
                <span className="text-xs w-6 text-right font-mono panel-muted">%</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                <span className="text-xs font-bold panel-muted">Neutral depth</span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={neutralCurve}
                  onChange={(e) => debouncedNeutralChange(e.target.value)}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                  aria-label="Adjust neutral depth"
                  aria-valuemin={60}
                  aria-valuemax={140}
                  aria-valuenow={neutralCurve}
                />
                <input
                  type="number"
                  min="60"
                  max="140"
                  value={neutralInput}
                  onChange={(e) => setNeutralInput(e.target.value)}
                  className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                  aria-label="Enter neutral depth value"
                />
                <span className="text-xs w-6 text-right font-mono panel-muted">%</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                <span className="text-xs font-bold panel-muted">Accent punch</span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={accentStrength}
                  onChange={(e) => debouncedAccentChange(e.target.value)}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                  aria-label="Adjust accent punch"
                  aria-valuemin={60}
                  aria-valuemax={140}
                  aria-valuenow={accentStrength}
                />
                <input
                  type="number"
                  min="60"
                  max="140"
                  value={accentInput}
                  onChange={(e) => setAccentInput(e.target.value)}
                  className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                  aria-label="Enter accent punch value"
                />
                <span className="text-xs w-6 text-right font-mono panel-muted">%</span>
              </div>

              <p className="text-[11px] leading-snug panel-muted">
                Use this to nudge buttons/highlights warmer, cooler, softer, or stronger without changing the whole palette.
              </p>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                <span className="text-xs font-bold panel-muted">Accent Hue</span>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={accentHueShift}
                  onChange={(e) => debouncedAccentHueChange(e.target.value)}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                  aria-label="Adjust accent hue"
                  aria-valuemin={-60}
                  aria-valuemax={60}
                  aria-valuenow={accentHueShift}
                />
                <input
                  type="number"
                  min="-60"
                  max="60"
                  value={accentHueInput}
                  onChange={(e) => setAccentHueInput(e.target.value)}
                  className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                  aria-label="Enter accent hue value"
                />
                <span className="text-xs w-6 text-right font-mono panel-muted">°</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                <span className="text-xs font-bold panel-muted">Accent Saturation</span>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={accentSaturationShift}
                  onChange={(e) => debouncedAccentSaturationChange(e.target.value)}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                  aria-label="Adjust accent saturation"
                  aria-valuemin={-40}
                  aria-valuemax={40}
                  aria-valuenow={accentSaturationShift}
                />
                <input
                  type="number"
                  min="-40"
                  max="40"
                  value={accentSaturationInput}
                  onChange={(e) => setAccentSaturationInput(e.target.value)}
                  className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                  aria-label="Enter accent saturation value"
                />
                <span className="text-xs w-6 text-right font-mono panel-muted">%</span>
              </div>

              {mode === 'Apocalypse' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                  <span className="text-xs font-bold" style={{ color: tokens.status.error }}>Apocalypse drive</span>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={apocalypseIntensity}
                    onChange={(e) => debouncedApocalypseChange(e.target.value)}
                    className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                    style={{ accentColor: tokens.status.error }}
                    aria-label="Adjust apocalypse intensity"
                    aria-valuemin={20}
                    aria-valuemax={150}
                    aria-valuenow={apocalypseIntensity}
                  />
                  <input
                    type="number"
                    min="20"
                    max="150"
                    value={apocalypseInput}
                    onChange={(e) => setApocalypseInput(e.target.value)}
                    className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                    aria-label="Enter apocalypse intensity value"
                  />
                  <span className="text-xs w-6 text-right font-mono panel-muted">%</span>
                </div>
              )}

              {themeMode === 'pop' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                  <span className="text-xs font-bold" style={{ color: tokens.brand.accent }}>Pop intensity</span>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={popIntensity}
                    onChange={(e) => debouncedPopChange(e.target.value)}
                    className="w-32 focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)]"
                    style={{ accentColor: tokens.brand.accent }}
                    aria-label="Adjust pop intensity"
                    aria-valuemin={60}
                    aria-valuemax={140}
                    aria-valuenow={popIntensity}
                  />
                  <input
                    type="number"
                    min="60"
                    max="140"
                    value={popInput}
                    onChange={(e) => setPopInput(e.target.value)}
                    className="w-16 text-xs text-center font-mono panel-surface-strong border rounded"
                    aria-label="Enter pop intensity value"
                  />
                  <span className="text-xs w-6 text-right font-mono panel-muted">%</span>
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setChaosMenuOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                  aria-expanded={chaosMenuOpen}
                  aria-haspopup="true"
                >
                  Chaos menu
                </button>
                {chaosMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border panel-surface-soft shadow-xl z-30">
                    <button
                      type="button"
                      onClick={() => { setChaosMenuOpen(false); randomRitual(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:opacity-80"
                    >
                      <span>Random ritual</span>
                      <Shuffle size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChaosMenuOpen(false); crankApocalypse(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:opacity-80"
                    >
                      <span>Crank Apocalypse</span>
                      <Flame size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChaosMenuOpen(false); resetPalette(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:opacity-80"
                    >
                      <span>Reset</span>
                      <Palette size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm">
        <div className="flex panel-surface-strong p-1 rounded-lg border flex-wrap" role="group" aria-label="Theme mode">
          {[
            { key: 'light', label: 'Light', description: 'For blogs, articles, docs, and readable content pages.', icon: <Sun size={14} /> },
            { key: 'dark', label: 'Dark', description: 'For dashboards, portals, archives, and immersive spaces.', icon: <Moon size={14} /> },
            { key: 'pop', label: 'Pop', description: 'For shop pages, product drops, launches, promos, and high-attention CTAs.', icon: <Palette size={14} /> },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setThemeMode(item.key)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 panel-text ${themeMode === item.key ? 'panel-surface shadow-sm' : ''} focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2`}
              style={themeMode === item.key ? { color: tokens.brand.primary } : undefined}
              aria-pressed={themeMode === item.key}
              aria-label={`Set theme mode to ${item.label}: ${item.description}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs panel-muted">
          {themeMode === 'light'
            ? 'For blogs, articles, docs, and readable content pages.'
            : themeMode === 'dark'
              ? 'For dashboards, portals, archives, and immersive spaces.'
              : 'For shop pages, product drops, launches, promos, and high-attention CTAs.'}
        </p>
        {variantStatus && (
          <ConfirmedVariantsStatus {...variantStatus} />
        )}
      </div>
    </div>
  </StageSection>
);

export default RefineStage;
