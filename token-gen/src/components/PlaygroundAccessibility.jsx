import React from 'react';
import { buildPlaygroundContrastChecks } from '../lib/playgroundAccessibility.js';

const PlaygroundAccessibility = ({ roles }) => {
  const contrastChecks = buildPlaygroundContrastChecks(roles);
  const passingCount = contrastChecks.filter((check) => check.passes).length;
  const failingCount = contrastChecks.length - passingCount;

  return (
    <section className="playground-accessibility tasting-panel" aria-labelledby="playground-accessibility-title">
      <div className="playground-section-heading">
        <div>
          <p className="tasting-eyebrow">Readability report</p>
          <h2 id="playground-accessibility-title" className="tasting-panel-title">How readable is this palette?</h2>
        </div>
        <span className="playground-section-meta">{contrastChecks.length} pairings · WCAG contrast</span>
      </div>

      <div
        className="playground-contrast-summary"
        role="group"
        aria-label={`${passingCount} of ${contrastChecks.length} pairings meet their contrast target; ${failingCount} need adjustment`}
      >
        <strong>{passingCount} of {contrastChecks.length} pairings meet their target</strong>
        {failingCount > 0 && <span>{failingCount} {failingCount === 1 ? 'needs' : 'need'} adjustment</span>}
        {failingCount === 0 && <span>All {contrastChecks.length} checks pass</span>}
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
            <div className="playground-contrast-measure">
              <strong>{check.ratio.toFixed(2)}:1</strong>
              <span className="playground-contrast-sample" aria-hidden="true" style={{ backgroundColor: check.background, color: check.foreground }}>{check.id === 'border-background' ? '—' : 'Aa'}</span>
            </div>
            <p>{check.foreground.toUpperCase()} on {check.background.toUpperCase()}</p>
            <small>{check.minimumRatio}:1 minimum</small>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PlaygroundAccessibility;
