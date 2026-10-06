import React from 'react';

const PlaygroundMoodBoard = ({ roles, swatches, harmony, themeMode }) => {
  const primary = swatches[0]?.color || roles.accent;
  const secondary = swatches[1]?.color || roles.secondaryAction;
  const tertiary = swatches[2]?.color || roles.surface;

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
          {swatches.slice(0, 6).map(({ name, color, locked }, index) => (
            <div className="playground-mood-swatch" key={`${name}-${index}`}>
              <span className="playground-mood-swatch-chip" style={{ backgroundColor: color }} aria-hidden="true" />
              <span className="playground-mood-swatch-label">
                <strong>{name}</strong>
                <small>{locked ? 'Locked' : 'Unlocked'}</small>
              </span>
              <code>{color.toUpperCase()}</code>
            </div>
          ))}
        </div>

        <article
          className="playground-mood-type-study"
          style={{ backgroundColor: roles.background, color: roles.text, borderColor: roles.border }}
        >
          <p className="playground-kicker">Type study</p>
          <strong style={{ color: roles.accent }}>Aa</strong>
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
