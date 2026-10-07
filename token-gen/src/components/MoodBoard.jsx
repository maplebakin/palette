import React, { useEffect, useState, useContext } from 'react';
import { Lock, Unlock, Wand2, Save, Palette, Trash2 } from 'lucide-react';
import { StageSection } from './stages/StageLayout';
import { createMoodCluster, regenerateMoodCluster, getMoodClusterTypes } from '../lib/theme/moodBoard';
import { hexWithAlpha, pickReadableText, normalizeHex } from '../lib/colorUtils';
import { useMoodBoard } from '../context/MoodBoardContext';
import { ProjectContext } from '../context/ProjectContext';

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
  currentSwatches = [],
  onApplyPaletteSpec,
  onSaveDraft,
  onExportSingleMoodBoard,
  onExportAllMoodBoards,
  copyHexValue,
  canSaveDraft = false,
}) => {
  const { savedMoodBoards, saveMoodBoard, deleteMoodBoard } = useMoodBoard();
  const projectContext = useContext(ProjectContext);
  const [clusters, setClusters] = useState([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [requiredHex, setRequiredHex] = useState(() => normalizeHex(baseColor || '#6366f1', '#6366f1'));
  const [requiredDirty, setRequiredDirty] = useState(false);
  const [showSavedMoodBoards, setShowSavedMoodBoards] = useState(false);

  useEffect(() => {
    if (!requiredDirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRequiredHex(normalizeHex(baseColor || '#6366f1', '#6366f1'));
    }
  }, [baseColor, requiredDirty]);

  useEffect(() => {
    if (!requiredHex || clusters.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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



  const handleGenerateThemeFromColor = (hexColor) => {
    // Apply the selected color as the base color to the main palette creator
    // This will be handled by calling the appropriate callback
    const paletteSpec = {
      baseColor: hexColor,
      mode: 'Monochromatic', // Default mode
      themeMode: 'dark', // Default theme mode
      isDark: true,
      printMode: false,
      customThemeName: `Theme from ${hexColor}`,
      harmonyIntensity: 100,
      apocalypseIntensity: 100,
      neutralCurve: 100,
      accentStrength: 100,
      popIntensity: 100,
      tokenPrefix: '',
      importedOverrides: null,
    };

    onApplyPaletteSpec?.(paletteSpec);
  };

  return (
    <StageSection
      id="mood-board"
      title="Mood Board"
      eyebrow="Advanced tools"
      subtitle="Explore colour families that might belong with this palette."
      className="forge-mood-board"
      collapsible
      defaultOpen={false}
    >
      <div className="forge-mood-board-content">
        <section className="forge-mood-board-current" aria-labelledby="mood-board-current-title">
          <div className="forge-mood-board-current-heading">
            <div>
              <p id="mood-board-current-title" className="forge-mood-board-kicker">Current palette</p>
              <p className="forge-mood-board-seed">Seed <code>{normalizeHex(baseColor || '#6366f1')}</code></p>
            </div>
            <span className="forge-mood-board-context-note">The colours you’re expanding from</span>
          </div>
          <div className="forge-mood-board-current-swatches" role="list" aria-label="Current palette colours">
            {currentSwatches
              .filter((swatch) => typeof swatch?.color === 'string' && swatch.color.trim())
              .slice(0, 7)
              .map((swatch, index) => (
                <div className="forge-mood-board-current-swatch" role="listitem" key={`${swatch.name}-${index}`}>
                  <span className="forge-mood-board-current-chip" style={{ backgroundColor: swatch.color }} aria-hidden="true" />
                  <span className="forge-mood-board-current-meta">
                    <span>{swatch.name}</span>
                    <code>{swatch.color.toUpperCase()}</code>
                  </span>
                </div>
              ))}
          </div>
        </section>

        <div className="forge-mood-board-tools">
          <div className="forge-mood-board-actions">
            <button
              type="button"
              onClick={handleRegenerate}
              className="forge-mood-board-button forge-mood-board-button-secondary"
              aria-label="Regenerate unlocked colour suggestions"
            >
              <Wand2 size={14} />
              Regenerate suggestions
            </button>

            <button
              type="button"
              onClick={() => setShowSavedMoodBoards(!showSavedMoodBoards)}
              className="forge-mood-board-button forge-mood-board-button-secondary"
              aria-expanded={showSavedMoodBoards}
            >
              <Palette size={14} />
              {showSavedMoodBoards ? 'Hide saved' : 'View saved'} ({savedMoodBoards.length})
            </button>
          </div>
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
            <span className="text-xs panel-muted">Suggestions refreshed at {generatedAt}</span>
          )}
        </div>

        <section className="forge-mood-board-suggestions" aria-labelledby="mood-board-suggestions-title">
          <div className="forge-mood-board-section-heading">
            <div>
              <p id="mood-board-suggestions-title" className="forge-mood-board-kicker">Suggested colours</p>
              <p className="forge-mood-board-instruction">Use a swatch as a new palette seed, or apply a full colour family to the editor.</p>
            </div>
            <span className="forge-mood-board-note">Unlock only the samples you want to refresh</span>
          </div>

      {/* Display saved mood boards if requested */}
      {showSavedMoodBoards && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold panel-text mb-4">Saved Mood Boards</h3>
          {savedMoodBoards.length === 0 ? (
            <div className="panel-surface-strong border rounded-xl p-4 text-sm panel-muted">
              No saved mood boards yet. Save some to see them here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedMoodBoards.map((moodBoard) => (
                <div key={moodBoard.id} className="panel-surface-strong border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold panel-text">{moodBoard.title}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Delete "${moodBoard.title}"? This removes the saved mood board from this browser.`)) return;
                        deleteMoodBoard(moodBoard.id);
                      }}
                      className="text-xs p-1 rounded-full hover:bg-red-500/20 hover:text-red-500"
                      aria-label="Delete mood board"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs panel-muted">
                    Created: {new Date(moodBoard.createdAt).toLocaleDateString()}
                  </p>

                  {/* Display color swatches from the mood board */}
                  <div className="mt-3">
                    <p className="text-xs font-semibold panel-muted mb-2">Colors:</p>
                    <div className="flex flex-wrap gap-1">
                      {moodBoard.clusters && moodBoard.clusters.flatMap(cluster =>
                        cluster.slots ? cluster.slots.map(slot => slot.color) : []
                      ).filter(Boolean).slice(0, 12).map((color, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleGenerateThemeFromColor(color)}
                          className="w-8 h-8 rounded border shadow-sm transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
                          style={{
                            backgroundColor: color,
                            borderColor: hexWithAlpha('#000', 0.2),
                          }}
                          title={`Use ${color} as the new palette seed`}
                          aria-label={`Use ${color} as the new palette seed; replaces the current palette`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Apply the first cluster's palette spec as an example
                        if (moodBoard.clusters && moodBoard.clusters[0]?.paletteSpec) {
                          onApplyPaletteSpec?.(moodBoard.clusters[0].paletteSpec);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                      style={{
                        backgroundColor: tokens.brand.cta,
                        color: pickReadableText(tokens.brand.cta),
                        borderColor: hexWithAlpha(tokens.brand.cta, 0.4),
                      }}
                    >
                      Apply first colour family to editor
                    </button>

                    {onExportSingleMoodBoard && (
                      <button
                        type="button"
                        onClick={() => onExportSingleMoodBoard(moodBoard)}
                        className="w-full px-3 py-1.5 rounded text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                        style={{
                          backgroundColor: tokens.brand.accent,
                          color: pickReadableText(tokens.brand.accent),
                          borderColor: hexWithAlpha(tokens.brand.accent, 0.4),
                        }}
                      >
                        Export Mood Board
                      </button>
                    )}

                    {onExportAllMoodBoards && projectContext && projectContext.moodBoards && projectContext.moodBoards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onExportAllMoodBoards()}
                        className="w-full px-3 py-1.5 rounded text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                        style={{
                          backgroundColor: tokens.brand.primary,
                          color: pickReadableText(tokens.brand.primary),
                          borderColor: hexWithAlpha(tokens.brand.primary, 0.4),
                        }}
                      >
                        Export All Project Mood Boards
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Display project mood boards if available */}
          {projectContext && projectContext.moodBoards && projectContext.moodBoards.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold panel-text mb-4">Project Mood Boards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectContext.moodBoards.map((moodBoard) => (
                  <div key={moodBoard.id} className="panel-surface-strong border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold panel-text">{moodBoard.title}</h4>
                      <button
                        type="button"
                        onClick={() => projectContext.removeMoodBoard(moodBoard.id)}
                        className="text-xs p-1 rounded-full hover:bg-red-500/20 hover:text-red-500"
                        aria-label="Remove mood board from project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs panel-muted">
                      Created: {new Date(moodBoard.createdAt).toLocaleDateString()}
                    </p>

                    {/* Display color swatches from the mood board */}
                    <div className="mt-3">
                      <p className="text-xs font-semibold panel-muted mb-2">Colors:</p>
                      <div className="flex flex-wrap gap-1">
                        {moodBoard.clusters && moodBoard.clusters.flatMap(cluster =>
                          cluster.slots ? cluster.slots.map(slot => slot.color) : []
                        ).filter(Boolean).slice(0, 12).map((color, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleGenerateThemeFromColor(color)}
                            className="w-6 h-6 rounded border shadow-sm hover:scale-110 transition-transform"
                            style={{
                              backgroundColor: color,
                              borderColor: hexWithAlpha('#000', 0.2),
                            }}
                            title={`Use ${color} as the new palette seed`}
                            aria-label={`Use ${color} as the new palette seed; replaces the current palette`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // Apply the first cluster's palette spec as an example
                        if (moodBoard.clusters && moodBoard.clusters[0]?.paletteSpec) {
                          onApplyPaletteSpec?.(moodBoard.clusters[0].paletteSpec);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                      style={{
                        backgroundColor: tokens.brand.cta,
                        color: pickReadableText(tokens.brand.cta),
                        borderColor: hexWithAlpha(tokens.brand.cta, 0.4),
                      }}
                    >
                      Apply first colour family to editor
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {clusters.length === 0 ? (
        <div className="panel-surface-strong border rounded-xl p-4 text-sm panel-muted">
          No mood board yet. Generate to explore color families.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {clusters.map((cluster) => {
            const clusterLocked = cluster.slots.every((slot) => slot.locked);
            return (
              <article
                key={cluster.id}
                className="forge-mood-board-cluster panel-surface-strong border rounded-xl p-4 space-y-3"
                role="group"
                aria-labelledby={`mood-cluster-${cluster.id}-title`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p id={`mood-cluster-${cluster.id}-title`} className="text-xs uppercase tracking-[0.2em] font-semibold panel-muted">{cluster.title}</p>
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
                <div className="forge-mood-board-colours">
                  {cluster.slots.map((slot) => (
                    <div key={slot.id} className="forge-mood-board-colour">
                      <button
                        type="button"
                        onClick={() => handleGenerateThemeFromColor(slot.color)}
                        className="forge-mood-board-swatch"
                        style={{
                          backgroundColor: slot.color,
                          borderColor: hexWithAlpha(tokens.brand.primary, 0.34),
                          boxShadow: slot.locked
                            ? `inset 0 0 0 2px ${hexWithAlpha(tokens.brand.primary, 0.72)}`
                            : undefined,
                        }}
                        title={`Use ${slot.color} as the new palette seed`}
                        aria-label={`Use ${slot.color} as the new palette seed; replaces the current palette`}
                      />
                      <div className="forge-mood-board-swatch-meta">
                        <span>{slot.family.replaceAll('-', ' ')}</span>
                        <button
                          type="button"
                          onClick={() => copyHexValue?.(slot.color, `${cluster.title} ${slot.family} colour`)}
                          aria-label={`Copy ${slot.color.toUpperCase()} from ${cluster.title} ${slot.family} suggestion`}
                          title="Copy colour value"
                        >
                          <code>{slot.color.toUpperCase()}</code>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSlotLock(cluster.id, slot.id)}
                        className="forge-mood-board-lock"
                        aria-pressed={slot.locked}
                        aria-label={`${slot.locked ? 'Unlock' : 'Lock'} ${cluster.title} ${slot.family} suggestion`}
                      >
                        {slot.locked ? <Lock size={13} /> : <Unlock size={13} />}
                        {slot.locked ? 'Locked' : 'Lock sample'}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyPaletteSpec?.(cluster.paletteSpec)}
                    className="forge-mood-board-button forge-mood-board-button-primary"
                    style={{
                      backgroundColor: tokens.brand.cta,
                      color: pickReadableText(tokens.brand.cta),
                      borderColor: hexWithAlpha(tokens.brand.cta, 0.4),
                    }}
                  >
                    Apply colour family to editor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const moodBoardData = {
                        title: `${cluster.title} Palette - ${new Date().toLocaleDateString()}`,
                        clusters: [cluster],
                        baseColor,
                        requiredHex,
                        generatedAt: new Date().toISOString()
                      };
                      saveMoodBoard(moodBoardData);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                    style={{
                      backgroundColor: tokens.brand.accent,
                      color: pickReadableText(tokens.brand.accent),
                      borderColor: hexWithAlpha(tokens.brand.accent, 0.4),
                    }}
                  >
                    <Save size={12} />
                    Save {cluster.title}
                  </button>

                  {projectContext && (
                    <button
                      type="button"
                      onClick={() => {
                        const moodBoardData = {
                          title: `${cluster.title} Palette - ${new Date().toLocaleDateString()}`,
                          clusters: [cluster],
                          baseColor,
                          requiredHex,
                          generatedAt: new Date().toISOString(),
                          projectId: projectContext.projectName // Reference to the project
                        };
                        projectContext.addMoodBoard(moodBoardData);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
                      style={{
                        backgroundColor: tokens.brand.primary,
                        color: pickReadableText(tokens.brand.primary),
                        borderColor: hexWithAlpha(tokens.brand.primary, 0.4),
                      }}
                    >
                      <Save size={12} />
                      Save to Project
                    </button>
                  )}
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
              </article>
            );
          })}
        </div>
      )}
        </section>
      </div>
    </StageSection>
  );
};

export default MoodBoard;
