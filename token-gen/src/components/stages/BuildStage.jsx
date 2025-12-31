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
  harmonyInput,
  neutralInput,
  accentInput,
  apocalypseInput,
  popInput,
  debouncedHarmonyChange,
  debouncedNeutralChange,
  debouncedAccentChange,
  debouncedApocalypseChange,
  debouncedPopChange,
}) => (
  <StageSection id="build" title="Build" subtitle="Base color, harmony, and generation controls.">
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setHeaderOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition shrink-0 whitespace-nowrap"
        aria-expanded={headerOpen}
        aria-label={headerOpen ? 'Hide controls' : 'Show controls'}
      >
        {headerOpen ? <EyeOff size={14} /> : <Eye size={14} />}
        Controls
      </button>
    </div>

    {headerOpen && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div
          className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 panel-surface-strong p-1.5 rounded-lg border">
              <input
                type="color"
                value={pickerColor}
                onChange={(e) => handleBaseColorChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="Choose base color"
              />
              <input
                type="text"
                value={baseInput}
                onChange={(e) => handleBaseColorChange(e.target.value)}
                className={`w-28 bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 outline-none uppercase ${baseError ? 'border-b border-rose-500' : ''}`}
                aria-label="Base color hex value"
                aria-invalid={Boolean(baseError)}
              />
            </div>
            <select
              onChange={(e) => applyPreset(e.target.value)}
              className="px-3 py-2 rounded-lg panel-surface-strong text-sm border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              defaultValue=""
              aria-label="Choose a preset palette"
            >
              <option value="" disabled>Presets…</option>
              {presets.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          {baseError && <p className="text-xs text-rose-600 font-semibold" role="alert">{baseError}</p>}
        </div>

        <div
          className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm"
        >
          <div className="flex panel-surface-strong p-1 rounded-lg border flex-wrap" role="group" aria-label="Harmony mode">
            {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${mode === m ? 'panel-surface shadow-sm' : ''} focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                style={mode === m
                  ? { color: tokens.brand.primary }
                  : { color: tokens.typography['text-muted'] }}
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
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Harmony spread</span>
                  <input
                    type="range"
                    min="50"
                    max="160"
                    value={harmonyInput}
                    onChange={(e) => debouncedHarmonyChange(e.target.value)}
                    className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Adjust harmony spread"
                    aria-valuemin={50}
                    aria-valuemax={160}
                    aria-valuenow={harmonyInput}
                  />
                  <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{harmonyInput}%</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Neutral depth</span>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={neutralInput}
                    onChange={(e) => debouncedNeutralChange(e.target.value)}
                    className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Adjust neutral depth"
                    aria-valuemin={60}
                    aria-valuemax={140}
                    aria-valuenow={neutralInput}
                  />
                  <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{neutralInput}%</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg panel-surface-strong border">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Accent punch</span>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={accentInput}
                    onChange={(e) => debouncedAccentChange(e.target.value)}
                    className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Adjust accent punch"
                    aria-valuemin={60}
                    aria-valuemax={140}
                    aria-valuenow={accentInput}
                  />
                  <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{accentInput}%</span>
                </div>

                {mode === 'Apocalypse' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-800">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Apocalypse drive</span>
                    <input
                      type="range"
                      min="20"
                      max="150"
                      value={apocalypseInput}
                      onChange={(e) => debouncedApocalypseChange(e.target.value)}
                      className="w-32 accent-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500"
                      aria-label="Adjust apocalypse intensity"
                      aria-valuemin={20}
                      aria-valuemax={150}
                      aria-valuenow={apocalypseInput}
                    />
                    <span className="text-xs w-10 text-right font-mono text-rose-700 dark:text-rose-200">{apocalypseInput}%</span>
                  </div>
                )}

                {themeMode === 'pop' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fuchsia-50 dark:bg-slate-800 border border-fuchsia-200 dark:border-fuchsia-700">
                    <span className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300">Pop intensity</span>
                    <input
                      type="range"
                      min="60"
                      max="140"
                      value={popInput}
                      onChange={(e) => debouncedPopChange(e.target.value)}
                      className="w-32 accent-fuchsia-500 focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                      aria-label="Adjust pop intensity"
                      aria-valuemin={60}
                      aria-valuemax={140}
                      aria-valuenow={popInput}
                    />
                    <span className="text-xs w-10 text-right font-mono text-fuchsia-700 dark:text-fuchsia-200">{popInput}%</span>
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
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${themeMode === item.key ? 'panel-surface shadow-sm' : ''} focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                style={themeMode === item.key
                  ? { color: tokens.brand.primary }
                  : { color: tokens.typography['text-muted'] }}
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
    )}
  </StageSection>
);

export default BuildStage;
