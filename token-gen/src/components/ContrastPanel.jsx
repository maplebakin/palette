import React from 'react';
import ColorSwatch from './ColorSwatch';

export default function ContrastPanel({ contrastChecks, finalTokens }) {
  return (
    <div className="print:hidden mb-10 max-w-7xl mx-auto">
      <div className="p-6 rounded-2xl border shadow-sm bg-white/80 dark:bg-slate-900/60 backdrop-blur"
        style={{ borderColor: finalTokens.cards['card-panel-border'] }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Live WCAG Contrast Checks</h3>
          <div className="text-[11px] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            Based on your current tokens
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contrastChecks.map((c) => (
            <div key={c.label} className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.label}</div>
              <div className="text-2xl font-bold my-2 text-slate-900 dark:text-white">{c.ratio.toFixed(2)}:1</div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${c.badge.color}`}>{c.badge.text}</div>
              <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {c.fg.toUpperCase()} on {c.bg.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
