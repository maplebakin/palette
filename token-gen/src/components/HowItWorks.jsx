import React from 'react';
import { FlaskConical, MailPlus, PackageOpen } from 'lucide-react';

// How the Tasting Room works: the honest model in three compact entries.
// Rendered on the public page near the finished-kits shelf.
const HowItWorks = () => (
  <section
    aria-label="How Apocapalette works"
    className="mt-10 rounded-3xl border panel-surface-soft p-6 md:p-8 space-y-4 shadow-[0_40px_140px_-80px_rgba(0,0,0,0.6)]"
  >
    <p className="text-[10px] uppercase tracking-[0.3em] panel-muted">You design it, I finish it</p>
    <h2 className="text-xl font-bold panel-text">How it works</h2>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-bold panel-text">
          <FlaskConical size={16} aria-hidden="true" />
          Play
        </p>
        <p className="text-sm panel-muted leading-relaxed">
          Make, tune, save, and share. The playground stays free — no account, no charge to play.
        </p>
      </div>
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-bold panel-text">
          <MailPlus size={16} aria-hidden="true" />
          Suggest
        </p>
        <p className="text-sm panel-muted leading-relaxed">
          Love a palette? Send it my way. If your suggestion becomes a finished kit, you get a copy free for calling it.
        </p>
      </div>
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-bold panel-text">
          <PackageOpen size={16} aria-hidden="true" />
          Collect
        </p>
        <p className="text-sm panel-muted leading-relaxed">
          Finished kits with documented contents and ready-to-use files. The shop opens soon.
        </p>
      </div>
    </div>
  </section>
);

export default HowItWorks;
