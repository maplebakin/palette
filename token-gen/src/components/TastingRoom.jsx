import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Lock,
  RefreshCcw,
  Sparkles,
  Unlock,
} from 'lucide-react';
import ForgeCta from './ForgeCta.jsx';
import ClimaxGate from './ClimaxGate.jsx';
import KitGallery from './KitGallery.jsx';
import PlaygroundAccessibility from './PlaygroundAccessibility.jsx';
import TokenTeaser from './TokenTeaser.jsx';
import TastingFooter from './TastingFooter.jsx';
import VaultStrip from './VaultStrip.jsx';
import { BUNDLE, KIT_SEEDS, KITS } from '../data/kits.js';
import { NAME_BANK, randomExplorationName } from '../data/nameBank.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { isCustom } from '../lib/honestyPredicate.js';
import { buildPreviewRoleTokens } from '../lib/previewTokens.js';
import { hexToHsl, hslToHex } from '../lib/colorUtils.js';
import { simulateColorVision } from '../lib/accessibility.js';
import { buildCopyToastMessage } from '../lib/copyToast.js';
import { requestGate } from '../lib/gateEvents.js';
import { getTokenTeaser } from '../lib/tokenTeaser.js';
import { loadPlaygroundSession, savePlaygroundSession } from '../lib/sessionPersistence.js';
import { STICKY_DELAY_MS, shouldShowStickyBar } from '../lib/stickyBar.js';
import { buildTheme } from '../lib/theme/engine.js';

const HARMONY_MODES = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
const DISPLAY_MODES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'pop', label: 'Pop' },
];
const SCENES = [
  { id: 'hero', label: 'Hero' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'shop', label: 'Shop' },
];
const EXPLORATION_SEEDS = [
  { baseColor: '#7f6bb3', mode: 'Analogous', themeMode: 'dark' },
  { baseColor: '#d48267', mode: 'Tertiary', themeMode: 'light' },
  { baseColor: '#2f8c83', mode: 'Complementary', themeMode: 'pop' },
  { baseColor: '#c4a24d', mode: 'Monochromatic', themeMode: 'dark' },
];

const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const toSeedHex = (value) => {
  const trimmed = String(value ?? '').trim();
  const candidate = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return `#${candidate.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : null;
};

const createPresetState = (kit) => {
  const seed = KIT_SEEDS[kit.id];
  return {
    kitId: kit.id,
    explorationName: '',
    baseColor: seed.baseColor,
    baseInput: seed.baseColor,
    harmony: seed.mode,
    themeMode: seed.themeMode,
    hueNudge: 0,
    satNudge: 0,
    lockedSwatches: {},
    swatchOverrides: {},
    regenerateCount: 0,
    userHasMutated: false,
    isChaosMinted: false,
    chaosIndex: 0,
    confirmedModes: { [seed.themeMode]: true },
  };
};

const createExplorationState = (seed, name, chaosIndex) => ({
  kitId: null,
  explorationName: name,
  baseColor: seed.baseColor,
  baseInput: seed.baseColor,
  harmony: seed.mode,
  themeMode: seed.themeMode,
  hueNudge: 0,
  satNudge: 0,
  lockedSwatches: {},
  swatchOverrides: {},
  regenerateCount: 0,
  userHasMutated: false,
  isChaosMinted: true,
  chaosIndex,
  confirmedModes: { [seed.themeMode]: true },
});

const buildThemeForState = (state, name) => buildTheme({
  name,
  baseColor: state.baseColor,
  mode: state.harmony,
  themeMode: state.themeMode,
  isDark: state.themeMode === 'dark',
  accentHueShift: state.hueNudge,
  accentSaturationShift: state.satNudge,
});

const getPaletteSwatches = (theme) => {
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
};

const getRenderedSwatches = (state, theme) => getPaletteSwatches(theme).map((swatch, index) => {
  const locked = hasOwn(state.lockedSwatches, index);
  return {
    ...swatch,
    color: locked
      ? state.lockedSwatches[index]
      : state.swatchOverrides[index] || swatch.color,
    locked,
  };
});

const regenerateSwatch = (color, index, iteration) => {
  const hsl = hexToHsl(color);
  const hueShift = 9 + ((index * 17 + iteration * 23) % 48);
  const saturation = Math.max(8, Math.min(96, hsl.s + (index % 2 === 0 ? 5 : -4)));
  const lightness = Math.max(8, Math.min(92, hsl.l + (index % 3 === 0 ? 3 : -3)));
  return hslToHex(hsl.h + hueShift, saturation, lightness);
};

const markMutation = (state, patch) => ({
  ...state,
  ...patch,
  userHasMutated: state.kitId ? true : state.userHasMutated,
  swatchOverrides: {},
});

const PreviewScene = ({ scene, roles, swatches, artifactLabel, onCopy }) => {
  if (scene === 'dashboard') {
    return (
      <div className="playground-scene playground-dashboard-scene" style={{ backgroundColor: roles.surface }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="playground-kicker">Studio overview</p>
            <h2 className="playground-scene-title">Good morning, Mira.</h2>
            <p className="playground-scene-copy">A calm place to see what is moving through the collection.</p>
          </div>
          <span className="playground-scene-date">Tuesday · 09:41</span>
        </div>
        <div className="playground-metric-grid">
          {[
            ['Active pieces', '24'],
            ['Saved signals', '08'],
            ['New this week', '+12%'],
          ].map(([label, value]) => (
            <div key={label} className="playground-metric" style={{ borderColor: roles.border }}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="playground-activity" style={{ borderColor: roles.border }}>
          <div className="flex items-center justify-between gap-3">
            <span className="playground-kicker">Recent movement</span>
            <span className="text-xs opacity-70">{artifactLabel}</span>
          </div>
          {['A new field note was added', 'Three colors were approved', 'The evening edit was shared'].map((item, index) => (
            <div key={item} className="playground-activity-row" style={{ borderColor: roles.border }}>
              <span className="playground-activity-dot" style={{ backgroundColor: swatches[index]?.color || roles.cta }} />
              <span>{item}</span>
              <span className="ml-auto text-xs opacity-60">{index + 1}h</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (scene === 'shop') {
    return (
      <div className="playground-scene playground-shop-scene" style={{ backgroundColor: roles.surface }}>
        <div className="flex items-center justify-between gap-3">
          <span className="playground-kicker">Field notes / 04</span>
          <span className="text-xs font-semibold opacity-70">Limited run</span>
        </div>
        <div className="playground-shop-grid">
          <div className="playground-product-art" style={{ background: `linear-gradient(145deg, ${roles.cta}, ${roles.accent}, ${roles.secondaryAction})` }}>
            <div className="playground-product-art-inner">
              <span>AP</span>
              <strong>Afterlight</strong>
              <small>Color study no. 04</small>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="playground-kicker">The current edit</p>
            <h2 className="playground-scene-title">Objects for slow mornings.</h2>
            <p className="playground-scene-copy">A considered set of small things, chosen for the way they sit together.</p>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" className="playground-scene-button" style={{ backgroundColor: roles.cta, color: roles.ctaForeground }}>
                View the edit
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
              <span className="text-sm font-bold">$48</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="playground-scene playground-hero-scene" style={{ backgroundColor: roles.surface }}>
      <div className="playground-hero-copy">
        <p className="playground-kicker">A living collection of useful beauty</p>
        <h2 className="playground-scene-title playground-hero-title">Explore the collection.</h2>
        <p className="playground-scene-copy">
          Pieces with a pulse, gathered for rooms, rituals, and the quiet pleasure of finding the right thing.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="playground-scene-button" style={{ backgroundColor: roles.cta, color: roles.ctaForeground }}>
            Browse the edit
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
          <span className="text-xs font-semibold opacity-70">Curated weekly · made to linger</span>
        </div>
      </div>
      <div className="playground-hero-colorfield" style={{ background: `linear-gradient(145deg, ${roles.cta}, ${roles.accent}, ${roles.secondaryAction})` }}>
        <div className="playground-colorfield-label">
          <span>Now showing</span>
          <strong>{artifactLabel}</strong>
        </div>
        <div className="playground-colorfield-swatches">
          {swatches.slice(0, 5).map(({ color, name }) => (
            <button
              key={`${name}-${color}`}
              type="button"
              onClick={() => onCopy(color)}
              className="playground-colorfield-swatch"
              style={{ backgroundColor: color }}
              title={`Copy ${name} ${color}`}
              aria-label={`Copy ${name} swatch ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TastingRoom = () => {
  const [restoredSession] = useState(() => loadPlaygroundSession());
  const [playground, setPlayground] = useState(() => restoredSession?.playground || createPresetState(KITS[0]));
  const [showTuning, setShowTuning] = useState(false);
  const [scene, setScene] = useState('hero');
  const [visionMode, setVisionMode] = useState('normal');
  const [copyCount, setCopyCount] = useState(() => restoredSession?.copyCount || 0);
  const [copyToast, setCopyToast] = useState('');
  const [engagementElapsed, setEngagementElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEngagementElapsed(true), STICKY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const kit = playground.kitId ? KITS.find((candidate) => candidate.id === playground.kitId) : null;
  const manifestKit = kit || KITS[0];
  const custom = isCustom({
    userHasMutated: playground.userHasMutated,
    isChaosMinted: playground.isChaosMinted,
  });
  const hasModeConfirmation = Object.values(playground.confirmedModes).some(Boolean);
  const showStickyBar = shouldShowStickyBar({
    elapsedMs: engagementElapsed ? STICKY_DELAY_MS : 0,
    hasModeConfirmation,
    copyCount,
  });

  useEffect(() => {
    savePlaygroundSession({ playground, isCustom: custom, copyCount });
  }, [copyCount, custom, playground]);
  const artifactLabel = playground.isChaosMinted
    ? formatArtifactName({ explorationName: playground.explorationName })
    : custom && kit
      ? `Custom exploration · inspired by ${kit.name}`
      : formatArtifactName({ kit });
  const theme = useMemo(
    () => buildThemeForState(playground, artifactLabel),
    [artifactLabel, playground],
  );
  const previewRoles = useMemo(
    () => buildPreviewRoleTokens(theme.tokens, playground.themeMode),
    [playground.themeMode, theme.tokens],
  );
  const swatches = useMemo(
    () => getRenderedSwatches(playground, theme),
    [playground, theme],
  );
  const visionRoles = useMemo(
    () => Object.fromEntries(Object.entries(previewRoles).map(([key, color]) => [
      key,
      simulateColorVision(color, visionMode),
    ])),
    [previewRoles, visionMode],
  );
  const visionSwatches = useMemo(
    () => swatches.map((swatch) => ({
      ...swatch,
      color: simulateColorVision(swatch.color, visionMode),
    })),
    [swatches, visionMode],
  );
  const { tokens: teaserTokens } = useMemo(
    () => getTokenTeaser(swatches, manifestKit),
    [manifestKit, swatches],
  );

  const selectPreset = (id) => {
    const nextKit = KITS.find((candidate) => candidate.id === id);
    if (nextKit) setPlayground(createPresetState(nextKit));
  };

  const mintChaos = () => {
    setPlayground((current) => {
      const nextIndex = current.chaosIndex + 1;
      const seed = EXPLORATION_SEEDS[nextIndex % EXPLORATION_SEEDS.length];
      const name = randomExplorationName(() => ((nextIndex % NAME_BANK.length) + 0.5) / NAME_BANK.length);
      return createExplorationState(seed, name, nextIndex);
    });
  };

  const handleSeedInput = (value) => {
    const candidate = toSeedHex(value);
    setPlayground((current) => {
      if (!candidate) return { ...current, baseInput: value };
      if (candidate === current.baseColor) return { ...current, baseInput: value };
      return markMutation(current, { baseColor: candidate, baseInput: candidate });
    });
  };

  const handleSeedBlur = () => {
    setPlayground((current) => ({ ...current, baseInput: current.baseColor }));
  };

  const handleHarmonyChange = (harmony) => {
    setPlayground((current) => {
      if (harmony === current.harmony) return current;
      return markMutation(current, { harmony });
    });
  };

  const handleHueNudge = (value) => {
    const next = Number(value);
    setPlayground((current) => (
      next === current.hueNudge ? current : markMutation(current, { hueNudge: next })
    ));
  };

  const handleSatNudge = (value) => {
    const next = Number(value);
    setPlayground((current) => (
      next === current.satNudge ? current : markMutation(current, { satNudge: next })
    ));
  };

  const toggleMode = (mode) => {
    setPlayground((current) => ({
      ...current,
      themeMode: mode,
      confirmedModes: { ...current.confirmedModes, [mode]: true },
      swatchOverrides: {},
    }));
  };

  const toggleSwatchLock = (index) => {
    setPlayground((current) => {
      const currentTheme = buildThemeForState(current, artifactLabel);
      const currentSwatches = getRenderedSwatches(current, currentTheme);
      const nextLocked = { ...current.lockedSwatches };
      const nextOverrides = { ...current.swatchOverrides };
      if (hasOwn(nextLocked, index)) {
        delete nextLocked[index];
        nextOverrides[index] = currentSwatches[index]?.color;
      } else if (currentSwatches[index]) {
        nextLocked[index] = currentSwatches[index].color;
        delete nextOverrides[index];
      }
      return {
        ...current,
        lockedSwatches: nextLocked,
        swatchOverrides: nextOverrides,
        userHasMutated: current.kitId ? true : current.userHasMutated,
      };
    });
  };

  const regenerateUnlocked = () => {
    setPlayground((current) => {
      const nextIteration = current.regenerateCount + 1;
      const currentTheme = buildThemeForState(current, artifactLabel);
      const currentSwatches = getRenderedSwatches(current, currentTheme);
      const nextOverrides = { ...current.swatchOverrides };
      currentSwatches.forEach((swatch, index) => {
        if (!hasOwn(current.lockedSwatches, index)) {
          nextOverrides[index] = regenerateSwatch(swatch.color, index, nextIteration);
        }
      });
      return {
        ...current,
        regenerateCount: nextIteration,
        swatchOverrides: nextOverrides,
        userHasMutated: current.kitId ? true : current.userHasMutated,
      };
    });
  };

  const resetToOriginal = () => {
    if (kit) setPlayground(createPresetState(kit));
  };

  const copySingleHex = (color) => {
    if (!color) return;
    setCopyToast(buildCopyToastMessage(color, copyCount));
    setCopyCount((current) => current + 1);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(color).catch(() => {});
    }
  };

  return (
    <div className="tasting-room min-h-screen">
      {copyToast && (
        <div className="playground-copy-toast" role="status" aria-live="polite">
          {copyToast}
        </div>
      )}
      {showStickyBar && (
        <aside className="tasting-sticky-bar" aria-label="Complete token pack">
          <p>Loving this palette? The complete token pack is in the kit.</p>
          <button type="button" onClick={() => requestGate('sticky-bar')}>
            See the complete kit
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </aside>
      )}
      <a href="#tasting-main" className="tasting-skip-link">Skip to playground</a>

      <header className="tasting-header">
        <div className="tasting-frame flex items-center justify-between gap-4 py-5">
          <div>
            <p className="tasting-wordmark">Apocapalette</p>
            <p className="tasting-header-note">Palette playground</p>
          </div>
          <span className="tasting-header-mark">Public demo</span>
        </div>
      </header>

      <main id="tasting-main" className="tasting-frame space-y-7 py-10 sm:py-14">
        <section className="tasting-hero">
          <p className="tasting-eyebrow">Live palette playground</p>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="tasting-title">{artifactLabel}</h1>
            {custom && kit && !playground.isChaosMinted && (
              <span className="playground-artifact-number">No. {kit.artifactNo}</span>
            )}
          </div>
          <p className="tasting-subtitle">A palette showroom — explore freely, take the kit home.</p>
        </section>

        <div className="playground-layout">
          <section
            className="playground-preview"
            aria-label="Live website preview"
            style={{
              backgroundColor: previewRoles.background,
              borderColor: previewRoles.border,
              color: previewRoles.text,
            }}
          >
            <div className="playground-preview-topline">
              <div>
                <p className="playground-kicker">Live scene</p>
                <p className="text-xs font-semibold opacity-70">{playground.themeMode} mode · updates as you tune</p>
              </div>
              <div className="playground-scene-tabs" role="tablist" aria-label="Preview scenes">
                {SCENES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={scene === option.id}
                    onClick={() => setScene(option.id)}
                    className={scene === option.id ? 'is-active' : ''}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <PreviewScene
              scene={scene}
              roles={visionRoles}
              swatches={visionSwatches}
              artifactLabel={artifactLabel}
              onCopy={copySingleHex}
            />
          </section>

          <div className="playground-mobile-quick-controls" aria-label="Quick palette controls">
            <button type="button" className="mobile-quick-chaos" onClick={mintChaos}>
              <Sparkles size={14} aria-hidden="true" />
              Chaos
            </button>
            <div className="mobile-quick-locks" aria-label="Quick swatch locks">
              {swatches.slice(0, 4).map(({ name, color, locked }, index) => (
                <button
                  key={`${name}-${index}`}
                  type="button"
                  className={`mobile-lock-chip ${locked ? 'is-locked' : ''}`}
                  onClick={() => toggleSwatchLock(index)}
                  aria-label={`${locked ? 'Unlock' : 'Lock'} ${name} swatch`}
                  title={`${locked ? 'Unlock' : 'Lock'} ${name}`}
                >
                  <span style={{ backgroundColor: color }} />
                  {locked ? <Lock size={12} aria-hidden="true" /> : <Unlock size={12} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          <aside className="playground-controls tasting-panel" aria-label="Playground controls">
            <div className="playground-control-heading">
              <div>
                <p className="tasting-eyebrow">Make it yours</p>
                <h2 className="tasting-panel-title">Tune the palette</h2>
              </div>
              <button
                type="button"
                onClick={mintChaos}
                className="playground-chaos-button"
                aria-label="Mint a new chaos exploration"
              >
                <Sparkles size={14} aria-hidden="true" />
                Chaos
              </button>
            </div>

            <label className="playground-control-label" htmlFor="kit-preset">
              Curated preset
              <select id="kit-preset" value={playground.kitId || 'exploration'} onChange={(event) => selectPreset(event.target.value)} className="playground-select">
                {playground.kitId === null && <option value="exploration">Current exploration</option>}
                {KITS.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    Artifact No. {candidate.artifactNo} — {candidate.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="playground-control-block">
              <span className="playground-control-label">Seed color</span>
              <div className="playground-seed-row">
                <input
                  type="color"
                  value={playground.baseColor}
                  onChange={(event) => handleSeedInput(event.target.value)}
                  aria-label="Seed color swatch"
                  className="playground-color-input"
                />
                <input
                  type="text"
                  value={playground.baseInput}
                  onChange={(event) => handleSeedInput(event.target.value)}
                  onBlur={handleSeedBlur}
                  aria-label="Seed color hex"
                  className="playground-hex-input"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="playground-control-block">
              <span className="playground-control-label">Harmony</span>
              <div className="playground-chip-grid" role="group" aria-label="Harmony mode">
                {HARMONY_MODES.map((harmony) => (
                  <button
                    key={harmony}
                    type="button"
                    onClick={() => handleHarmonyChange(harmony)}
                    aria-pressed={playground.harmony === harmony}
                    className={`playground-chip ${playground.harmony === harmony ? 'is-active' : ''}`}
                  >
                    {harmony}
                  </button>
                ))}
              </div>
            </div>

            <div className="playground-control-block">
              <span className="playground-control-label">Preview mode</span>
              <div className="playground-mode-row" role="group" aria-label="Preview mode">
                {DISPLAY_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => toggleMode(mode.value)}
                    aria-pressed={playground.themeMode === mode.value}
                    className={`playground-mode-pill ${playground.themeMode === mode.value ? 'is-active' : ''}`}
                  >
                    {mode.label}
                    {playground.confirmedModes[mode.value] && (
                      <Sparkles size={11} aria-label="confirmed" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="playground-control-block">
              <button
                type="button"
                onClick={() => setShowTuning((current) => !current)}
                className="playground-tuning-toggle"
                aria-expanded={showTuning}
              >
                <span>Fine-tune nudges</span>
                <span>{showTuning ? 'Hide' : 'Show'}</span>
              </button>
              {showTuning && (
                <div className="playground-tuning-panel">
                  <label>
                    Hue nudge
                    <input type="range" min="-30" max="30" value={playground.hueNudge} onChange={(event) => handleHueNudge(event.target.value)} aria-label="Hue nudge" />
                    <span>{playground.hueNudge}°</span>
                  </label>
                  <label>
                    Saturation nudge
                    <input type="range" min="-30" max="30" value={playground.satNudge} onChange={(event) => handleSatNudge(event.target.value)} aria-label="Saturation nudge" />
                    <span>{playground.satNudge}%</span>
                  </label>
                </div>
              )}
              <p className="playground-session-note">Tweaks live in this browser session.</p>
            </div>

            <div className="playground-control-block">
              <div className="flex items-center justify-between gap-3">
                <span className="playground-control-label">Swatch locks</span>
                <button type="button" onClick={regenerateUnlocked} className="playground-regenerate-button">
                  <RefreshCcw size={13} aria-hidden="true" />
                  Regenerate unlocked
                </button>
              </div>
              <div className="playground-swatch-grid">
                {swatches.slice(0, 8).map(({ name, color, locked }, index) => (
                  <div key={`${name}-${index}`} className="playground-swatch-card">
                    <button
                      type="button"
                      className="playground-swatch-color"
                      style={{ backgroundColor: color }}
                      onClick={() => copySingleHex(color)}
                      aria-label={`Copy ${name} swatch ${color}`}
                      title={`Copy ${name} ${color}`}
                    />
                    <span className="playground-swatch-name">{name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSwatchLock(index)}
                      className="playground-lock-button"
                      aria-label={`${locked ? 'Unlock' : 'Lock'} ${name} swatch`}
                      title={`${locked ? 'Unlock' : 'Lock'} ${name}`}
                    >
                      {locked ? <Lock size={12} aria-hidden="true" /> : <Unlock size={12} aria-hidden="true" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {kit && custom && (
              <button type="button" onClick={resetToOriginal} className="playground-reset-button">
                Reset to original {kit.name} seed
              </button>
            )}
            <p className="playground-control-note">
              {custom ? 'Custom exploration · your edits are part of this palette.' : `${kit?.teaserTokenCount || 12} teaser tokens from the curated kit.`}
            </p>
          </aside>
        </div>

        <TokenTeaser manifest={manifestKit} tokens={teaserTokens} onCopy={copySingleHex} />

        <VaultStrip manifest={manifestKit} />

        <ClimaxGate
          manifest={manifestKit}
          isCustom={custom}
          paletteSeed={playground.baseColor}
        />

        <PlaygroundAccessibility
          roles={previewRoles}
          visionMode={visionMode}
          onVisionModeChange={setVisionMode}
        />

        <div className="tasting-panel flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="tasting-eyebrow">The shelf</p>
            <p className="tasting-muted">{BUNDLE.blurb}</p>
          </div>
          <p className="text-lg font-bold">${BUNDLE.price} bundle</p>
        </div>

        <ForgeCta />

        <KitGallery />
      </main>

      <TastingFooter />
    </div>
  );
};

export default TastingRoom;
