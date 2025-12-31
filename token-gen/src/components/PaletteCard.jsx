import React from 'react';
import { useProject } from '../context/ProjectContext';
import { normalizeHex } from '../lib/colorUtils';

const MODE_OPTIONS = [
  { value: 'mono', label: 'Monochromatic' },
  { value: 'analogous', label: 'Analogous' },
  { value: 'complementary', label: 'Complementary' },
  { value: 'tertiary', label: 'Tertiary' },
  { value: 'apocalypse', label: 'Apocalypse' },
];

const KIND_OPTIONS = [
  { value: 'season', label: 'Season' },
  { value: 'people', label: 'People' },
  { value: 'state', label: 'State' },
];

export default function PaletteCard({ section, onCapture }) {
  const { updateSection, removeSection } = useProject();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    updateSection(section.id, {
      ...section,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const swatchCount = section.colors?.length || 0;
  const tokenCount = section.tokens ? Object.keys(section.tokens).length : 0;

  return (
    <div className="panel-surface p-4 border rounded flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <input
          type="text"
          name="label"
          value={section.label}
          onChange={handleChange}
          className="font-bold bg-transparent text-lg panel-text"
        />
        {/* TERTIARY: Destructive action is quiet unless hovered. */}
        <button
          onClick={() => removeSection(section.id)}
          className="px-2 py-1 text-xs rounded panel-muted hover:opacity-80"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs panel-muted">Kind</span>
          <select
            name="kind"
            value={section.kind}
            onChange={handleChange}
            className="bg-transparent border-b panel-outline rounded-none px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] panel-text"
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs panel-muted">Mode</span>
          <select
            name="mode"
            value={section.mode}
            onChange={handleChange}
            className="bg-transparent border-b panel-outline rounded-none px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] panel-text"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs panel-muted">Base Hex</span>
          <input
            type="text"
            name="baseHex"
            value={section.baseHex}
            onChange={handleChange}
            className="bg-transparent border-b panel-outline rounded-none px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] panel-text"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs panel-muted">Swatch</span>
          <input
            type="color"
            value={normalizeHex(section.baseHex)}
            onChange={(e) => updateSection(section.id, { ...section, baseHex: e.target.value })}
            className="h-9 w-full rounded border-0"
            aria-label="Base color picker"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm panel-muted">
        <input
          type="checkbox"
          name="locked"
          checked={section.locked}
          onChange={handleChange}
        />
        Locked
      </label>
      <div className="flex items-center justify-between text-xs panel-muted">
        <span>{tokenCount} tokens, {swatchCount} colors</span>
        {/* SECONDARY: This is the main action for a card, but is less important than primary app actions. */}
        <button
          type="button"
          onClick={() => onCapture(section.id)}
          className="px-3 py-1 rounded panel-cta text-xs"
        >
          Update from current palette
        </button>
      </div>
    </div>
  );
}
