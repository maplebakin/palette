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
import { buildPreviewRoleTokens } from '../../lib/previewTokens.js';

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
  onJumpToFileTools,
  showFileTools = false,
  isInternal,
}) => {
  const isPopMode = themeMode === 'pop';
  const isLightPreview = themeMode === 'light';
  const washAlpha = isPopMode ? 0.1 : isLightPreview ? 0.18 : 0.32;
  const accentWashAlpha = isPopMode ? 0.06 : isLightPreview ? 0.14 : 0.32;
  const secondaryWashAlpha = isPopMode ? 0.04 : isLightPreview ? 0.08 : 0.18;
  const skeletonBlush = tokens.pop?.['skeleton-blush'] || tokens.typography["text-muted"];
  const stickerBorder = tokens.pop?.['sticker-border'] || tokens.brand.primary;
  const stickerBorderWidth = tokens.pop?.['sticker-border-width'] || tokens.aliases?.['sticker-border-width'] || '1px';
  const stickerShadow = isPopMode
    ? `0 2px 0 ${hexWithAlpha(stickerBorder, 0.35)}, 0 10px 24px ${hexWithAlpha('#000000', 0.08)}`
    : undefined;
  const previewRoles = buildPreviewRoleTokens(tokens, themeMode);
  const entityHighlightAccent = previewRoles.entityHighlightAccent;
  const entityHighlightBg = previewRoles.entityHighlightBg;
  const entityHighlightText = previewRoles.entityHighlightText;
  const entityHighlightBorder = previewRoles.entityHighlightBorder || hexWithAlpha(stickerBorder, 0.22);
  const previewShellBg = previewRoles.shellBg;
  const previewPanelBg = previewRoles.panelBg;
  const previewCardBg = previewRoles.cardBg;
  const previewUtilityAccent = previewRoles.utilityAccent;
  const previewPrimaryAction = previewRoles.cta;
  const previewPrimaryActionForeground = previewRoles.ctaForeground || primaryTextColor;
  const previewSecondaryActionForeground = previewRoles.secondaryActionForeground;
  const previewSecondaryActionBorder = previewRoles.secondaryActionBorder;
  const ctaForeground = tokens.pop?.['pop-cta-foreground'] || previewPrimaryActionForeground;

  return (
  <StageSection id="validate" title="Review" subtitle="Preview, copy essentials, and confirm the palette before packaging.">
    <ColorBlindnessSimulator>
      <section
        className="relative overflow-hidden rounded-3xl border shadow-[0_40px_140px_-80px_rgba(0,0,0,0.6)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500"
        style={{
          boxShadow: `0 35px 120px -80px ${tokens.brand.primary}aa`,
          backgroundImage: `linear-gradient(140deg, ${hexWithAlpha(tokens.surfaces["background"], 1)} 0%, ${hexWithAlpha(tokens.brand.primary, washAlpha)} 45%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, accentWashAlpha)} 90%)`,
          borderColor: tokens.cards["card-panel-border"],
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 20% 20%, ${hexWithAlpha('#ffffff', 0.08)}, transparent 35%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(120deg, ${hexWithAlpha(tokens.brand.secondary || tokens.brand.primary, secondaryWashAlpha)}, transparent 50%)` }} />
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
            className={`relative rounded-2xl overflow-hidden ring-1 bg-white/5 backdrop-blur-md transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 ${isPopMode ? 'pop-preview-shell' : ''}`}
            data-testid="theme-preview-root"
            style={{
              backgroundColor: isPopMode ? tokens.surfaces["background"] : previewShellBg,
              boxShadow: isPopMode ? `0 34px 90px -46px ${tokens.pop?.['pop-background'] || tokens.brand.primary}` : `0 24px 70px -50px ${tokens.brand.primary}`,
              borderColor: hexWithAlpha(tokens.cards["card-panel-border"], 0.5),
              color: tokens.typography["text-strong"],
            }}
            aria-label={`Live palette preview showing ${displayThemeName}`}
          >
            <div className="h-12 border-b flex items-center px-4 gap-4" style={{ borderColor: tokens.surfaces["surface-plain-border"], backgroundColor: isLightPreview ? previewPanelBg : hexWithAlpha(tokens.surfaces["background"], 0.7) }}>
              <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              <span className="text-xs font-semibold" style={{ color: tokens.typography['text-muted'] }}>Preview • Instant harmony</span>
            </div>

            {isPopMode ? (
              <div className="p-6 md:p-10 space-y-5" data-testid="theme-preview-content">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: tokens.typography["text-muted"] }}>Shop / launch preview</div>
                    <div className="mt-1 text-xl font-black" style={{ color: tokens.typography["heading"] }}>Product drop section</div>
                  </div>
                  <div className="rounded-full border px-3 py-1 text-[11px] font-bold pop-preview-chip" style={{ borderColor: tokens.cards["card-panel-border"], color: tokens.typography["text-strong"] }}>
                    Saturated conversion mode
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border p-4 pop-shop-panel" style={{ backgroundColor: tokens.cards["card-panel-surface"], borderColor: tokens.cards["card-panel-border"] }}>
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] pop-section-label">Launch Hero</div>
                    <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: tokens.typography["text-muted"] }}>New drop</div>
                    <div className="mt-2 text-3xl font-black leading-none" style={{ color: tokens.typography["heading"] }}>Launch kit</div>
                    <p className="mt-2 text-sm" style={{ color: tokens.typography["text-muted"] }}>A bold theme kit for product drops, promos, and creator shops.</p>
                    <div className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black pop-cta" style={{ backgroundColor: tokens.brand.cta, color: ctaForeground }}>
                      Bundle $29
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border pop-shop-panel" style={{ backgroundColor: tokens.cards["card-panel-surface-strong"], borderColor: tokens.cards["card-panel-border"] }}>
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] pop-section-label">Signup Strip</div>
                    <div className="text-sm font-bold" style={{ color: tokens.typography["text-strong"] }}>Drop alerts</div>
                    <div className="mt-3 flex overflow-hidden rounded-full border" style={{ borderColor: tokens.cards["card-panel-border"] }}>
                      <div className="flex-1 px-3 py-2 text-xs" style={{ color: tokens.typography["text-muted"] }}>email@example.com</div>
                      <div className="px-3 py-2 text-xs font-black pop-cta" style={{ backgroundColor: tokens.brand.cta, color: ctaForeground }}>Join</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className="relative rounded-3xl border p-5 pop-product-card transition-all duration-500 ease-out hover:-translate-y-1"
                    style={{
                      backgroundColor: tokens.cards["card-panel-surface"],
                      borderColor: tokens.brand["focus-ring"],
                      borderWidth: 2,
                    }}
                  >
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] pop-section-label">Product Card</div>
                    <span className="absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide pop-cta" style={{ backgroundColor: tokens.brand.accent, color: ctaForeground }}>Featured</span>
                    <div className="aspect-square rounded-2xl mb-4 pop-product-media" />
                    <h3 className="text-xl font-black" style={{ color: tokens.typography["heading"] }}>Gloss Pack</h3>
                    <p className="mt-1 text-sm" style={{ color: tokens.typography["text-muted"] }}>Conversion-ready color, buttons, cards, and badges.</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-2xl font-black" style={{ color: tokens.typography["text-strong"] }}>$48</span>
                      <button className="pop-cta px-5 py-2.5 text-sm font-black" style={{ backgroundColor: tokens.brand.cta, color: ctaForeground }}>
                        Buy now
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border p-5 pop-shop-panel" style={{ backgroundColor: tokens.cards["card-panel-surface-strong"], borderColor: tokens.cards["card-panel-border"] }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] pop-section-label">Sale Banner</div>
                          <div className="mt-1 text-2xl font-black" style={{ color: tokens.typography["heading"] }}>40% off today</div>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center font-black" style={{ backgroundColor: tokens.pop?.['pop-highlight'] || tokens.brand["accent-strong"], color: tokens.typography["heading"] }}>!</div>
                      </div>
                    </div>
                    <div className="rounded-3xl border p-5 pop-shop-panel" style={{ backgroundColor: tokens.entity["entity-card-surface"], borderColor: tokens.cards["card-panel-border"] }}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: tokens.pop?.['pop-highlight'] || tokens.brand["accent-strong"], color: tokens.typography["heading"] }}>
                          <Check size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-black" style={{ color: tokens.typography["text-strong"] }}>Selected product</div>
                          <div className="text-xs" style={{ color: tokens.typography["text-muted"] }}>Radius-matched highlight, no square outline.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            ) : (
              <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8" data-testid="theme-preview-content">
                <div className="space-y-4">
                  <div className="h-8 w-3/4 rounded mb-6" style={{ backgroundColor: tokens.brand.primary, opacity: 0.25 }}></div>
                  <div className="h-4 w-full rounded" style={{ backgroundColor: skeletonBlush, opacity: 0.12 }}></div>
                  <div className="h-4 w-5/6 rounded" style={{ backgroundColor: skeletonBlush, opacity: 0.12 }}></div>
                  <div className="h-4 w-4/6 rounded" style={{ backgroundColor: skeletonBlush, opacity: 0.12 }}></div>
                </div>

                <div
                  data-testid="preview-content-card"
                  className="col-span-2 p-6 rounded-xl border shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.5)]"
                  style={{
                    backgroundColor: previewCardBg,
                    borderColor: tokens.cards["card-panel-border"],
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-extrabold" style={{ color: tokens.typography["heading"] }}>Thematic Output</h3>
                    <span className="text-[11px] px-3 py-1 rounded-full border" style={{ borderColor: previewUtilityAccent, color: previewUtilityAccent }}>Instant copy</span>
                  </div>
                  <p className="mb-6" style={{ color: tokens.typography["text-body"] }}>
                    Feel the palette first; tweak later. Surfaces, text, and primary action sit in balance so you can decide fast.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      data-testid="preview-primary-action"
                      className="px-4 py-2 rounded-lg font-semibold transition-transform active:scale-95 shadow-[0_10px_40px_-20px]"
                      style={{
                        backgroundColor: previewPrimaryAction,
                        color: previewPrimaryActionForeground,
                        boxShadow: `0 12px 30px -18px ${previewPrimaryAction}`,
                      }}
                    >
                      Primary Action
                    </button>
                    <button
                      data-testid="preview-secondary-action"
                      className="px-4 py-2 rounded-lg font-semibold border transition-transform active:scale-95"
                      style={{
                        borderColor: previewSecondaryActionBorder,
                        borderWidth: stickerBorderWidth,
                        boxShadow: stickerShadow,
                        color: previewSecondaryActionForeground,
                      }}
                    >
                      Secondary
                    </button>
                  </div>

                  <div
                       data-testid="entity-highlight-card"
                       className="relative mt-8 p-4 pl-6 rounded-2xl border flex items-center gap-3 entity-sticker-card"
                       style={{
                         backgroundColor: entityHighlightBg,
                         borderColor: entityHighlightBorder,
                         borderWidth: 1,
                         borderRadius: '1rem',
                       }}
                  >
                    <span
                      data-testid="entity-highlight-strip"
                      className="entity-sticker-accent absolute left-3 top-4 bottom-4 w-1.5"
                      style={{ backgroundColor: entityHighlightAccent }}
                      aria-hidden="true"
                    />
                    <div
                         data-testid="entity-highlight-icon"
                         className="w-9 h-9 rounded-full flex items-center justify-center"
                         style={{
                           backgroundColor: isLightPreview ? entityHighlightBg : entityHighlightAccent,
                           border: isLightPreview ? `1px solid ${entityHighlightBorder}` : undefined,
                           color: isLightPreview ? entityHighlightAccent : entityHighlightBg,
                           boxShadow: isLightPreview ? `0 8px 18px -14px ${entityHighlightAccent}` : `0 8px 18px -10px ${entityHighlightAccent}`,
                         }}>
                      <Check size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: entityHighlightText }}>Entity Highlight</div>
                      <div className="text-xs opacity-80" style={{ color: entityHighlightText }}>Unique component tokens</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
      {showFileTools && (
        <button
          type="button"
          onClick={() => { setActiveTab(['Ex', 'ports'].join('')); onJumpToFileTools?.(); }}
          className="px-3 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition"
        >
          Jump to file tools
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
};

export default ValidateStage;
