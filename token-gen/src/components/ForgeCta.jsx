import React from 'react';
import { PackageOpen } from 'lucide-react';
import { requestGate } from '../lib/gateEvents.js';

// ─── MADDIE: SET THIS BEFORE SHARING THE DEMO PUBLICLY ───────────────────────
// There is no public forge-kit storefront URL yet, so this defaults to a
// placeholder. Point it at wherever the paid theme kits will live
// (Gumroad / Ko-fi / your own page) — the CTA button below links here.
export const FORGE_KIT_URL = 'https://example.com/apocapalette-forge-kits';

// End-of-Review conversion panel for the public demo build.
// Rendered only when the private forge is NOT active (in forge builds the
// Review step flows straight into the Package/Export steps instead).
const ForgeCta = () => (
  <section
    aria-label="Full theme kits"
    className="mt-10 rounded-3xl border panel-surface-soft p-6 md:p-8 space-y-4 shadow-[0_40px_140px_-80px_rgba(0,0,0,0.6)]"
  >
    <p className="text-[10px] uppercase tracking-[0.3em] panel-muted">Beyond the demo</p>
    <h2 className="text-xl font-bold panel-text flex items-center gap-2">
      <PackageOpen size={20} aria-hidden />
      This demo makes palettes. The forge makes products.
    </h2>
    <p className="text-sm panel-muted leading-relaxed max-w-2xl">
      The public demo lets you generate, inspect, and copy any palette — but it
      can&rsquo;t export files. Full theme kits from the private forge ship
      designer-ready files (Adobe <span className="font-mono">.ase</span> swatches,
      Procreate <span className="font-mono">.swatches</span>, GIMP palettes),
      plus docs and a usage license for client work.
    </p>
    <div>
      <button
        type="button"
        onClick={() => requestGate('see-full-kit')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
      >
        Get the full theme kit
      </button>
    </div>
  </section>
);

export default ForgeCta;
