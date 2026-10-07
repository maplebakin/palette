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
      You&apos;ve found a direction. The finished kit carries it into production with every mode, tint, export, and contrast check already organized.
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
                <p className="kit-gallery-tagline">A polished system, ready to build with.</p>
                <ul className="kit-system-contents">
                  <li>{kit.modes.length} modes: Light, Dark, and Pop</li>
                  <li>{kit.totalTokens} semantic tokens in each mode</li>
                  <li>{kit.coreColors} core colors, {kit.tintsPerColor} tints each</li>
                  <li>{formats}</li>
                  <li>Manifest and measured WCAG contrast matrix</li>
                  <li>Commercial-use license for finished work</li>
                  <li>Production-ready file structure</li>
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
