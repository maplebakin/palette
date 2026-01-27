import React from 'react';
import { Eye, EyeOff, Shuffle, Flame, Sun, Moon, Palette } from 'lucide-react';
import { StageSection } from './StageLayout';

const BuildStage = ({
  headerOpen,
  setHeaderOpen,
  chaosMenuOpen,
  setChaosMenuOpen,
  randomRitual,
  crankApocalypse,
  resetPalette,
  tokens,
  mode,
  setMode,
  themeMode,
  setThemeMode,
  pickerColor,
  baseInput,
  baseError,
  handleBaseColorChange,
  presets,
  applyPreset,
  showFineTune,
  setShowFineTune,
  harmonyIntensity,
  neutralCurve,
  accentStrength,
  apocalypseIntensity,
  popIntensity,
  harmonyInput,
  neutralInput,
  accentInput,
  apocalypseInput,
  popInput,
  setHarmonyInput,
  setNeutralInput,
  setAccentInput,
  setApocalypseInput,
  setPopInput,
  debouncedHarmonyChange,
  debouncedNeutralChange,
  debouncedAccentChange,
  debouncedApocalypseChange,
  debouncedPopChange,
}) => (
  <StageSection id="build" title="Build" subtitle="Base color, harmony, and generation controls.">
    {/* Quick Actions Bar */}
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        type="button"
        onClick={() => setHeaderOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition shrink-0 whitespace-nowrap shadow-md"
        aria-expanded={headerOpen}
        aria-label={headerOpen ? 'Hide controls' : 'Show controls'}
      >
        {headerOpen ? <EyeOff size={14} /> : <Eye size={14} />}
        {headerOpen ? 'Hide' : 'Show'} Controls
      </button>
      
      {/* Quick actions grouped */}
      <div className="flex items-center gap-1 panel-surface-soft rounded-full px-2 py-1">
        <button
          type="button"
          onClick={resetPalette}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold hover:bg-gray-500/20 transition"
          aria-label="Reset palette"
          title="Reset to default palette"
        >
          <span>⟲</span>
          Reset
        </button>
      </div>

      <div className="flex items-center gap-1 panel-surface-soft rounded-full px-2 py-1">
        <button
          type="button"
          onClick={randomRitual}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold hover:bg-purple-500/20 transition"
          aria-label="Random ritual"
          title="Generate random palette"
        >
          <Shuffle size={12} />
          Random
        </button>
        <button
          type="button"
          onClick={crankApocalypse}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold hover:bg-red-500/20 transition"
          aria-label="Crank apocalypse"
          title="Intensify colors"
        >
          <Flame size={12} />
          Apocalypse
        </button>
      </div>
    </div>

    {headerOpen && (
      <div className="space-y-4">
        {/* Compact Color Controls - Sticky */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border panel-surface-soft backdrop-blur-sm sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 panel-surface-strong p-2 rounded-lg border shadow-sm">
            <input
              type="color"
              value={pickerColor}
              onChange={(e) => handleBaseColorChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
              aria-label="Choose base color"
            />
            <input
              type="text"
              value={baseInput}
              onChange={(e) => handleBaseColorChange(e.target.value)}
              className="w-24 bg-transparent text-sm font-mono panel-text outline-none uppercase border-b border-transparent"
              style={{ borderColor: baseError ? tokens.status.error : 'transparent' }}
              aria-label="Base color hex value"
              aria-invalid={Boolean(baseError)}
              placeholder="#000000"
            />
          </div>
          
          <select
            onChange={(e) => applyPreset(e.target.value)}
            className="px-3 py-2.5 rounded-lg panel-surface-strong panel-text text-sm border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2 shadow-sm"
            defaultValue=""
            aria-label="Choose a preset palette"
          >
            <option value="" disabled>🎨 Presets…</option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>

          {baseError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
                ⚠️ {baseError}
              </span>
            </div>
          )}
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div
          className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm"
        >
          <div className="flex panel-surface-strong p-1 rounded-lg border flex-wrap" role="group" aria-label="Harmony mode">
            {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all panel-text ${mode === m ? 'panel-surface shadow-sm' : ''} focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2`}
                style={mode === m ? { color: tokens.brand.primary } : undefined}
                aria-pressed={mode === m}
                aria-label={`Set harmony mode to ${m}`}
              >
                {m}
              </button>
            ))}
          </div>
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

        <div
          className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm"
        >
          <div className="flex panel-surface-strong p-1 rounded-lg border flex-wrap" role="group" aria-label="Theme mode">
            {[
              { key: 'light', label: 'Light', icon: <Sun size={14} /> },
              { key: 'dark', label: 'Dark', icon: <Moon size={14} /> },
              { key: 'pop', label: 'Pop', icon: <Palette size={14} /> },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setThemeMode(item.key)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 panel-text ${themeMode === item.key ? 'panel-surface shadow-sm' : ''} focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2`}
                style={themeMode === item.key ? { color: tokens.brand.primary } : undefined}
                aria-pressed={themeMode === item.key}
                aria-label={`Set theme mode to ${item.label}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    )}
  </StageSection>
);

export default BuildStage;
