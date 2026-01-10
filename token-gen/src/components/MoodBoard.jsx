import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Wand2 } from 'lucide-react';
import { StageSection } from './stages/StageLayout';
import { createMoodCluster, regenerateMoodCluster, getMoodClusterTypes } from '../lib/theme/moodBoard';
import { hexWithAlpha, pickReadableText, normalizeHex } from '../lib/colorUtils';

const sanitizeHexInput = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  const hex = match[1];
  return normalizeHex(`#${hex}`, fallback || '#6366f1');
};

const MoodBoard = ({
  tokens,
  baseColor,
  onApplyPaletteSpec,
  onSaveDraft,
  canSaveDraft = false,
  copyHexValue,
}) => {
  const [clusters, setClusters] = useState([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [requiredHex, setRequiredHex] = useState(() => normalizeHex(baseColor || '#6366f1', '#6366f1'));
  const [requiredDirty, setRequiredDirty] = useState(false);

  useEffect(() => {
    if (!requiredDirty) {
      setRequiredHex(normalizeHex(baseColor || '#6366f1', '#6366f1'));
    }
  }, [baseColor, requiredDirty]);

  useEffect(() => {
    if (!requiredHex || clusters.length === 0) return;
    setClusters((prev) => prev.map((cluster) => {
      const duplicateIds = cluster.slots
        .filter((slot) => slot.role !== 'required' && !slot.locked && String(slot.color || '').toLowerCase() === requiredHex.toLowerCase())
        .map((slot) => slot.id);
      return regenerateMoodCluster(cluster, {
        baseHex: baseColor,
        requiredHex,
        seed: cluster.seed,
        slotsToRegenerate: duplicateIds.length ? duplicateIds : undefined,
      });
    }));
  }, [requiredHex, baseColor, clusters.length]);

  const handleRequiredChange = (value) => {
    const next = sanitizeHexInput(value, null);
    if (!next) return;
    setRequiredDirty(true);
    setRequiredHex(next);
  };

  const handleRegenerate = () => {
    const seed = Math.floor(Math.random() * 1e9);
    const types = getMoodClusterTypes({ includeCool: true });
    setClusters((prev) => {
      const byType = new Map(prev.map((cluster) => [cluster.type, cluster]));
      return types.map((type, index) => {
        const nextSeed = seed + index * 9973;
        const existing = byType.get(type);
        if (!existing) {
          return createMoodCluster(baseColor, requiredHex, type, { seed: nextSeed });
        }
        return regenerateMoodCluster(existing, {
          baseHex: baseColor,
          requiredHex,
          seed: nextSeed,
        });
      }).filter(Boolean);
    });
    setGeneratedAt(new Date().toLocaleTimeString());
  };

  const toggleSlotLock = (clusterId, slotId) => {
    setClusters((prev) => prev.map((cluster) => {
      if (cluster.id !== clusterId) return cluster;
      return {
        ...cluster,
        slots: cluster.slots.map((slot) => (
          slot.id === slotId ? { ...slot, locked: !slot.locked } : slot
        )),
      };
    }));
  };

  const setClusterLock = (clusterId, nextLocked) => {
    setClusters((prev) => prev.map((cluster) => {
      if (cluster.id !== clusterId) return cluster;
      return {
        ...cluster,
        slots: cluster.slots.map((slot) => ({
          ...slot,
          locked: nextLocked,
        })),
      };
    }));
  };

  return (
    <StageSection
      id="mood-board"
      title="Mood Board"
      subtitle="Planning-only cluster explorations. Apply to update the editor."
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRegenerate}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold shadow-md hover:-translate-y-[1px] active:scale-95 transition border panel-surface-strong"
          style={{
            backgroundColor: tokens.brand.primary,
            color: pickReadableText(tokens.brand.primary),
            borderColor: hexWithAlpha(tokens.brand.primary, 0.4),
          }}
        >
          <Wand2 size={14} />
          Regenerate Unlocked
        </button>
        <label className="flex items-center gap-2 text-xs font-semibold panel-muted">
          Required hex
          <input
            type="text"
            value={requiredHex}
            onChange={(e) => handleRequiredChange(e.target.value)}
            className="px-2 py-1 rounded-md panel-surface-strong text-xs border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
            aria-label="Required hex color"
            maxLength={7}
          />
        </label>
        {generatedAt && (
          <span className="text-xs panel-muted">Last generated at {generatedAt}</span>
        )}
      </div>

      {clusters.length === 0 ? (
        <div className="panel-surface-strong border rounded-xl p-4 text-sm panel-muted">
          No mood board yet. Generate to explore color families.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clusters.map((cluster) => {
            const clusterLocked = cluster.slots.every((slot) => slot.locked);
            return (
              <div key={cluster.id} className="panel-surface-strong border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] font-semibold panel-muted">{cluster.title}</p>
                    <p className="text-sm">{cluster.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClusterLock(cluster.id, !clusterLocked)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border panel-surface-strong hover:opacity-90 transition"
                    aria-pressed={clusterLocked}
                  >
                    {clusterLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    {clusterLocked ? 'Unlock Mood Palette' : 'Lock Mood Palette'}
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {cluster.slots.map((slot) => (
                    <div key={slot.id} className="relative">
                      <button
                        type="button"
                        onClick={() => copyHexValue(slot.color, slot.color)}
                        className="h-8 rounded-md border shadow-inner block w-full hover:scale-[1.02] active:scale-95 transition"
                        style={{
                          backgroundColor: slot.color,
                          borderColor: hexWithAlpha('#000', 0.15),
                          boxShadow: slot.locked
                            ? `0 0 0 2px ${hexWithAlpha(tokens.brand.primary, 0.45)}`
                            : undefined,
                        }}
                        title={slot.color}
                        aria-label={`Copy ${slot.color}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleSlotLock(cluster.id, slot.id)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] border panel-surface-strong hover:opacity-90"
                        aria-pressed={slot.locked}
                        aria-label={slot.locked ? 'Unlock swatch' : 'Lock swatch'}
                      >
                        {slot.locked ? <Lock size={10} /> : <Unlock size={10} />}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyPaletteSpec?.(cluster.paletteSpec)}
                    className="px-3 py-2 rounded-full text-[11px] font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                    style={{
                      backgroundColor: tokens.brand.cta,
                      color: pickReadableText(tokens.brand.cta),
                      borderColor: hexWithAlpha(tokens.brand.cta, 0.4),
                    }}
                  >
                    Apply to Editor
                  </button>
                  {canSaveDraft && (
                    <button
                      type="button"
                      onClick={() => onSaveDraft?.(cluster)}
                      className="px-3 py-2 rounded-full text-[11px] font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                    >
                      Save as Draft
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StageSection>
  );
};

export default MoodBoard;
