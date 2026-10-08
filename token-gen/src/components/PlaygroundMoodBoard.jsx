import React from 'react';
import {
  getContextualMoodSuggestions,
  SEMANTIC_PALETTE_ROLES,
} from '../lib/playgroundPalette.js';

const PlaygroundMoodBoard = ({
  roles,
  swatches,
  sourceSwatches = swatches,
  harmony,
  themeMode,
  seedColor,
  selectedRole,
  onRoleSelect,
  onApplySuggestion,
}) => {
  const primary = swatches.find(({ id }) => id === 'accent')?.color || swatches[0]?.color || roles.accent;
  const secondary = swatches.find(({ id }) => id === 'cta')?.color || swatches[1]?.color || roles.secondaryAction;
  const tertiary = swatches.find(({ id }) => id === 'surface')?.color || swatches[2]?.color || roles.surface;
  const headingColor = swatches.find(({ id }) => id === 'heading')?.color || roles.heading || roles.text;
  const activeRoleId = selectedRole || 'accent';
  const activeRole = SEMANTIC_PALETTE_ROLES.find(({ id }) => id === activeRoleId) || SEMANTIC_PALETTE_ROLES[5];
  const resolvedSeedColor = seedColor || sourceSwatches.find(({ id }) => id === 'accent')?.color || roles.accent;
  const activeRoleColor = sourceSwatches.find(({ id }) => id === activeRole.id)?.color || resolvedSeedColor;
  const suggestions = getContextualMoodSuggestions({
    seedColor: resolvedSeedColor,
    roleColor: activeRoleColor,
    harmony,
    roleId: activeRole.id,
    backgroundColor: sourceSwatches.find(({ id }) => id === 'background')?.color || roles.background,
  });

  return (
    <section className="playground-scene playground-mood-scene" aria-label="Mood board sketch preview">
      <div className="playground-mood-heading">
        <div>
          <p className="playground-kicker">Live sketch</p>
          <h2 className="playground-mood-title">Mood board</h2>
        </div>
        <span>{harmony} · {themeMode}</span>
      </div>

      <div className="playground-mood-grid">
        <article
          className="playground-mood-feature"
          style={{ backgroundColor: roles.surface, color: roles.text }}
        >
          <div
            className="playground-mood-color-field"
            aria-hidden="true"
            style={{ background: `linear-gradient(145deg, ${primary}, ${secondary}, ${tertiary})` }}
          >
            <span style={{ backgroundColor: tertiary }} />
            <span style={{ backgroundColor: primary }} />
            <span style={{ backgroundColor: secondary }} />
          </div>
          <div className="playground-mood-feature-copy">
            <span>Color field</span>
            <strong>Surface and accent</strong>
          </div>
        </article>

        <div className="playground-mood-palette">
          <p className="playground-kicker">Palette</p>
          {swatches.map(({ id, name, color, locked }) => (
            <div className="playground-mood-swatch" key={id || name}>
              <span className="playground-mood-swatch-chip" style={{ backgroundColor: color }} aria-hidden="true" />
              <span className="playground-mood-swatch-label">
                <strong>{name}</strong>
                <small>{locked ? 'Locked' : 'Unlocked'}</small>
              </span>
              <code>{color.toUpperCase()}</code>
            </div>
          ))}
        </div>

        <section className="playground-mood-suggestions" aria-label="Contextual color suggestions">
          <div className="playground-mood-suggestions-heading">
            <div>
              <p className="playground-kicker">Harmony suggestions</p>
              <h3>Try a color for {activeRole.name}</h3>
            </div>
            <label>
              <span>Suggest for</span>
              <select
                aria-label="Mood suggestions role"
                value={activeRole.id}
                onChange={(event) => onRoleSelect?.(event.target.value)}
              >
                {SEMANTIC_PALETTE_ROLES.map(({ id, name }) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="playground-mood-suggestions-copy">
            Candidate colors follow the current seed and {harmony.toLowerCase()} harmony. Select a role in the creator to tune a different part of the system.
          </p>
          <div className="playground-mood-candidate-grid">
            {suggestions.map(({ id, label, color }) => (
              <button
                key={id}
                type="button"
                className="playground-mood-candidate"
                onClick={() => onApplySuggestion?.(activeRole.id, color)}
                aria-label={`Apply ${label} ${color.toUpperCase()} to ${activeRole.name}`}
              >
                <span style={{ backgroundColor: color }} aria-hidden="true" />
                <strong>{label}</strong>
                <code>{color.toUpperCase()}</code>
              </button>
            ))}
          </div>
        </section>

        <article
          className="playground-mood-type-study"
          style={{ backgroundColor: roles.background, color: roles.text, borderColor: roles.border }}
        >
          <p className="playground-kicker">Type study</p>
          <strong style={{ color: headingColor }}>Aa</strong>
          <span>Heading · Body text</span>
        </article>

        <article
          className="playground-mood-surface-study"
          style={{ backgroundColor: roles.surface, color: roles.text, borderColor: roles.border }}
        >
          <p className="playground-kicker">Surface study</p>
          <div className="playground-mood-surface-samples">
            <span style={{ backgroundColor: roles.background, borderColor: roles.border }} />
            <span style={{ backgroundColor: tertiary, borderColor: roles.border }} />
            <span style={{ backgroundColor: primary, borderColor: roles.border }} />
          </div>
          <span>Background · Surface · Accent</span>
        </article>
      </div>
    </section>
  );
};

export default PlaygroundMoodBoard;
