import React from 'react';

const SuggestKitInvitation = ({ visible, onSuggest }) => {
  if (!visible) return null;

  return (
    <section className="suggest-kit-invitation tasting-panel" aria-labelledby="suggest-kit-title">
      <div>
        <p className="tasting-eyebrow">Keep the sketch moving</p>
        <h2 id="suggest-kit-title" className="tasting-panel-title">Love this palette?</h2>
      </div>
      <p className="suggest-kit-invitation-copy">
        Suggest it for a finished kit. You design it, I finish it — reviewed by hand, contrast-checked, and packaged for use.
      </p>
      <button type="button" className="suggest-kit-button" onClick={onSuggest}>
        Suggest this for a finished kit
      </button>
      <p className="suggest-kit-expectation">
        I read every suggestion and finish the ones that want making, as time allows. If your suggestion becomes a kit, you&apos;ll be first to know and get a copy free for calling it. I can&apos;t finish every suggestion.
      </p>
      <p className="suggest-kit-finishing-note">
        Finished kits are based on your palette. I may adjust colours for contrast and coherence.
      </p>
    </section>
  );
};

export default SuggestKitInvitation;
