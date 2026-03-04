import React from 'react';

export default function CollapsedQuickBar({
  headerOpen,
  quickBarBottom,
  pickerColor,
  handleBaseColorChange,
  baseInput,
  baseError,
  tokens,
  mode,
  setMode,
  themeMode,
  setThemeMode,
}) {
  if (headerOpen) return null;

  return (
    <div
      className="fixed left-3 z-30"
      style={{ width: 'calc(100% - 24px)', maxWidth: '420px', bottom: quickBarBottom }}
    >
      <div className="rounded-2xl border panel-surface-soft backdrop-blur p-3 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 panel-surface-strong p-1.5 rounded-lg border flex-1">
            <input
              type="color"
              value={pickerColor}
              onChange={(event) => handleBaseColorChange(event.target.value)}
              className="w-9 h-9 rounded cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
              aria-label="Choose base color"
            />
            <input
              type="text"
              value={baseInput}
              onChange={(event) => handleBaseColorChange(event.target.value)}
              className="w-full bg-transparent text-sm font-mono panel-text outline-none uppercase border-b border-transparent"
              style={{ borderColor: baseError ? tokens.status.error : 'transparent' }}
              aria-label="Base color hex value"
              aria-invalid={Boolean(baseError)}
            />
          </div>
        </div>
        {baseError && <p className="text-xs font-semibold" style={{ color: tokens.status.error }} role="alert">{baseError}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="flex-1 px-3 py-2 rounded-lg panel-surface-strong text-sm border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
            aria-label="Select style mode"
          >
            {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <div className="flex panel-surface-strong p-1 rounded-lg border" role="group" aria-label="Theme mode">
            {[
              { key: 'light', label: 'L' },
              { key: 'dark', label: 'D' },
              { key: 'pop', label: 'P' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setThemeMode(item.key)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  themeMode === item.key ? 'panel-surface shadow-sm' : ''
                } panel-text focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2`}
                style={themeMode === item.key ? { color: tokens.brand.primary } : undefined}
                aria-pressed={themeMode === item.key}
                aria-label={`Set theme mode to ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
