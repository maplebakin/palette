import React from 'react';
import { IN_THE_FORGE, KIT_SEEDS, KITS } from '../data/kits.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { hexToHsl, hslToHex } from '../lib/colorUtils.js';

const formatModes = (modes = []) => modes.map((mode) => mode.charAt(0).toUpperCase() + mode.slice(1)).join('/');

const buildCoverColors = (kit) => {
  const seed = KIT_SEEDS[kit.id]?.baseColor || '#8b6f9c';
  const hsl = hexToHsl(seed);
  // Tonal strip: small hue steps keep the cover inside the kit's own color
  // family instead of sweeping a rainbow unrelated to the kit.
  return [0, 10, 20, 30, 40].map((hueShift, index) => (
    hslToHex(hsl.h + hueShift, Math.max(28, hsl.s + (index % 2 ? -8 : 4)), Math.max(18, Math.min(86, hsl.l + (index - 2) * 7)))
  ));
};

const KitGallery = () => (
  <section id="kit-collection" className="kit-gallery tasting-panel" aria-label="Curated kit gallery">
    <div className="playground-section-heading">
      <div>
        <p className="tasting-eyebrow">The collection</p>
        <h2 className="tasting-panel-title">Three ways in</h2>
      </div>
      <span className="playground-section-meta">Curated kits</span>
    </div>

    <div className="kit-gallery-grid">
      {KITS.map((kit) => {
        const coverColors = buildCoverColors(kit);
        return (
          <article key={kit.id} className="kit-gallery-card">
            <div className="kit-gallery-content">
              <span className="kit-cover-strip" aria-hidden="true">
                {coverColors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </span>
              <div className="kit-gallery-copy">
                <span className="kit-gallery-name">{formatArtifactName({ kit })}</span>
                <span className="kit-gallery-meta">${kit.price} · {kit.totalTokens} tokens · {formatModes(kit.modes)} · {kit.formats.length} formats</span>
                <p className="kit-gallery-status">Shop opening soon</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>

    <p className="kit-forge-strip">
      In the forge: {IN_THE_FORGE.map(({ name }) => name).join(' and ')}. Selected community suggestions may join them.
    </p>
  </section>
);

export default KitGallery;
