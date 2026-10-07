import React from 'react';
import { KITS } from '../data/kits.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { hexToHsl, hslToHex } from '../lib/colorUtils.js';

const FORMAT_LABELS = {
  ase: 'ASE',
  swatches: 'Procreate swatches',
  gpl: 'GPL',
  css: 'CSS',
  json: 'JSON',
  'figma-tokens': 'Tokens Studio JSON',
  tailwind: 'Tailwind v3 snippet',
};

const buildCoverColors = () => {
  const hsl = hexToHsl('#7f1d1d');
  return [0, 10, 20, 30, 40].map((hueShift, index) => (
    hslToHex(hsl.h + hueShift, Math.max(28, hsl.s + (index % 2 ? -8 : 4)), Math.max(18, Math.min(86, hsl.l + (index - 2) * 7)))
  ));
};

const KitGallery = () => (
  <section id="kit-collection" className="kit-gallery tasting-panel" aria-labelledby="kit-collection-title">
    <div className="playground-section-heading">
      <div>
        <p className="tasting-eyebrow">From sketch to system</p>
        <h2 id="kit-collection-title" className="tasting-panel-title">From sketch to system</h2>
      </div>
      <span className="playground-section-meta">Finished palette system</span>
    </div>
    <p className="kit-gallery-intro">
      A sketch is seven colors. A finished kit is every token, tint, mode and file format a project needs, already contrast-checked.
    </p>

    <div className="kit-compare-grid">
      <article className="kit-sketch-card">
        <p className="tasting-eyebrow">Your sketch</p>
        <h3>Free palette creator</h3>
        <ul>
          <li>7 roles in the mode you pick</li>
          <li>Lock, edit and copy any colour</li>
          <li>Live preview and contrast checks</li>
          <li>Save in your browser or share a link</li>
        </ul>
        <p className="kit-sketch-free">Free · No account</p>
      </article>

      <div className="kit-gallery-features">
        {KITS.map((kit) => {
          const coverColors = buildCoverColors();
          const formats = kit.formats.map((format) => FORMAT_LABELS[format] || format).join(', ');
          return (
            <article key={kit.id} className="kit-gallery-feature" id="finished-kits">
              <div
                className="playground-kit-preview"
                role="img"
                aria-label={`${kit.name} color preview`}
              >
                <span className="kit-cover-strip" aria-hidden="true">
                  {coverColors.map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} />)}
                </span>
              </div>
              <div className="kit-gallery-content">
                <div className="kit-gallery-heading">
                  <h3 className="kit-gallery-name">{formatArtifactName({ kit }).replace(/^Artifact No\. \d+ — /, '')}</h3>
                  <p className="kit-gallery-price">${kit.price}</p>
                </div>
                <ul className="kit-system-contents">
                  <li>{kit.totalTokens} semantic tokens per mode in Light/Dark/Pop</li>
                  <li>{kit.coreColors} core colours with {kit.tintsPerColor} tints each</li>
                  <li>{formats}</li>
                  <li>Contrast matrix with measured WCAG ratios</li>
                  <li>Usage licence included</li>
                </ul>
                <p className="kit-gallery-status">Shop opening soon</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

export default KitGallery;
