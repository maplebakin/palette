import React from 'react';
import { ArrowUpRight, Link2 } from 'lucide-react';

const CUSTOM_PALETTE_HONEST_LINE = "This exact palette isn't for sale — it's a sketch. The kits are the finished paintings: contrast-checked, Light/Dark/Pop variants, supported.";

const PlaygroundHandoff = ({ onCopyLink, accent, onAccent }) => {
  const style = {
    ...(accent ? { '--handoff-accent': accent } : {}),
    ...(onAccent ? { '--handoff-on-accent': onAccent } : {}),
  };

  return (
    <section
      className="playground-handoff tasting-panel"
      aria-labelledby="playground-handoff-title"
      style={style}
    >
      <div className="playground-handoff-header">
        <div>
          <p className="tasting-eyebrow">Share this sketch</p>
          <h2 id="playground-handoff-title" className="tasting-panel-title">This sketch is yours.</h2>
        </div>
        <p className="playground-handoff-saved">Saved in this browser — it won&apos;t vanish if you refresh.</p>
      </div>
      <p className="playground-handoff-honesty">{CUSTOM_PALETTE_HONEST_LINE}</p>
      <div className="playground-handoff-actions">
        <button type="button" className="playground-handoff-copy" onClick={onCopyLink}>
          <Link2 size={14} aria-hidden="true" />
          Copy link to this palette
        </button>
        <a href="#finished-kits" className="playground-handoff-link">
          Browse finished kits
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
};

export default PlaygroundHandoff;
