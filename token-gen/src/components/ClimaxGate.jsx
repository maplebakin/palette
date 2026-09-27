import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, LockKeyhole, Mail, X } from 'lucide-react';
import { FORGE_KIT_URL } from './ForgeCta.jsx';
import { GATE_EVENT } from '../lib/gateEvents.js';
import {
  buildClimaxGateCopy,
  buildFormatTree,
  buildKitSpecificityLine,
  getClimaxGateTier,
  submitInterest,
} from '../lib/climaxGate.js';

const InterestCapture = ({ paletteSeed }) => {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    submitInterest({ email, seed: paletteSeed });
    setSaved(true);
  };

  if (saved) {
    return (
      <p className="climax-gate-interest-confirmation" role="status">
        <Check size={15} aria-hidden="true" />
        Saved in this browser for future consideration.
      </p>
    );
  }

  return (
    <form className="climax-gate-interest" onSubmit={handleSubmit}>
      <label htmlFor="climax-interest-email">Want us to consider this direction for a future kit?</label>
      <div className="climax-gate-interest-row">
        <div className="climax-gate-email-field">
          <Mail size={14} aria-hidden="true" />
          <input
            id="climax-interest-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email for future kit consideration"
            required
          />
        </div>
        <button type="submit" className="climax-gate-interest-submit">Save direction</button>
      </div>
    </form>
  );
};

const GateContent = ({ manifest, isCustom, paletteSeed, tier }) => {
  const copy = buildClimaxGateCopy({ manifest, isCustom });
  const formatTree = buildFormatTree(manifest);

  return (
    <div className="climax-gate-content">
      <div className="climax-gate-heading">
        <div>
          <p className="tasting-eyebrow">{tier === 'detail' ? 'Inside the vault' : 'Take it home'}</p>
          <h2 id="climax-gate-title" className="climax-gate-title">{copy.title}</h2>
          <p className="climax-gate-bridge">{copy.bridgeCopy}</p>
        </div>
        <div className="climax-gate-price" aria-label={`Kit price $${manifest.price}`}>
          <span>Kit</span>
          <strong>${manifest.price}</strong>
        </div>
      </div>

      <p className="climax-gate-specificity">{buildKitSpecificityLine(manifest)}</p>

      <div className="climax-gate-tree" aria-hidden="true">
        <span className="climax-gate-tree-root">{manifest.name}/</span>
        {formatTree.map((entry) => (
          <span key={entry.id} className={`climax-gate-tree-entry is-${entry.kind}`}>
            {entry.kind === 'folder' ? '├─ ' : '└─ '}{entry.label}
          </span>
        ))}
      </div>

      <div className="climax-gate-actions">
        <a href={FORGE_KIT_URL} target="_blank" rel="noreferrer" className="climax-gate-primary">
          {copy.primaryCta}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <span className="climax-gate-action-price">${manifest.price}</span>
      </div>

      {isCustom && (
        <>
          <a href={FORGE_KIT_URL} target="_blank" rel="noreferrer" className="climax-gate-secondary">
            {copy.secondaryCta}
          </a>
          <InterestCapture paletteSeed={paletteSeed} />
        </>
      )}

      <a href={FORGE_KIT_URL} target="_blank" rel="noreferrer" className="climax-gate-bundle">
        {copy.bundleLine}
      </a>
    </div>
  );
};

const ClimaxGate = ({ manifest, isCustom, paletteSeed }) => {
  const [tier, setTier] = useState(null);

  useEffect(() => {
    const handleGateRequest = (event) => {
      const nextTier = getClimaxGateTier(event.detail?.source);
      if (nextTier) setTier(nextTier);
    };

    window.addEventListener(GATE_EVENT, handleGateRequest);
    return () => window.removeEventListener(GATE_EVENT, handleGateRequest);
  }, []);

  useEffect(() => {
    if (tier !== 'takeover') return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setTier(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [tier]);

  if (!tier) return null;

  if (tier === 'takeover') {
    return (
      <div className="climax-gate-takeover" role="dialog" aria-modal="true" aria-labelledby="climax-gate-title">
        <div className="climax-gate-dialog">
          <button type="button" className="climax-gate-close" onClick={() => setTier(null)} aria-label="Close kit gate">
            <X size={18} aria-hidden="true" />
          </button>
          <GateContent manifest={manifest} isCustom={isCustom} paletteSeed={paletteSeed} tier={tier} />
        </div>
      </div>
    );
  }

  return (
    <section
      className={`climax-gate-in-flow climax-gate-${tier}`}
      aria-labelledby="climax-gate-title"
      data-testid={`climax-gate-${tier}`}
    >
      <div className="climax-gate-in-flow-topline">
        <div className="climax-gate-lock-label"><LockKeyhole size={14} aria-hidden="true" /> Kit access</div>
        <button type="button" className="climax-gate-dismiss" onClick={() => setTier(null)}>Close</button>
      </div>
      <GateContent manifest={manifest} isCustom={isCustom} paletteSeed={paletteSeed} tier={tier} />
    </section>
  );
};

export default ClimaxGate;
