import React from 'react';

const TastingFooter = () => (
  <footer className="tasting-footer">
    <div className="tasting-frame flex flex-wrap items-center justify-between gap-4 py-8">
      <p className="tasting-footer-line">The demo lets you feel them. Finished kits let you ship them.</p>
      <nav className="tasting-footer-links" aria-label="Footer links">
        <a href="#tasting-main">Back to top</a>
        <a href="#finished-kits">Finished kits</a>
      </nav>
    </div>
  </footer>
);

export default TastingFooter;
