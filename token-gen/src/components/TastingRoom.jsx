import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import ForgeCta from './ForgeCta.jsx';
import { BUNDLE, KIT_SEEDS, KITS } from '../data/kits.js';
import { randomExplorationName } from '../data/nameBank.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { buildTheme } from '../lib/theme/engine.js';
import { buildPreviewRoleTokens } from '../lib/previewTokens.js';

const EXPLORATION_SEEDS = [
  { baseColor: '#7f6bb3', mode: 'Analogous', themeMode: 'dark' },
  { baseColor: '#d48267', mode: 'Tertiary', themeMode: 'light' },
  { baseColor: '#2f8c83', mode: 'Complementary', themeMode: 'pop' },
  { baseColor: '#c4a24d', mode: 'Monochromatic', themeMode: 'dark' },
];

const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6,8}$/i.test(value);

const TastingRoom = () => {
  const [selection, setSelection] = useState(() => ({
    kit: KITS[0],
    explorationName: '',
    seed: KIT_SEEDS[KITS[0].id],
  }));

  const artifactName = formatArtifactName(selection);
  const theme = useMemo(() => buildTheme({
    ...selection.seed,
    name: artifactName,
  }), [artifactName, selection.seed]);
  const previewRoles = useMemo(
    () => buildPreviewRoleTokens(theme.tokens, selection.seed.themeMode),
    [selection.seed.themeMode, theme.tokens],
  );
  const previewSwatches = useMemo(() => {
    const generated = theme.orderedStack
      .map(({ name, value }) => ({ name, color: value }))
      .filter(({ color }) => isHexColor(color));
    const fallback = [
      { name: 'Primary', color: theme.tokens.brand?.primary },
      { name: 'Secondary', color: theme.tokens.brand?.secondary },
      { name: 'Accent', color: theme.tokens.brand?.accent },
      { name: 'Surface', color: theme.tokens.cards?.['card-panel-surface'] },
      { name: 'Text', color: theme.tokens.typography?.['text-body'] },
      { name: 'CTA', color: theme.tokens.brand?.cta },
    ].filter(({ color }) => isHexColor(color));
    const seen = new Set();
    return [...generated, ...fallback].filter(({ color }) => {
      const key = color.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [theme]);

  const selectKit = (kit) => {
    setSelection({
      kit,
      explorationName: '',
      seed: KIT_SEEDS[kit.id],
    });
  };

  const startExploration = () => {
    const index = Math.floor(Math.random() * EXPLORATION_SEEDS.length);
    setSelection({
      kit: null,
      explorationName: randomExplorationName(),
      seed: EXPLORATION_SEEDS[index],
    });
  };

  return (
    <div className="tasting-room min-h-screen">
      <a href="#tasting-main" className="tasting-skip-link">Skip to showroom</a>

      <header className="tasting-header">
        <div className="tasting-frame flex items-center justify-between gap-4 py-5">
          <div>
            <p className="tasting-wordmark">Apocapalette</p>
            <p className="tasting-header-note">Palette showroom</p>
          </div>
          <span className="tasting-header-mark">Public demo</span>
        </div>
      </header>

      <main id="tasting-main" className="tasting-frame space-y-8 py-10 sm:py-14">
        <section className="tasting-hero">
          <p className="tasting-eyebrow">{selection.kit ? 'Curated artifact' : 'Open exploration'}</p>
          <h1 className="tasting-title">{artifactName}</h1>
          <p className="tasting-subtitle">A palette showroom — explore freely, take the kit home.</p>
          <div className="tasting-meta-row" aria-label="Artifact details">
            <span>{selection.kit ? `$${selection.kit.price} kit` : 'Live exploration'}</span>
            <span aria-hidden="true">·</span>
            <span>{selection.kit ? `${selection.kit.teaserTokenCount} teaser tokens` : `${previewSwatches.length} live swatches`}</span>
            <span aria-hidden="true">·</span>
            <span>{selection.seed.themeMode} mode</span>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <aside className="tasting-panel space-y-4" aria-label="Curated kits">
            <div>
              <p className="tasting-eyebrow">The shelf</p>
              <h2 className="tasting-panel-title">Choose an artifact</h2>
            </div>
            <div className="space-y-2">
              {KITS.map((kit) => (
                <button
                  key={kit.id}
                  type="button"
                  onClick={() => selectKit(kit)}
                  className={`tasting-kit-button ${selection.kit?.id === kit.id ? 'is-selected' : ''}`}
                  aria-pressed={selection.kit?.id === kit.id}
                >
                  <span>{kit.name}</span>
                  <span className="tasting-kit-number">No. {kit.artifactNo}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={startExploration} className="tasting-explore-button">
              <Sparkles size={14} aria-hidden="true" />
              Explore freely
            </button>
            <div className="tasting-bundle">
              <p className="tasting-eyebrow">Bundle</p>
              <p className="text-lg font-semibold">${BUNDLE.price}</p>
              <p className="tasting-muted">{BUNDLE.blurb}</p>
            </div>
          </aside>

          <section
            className="tasting-palette-surface space-y-6"
            aria-label="Rendered palette preview"
            style={{
              backgroundColor: previewRoles.background,
              borderColor: previewRoles.border,
              color: previewRoles.text,
            }}
          >
            <div
              className="rounded-2xl border p-5 sm:p-7"
              style={{
                backgroundColor: previewRoles.surface,
                borderColor: previewRoles.secondaryActionBorder,
              }}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-70">Rendered preview</p>
                  <h2 className="mt-2 text-2xl font-black">A small system with a long shadow.</h2>
                  <p className="mt-2 max-w-xl text-sm opacity-80">
                    A live taste of the kit: surfaces, action colors, quiet neutrals, and the colors that make the whole thing feel like itself.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
                  style={{ backgroundColor: previewRoles.cta, color: previewRoles.ctaForeground }}
                >
                  Taste the system
                  <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-70">Palette surface</p>
                  <h2 className="mt-1 text-lg font-bold">{selection.kit ? 'Twelve teaser tokens' : 'Exploration swatches'}</h2>
                </div>
                <span className="text-xs font-semibold opacity-70">{previewSwatches.length} shown</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {previewSwatches.map(({ name, color }) => (
                  <div key={`${name}-${color}`} className="rounded-xl border p-2" style={{ borderColor: previewRoles.border }}>
                    <div className="h-20 rounded-lg" style={{ backgroundColor: color }} />
                    <p className="mt-2 truncate text-[11px] font-semibold opacity-80">{name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase opacity-70">{color}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="tasting-panel" aria-label="Kit contents">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="tasting-eyebrow">Inside the artifact</p>
              <h2 className="tasting-panel-title">A complete color working set.</h2>
              <p className="tasting-muted mt-2 max-w-2xl">
                Six core colors, nine tints per color, three modes, and a contrast matrix prepared for the moment a good palette becomes a real project.
              </p>
            </div>
            <div className="tasting-stat-grid">
              <span><strong>{selection.kit?.coreColors || 6}</strong> core</span>
              <span><strong>{selection.kit?.tintsPerColor || 9}</strong> tints</span>
              <span><strong>{selection.kit?.totalTokens || 59}</strong> tokens</span>
            </div>
          </div>
        </section>

        <ForgeCta />
      </main>
    </div>
  );
};

export default TastingRoom;
