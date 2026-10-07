import React from 'react';
import { buildPlaygroundContrastChecks } from '../lib/playgroundAccessibility.js';

const PlaygroundAccessibility = ({ roles }) => {
  const contrastChecks = buildPlaygroundContrastChecks(roles);

  return (
    <section className="playground-accessibility tasting-panel" aria-labelledby="playground-accessibility-title">
      <div className="playground-section-heading">
        <div>
          <p className="tasting-eyebrow">Measured against WCAG contrast ratios</p>
          <h2 id="playground-accessibility-title" className="tasting-panel-title">Is it readable?</h2>
        </div>
        <span className="playground-section-meta">Updates with every edit</span>
      </div>

      <div className="playground-contrast-grid">
        {contrastChecks.map((check) => (
          <article key={check.id} className={`playground-contrast-card ${check.passes ? 'is-pass' : 'is-fail'}`}>
            <div className="flex items-start justify-between gap-3">
              <h3>{check.label}</h3>
              <span className={`playground-contrast-badge ${check.passes ? 'is-pass' : 'is-fail'}`}>
                {check.passes ? 'Pass' : 'Fail'}
              </span>
            </div>
            <strong>{check.ratio.toFixed(2)}:1</strong>
            <p>{check.foreground.toUpperCase()} on {check.background.toUpperCase()}</p>
            <small>{check.minimumRatio}:1 minimum</small>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PlaygroundAccessibility;
