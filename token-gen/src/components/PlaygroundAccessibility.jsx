import React from 'react';
import { colorVisionOptions } from '../lib/accessibility.js';
import { buildPlaygroundContrastChecks } from '../lib/playgroundAccessibility.js';

const VISION_OPTIONS = colorVisionOptions.filter(({ key }) => (
  ['normal', 'protanopia', 'deuteranopia', 'tritanopia'].includes(key)
));

const PlaygroundAccessibility = ({ roles, visionMode, onVisionModeChange }) => {
  const contrastChecks = buildPlaygroundContrastChecks(roles);

  return (
    <section className="playground-accessibility tasting-panel" aria-label="Accessibility checks">
      <div className="playground-section-heading">
        <div>
          <p className="tasting-eyebrow">Your live sketch's contrast</p>
          <h2 className="tasting-panel-title">Accessibility checks</h2>
        </div>
        <span className="playground-section-meta">Live with every edit</span>
      </div>

      <div className="playground-contrast-grid">
        {contrastChecks.map((check) => (
          <article key={check.id} className="playground-contrast-card">
            <div className="flex items-start justify-between gap-3">
              <h3>{check.label}</h3>
              <span className={`playground-contrast-badge ${check.badge.text === 'AAA' ? 'is-aaa' : check.badge.text.startsWith('AA') ? 'is-aa' : 'is-fail'}`} title={check.badge.hint}>
                {check.badge.label}
              </span>
            </div>
            <strong>{check.ratio.toFixed(2)}:1</strong>
            <p>{check.foreground.toUpperCase()} on {check.background.toUpperCase()}</p>
          </article>
        ))}
      </div>

      <div className="playground-vision-block">
        <div>
          <h3 className="playground-vision-title">Vision deficiency simulator</h3>
          <p className="playground-vision-copy">Re-render the live preview through common color-vision profiles.</p>
        </div>
        <div className="playground-vision-controls" role="group" aria-label="Vision deficiency simulator">
          {VISION_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onVisionModeChange(option.key)}
              aria-pressed={visionMode === option.key}
              className={visionMode === option.key ? 'is-active' : ''}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="playground-accessibility-caption">Full contrast matrices ship with every kit.</p>
    </section>
  );
};

export default PlaygroundAccessibility;
