import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Lock,
  Sparkles,
  Unlock,
} from 'lucide-react';
import KitGallery from './KitGallery.jsx';
import PlaygroundAccessibility from './PlaygroundAccessibility.jsx';
import PlaygroundCodeExport from './PlaygroundCodeExport.jsx';
import PlaygroundLibrary from './PlaygroundLibrary.jsx';
import PlaygroundMoodBoard from './PlaygroundMoodBoard.jsx';
import SuggestKitInvitation from './SuggestKitInvitation.jsx';
import SuggestKitDialog from './SuggestKitDialog.jsx';
import TastingFooter from './TastingFooter.jsx';
import { INSPIRATION_SEEDS, KIT_SEEDS } from '../data/kits.js';
import { formatArtifactName } from '../lib/artifactNaming.js';
import { isCustom } from '../lib/honestyPredicate.js';
import { buildPreviewRoleTokens } from '../lib/previewTokens.js';
import { hexToHsl, hslToHex, pickReadableText } from '../lib/colorUtils.js';
import { colorVisionOptions, simulateColorVision } from '../lib/accessibility.js';
import {
  buildSemanticPaletteSwatches,
  SEMANTIC_PALETTE_ROLES,
} from '../lib/playgroundPalette.js';
import { buildCopyToastMessage } from '../lib/copyToast.js';
import { decodePlaygroundHash, encodePlaygroundHash } from '../lib/playgroundLink.js';
import { loadPlaygroundSession, savePlaygroundSession } from '../lib/sessionPersistence.js';
import { buildTheme } from '../lib/theme/engine.js';
import { captureKitSuggestion } from '../lib/kitSuggestion.js';
import { phraseToSeedColor } from '../lib/seedColor.js';
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
const GENERATION_HARMONY_INTENSITIES = [100, 114, 86, 126, 94, 108, 78, 120];
const GENERATION_HUE_OFFSETS = [0, 15, -15, 28, -28, 42, -42, 8];

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
    semanticPalette: true,
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

const buildThemeForState = (state, name) => {
  const generationIndex = (state.regenerateCount || 0) % GENERATION_HARMONY_INTENSITIES.length;
  const baseHsl = hexToHsl(state.baseColor);
  const generatedBase = GENERATION_HUE_OFFSETS[generationIndex] === 0
    ? state.baseColor
    : hslToHex(baseHsl.h + GENERATION_HUE_OFFSETS[generationIndex], baseHsl.s, baseHsl.l);
  return buildTheme({
    name,
    baseColor: generatedBase,
    mode: state.harmony,
    themeMode: state.themeMode,
    isDark: state.themeMode === 'dark',
    harmonyIntensity: GENERATION_HARMONY_INTENSITIES[generationIndex],
    accentHueShift: state.hueNudge,
    accentSaturationShift: state.satNudge,
  });
};

const getLegacyPaletteSwatches = (theme) => {
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

const getPaletteSwatches = (theme) => buildSemanticPaletteSwatches(theme.tokens)
  .filter(({ color }) => isHexColor(color));

const remapLegacySwatchRecord = (record, theme) => {
  const legacySwatches = getLegacyPaletteSwatches(theme);
  const roleIndices = new Map(SEMANTIC_PALETTE_ROLES.map(({ path }, index) => [path, index]));
  roleIndices.set('brand.primary', SEMANTIC_PALETTE_ROLES.findIndex(({ id }) => id === 'cta'));
  return Object.entries(record || {}).reduce((mapped, [legacyIndex, color]) => {
    const roleIndex = roleIndices.get(legacySwatches[Number(legacyIndex)]?.path);
    if (roleIndex !== undefined && isHexColor(color)) mapped[roleIndex] = color;
    return mapped;
  }, {});
};

const restoreLinkedPlayground = (payload) => {
  const normalized = {
    ...payload,
    baseInput: payload.baseInput ?? payload.baseColor,
    regenerateCount: payload.regenerateCount ?? 0,
    modeStates: payload.modeStates ?? {},
    lockedSwatches: payload.lockedSwatches ?? {},
    swatchOverrides: payload.swatchOverrides ?? {},
    userHasMutated: payload.userHasMutated ?? Boolean(payload.kitId && !payload.isChaosMinted),
    confirmedModes: payload.confirmedModes || { [payload.themeMode]: true },
  };
  if (normalized.semanticPalette === true) return normalized;

  const currentTheme = buildThemeForState({ ...normalized, regenerateCount: 0 }, 'Current palette');
  const modeStates = Object.fromEntries(Object.entries(normalized.modeStates).map(([mode, modeState]) => {
    const modeTheme = buildThemeForState({ ...normalized, themeMode: mode, regenerateCount: 0 }, 'Current palette');
    return [mode, {
      ...modeState,
      lockedSwatches: remapLegacySwatchRecord(modeState.lockedSwatches, modeTheme),
      swatchOverrides: remapLegacySwatchRecord(modeState.swatchOverrides, modeTheme),
    }];
  }));

  return {
    ...normalized,
    semanticPalette: true,
    lockedSwatches: remapLegacySwatchRecord(normalized.lockedSwatches, currentTheme),
    swatchOverrides: remapLegacySwatchRecord(normalized.swatchOverrides, currentTheme),
    modeStates,
  };
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

const PreviewScene = ({
  scene,
  roles,
  swatches,
  sourceSwatches,
  artifactLabel,
  onCopy,
  harmony,
  themeMode,
  seedColor,
  selectedRole,
  onRoleSelect,
  onApplySuggestion,
}) => {
  if (scene === 'mood') {
    return (
      <PlaygroundMoodBoard
        roles={roles}
        swatches={swatches}
        sourceSwatches={sourceSwatches}
        harmony={harmony}
        themeMode={themeMode}
        seedColor={seedColor}
        selectedRole={selectedRole}
        onRoleSelect={onRoleSelect}
        onApplySuggestion={onApplySuggestion}
      />
    );
  }

  if (scene === 'dashboard') {
    return (
      <div className="playground-scene playground-dashboard-scene" style={{ backgroundColor: roles.surface }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="playground-kicker">Studio overview</p>
            <h2 className="playground-scene-title" style={{ color: roles.heading }}>Good morning, Mira.</h2>
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
            <h2 className="playground-scene-title" style={{ color: roles.heading }}>Objects for slow mornings.</h2>
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
        <p className="playground-kicker">A living collection</p>
        <h2 className="playground-scene-title playground-hero-title" style={{ color: roles.heading }}>Explore the collection.</h2>
        <p className="playground-scene-copy">
          Useful pieces, chosen for rooms and rituals.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="playground-scene-button" style={{ backgroundColor: roles.cta, color: roles.ctaForeground }}>
            Browse the edit
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
          <span className="text-xs font-semibold opacity-70">Curated with care</span>
        </div>
      </div>
      <div className="playground-hero-colorfield" style={{
        background: `linear-gradient(118deg, ${roles.cta} 0 48%, ${roles.accent} 48% 72%, ${roles.secondaryAction} 72%)`,
        '--artifact-ink': roles.background,
        '--artifact-paper': roles.surface,
        '--artifact-label': pickReadableText(roles.cta),
        '--artifact-label-surface': roles.cta,
      }}>
        <div className="playground-artifact-composition" aria-hidden="true"><span /><span /></div>
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
      : restoreLinkedPlayground(restoredSession?.playground || createPresetState({ id: 'nuclear-winter' }))
  ));
  const [hasModifiedPalette, setHasModifiedPalette] = useState(false);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [suggestionCapture, setSuggestionCapture] = useState(null);
  const [scene, setScene] = useState('hero');
  const [selectedMoodRole, setSelectedMoodRole] = useState(null);
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
  const previewRoles = useMemo(
    () => {
      const renderedSwatches = getRenderedSwatches(playground, theme);
      const appliedTokens = applyRenderedSwatchesToTokens(theme.tokens, renderedSwatches);
      const preview = buildPreviewRoleTokens(appliedTokens, playground.themeMode);
      const roleColors = Object.fromEntries(renderedSwatches.map(({ id, color }) => [id, color]));
      const cta = roleColors.cta || preview.cta;
      const muted = roleColors.muted || preview.mutedText;
      return {
        ...preview,
        background: roleColors.background || preview.background,
        surface: roleColors.surface || preview.surface,
        text: roleColors.text || preview.text,
        heading: roleColors.heading || preview.text,
        muted,
        mutedText: muted,
        accent: roleColors.accent || preview.accent,
        cta,
        ctaText: pickReadableText(cta),
        ctaForeground: pickReadableText(cta),
      };
    },
    [playground, theme],
  );
  const swatches = useMemo(
    () => getRenderedSwatches(playground, theme),
    [playground, theme],
  );
  const codeRoles = useMemo(() => ({
    ...Object.fromEntries(swatches.map(({ id, color }) => [id, color])),
    border: previewRoles.border,
    ctaText: previewRoles.ctaText,
  }), [previewRoles, swatches]);
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

  const surpriseMe = () => {
    const bytes = new Uint8Array(3);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
    }
    const seed = `#${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    markPaletteModified();
    setPlayground((current) => {
      return {
        ...current,
        kitId: null,
        explorationName: 'Surprise palette',
        baseColor: seed,
        baseInput: seed,
        regenerateCount: 0,
        swatchOverrides: {},
        userHasMutated: true,
        isChaosMinted: true,
        chaosIndex: current.chaosIndex + 1,
      };
    });
  };

  const handleSeedInput = (value) => {
    const candidate = toSeedHex(value) || phraseToSeedColor(value);
    if (!candidate) {
      setPlayground((current) => ({ ...current, baseInput: value }));
      return;
    }
    if (candidate !== playground.baseColor || value !== playground.baseInput) markPaletteModified();
    setPlayground((current) => {
      if (candidate === current.baseColor) return { ...current, baseInput: value };
      return markMutation(current, {
        baseColor: candidate,
        baseInput: value,
        regenerateCount: 0,
      });
    });
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

  const applyMoodSuggestion = (roleId, color) => {
    const roleIndex = SEMANTIC_PALETTE_ROLES.findIndex(({ id }) => id === (roleId || selectedMoodRole || 'accent'));
    if (roleIndex >= 0) handleSwatchColorChange(roleIndex, color);
  };

  const regenerateUnlocked = () => {
    markPaletteModified();
    setPlayground((current) => {
      const nextIteration = current.regenerateCount + 1;
      return {
        ...current,
        regenerateCount: nextIteration,
        swatchOverrides: {},
        userHasMutated: current.kitId ? true : current.userHasMutated,
      };
    });
  };

  useEffect(() => {
    const regenerateOnSpace = (event) => {
      if ((event.code !== 'Space' && event.key !== ' ') || event.repeat) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, button, a[href], summary, [contenteditable="true"], [role="tab"]')) return;
      event.preventDefault();
      setHasModifiedPalette(true);
      setSaveStatus('idle');
      setPlayground((current) => ({
        ...current,
        regenerateCount: current.regenerateCount + 1,
        swatchOverrides: {},
        userHasMutated: current.kitId ? true : current.userHasMutated,
      }));
    };

    window.addEventListener('keydown', regenerateOnSpace);
    return () => window.removeEventListener('keydown', regenerateOnSpace);
  }, []);

  const copySingleHex = (color) => {
    if (!color) return;
    setCopyToast(buildCopyToastMessage(color, copyCount));
    setCopyCount((current) => current + 1);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(color).catch(() => {});
    }
  };

  const copyPaletteArtifact = async (value, confirmation) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setCopyToast(confirmation);
    } catch {
      setCopyToast('Could not copy. Please try again.');
    }
  };

  const copyPaletteCode = (code) => {
    setCopyCount((current) => current + 1);
    void copyPaletteArtifact(code, 'Palette code copied.');
  };

  const copyPaletteLink = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = buildCurrentShareUrl(playground);
    void copyPaletteArtifact(shareUrl, 'Copied share link.');
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
    setSaveStatus('loaded');
  };

  return (
    <div className="tasting-room min-h-screen">
      {copyToast && (
        <div className={copyToast === 'Palette code copied.' || copyToast === 'Copied share link.' ? 'sr-only' : 'playground-copy-toast'} role="status" aria-live="polite">
          {copyToast}
        </div>
      )}
      <a href="#tasting-main" className="tasting-skip-link">Skip to palette creator</a>

      <main id="tasting-main" className="tasting-frame playground-page-content py-5 sm:py-6">
        <header className="playground-page-header">
          <span className="playground-page-brand">Apocapalette · The Tasting Room</span>
          <h1>Make a palette worth keeping.</h1>
          <p>Pick a seed color. Get seven roles. See them on a real page, then check they&apos;re readable.</p>
        </header>

        <div className="playground-console">
          <aside className="playground-controls" aria-label="Playground controls">
            <p className="playground-palette-status">{artifactLabel}</p>

            <div className="playground-control-block">
              <label className="playground-control-label" htmlFor="playground-seed-input">1. Seed color</label>
              <div className="playground-seed-row">
                <input
                  type="color"
                  value={playground.baseColor}
                  onChange={(event) => handleSeedInput(event.target.value)}
                  aria-label="Seed color swatch"
                  className="playground-color-input"
                />
                <input
                  id="playground-seed-input"
                  type="text"
                  value={playground.baseInput}
                  onChange={(event) => handleSeedInput(event.target.value)}
                  aria-label="Seed color hex or phrase"
                  placeholder="#7f1d1d or a phrase"
                  className="playground-hex-input"
                  spellCheck="false"
                />
              </div>
              <p className="playground-seed-help">A phrase always hashes to the same seed and palette.</p>
            </div>

            <div className="playground-control-block">
              <span className="playground-control-label">2. Color relationship</span>
              <div className="playground-chip-grid" role="group" aria-label="Color relationship">
                {HARMONY_MODES.map((harmony) => (
                  <button
                    key={harmony}
                    type="button"
                    onClick={() => handleHarmonyChange(harmony)}
                    aria-pressed={playground.harmony === harmony}
                    className={'playground-chip' + (playground.harmony === harmony ? ' is-active' : '')}
                  >
                    {harmony}
                  </button>
                ))}
              </div>
            </div>

            <div className="playground-control-block">
              <span className="playground-control-label">3. Theme</span>
              <div className="playground-mode-row" role="group" aria-label="Theme">
                {DISPLAY_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => toggleMode(mode.value)}
                    aria-pressed={playground.themeMode === mode.value}
                    className={'playground-mode-pill' + (playground.themeMode === mode.value ? ' is-active' : '')}
                  >
                    {mode.label}
                    {playground.confirmedModes[mode.value] && (
                      <Sparkles size={11} aria-label="confirmed" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={regenerateUnlocked} className="playground-generate-button">
              <span>Regenerate</span>
            </button>
            <p className="playground-regeneration-note">
              Press Space to regenerate. Locked roles stay put. Everything else is rebuilt from your seed.
            </p>

            <button type="button" onClick={surpriseMe} className="playground-surprise-button">
              Surprise me
            </button>

            <details className="playground-advanced-refinement">
              <summary>Advanced options</summary>
              <div className="playground-tuning-panel">
                <label>
                  Hue shift
                  <input type="range" min="-30" max="30" value={playground.hueNudge} onChange={(event) => handleHueNudge(event.target.value)} aria-label="Hue shift" />
                  <span>{playground.hueNudge}°</span>
                </label>
                <label>
                  Saturation shift
                  <input type="range" min="-30" max="30" value={playground.satNudge} onChange={(event) => handleSatNudge(event.target.value)} aria-label="Saturation shift" />
                  <span>{playground.satNudge}%</span>
                </label>
              </div>
            </details>
          </aside>

          <section className="playground-creator-workspace" aria-label="Live palette and preview">
            <section className="playground-generator-panel tasting-panel" aria-labelledby="playground-generator-title">
              <div className="playground-current-palette">
                <div className="playground-palette-heading">
                  <div>
                    <p className="playground-kicker">Generated from one seed</p>
                    <h2 id="playground-generator-title" className="tasting-panel-title">Your seven roles</h2>
                  </div>
                  <p>Lock to keep, pick a color to edit, tap the hex to copy.</p>
                </div>
                <div className="playground-role-grid" role="group" aria-label="Generated semantic palette">
                  {swatches.map(({ id, name, color, locked }, index) => (
                    <article className={'playground-role-card' + (selectedMoodRole === id ? ' is-selected' : '') + (locked ? ' is-locked' : '')} key={id}>
                      <div className="playground-role-card-heading">
                        <button
                          type="button"
                          className="playground-role-select"
                          onClick={() => setSelectedMoodRole(id)}
                          aria-pressed={selectedMoodRole === id}
                          aria-label={'Select ' + name + ' for Mood suggestions'}
                        >
                          {name}
                        </button>
                        <button
                          type="button"
                          className={'playground-role-lock' + (locked ? ' is-locked' : '')}
                          onClick={() => toggleSwatchLock(index)}
                          aria-label={(locked ? 'Unlock ' : 'Lock ') + name + ' role'}
                          title={(locked ? 'Unlock ' : 'Lock ') + name + ' role'}
                        >
                          {locked ? <Lock size={13} aria-hidden="true" /> : <Unlock size={13} aria-hidden="true" />}
                        </button>
                      </div>
                      <div className="playground-role-paint" style={{ backgroundColor: color }}>
                        <input
                          type="color"
                          value={color}
                          onChange={(event) => handleSwatchColorChange(index, event.target.value)}
                          aria-label={'Edit ' + name + ' role color'}
                          title={'Edit ' + name + ' role color'}
                          className="playground-role-color-picker"
                        />
                      </div>
                      <button
                        type="button"
                        className="playground-role-copy"
                        onClick={() => copySingleHex(color)}
                        aria-label={'Copy ' + name + ' role color ' + color.toUpperCase()}
                      >
                        <code>{color.toUpperCase()}</code>
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section
              className="playground-preview"
              aria-labelledby="playground-preview-title"
            >
              <div className="playground-preview-topline">
                <div className="playground-preview-heading">
                  <p className="tasting-eyebrow">On a real page</p>
                  <h2 id="playground-preview-title" className="tasting-panel-title">Live preview</h2>
                  <p className="playground-preview-mode">{playground.themeMode} theme · updates as you tune</p>
                </div>
                <label className="playground-vision-select-label">
                  Colour-vision simulator
                  <select aria-label="Colour-vision simulator" value={visionMode} onChange={(event) => setVisionMode(event.target.value)}>
                    {colorVisionOptions
                      .filter(({ key }) => ['normal', 'protanopia', 'deuteranopia', 'tritanopia'].includes(key))
                      .map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </label>
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
                sourceSwatches={swatches}
                artifactLabel={artifactLabel}
                onCopy={copySingleHex}
                harmony={playground.harmony}
                themeMode={playground.themeMode}
                seedColor={playground.baseColor}
                selectedRole={selectedMoodRole}
                onRoleSelect={setSelectedMoodRole}
                onApplySuggestion={applyMoodSuggestion}
              />
            </section>
          </section>
        </div>

        <PlaygroundLibrary
          swatches={swatches}
          savedPalettes={savedPalettes}
          selectedPaletteId={selectedSavedPaletteId}
          saveStatus={saveStatus}
          linkCopied={copyToast === 'Copied share link.'}
          onSave={saveCurrentPalette}
          onSelectedPaletteChange={setSelectedSavedPaletteId}
          onLoad={loadSelectedPalette}
          onCopyLink={copyPaletteLink}
        />

        {hasModifiedPalette && (
          <div className="playground-suggestion-row" key="playground-suggestion-row">
            <SuggestKitInvitation visible onSuggest={openSuggestionDialog} />
          </div>
        )}

        <div className="playground-followup-grid">
          <PlaygroundAccessibility roles={previewRoles} />
          <PlaygroundCodeExport roles={codeRoles} onCopy={copyPaletteCode} copied={copyToast === 'Palette code copied.'} />
        </div>

        <KitGallery />

        <SuggestKitDialog
          open={isSuggestionDialogOpen}
          capture={suggestionCapture}
          onRequestClose={() => setIsSuggestionDialogOpen(false)}
        />
      </main>

      <TastingFooter />
    </div>
  );
};

export default TastingRoom;
