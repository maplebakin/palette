import React from 'react';
import {
  Braces,
  Code2,
  FileText,
  Layers,
  LockKeyhole,
  Palette,
} from 'lucide-react';
import { requestGate } from '../lib/gateEvents.js';
import { buildVaultCards } from '../lib/vaultMetadata.js';

const ICONS = {
  palette: Palette,
  layers: Layers,
  'file-text': FileText,
  code: Code2,
  braces: Braces,
};

const VaultStrip = ({ manifest }) => (
  <section className="vault-strip tasting-panel" aria-label="Locked production formats">
    <div className="playground-section-heading">
      <div>
        <p className="tasting-eyebrow">The vault</p>
        <h2 className="tasting-panel-title">Production formats</h2>
      </div>
      <span className="playground-section-meta">Included with the kit</span>
    </div>

    <div className="vault-card-grid" role="list">
      {buildVaultCards(manifest).map((card) => {
        const Icon = ICONS[card.icon] || FileText;
        return (
          <button
            key={card.format}
            type="button"
            className="vault-card"
            onClick={() => requestGate('vault-click')}
            aria-label={`Open ${card.label} ${card.name} details`}
          >
            <span className="vault-card-icon"><Icon size={18} aria-hidden="true" /></span>
            <span className="vault-card-copy">
              <strong>{card.label}</strong>
              <span>{card.name}</span>
            </span>
            <LockKeyhole size={14} className="vault-card-lock" aria-hidden="true" />
            <span className="vault-card-metadata">{card.metadata}</span>
          </button>
        );
      })}
    </div>
  </section>
);

export default VaultStrip;
