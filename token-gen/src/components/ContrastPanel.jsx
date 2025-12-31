import React from 'react';
import ColorSwatch from './ColorSwatch';

export default function ContrastPanel({ contrastChecks }) {
  const failing = contrastChecks.filter((check) => check.ratio < 4.5);
  return (
    <div className="print:hidden mb-10 max-w-7xl mx-auto">
      <div className="panel-surface p-6 rounded-2xl border shadow-sm backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold panel-text">Live WCAG Contrast Checks</h3>
          <div className="text-[11px] px-3 py-1 rounded-full border panel-outline panel-muted">
            Based on your current tokens
          </div>
        </div>
        {failing.length > 0 && (
          <div className="mb-4 rounded-xl border panel-surface-soft p-3 text-xs panel-text">
            <div className="font-semibold">Contrast warnings</div>
            <div className="panel-muted">
              {failing.map((check) => `${check.label} ${check.ratio.toFixed(2)}:1`).join(' • ')}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contrastChecks.map((c) => (
            <div key={c.label} className="panel-surface-soft p-4 rounded-lg border">
              <div className="text-sm font-medium panel-text">{c.label}</div>
              <div className="text-2xl font-bold my-2 panel-text">{c.ratio.toFixed(2)}:1</div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${c.badge.color}`}>{c.badge.text}</div>
              <div className="mt-2 text-[11px] font-mono panel-muted">
                {c.fg.toUpperCase()} on {c.bg.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
