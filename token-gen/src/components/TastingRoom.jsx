import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Lock,
  RefreshCcw,
  Sparkles,
  Unlock,
} from 'lucide-react';
import HowItWorks from './HowItWorks.jsx';
import KitGallery from './KitGallery.jsx';
import PlaygroundHandoff from './PlaygroundHandoff.jsx';
import PlaygroundAccessibility from './PlaygroundAccessibility.jsx';
import PlaygroundLibrary from './PlaygroundLibrary.jsx';
import PlaygroundMoodBoard from './PlaygroundMoodBoard.jsx';
import PlaygroundTokenInspector from './PlaygroundTokenInspector.jsx';
import SuggestKitInvitation from './SuggestKitInvitation.jsx';
import SuggestKitDialog from './SuggestKitDialog.jsx';
import TastingFooter from './TastingFooter.jsx';
import { INSPIRATION_SEEDS, KIT_SEEDS } from '../data/kits.js';
import { NAME_BANK, randomExplorationName } from '../data/nameBank.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { isCustom } from '../lib/honestyPredicate.js';
import { buildPreviewRoleTokens } from '../lib/previewTokens.js';
import { hexToHsl, hslToHex } from '../lib/colorUtils.js';
import { simulateColorVision } from '../lib/accessibility.js';
import { buildCopyToastMessage } from '../lib/copyToast.js';
import { resolveHandoffAccent, resolveOnAccentText } from '../lib/handoffAccent.js';
import { decodePlaygroundHash, encodePlaygroundHash } from '../lib/playgroundLink.js';
import { loadPlaygroundSession, savePlaygroundSession } from '../lib/sessionPersistence.js';
import { buildTheme } from '../lib/theme/engine.js';
import { captureKitSuggestion } from '../lib/kitSuggestion.js';
import {
  loadSavedPlaygroundPalettes,
  savePlaygroundPalette,
} from '../lib/savedPlaygroundPalettes.js';

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
  { id: 'mood', label: 'Mood' },
];
const MAIN_TOKEN_PATHS = [
  'brand.primary',
  'brand.secondary',
  'brand.accent',
  'brand.cta',
  'surfaces.background',
  'cards.card-panel-surface',
  'cards.card-panel-border',
  'typography.text-body',
  'typography.heading',
  'typography.text-muted',
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
    modeStates: {},
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
  modeStates: {},
  userHasMutated: false,
  isChaosMinted: true,
  chaosIndex,
  confirmedModes: { [seed.themeMode]: true },
});

const restoreLinkedPlayground = (payload) => ({
  ...payload,
  baseInput: payload.baseInput ?? payload.baseColor,
  regenerateCount: payload.regenerateCount ?? 0,
  modeStates: payload.modeStates ?? {},
  userHasMutated: payload.userHasMutated ?? Boolean(payload.kitId && !payload.isChaosMinted),
  confirmedModes: payload.confirmedModes || { [payload.themeMode]: true },
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
    .map(({ name, path, value }) => ({ name, path, color: value }))
    .filter(({ color }) => isHexColor(color));
  const fallback = [
    { name: 'Primary', path: 'brand.primary', color: theme.tokens.brand?.primary },
    { name: 'Secondary', path: 'brand.secondary', color: theme.tokens.brand?.secondary },
    { name: 'Accent', path: 'brand.accent', color: theme.tokens.brand?.accent },
    { name: 'Surface', path: 'cards.card-panel-surface', color: theme.tokens.cards?.['card-panel-surface'] },
    { name: 'Text', path: 'typography.text-body', color: theme.tokens.typography?.['text-body'] },
    { name: 'CTA', path: 'brand.cta', color: theme.tokens.brand?.cta },
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

const getRenderedTokenValues = (state, theme) => {
  const paletteValues = new Map(getRenderedSwatches(state, theme)
    .filter(({ path }) => path)
    .map(({ path, color }) => [path, color]));
  return theme.orderedStack.map((token) => ({
    ...token,
    value: paletteValues.get(token.path) || token.value,
  }));
};

const selectMainTokenValues = (tokens) => {
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  return MAIN_TOKEN_PATHS.map((path) => byPath.get(path)).filter(Boolean);
};

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

const setTokenValue = (tokens, path, value) => {
  const [key, ...remaining] = path.split('.');
  if (!key) return tokens;
  return {
    ...tokens,
    [key]: remaining.length
      ? setTokenValue(tokens[key] || {}, remaining.join('.'), value)
      : value,
  };
};

const applyRenderedSwatchesToTokens = (tokens, swatches) => swatches.reduce(
  (result, { path, color }) => (path ? setTokenValue(result, path, color) : result),
  tokens,
);

const PreviewScene = ({ scene, roles, swatches, artifactLabel, onCopy, harmony, themeMode }) => {
  if (scene === 'mood') {
    return (
      <PlaygroundMoodBoard
        roles={roles}
        swatches={swatches}
        harmony={harmony}
        themeMode={themeMode}
      />
    );
  }

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
  const [linkedPlayground] = useState(() => (
    typeof window === 'undefined' ? null : decodePlaygroundHash(window.location.hash)
  ));
  const [playground, setPlayground] = useState(() => (
    linkedPlayground
      ? restoreLinkedPlayground(linkedPlayground)
      : restoredSession?.playground || createPresetState({ id: 'nuclear-winter' })
  ));
  const [hasModifiedPalette, setHasModifiedPalette] = useState(false);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [suggestionCapture, setSuggestionCapture] = useState(null);
  const [scene, setScene] = useState('hero');
  const [visionMode, setVisionMode] = useState('normal');
  const [copyCount, setCopyCount] = useState(() => restoredSession?.copyCount || 0);
  const [copyToast, setCopyToast] = useState('');
  const [savedPalettes, setSavedPalettes] = useState(() => loadSavedPlaygroundPalettes());
  const [selectedSavedPaletteId, setSelectedSavedPaletteId] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const seedInfo = playground.kitId
    ? INSPIRATION_SEEDS.find((candidate) => candidate.id === playground.kitId)
    : null;
  const custom = isCustom({
    userHasMutated: playground.userHasMutated,
    isChaosMinted: playground.isChaosMinted,
  });
  useEffect(() => {
    savePlaygroundSession({ playground, isCustom: custom, copyCount });
  }, [copyCount, custom, playground]);
  useEffect(() => {
    if (!copyToast) return undefined;
    const timeout = globalThis.setTimeout(() => setCopyToast(''), 2200);
    return () => globalThis.clearTimeout(timeout);
  }, [copyToast]);
  const artifactLabel = playground.isChaosMinted
    ? formatArtifactName({ explorationName: playground.explorationName })
    : custom && seedInfo
      ? `Custom exploration · inspired by ${seedInfo.name}`
      : seedInfo
        ? `${seedInfo.name} seed`
        : formatArtifactName({ explorationName: playground.explorationName });
  const theme = useMemo(
    () => buildThemeForState(playground, artifactLabel),
    [artifactLabel, playground],
  );
  const handoffAccent = useMemo(() => {
    const accent = resolveHandoffAccent({ theme, baseColor: playground.baseColor });
    return { accent, onAccent: resolveOnAccentText(accent) };
  }, [playground.baseColor, theme]);
  const previewRoles = useMemo(
    () => buildPreviewRoleTokens(
      applyRenderedSwatchesToTokens(theme.tokens, getRenderedSwatches(playground, theme)),
      playground.themeMode,
    ),
    [playground, theme],
  );
  const swatches = useMemo(
    () => getRenderedSwatches(playground, theme),
    [playground, theme],
  );
  const tokenValues = useMemo(
    () => getRenderedTokenValues(playground, theme),
    [playground, theme],
  );
  const mainTokenValues = useMemo(
    () => selectMainTokenValues(tokenValues),
    [tokenValues],
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

  const markPaletteModified = () => {
    setHasModifiedPalette(true);
    setSaveStatus('idle');
  };

  const selectPreset = (id) => {
    if (!KIT_SEEDS[id]) return;
    const nextPreset = createPresetState({ id });
    if (JSON.stringify(playground) !== JSON.stringify(nextPreset)) markPaletteModified();
    setPlayground(nextPreset);
  };

  const mintChaos = () => {
    markPaletteModified();
    setPlayground((current) => {
      const nextIndex = current.chaosIndex + 1;
      const seed = EXPLORATION_SEEDS[nextIndex % EXPLORATION_SEEDS.length];
      const name = randomExplorationName(() => ((nextIndex % NAME_BANK.length) + 0.5) / NAME_BANK.length);
      return createExplorationState(seed, name, nextIndex);
    });
  };

  const handleSeedInput = (value) => {
    const candidate = toSeedHex(value);
    if (candidate && candidate !== playground.baseColor) markPaletteModified();
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
    if (harmony !== playground.harmony) markPaletteModified();
    setPlayground((current) => {
      if (harmony === current.harmony) return current;
      return markMutation(current, { harmony });
    });
  };

  const handleHueNudge = (value) => {
    const next = Number(value);
    if (next !== playground.hueNudge) markPaletteModified();
    setPlayground((current) => (
      next === current.hueNudge ? current : markMutation(current, { hueNudge: next })
    ));
  };

  const handleSatNudge = (value) => {
    const next = Number(value);
    if (next !== playground.satNudge) markPaletteModified();
    setPlayground((current) => (
      next === current.satNudge ? current : markMutation(current, { satNudge: next })
    ));
  };

  const toggleMode = (mode) => {
    if (
      mode !== playground.themeMode
      || Object.keys(playground.swatchOverrides).length > 0
      || !playground.confirmedModes[mode]
    ) markPaletteModified();
    setPlayground((current) => {
      const modeStates = {
        ...current.modeStates,
        [current.themeMode]: {
          lockedSwatches: { ...current.lockedSwatches },
          swatchOverrides: { ...current.swatchOverrides },
          regenerateCount: current.regenerateCount,
        },
      };
      const targetState = modeStates[mode];
      return {
        ...current,
        themeMode: mode,
        confirmedModes: { ...current.confirmedModes, [mode]: true },
        modeStates,
        lockedSwatches: targetState?.lockedSwatches
          ? { ...targetState.lockedSwatches }
          : { ...current.lockedSwatches },
        swatchOverrides: targetState?.swatchOverrides
          ? { ...targetState.swatchOverrides }
          : {},
        regenerateCount: targetState?.regenerateCount ?? current.regenerateCount,
      };
    });
  };

  const toggleSwatchLock = (index) => {
    markPaletteModified();
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

  const handleSwatchColorChange = (index, color) => {
    if (!isHexColor(color)) return;
    markPaletteModified();
    setPlayground((current) => {
      const lockedSwatches = { ...current.lockedSwatches };
      const swatchOverrides = { ...current.swatchOverrides };
      if (hasOwn(lockedSwatches, index)) {
        lockedSwatches[index] = color;
      } else {
        swatchOverrides[index] = color;
      }
      return {
        ...current,
        lockedSwatches,
        swatchOverrides,
        userHasMutated: current.kitId ? true : current.userHasMutated,
      };
    });
  };

  const regenerateUnlocked = () => {
    markPaletteModified();
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
    if (seedInfo) setPlayground(createPresetState({ id: seedInfo.id }));
  };

  const copySingleHex = (color) => {
    if (!color) return;
    setCopyToast(buildCopyToastMessage(color, copyCount));
    setCopyCount((current) => current + 1);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(color).catch(() => {});
    }
  };

  const copyTokenValue = ({ path, value }) => {
    if (value === null || value === undefined) return;
    const text = String(value);
    setCopyToast(`Copied ${path}: ${text}.`);
    setCopyCount((current) => current + 1);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const copyPaletteLink = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = buildCurrentShareUrl(playground);
    setCopyToast('Copied link to this palette.');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
  };

  const buildCurrentShareUrl = (state) => (
    typeof window === 'undefined'
      ? encodePlaygroundHash(state)
      : `${window.location.origin}${window.location.pathname}${encodePlaygroundHash(state)}`
  );

  const openSuggestionDialog = () => {
    setSuggestionCapture(captureKitSuggestion({
      playground,
      swatches,
      shareLink: buildCurrentShareUrl(playground),
    }));
    setIsSuggestionDialogOpen(true);
  };

  const saveCurrentPalette = () => {
    try {
      const savedPalette = savePlaygroundPalette({ playground, name: artifactLabel });
      setSavedPalettes((current) => [savedPalette, ...current]);
      setSelectedSavedPaletteId(savedPalette.id);
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    }
  };

  const loadSelectedPalette = () => {
    const savedPalette = savedPalettes.find(({ id }) => id === selectedSavedPaletteId);
    if (!savedPalette) return;
    markPaletteModified();
    setPlayground(JSON.parse(JSON.stringify(savedPalette.playground)));
  };

  return (
    <div className="tasting-room min-h-screen">
      {copyToast && (
        <div className="playground-copy-toast" role="status" aria-live="polite">
          {copyToast}
        </div>
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
          <p className="tasting-eyebrow">LIVE PALETTE PLAYGROUND</p>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="tasting-title">Make a palette worth keeping.</h1>
          </div>
          <p className="tasting-subtitle">Generate a sketch here. Ship with a finished 59-token kit — Light, Dark, Pop, seven production formats — from $9.</p>
        </section>

        {(custom || hasModifiedPalette) && (
          <div className="playground-handoff-row">
            {custom && (
              <PlaygroundHandoff
                onCopyLink={copyPaletteLink}
                accent={handoffAccent.accent}
                onAccent={handoffAccent.onAccent}
              />
            )}
            <SuggestKitInvitation visible={hasModifiedPalette} onSuggest={openSuggestionDialog} />
          </div>
        )}

        <PlaygroundLibrary
          savedPalettes={savedPalettes}
          selectedPaletteId={selectedSavedPaletteId}
          saveStatus={saveStatus}
          onSave={saveCurrentPalette}
          onSelectedPaletteChange={setSelectedSavedPaletteId}
          onLoad={loadSelectedPalette}
          onCopyLink={copyPaletteLink}
          showShareLink={!custom}
        />

        <SuggestKitDialog
          open={isSuggestionDialogOpen}
          capture={suggestionCapture}
          onRequestClose={() => setIsSuggestionDialogOpen(false)}
        />

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
              harmony={playground.harmony}
              themeMode={playground.themeMode}
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
            <p className="playground-palette-status">{artifactLabel}</p>

            <label className="playground-control-label" htmlFor="kit-preset">
              Starting point
              <select id="kit-preset" value={playground.kitId || 'exploration'} onChange={(event) => selectPreset(event.target.value)} className="playground-select">
                {playground.kitId === null && <option value="exploration">Current exploration</option>}
                {INSPIRATION_SEEDS.map((seed) => (
                  <option key={seed.id} value={seed.id}>
                    {seed.name} seed
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

            <details className="playground-advanced-refinement">
              <summary>Advanced refinement</summary>
              <div className="playground-advanced-content">
                <details className="playground-advanced-subpanel">
                  <summary>Fine-tune nudges</summary>
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
                  <p className="playground-session-note">Tweaks are kept in this browser.</p>
                </details>

                <div className="playground-control-block">
                  <div className="playground-advanced-heading">
                    <span className="playground-control-label">Swatch edits and locks</span>
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
                        <div className="playground-swatch-meta">
                          <div>
                            <span className="playground-swatch-name">{name}</span>
                            <code>{color.toUpperCase()}</code>
                          </div>
                          <label className="playground-swatch-edit">
                            <span className="sr-only">Edit {name} swatch color</span>
                            <input
                              type="color"
                              value={color}
                              onChange={(event) => handleSwatchColorChange(index, event.target.value)}
                              aria-label={`Edit ${name} swatch color`}
                              title={`Edit ${name} color`}
                            />
                          </label>
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
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </details>

            {seedInfo && custom && (
              <button type="button" onClick={resetToOriginal} className="playground-reset-button">
                Reset to original {seedInfo.name} seed
              </button>
            )}
            <p className="playground-control-note">
              {custom ? 'Custom exploration · your edits are part of this palette.' : 'Starting seed · make it yours.'}
            </p>
          </aside>
        </div>

        <PlaygroundTokenInspector tokens={mainTokenValues} onCopy={copyTokenValue} />

        <PlaygroundAccessibility
          roles={previewRoles}
          visionMode={visionMode}
          onVisionModeChange={setVisionMode}
        />

        <KitGallery />

        <HowItWorks />
      </main>

      <TastingFooter />
    </div>
  );
};

export default TastingRoom;
