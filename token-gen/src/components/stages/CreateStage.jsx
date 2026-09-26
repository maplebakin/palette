import React from 'react';
import { Eye, EyeOff, Shuffle, Flame } from 'lucide-react';
import { StageSection } from './StageLayout';

// Step 1 of the demo stepper: seed color + harmony + presets.
// Split out of BuildStage (which previously rendered Create + Refine stacked);
// fine-tune sliders and the light/dark/pop switch now live in RefineStage.
const CreateStage = ({
  headerOpen,
  setHeaderOpen,
  randomRitual,
  crankApocalypse,
  resetPalette,
  tokens,
  mode,
  setMode,
  pickerColor,
  baseInput,
  baseError,
  handleBaseColorChange,
  flushBaseColorChange,
  presets,
  applyPreset,
}) => (
  <StageSection id="create" title="Create" subtitle="Pick the base color and shape the first version of the palette.">
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
              onChange={(e) => handleBaseColorChange(e.target.value, { deferInput: true })}
              onBlur={flushBaseColorChange}
              onMouseUp={flushBaseColorChange}
              onPointerUp={flushBaseColorChange}
              onTouchEnd={flushBaseColorChange}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
              aria-label="Choose base color"
            />
            <input
              type="text"
              value={baseInput}
              onChange={(e) => handleBaseColorChange(e.target.value)}
              onBlur={flushBaseColorChange}
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

        {/* Harmony mode */}
        <div className="flex flex-col gap-3 p-3 rounded-xl border panel-surface-soft backdrop-blur-sm">
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
          <p className="text-xs panel-muted">
            Pick a harmony to spin the first version of the palette. Fine-tuning lives one step ahead, under Refine.
          </p>
        </div>
      </div>
    )}
  </StageSection>
);

export default CreateStage;
