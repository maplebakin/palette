import React from 'react';
import { ArrowUpRight, Link2 } from 'lucide-react';
import { CUSTOM_PALETTE_HONEST_LINE } from '../lib/climaxGate.js';

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
          <p className="tasting-eyebrow">Keep this sketch</p>
          <h2 id="playground-handoff-title" className="tasting-panel-title">This one&apos;s yours.</h2>
        </div>
        <p className="playground-handoff-saved">Saved in this browser — it won&apos;t vanish if you refresh.</p>
      </div>
      <p className="playground-handoff-honesty">{CUSTOM_PALETTE_HONEST_LINE}</p>
      <div className="playground-handoff-actions">
        <button type="button" className="playground-handoff-copy" onClick={onCopyLink}>
          <Link2 size={14} aria-hidden="true" />
          Copy link to this palette
        </button>
        <a href="#kit-collection" className="playground-handoff-link">
          Browse finished kits
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
};

export default PlaygroundHandoff;
