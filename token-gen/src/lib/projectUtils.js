import { normalizeHex } from './colorUtils.js';
import { buildOrderedStack, generateTokens } from './tokens.js';

export const PROJECT_SCHEMA_VERSION = 1;

export const DEFAULT_PROJECT_SETTINGS = {
  neutralCap: 8,
  maxColors: 40,
  nearDupThreshold: 2.0,
  anchorsAlwaysKeep: true,
};

export const createEmptyProject = () => ({
  schemaVersion: PROJECT_SCHEMA_VERSION,
  projectName: 'New Project',
  settings: { ...DEFAULT_PROJECT_SETTINGS },
  sections: [],
});

const normalizeModeValue = (mode) => {
  if (!mode) return 'mono';
  const value = String(mode).toLowerCase();
  if (value.startsWith('mono')) return 'mono';
  if (value.startsWith('anal')) return 'analogous';
  if (value.startsWith('comp')) return 'complementary';
  if (value.startsWith('apo')) return 'apocalypse';
  if (value.startsWith('ter')) return 'tertiary';
  return 'mono';
};

export const toGeneratorMode = (projectMode) => {
  const value = normalizeModeValue(projectMode);
  if (value === 'analogous') return 'Analogous';
  if (value === 'complementary') return 'Complementary';
  if (value === 'tertiary') return 'Tertiary';
  if (value === 'apocalypse') return 'Apocalypse';
  return 'Monochromatic';
};

export const toProjectMode = (generatorMode) => normalizeModeValue(generatorMode);

const normalizeKind = (kind) => {
  if (!kind) return 'season';
  const value = String(kind).toLowerCase();
  if (value.includes('season')) return 'season';
  if (value.includes('character') || value.includes('people')) return 'people';
  if (value.includes('state')) return 'state';
  return 'season';
};

const isValidHex = (value) => Boolean(value && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value));

const normalizeHexValue = (value) => {
  if (!isValidHex(value)) return null;
  return normalizeHex(value);
};

const normalizeTokens = (tokens) => {
  if (!tokens || typeof tokens !== 'object') return undefined;
  const entries = Object.entries(tokens)
    .map(([key, value]) => [key, normalizeHexValue(value)])
    .filter(([, value]) => value);
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
};

const normalizeColors = (colors) => {
  if (!Array.isArray(colors)) return undefined;
  const normalized = colors
    .map((color) => {
      if (!color || typeof color !== 'object') return null;
      const name = String(color.name || '').trim();
      const hex = normalizeHexValue(color.hex);
      if (!name || !hex) return null;
      return { name, hex };
    })
    .filter(Boolean);
  return normalized.length ? normalized : undefined;
};

const normalizeSection = (section, index) => {
  const id = String(section?.id || `section-${index + 1}`);
  const label = String(section?.label || `Section ${index + 1}`);
  const kind = normalizeKind(section?.kind || section?.role);
  const baseHex = normalizeHexValue(section?.baseHex || section?.anchorHex) || '#6366f1';
  const mode = normalizeModeValue(section?.mode || section?.generatorMode);
  const locked = Boolean(section?.locked);
  const tokens = normalizeTokens(section?.tokens);
  const colors = normalizeColors(section?.colors);

  return {
    id,
    label,
    kind,
    baseHex,
    mode,
    locked,
    ...(tokens ? { tokens } : {}),
    ...(colors ? { colors } : {}),
  };
};

export const normalizeProject = (project) => {
  if (!project || typeof project !== 'object') return createEmptyProject();
  const settings = project.settings && typeof project.settings === 'object'
    ? project.settings
    : {};

  const normalizedSettings = {
    neutralCap: Number.isFinite(settings.neutralCap) ? settings.neutralCap : DEFAULT_PROJECT_SETTINGS.neutralCap,
    maxColors: Number.isFinite(settings.maxColors) ? settings.maxColors : DEFAULT_PROJECT_SETTINGS.maxColors,
    nearDupThreshold: Number.isFinite(settings.nearDupThreshold) ? settings.nearDupThreshold : DEFAULT_PROJECT_SETTINGS.nearDupThreshold,
    anchorsAlwaysKeep: typeof settings.anchorsAlwaysKeep === 'boolean' ? settings.anchorsAlwaysKeep : DEFAULT_PROJECT_SETTINGS.anchorsAlwaysKeep,
  };

  const sections = Array.isArray(project.sections)
    ? project.sections
    : Array.isArray(project.palettes)
    ? project.palettes
    : [];

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectName: String(project.projectName || 'New Project'),
    settings: normalizedSettings,
    sections: sections.map(normalizeSection),
  };
};

const readTokenValue = (tokens, path) => {
  if (!tokens) return null;
  const parts = path.split('.');
  let current = tokens;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  if (current && typeof current === 'object' && 'value' in current) return current.value;
  return current ?? null;
};

const ROLE_TOKEN_PATHS = {
  background: 'surfaces.background',
  surface: 'cards.card-panel-surface',
  primary: 'brand.primary',
  secondary: 'brand.secondary',
  accent: 'brand.accent',
  cta: 'brand.cta',
  text: 'typography.text-body',
  muted: 'typography.text-muted',
  warning: 'foundation.status.warning',
  dark: 'foundation.neutrals.neutral-9',
};

export const buildSectionSnapshotFromPalette = (paletteState) => {
  if (!paletteState || typeof paletteState !== 'object') return null;
  const baseHex = normalizeHexValue(paletteState.baseColor) || '#6366f1';
  const generatorMode = paletteState.mode || 'Monochromatic';
  const themeMode = paletteState.themeMode || (paletteState.isDark ? 'dark' : 'light');
  const apocalypseIntensity = paletteState.apocalypseIntensity ?? 100;
  const harmonyIntensity = paletteState.harmonyIntensity ?? 100;
  const neutralCurve = paletteState.neutralCurve ?? 100;
  const accentStrength = paletteState.accentStrength ?? 100;
  const popIntensity = paletteState.popIntensity ?? 100;

  const tokens = generateTokens(baseHex, generatorMode, themeMode, apocalypseIntensity, {
    harmonyIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
  });

  const roleTokens = Object.entries(ROLE_TOKEN_PATHS)
    .map(([key, path]) => [key, normalizeHexValue(readTokenValue(tokens, path))])
    .filter(([, value]) => value);

  const colors = buildOrderedStack(tokens)
    .map((swatch) => ({
      name: swatch.name,
      hex: normalizeHexValue(swatch.value),
    }))
    .filter((swatch) => swatch.hex);

  return {
    baseHex,
    mode: toProjectMode(generatorMode),
    tokens: roleTokens.length ? Object.fromEntries(roleTokens) : undefined,
    colors: colors.length ? colors : undefined,
  };
};
