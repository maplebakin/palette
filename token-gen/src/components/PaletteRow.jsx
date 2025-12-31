import React from 'react';

const PaletteRow = ({ title, colors }) => (
  <div className="p-4 rounded-lg border shadow-sm panel-surface-soft backdrop-blur-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold uppercase tracking-wider panel-text">{title}</span>
      <span className="text-[10px] font-semibold panel-muted">{colors.length} swatches</span>
    </div>
    <div className="flex gap-1 mb-3">
      {colors.map(({ name, color }, index) => (
        <div
          key={`${name}-${index}`}
          className="flex-1 h-8 rounded-sm border shadow-inner"
          style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.08)' }}
          title={`${name}: ${color}`}
        />
      ))}
    </div>
    <div className="flex flex-wrap gap-2">
      {colors.map(({ name, color }, index) => (
        <span
          key={`${name}-${index}`}
          className="text-[11px] px-2 py-1 rounded-full border"
          style={{ borderColor: color, color }}
        >
          {name}
        </span>
      ))}
    </div>
  </div>
);

export default PaletteRow;
