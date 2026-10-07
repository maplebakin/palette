import React from 'react';
import { IN_THE_FORGE, KIT_SEEDS, KITS } from '../data/kits.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { hexToHsl, hslToHex } from '../lib/colorUtils.js';

const formatModes = (modes = []) => modes.map((mode) => mode.charAt(0).toUpperCase() + mode.slice(1)).join('/');
const FORMAT_LABELS = {
  ase: 'ASE',
  swatches: 'Procreate swatches',
  gpl: 'GPL',
  css: 'CSS',
  json: 'JSON',
  'figma-tokens': 'Tokens Studio JSON',
  tailwind: 'Tailwind v3 snippet',
};

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
        <p className="tasting-eyebrow">Finished systems</p>
        <h2 className="tasting-panel-title">Finished palette systems</h2>
      </div>
      <span className="playground-section-meta">Designed palettes</span>
    </div>
    <p className="kit-gallery-intro">
      Your sketch colors are yours to keep and copy. A finished kit adds 59 semantic tokens per mode, Light/Dark/Pop variants, seven production file types, contrast data, and a usage licence.
    </p>

    <div className="kit-gallery-features">
      {KITS.map((kit) => {
        const coverColors = buildCoverColors(kit);
        return (
          <article key={kit.id} className="kit-gallery-feature">
            <div
              className="kit-gallery-preview"
              role="img"
              aria-label={`${formatArtifactName({ kit })} color preview`}
            >
              <span className="kit-cover-strip" aria-hidden="true">
                {coverColors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </span>
            </div>
            <div className="kit-gallery-content">
              <div className="kit-gallery-heading">
                <h3 className="kit-gallery-name">{formatArtifactName({ kit })}</h3>
                <p className="kit-gallery-price">${kit.price}</p>
              </div>
              <dl className="kit-gallery-contents">
                <div>
                  <dt>Tokens</dt>
                  <dd>{kit.totalTokens} semantic tokens per mode</dd>
                </div>
                <div>
                  <dt>Variants</dt>
                  <dd>{formatModes(kit.modes)}</dd>
                </div>
                <div>
                  <dt>Formats</dt>
                  <dd>{kit.formats.map((format) => FORMAT_LABELS[format] || format).join(', ')}</dd>
                </div>
                <div>
                  <dt>Contrast data</dt>
                  <dd>{kit.includesContrastMatrix ? 'Matrix included' : 'Not included'}</dd>
                </div>
                <div>
                  <dt>Licence</dt>
                  <dd>Usage licence included</dd>
                </div>
              </dl>
              <p className="kit-gallery-status">Shop opening soon</p>
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
