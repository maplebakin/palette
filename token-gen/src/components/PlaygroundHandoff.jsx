import React from 'react';
import { ArrowUpRight, Link2 } from 'lucide-react';

const CUSTOM_PALETTE_HONEST_LINE = "This exact palette isn't for sale. The finished kit carries it into a contrast-checked system with Light, Dark, and Pop modes.";

const PlaygroundHandoff = ({ onCopyLink, accent, onAccent, linkCopied = false }) => {
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
          <p className="tasting-eyebrow">Share this palette</p>
          <h2 id="playground-handoff-title" className="tasting-panel-title">Your palette is yours.</h2>
        </div>
        <p className="playground-handoff-saved">Saved in this browser — it stays after refresh.</p>
      </div>
      <p className="playground-handoff-honesty">{CUSTOM_PALETTE_HONEST_LINE}</p>
      <div className="playground-handoff-actions">
        <button type="button" aria-label="Copy palette link" className={`playground-handoff-copy${linkCopied ? ' is-copied' : ''}`} onClick={onCopyLink}>
          <Link2 size={14} aria-hidden="true" />
          {linkCopied ? 'Link copied' : 'Copy palette link'}
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
