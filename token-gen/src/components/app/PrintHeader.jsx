import React from 'react';

export default function PrintHeader({
  tokens,
  displayThemeName,
  baseColor,
  mode,
  printMeta,
}) {
  return (
    <div
      className="hidden print:flex items-start justify-between gap-6 max-w-7xl mx-auto px-6 py-4 mb-4 rounded-xl border print-header"
      style={{
        backgroundColor: tokens.cards['card-panel-surface'],
        color: tokens.typography['text-strong'],
        borderColor: tokens.cards['card-panel-border'],
      }}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Theme</p>
        <p className="text-lg font-bold leading-tight">{displayThemeName}</p>
        <p className="text-xs panel-muted opacity-80">Base color: {baseColor.toUpperCase()}</p>
      </div>
      <div className="space-y-1 text-right">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Mode</p>
        <p className="text-sm font-bold">{mode}</p>
        <p className="text-xs panel-muted opacity-80">{printMeta.dateTime}</p>
      </div>
    </div>
  );
}
