import React, { useEffect, useRef } from 'react';
import { requestGate } from '../lib/gateEvents.js';
import { getTokenTeaser } from '../lib/tokenTeaser.js';

const TokenTeaser = ({ manifest, tokens, onCopy }) => {
  const fadeRef = useRef(null);
  const { tokens: teaserTokens, moreCount } = getTokenTeaser(tokens, manifest);

  useEffect(() => {
    const fadeNode = fadeRef.current;
    if (!fadeNode || typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        requestGate('token-fade');
        observer.disconnect();
      }
    }, { threshold: 0.45 });
    observer.observe(fadeNode);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="token-teaser tasting-panel" aria-label="Token teaser">
      <div className="playground-section-heading">
        <div>
          <p className="tasting-eyebrow">A closer look</p>
          <h2 className="tasting-panel-title">The first layer</h2>
        </div>
        <span className="playground-section-meta">Tap a token to copy its hex</span>
      </div>

      <div className="token-teaser-grid" role="list" aria-label="Teaser tokens">
        {teaserTokens.map(({ name, color }, index) => (
          <button
            key={`${name}-${color}-${index}`}
            type="button"
            className="token-teaser-card"
            onClick={() => onCopy(color)}
            aria-label={`Copy ${name} token ${color}`}
            data-testid="token-teaser-card"
          >
            <span className="token-teaser-swatch" style={{ backgroundColor: color }} />
            <span className="token-teaser-name">{name}</span>
            <span className="token-teaser-hex">{color.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div ref={fadeRef} className="token-teaser-fade" aria-label={`${moreCount} more production tokens live in the kit`}>
        <span>+{moreCount} more production tokens live in the kit</span>
      </div>
    </section>
  );
};

export default TokenTeaser;
