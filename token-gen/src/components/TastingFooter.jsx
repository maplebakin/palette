import React from 'react';
import { FORGE_KIT_URL } from './ForgeCta.jsx';
import { requestGate } from '../lib/gateEvents.js';

const TastingFooter = () => (
  <footer className="tasting-footer">
    <div className="tasting-frame flex flex-wrap items-center justify-between gap-4 py-8">
      <p className="tasting-footer-line">The demo lets you feel them. The kit lets you ship them.</p>
      <nav className="tasting-footer-links" aria-label="Footer links">
        <a href="#tasting-main">Back to top</a>
        <a
          href={FORGE_KIT_URL}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            event.preventDefault();
            requestGate('see-full-kit');
          }}
        >
          Forge kits
        </a>
      </nav>
    </div>
  </footer>
);

export default TastingFooter;
