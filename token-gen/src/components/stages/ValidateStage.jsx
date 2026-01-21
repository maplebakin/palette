import React, { lazy, Suspense } from 'react';
import { Eye, EyeOff, Check, Layers, Droplet, Type, Grid, Box, Sun, FileText } from 'lucide-react';
import ColorSwatch from '../ColorSwatch';
import Section from '../Section';
import ErrorBoundary from '../ErrorBoundary.jsx';
import SectionFallback from '../SectionFallback.jsx';
import PaletteRow from '../PaletteRow';
import ColorVisionPanel from '../ColorVisionPanel';
import ColorBlindnessSimulator from '../ColorBlindnessSimulator';
import { StageSection } from './StageLayout';
import { hexWithAlpha } from '../../lib/colorUtils';

const ContrastPanel = lazy(() => import('../ContrastPanel'));

const ValidateStage = ({
  tokens,
  displayThemeName,
  baseColor,
  mode,
  themeMode,
  isDark,
  primaryTextColor,
  quickEssentials,
  copyAllEssentials,
  copyEssentialsList,
  copyHexValue,
  orderedSwatches,
  showContrast,
  setShowContrast,
  contrastChecks,
  paletteRows,
  activeTab,
  setActiveTab,
  getTabId,
  tabOptions,
  onJumpToExports,
  showExports = false,
  isInternal,
}) => (
  <StageSection id="validate" title="Validate" subtitle="Preview, review, and copy essentials before you package or export.">
    <ColorBlindnessSimulator>
      <section
        className="relative overflow-hidden rounded-3xl border shadow-[0_40px_140px_-80px_rgba(0,0,0,0.6)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500"
        style={{
          boxShadow: `0 35px 120px -80px ${tokens.brand.primary}aa`,
          backgroundImage: `linear-gradient(140deg, ${hexWithAlpha(tokens.surfaces["background"], 1)} 0%, ${hexWithAlpha(tokens.brand.primary, 0.32)} 45%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.32)} 90%)`,
          borderColor: tokens.cards["card-panel-border"],
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 20% 20%, ${hexWithAlpha('#ffffff', 0.08)}, transparent 35%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(120deg, ${hexWithAlpha(tokens.brand.secondary || tokens.brand.primary, 0.18)}, transparent 50%)` }} />
        <div className="relative p-6 md:p-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] panel-muted">Apocapalette live</p>
              <h2 className="text-3xl md:text-4xl font-black" style={{ color: tokens.typography['heading'] }}>{displayThemeName}</h2>
              <p className="text-sm" style={{ color: tokens.typography['text-muted'] }}>Base {baseColor.toUpperCase()} • {mode} • {themeMode === 'pop' ? 'Pop' : (isDark ? 'Dark' : 'Light')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: tokens.typography['text-strong'] }}>
              <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/10">Live preview</span>
              <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/10">Chaos tuned</span>
            </div>
          </div>
          <div
            className="relative rounded-2xl overflow-hidden ring-1 bg-white/5 backdrop-blur-md transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
            data-testid="theme-preview-root"
            style={{
              backgroundColor: hexWithAlpha(tokens.surfaces["background"], 0.65),
              boxShadow: `0 24px 70px -50px ${tokens.brand.primary}`,
              borderColor: hexWithAlpha(tokens.cards["card-panel-border"], 0.5),
              color: tokens.typography["text-strong"],
            }}
            aria-label={`Live palette preview showing ${displayThemeName}`}
          >
            <div className="h-12 border-b flex items-center px-4 gap-4" style={{ borderColor: tokens.surfaces["surface-plain-border"], backgroundColor: hexWithAlpha(tokens.surfaces["background"], 0.7) }}>
              <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              <span className="text-xs font-semibold" style={{ color: tokens.typography['text-muted'] }}>Preview • Instant harmony</span>
            </div>

            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8" data-testid="theme-preview-content">
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded mb-6" style={{ backgroundColor: tokens.brand.primary, opacity: 0.25 }}></div>
                <div className="h-4 w-full rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.12 }}></div>
                <div className="h-4 w-5/6 rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.12 }}></div>
                <div className="h-4 w-4/6 rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.12 }}></div>
              </div>

              <div
                className="col-span-2 p-6 rounded-xl border shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.5)]"
                style={{
                  backgroundColor: tokens.cards["card-panel-surface"],
                  borderColor: tokens.cards["card-panel-border"],
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-extrabold" style={{ color: tokens.typography["heading"] }}>Thematic Output</h3>
                  <span className="text-[11px] px-3 py-1 rounded-full border" style={{ borderColor: tokens.brand.primary, color: tokens.brand.primary }}>Instant copy</span>
                </div>
                <p className="mb-6" style={{ color: tokens.typography["text-body"] }}>
                  Feel the palette first; tweak later. Surfaces, text, and primary action sit in balance so you can decide fast.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 rounded-lg font-semibold transition-transform active:scale-95 shadow-[0_10px_40px_-20px]" style={{ backgroundColor: tokens.brand.primary, color: '#fff', boxShadow: `0 12px 30px -18px ${tokens.brand.primary}` }}>
                    Primary Action
                  </button>
                  <button className="px-4 py-2 rounded-lg font-semibold border transition-transform active:scale-95"
                          style={{
                            borderColor: tokens.brand.primary,
                            color: tokens.brand.primary,
                          }}>
                    Secondary
                  </button>
                </div>

                <div className="mt-8 p-4 rounded border flex items-center gap-3"
                     style={{
                       backgroundColor: tokens.entity["entity-card-surface"],
                       borderColor: tokens.entity["entity-card-border"],
                     }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner"
                       style={{ backgroundColor: tokens.brand.accent, color: '#fff' }}>
                    <Check size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: tokens.entity["entity-card-heading"] }}>Entity Highlight</div>
                    <div className="text-xs opacity-80" style={{ color: tokens.typography["text-body"] }}>Unique component tokens</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ColorBlindnessSimulator>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex-1 flex justify-center">
        <div
          role="tablist"
          aria-label="Palette views"
          className="inline-flex gap-2 p-1 rounded-full border panel-surface-soft shadow-sm"
        >
          {tabOptions.map((tab, index) => (
            <button
              key={tab}
              id={getTabId(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tab-panel-${index}`}
              tabIndex={activeTab === tab ? 0 : -1}
              type="button"
              onClick={() => setActiveTab(tab)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const dir = e.key === 'ArrowRight' ? 1 : -1;
                  const next = (index + dir + tabOptions.length) % tabOptions.length;
                  setActiveTab(tabOptions[next]);
                }
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all hover:opacity-90 ${activeTab === tab ? 'shadow-md' : ''}`}
              style={activeTab === tab
                ? { backgroundColor: tokens.brand.primary, color: primaryTextColor }
                : { color: tokens.typography['text-muted'] }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {showExports && (
        <button
          type="button"
          onClick={() => { setActiveTab('Exports'); onJumpToExports?.(); }}
          className="px-3 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
        >
          Jump to Exports
        </button>
      )}
    </div>

    <section className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold panel-text">Quick essentials</h2>
          <p className="text-xs panel-muted">Tap to copy. Instant gratification before the deep dive.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAllEssentials}
          className="text-xs font-bold px-4 py-2 rounded-full hover:-translate-y-[2px] transition shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
            style={{
              backgroundColor: tokens.brand.primary,
              color: primaryTextColor,
              boxShadow: `0 14px 32px -22px ${tokens.brand.primary}`,
            }}
          >
            Copy all as hex list
          </button>
          <button
            type="button"
            onClick={copyEssentialsList}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border panel-surface-strong panel-text hover:-translate-y-[1px] active:scale-95 transition"
            style={{ borderColor: tokens.cards["card-panel-border"] }}
          >
            <FileText size={14} />
            Copy quick kit
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
        {quickEssentials.slice(0, 10).map(({ key, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => copyHexValue(color, `${key} hex`)}
            className="group relative p-3 rounded-xl border shadow-sm flex flex-col gap-2 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl panel-surface-soft"
            style={{ borderColor: tokens.cards["card-panel-border"] }}
            aria-label={`Copy ${key} ${color}`}
          >
            <span className="text-[11px] font-semibold panel-muted">{key}</span>
            <div className="h-12 rounded-lg border" style={{ backgroundColor: color, borderColor: hexWithAlpha(color, 0.18) }} />
            <span className="text-[11px] font-mono panel-text uppercase tracking-wide">{color}</span>
            <span className="absolute right-3 top-3 text-[10px] opacity-0 group-hover:opacity-80 panel-muted">Copy</span>
          </button>
        ))}
      </div>
    </section>

    <div className="sticky top-3 md:top-16 z-10">
      <div
        className="rounded-2xl border panel-surface-soft shadow-sm px-4 py-3 flex items-center gap-3 overflow-x-auto snap-x snap-mandatory"
        aria-label="Pinned swatch strip — quick palette preview"
      >
        {quickEssentials.slice(0, 8).map(({ key, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => copyHexValue(color, `${key} hex`)}
            className="min-w-[120px] flex-1 rounded-xl p-2 border shadow-sm snap-start text-left hover:-translate-y-0.5 transition"
            style={{ backgroundColor: color, borderColor: hexWithAlpha(color, 0.25) }}
            aria-label={`Copy ${key} ${color}`}
          >
            <div className="text-[10px] font-bold uppercase tracking-tight panel-chip px-2 py-1 rounded-full inline-block shadow-sm">
              {color}
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-10">
      <div id="tab-panel-0" role="tabpanel" aria-labelledby={getTabId('Quick view')} hidden={activeTab !== 'Quick view'}>
        {activeTab === 'Quick view' && (
          <>
            <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Ordered stack" reset={reset} message={message} />}>
              <div
                className="p-6 rounded-2xl border shadow-sm panel-surface-soft backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                <h2 className="text-lg font-semibold panel-text">Ordered token stack</h2>
                <p className="text-xs panel-muted">Aligned to the handoff order for quick scanning.</p>
              </div>
              <div className="text-[11px] px-3 py-1 rounded-full border panel-outline panel-muted">Click swatches to copy</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list" aria-label="Ordered tokens">
                  {orderedSwatches.map(({ name, color }, index) => (
                    <ColorSwatch key={`${name}-${index}`} name={name} color={color} />
                  ))}
                </div>
              </div>
            </ErrorBoundary>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowContrast((v) => !v)}
                className="p-2 rounded-md panel-surface-strong border hover:opacity-90 transition"
                title="Toggle contrast diagnostics"
                aria-pressed={showContrast}
                aria-label="Toggle contrast diagnostics panel"
              >
                {showContrast ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>

            {showContrast && (
              <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Contrast checks" reset={reset} message={message} />}>
                <Suspense fallback={<div className="p-4 rounded-lg border panel-surface-soft text-sm">Loading contrast…</div>}>
                  <ContrastPanel contrastChecks={contrastChecks} />
                </Suspense>
              </ErrorBoundary>
            )}

            <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Accessibility" reset={reset} message={message} />}>
              <ColorVisionPanel swatches={quickEssentials} />
            </ErrorBoundary>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold panel-text">Cohesive palette</h3>
              <p className="text-xs panel-muted">Main families at a glance</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paletteRows.map((row) => (
                  <PaletteRow key={row.title} title={row.title} colors={row.colors} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div id="tab-panel-1" role="tabpanel" aria-labelledby={getTabId('Full system')} hidden={activeTab !== 'Full system'}>
        {activeTab === 'Full system' && (
          <div className="space-y-2">
            <Section title="Foundation: Neutral Ladder" icon={<Layers size={18} className="panel-muted" />}>
              {Object.entries(tokens.foundation.neutrals).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Foundation: Accents" icon={<Droplet size={18} className="panel-muted" />}>
              {Object.entries(tokens.foundation.accents).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Brand & Core" icon={<Droplet size={18} className="panel-muted" />}>
              {Object.entries(tokens.brand).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Text Palette" icon={<Type size={18} className="panel-muted" />}>
              {Object.entries(tokens.textPalette).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Typography" icon={<Type size={18} className="panel-muted" />}>
              {Object.entries(tokens.typography).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Borders" icon={<Grid size={18} className="panel-muted" />}>
              {Object.entries(tokens.borders).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Surfaces & Backgrounds" icon={<Layers size={18} className="panel-muted" />}>
              {Object.entries(tokens.surfaces).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Components: Cards & Tags" icon={<Grid size={18} className="panel-muted" />}>
              {Object.entries(tokens.cards).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Components: Glass" icon={<Box size={18} className="panel-muted" />}>
              {Object.entries(tokens.glass).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Components: Entity" icon={<Box size={18} className="panel-muted" />}>
              {Object.entries(tokens.entity).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            <Section title="Status & Feedback" icon={<Check size={18} className="panel-muted" />}>
              {Object.entries(tokens.status).map(([key, val]) => (
                <ColorSwatch key={key} name={key} color={val} />
              ))}
            </Section>

            {isInternal && (
              <>
                <Section title="Admin Palette" icon={<Box size={18} className="panel-muted" />}>
                  {Object.entries(tokens.admin).map(([key, val]) => (
                    <ColorSwatch key={key} name={key} color={val} />
                  ))}
                </Section>

                <Section title="Back-Compat Aliases" icon={<Box size={18} className="panel-muted" />}>
                  {Object.entries(tokens.aliases).map(([key, val]) => (
                    <ColorSwatch key={key} name={key} color={val} />
                  ))}
                </Section>

                <Section title="Dawn Overrides" icon={<Sun size={18} className="panel-muted" />}>
                  {Object.entries(tokens.dawn).map(([key, val]) => (
                    <ColorSwatch key={key} name={key} color={val} />
                  ))}
                </Section>

                <Section title="Legacy Palette" icon={<Box size={18} className="panel-muted" />}>
                  {Object.entries(tokens.named).map(([key, val]) => (
                    <ColorSwatch key={key} name={key} color={val} />
                  ))}
                </Section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  </StageSection>
);

export default ValidateStage;
