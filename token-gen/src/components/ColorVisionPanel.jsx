import React, { useMemo, useState } from 'react';
import { colorVisionOptions, simulateColorVision } from '../lib/accessibility';
import { hexWithAlpha } from '../lib/colorUtils';

export default function ColorVisionPanel({ swatches = [] }) {
  const [mode, setMode] = useState('normal');
  const previewSwatches = useMemo(
    () => swatches.filter((swatch) => Boolean(swatch?.color)).slice(0, 12),
    [swatches]
  );
  const simulated = useMemo(
    () => previewSwatches.map((swatch) => ({
      ...swatch,
      simulated: simulateColorVision(swatch.color, mode),
    })),
    [previewSwatches, mode]
  );

  return (
    <div className="panel-surface p-6 rounded-2xl border shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold panel-text">Color Vision Simulator</h3>
          <p className="text-xs panel-muted">Preview key colors under common color-vision profiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {colorVisionOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                mode === option.key ? 'panel-surface-strong shadow-sm' : 'panel-surface-soft'
              }`}
              aria-pressed={mode === option.key}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {simulated.length === 0 ? (
        <p className="text-xs panel-muted">No swatches available for simulation.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {simulated.map((swatch) => {
            const label = swatch.key || swatch.name || swatch.color;
            return (
              <div key={label} className="panel-surface-soft p-3 rounded-lg border">
                <div className="text-[11px] font-semibold panel-muted">{label}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase panel-muted">Original</span>
                  <div
                    className="h-10 rounded-md border"
                    style={{
                      backgroundColor: swatch.color,
                      borderColor: hexWithAlpha(swatch.color, 0.2),
                    }}
                  />
                  <span className="text-[10px] font-mono panel-muted">{swatch.color.toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase panel-muted">Simulated</span>
                  <div
                    className="h-10 rounded-md border"
                    style={{
                      backgroundColor: swatch.simulated,
                      borderColor: hexWithAlpha(swatch.simulated, 0.2),
                    }}
                  />
                  <span className="text-[10px] font-mono panel-muted">{swatch.simulated.toUpperCase()}</span>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
