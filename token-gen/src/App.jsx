import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense, useContext } from 'react';
import { FileText, Image as ImageIcon, Shuffle } from 'lucide-react';
import ProjectView from './components/ProjectView';
import { StageNav } from './components/stages/StageLayout';
import IdentityStage from './components/stages/IdentityStage';
import BuildStage from './components/stages/BuildStage';
import ValidateStage from './components/stages/ValidateStage';
import PackageStage from './components/stages/PackageStage';
import ExportStage from './components/stages/ExportStage';
import MoodBoard from './components/MoodBoard';
import ListingAssetsCanvas from './components/ListingAssetsCanvas';
import useDarkClassSync from './hooks/useDarkClassSync';
import useShareLink from './hooks/useShareLink';
import { useNotification } from './context/NotificationContext.jsx';
import { PaletteContext } from './context/PaletteContext.jsx';
import { ProjectContext } from './context/ProjectContext.jsx';
import { HistoryProvider } from './context/HistoryContext.jsx';
import { MoodBoardProvider } from './context/MoodBoardContext.jsx';
import {
  escapeXml,
  getContrastRatio,
  getWCAGBadge,
  hexToHsl,
  hexToRgb,
  hexWithAlpha,
  hslToHex,
  normalizeHex,
  pickReadableText,
} from './lib/colorUtils';
import { orderedSwatchSpec } from './lib/tokens';
import { nestTokens } from './lib/theme/paths';
import { buildGenericPayload, buildPenpotPayload, buildWitchcraftPayload, buildFigmaTokensPayload, buildStyleDictionaryPayload } from './lib/payloads';
import { toPenpotTokens } from './lib/penpotTokens';
import { buildThemeCss, getThemeClassName, THEME_CLASSNAMES } from './lib/themeStyles';
import { buildTheme } from './lib/theme/engine';
import { buildCssVariables } from './lib/theme/styles';
import { downloadFile, exportJson as exportJsonFile, exportAssets, exportThemePack, buildExportFilename, slugifyFilename } from './lib/export';
import { generateDesignSpacePalette } from './lib/exports/designSpacePalette';
import { buildSectionSnapshotFromPalette, toGeneratorMode } from './lib/projectUtils';
import { exportSingleMoodBoard, exportMoodBoardCollection } from './lib/exportMoodBoards';

const encoder = new TextEncoder();
const encodeText = (str) => encoder.encode(str);

const concatUint8 = (arrays) => {
  const total = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  arrays.forEach((arr) => {
    out.set(arr, offset);
    offset += arr.length;
  });
  return out;
};

const writeOctal = (buffer, offset, length, value) => {
  const octal = value.toString(8).padStart(length - 1, '0');
  const chars = `${octal} `;
  for (let i = 0; i < length; i += 1) {
    buffer[offset + i] = i < chars.length ? chars.charCodeAt(i) : 0;
  }
};

const writeString = (buffer, offset, length, value) => {
  const bytes = encodeText(value);
  const len = Math.min(bytes.length, length);
  buffer.set(bytes.subarray(0, len), offset);
};

const STORAGE_KEYS = {
  current: 'token-gen/current-palette',
  saved: 'token-gen/saved-palettes',
};

const clampValue = (val, min, max) => Math.min(max, Math.max(min, Number(val)));
const adjustHexLuminance = (hex, delta) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clampValue(l + delta, 2, 98));
};
const sanitizeHexInput = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) return fallback;
  let hex = match[1].toLowerCase();
  if (hex.length === 8) hex = hex.slice(0, 6);
  return `#${hex}`;
};
const sanitizeThemeName = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean || fallback;
};
const sanitizePrefix = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-z0-9_.-]/gi, '').slice(0, 32);
};
const buildPrintTokenTree = (printTokenSet) => {
  if (!printTokenSet || typeof printTokenSet !== 'object') return null;
  const root = {};
  Object.entries(printTokenSet).forEach(([key, token]) => {
    if (!key) return;
    if (key === 'description' || key.startsWith('meta/')) return;
    const tokenValue = token && typeof token === 'object' && 'value' in token ? token.value : token;
    if (tokenValue == null) return;
    const segments = String(key).split('/').map((segment) => segment.trim()).filter(Boolean);
    if (!segments.length) return;
    const payload = token && typeof token === 'object' && 'type' in token && 'value' in token
      ? token
      : tokenValue;
    nestTokens(root, segments, payload);
  });
  return Object.keys(root).length ? root : null;
};
const THEME_PACK_GUIDANCE = {
  Monochromatic: {
    best: 'Calm product UI, editorial systems',
    not: 'High-energy multi-brand palettes',
  },
  Analogous: {
    best: 'Warm storytelling, immersive UI',
    not: 'Strictly neutral enterprise systems',
  },
  Complementary: {
    best: 'Bold CTA contrast, marketing',
    not: 'Subtle, low-contrast brands',
  },
  Tertiary: {
    best: 'Playful multi-accent products',
    not: 'Minimal single-accent systems',
  },
  Apocalypse: {
    best: 'Experimental visuals, game UI',
    not: 'Conservative enterprise apps',
  },
};
const getThemePackGuidance = (modeValue) => (
  THEME_PACK_GUIDANCE[modeValue] ?? {
    best: 'Product UI and brand systems',
    not: 'Single-use experiments',
  }
);

const TOKEN_VAR_MAP = new Map(
  orderedSwatchSpec.reduce((acc, { path, fallbackPath }) => {
    const key = path.replace(/\./g, '-');
    if (!acc.has(key)) acc.set(key, path);
    if (fallbackPath) {
      const fallbackKey = fallbackPath.replace(/\./g, '-');
      if (!acc.has(fallbackKey)) acc.set(fallbackKey, fallbackPath);
    }
    return acc;
  }, new Map())
);

const parseCssVariables = (cssText) => {
  const vars = new Map();
  if (typeof cssText !== 'string') return vars;
  const pattern = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
  let match = null;
  while ((match = pattern.exec(cssText)) !== null) {
    vars.set(match[1].trim(), match[2].trim());
  }
  return vars;
};

const resolveCssVar = (varName) => {
  let bestKey = null;
  let bestPath = null;
  TOKEN_VAR_MAP.forEach((path, key) => {
    if (varName === key || varName.endsWith(`-${key}`)) {
      if (!bestKey || key.length > bestKey.length) {
        bestKey = key;
        bestPath = path;
      }
    }
  });
  if (!bestKey) return null;
  const rawPrefix = varName.slice(0, varName.length - bestKey.length);
  const prefix = rawPrefix.endsWith('-') ? rawPrefix.slice(0, -1) : rawPrefix;
  return { path: bestPath, prefix: prefix || '' };
};

const buildOverridesFromCss = (cssText) => {
  const vars = parseCssVariables(cssText);
  const overrides = {};
  const prefixCounts = new Map();
  vars.forEach((value, name) => {
    const resolved = resolveCssVar(name);
    if (!resolved) return;
    overrides[resolved.path] = value;
    if (resolved.prefix) {
      prefixCounts.set(resolved.prefix, (prefixCounts.get(resolved.prefix) ?? 0) + 1);
    }
  });
  let detectedPrefix = '';
  let highest = 0;
  prefixCounts.forEach((count, prefix) => {
    if (count > highest) {
      highest = count;
      detectedPrefix = prefix;
    }
  });
  return { overrides, prefix: detectedPrefix };
};

const inferThemeMode = (value) => {
  if (typeof value !== 'string') return null;
  const clean = normalizeHex(value, '');
  if (!clean) return null;
  const { r, g, b } = hexToRgb(clean);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma < 0.45 ? 'dark' : 'light';
};

const STAGE_DEFS = [
  { id: 'identity', label: 'Identity' },
  { id: 'build', label: 'Build' },
  { id: 'validate', label: 'Validate' },
  { id: 'package', label: 'Package', tab: 'Print assets' },
  { id: 'export', label: 'Export', tab: 'Exports' },
];



const createTarArchive = (files) => {
  const blocks = [];

  files.forEach(({ name, data }) => {
    const header = new Uint8Array(512);
    writeString(header, 0, 100, name);
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, data.length);
    writeOctal(header, 136, 12, Math.floor(Date.now() / 1000));
    writeString(header, 156, 1, '0');
    writeString(header, 257, 6, 'ustar\0');
    writeString(header, 263, 2, '00');
    for (let i = 148; i < 156; i += 1) header[i] = 32;
    let sum = 0;
    for (let i = 0; i < 512; i += 1) sum += header[i];
    writeOctal(header, 148, 8, sum);

    blocks.push(header);
    blocks.push(data);

    const remainder = data.length % 512;
    if (remainder !== 0) {
      blocks.push(new Uint8Array(512 - remainder));
    }
  });

  blocks.push(new Uint8Array(1024));
  return concatUint8(blocks);
};

const renderPaletteCardPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const base = normalizeHex(theme.baseColor || '#6366f1');
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces['background'] || '#0b1021');
  const card = normalizeHex(surfaces['card-panel-surface'] || '#111827');
  const text = normalizeHex(typography['text-strong'] || '#0f172a');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // Backgrounds
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = card;
  ctx.beginPath();
  ctx.roundRect(60, 60, 1080, 680, 28);
  ctx.fill();
  ctx.strokeStyle = hexWithAlpha(primary, 0.13);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Accents
  ctx.fillStyle = hexWithAlpha(primary, 0.13);
  ctx.beginPath();
  ctx.roundRect(60, 140, 1080, 18, 9);
  ctx.fill();
  ctx.fillStyle = hexWithAlpha(primary, 0.2);
  ctx.beginPath();
  ctx.roundRect(60, 100, 360, 28, 14);
  ctx.fill();

  // Text
  ctx.fillStyle = text;
  ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(safeName, 80, 120);
  ctx.fillStyle = muted;
  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, sans-serif';
  const themeLabel = theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light');
  ctx.fillText(`Base ${base} • ${theme.mode} • ${themeLabel}`, 80, 170);

  // Gradient card
  const grad = ctx.createLinearGradient(720, 200, 1080, 520);
  grad.addColorStop(0, hexWithAlpha(primary, 0.95));
  grad.addColorStop(0.5, hexWithAlpha(secondary, 0.9));
  grad.addColorStop(1, hexWithAlpha(accent, 0.85));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(720, 200, 360, 320, 24);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 32px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Primary', 760, 250);
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(primary.toUpperCase(), 760, 290);
  ctx.fillText(secondary.toUpperCase(), 760, 330);
  ctx.fillText(accent.toUpperCase(), 760, 370);

  // Surface card
  ctx.fillStyle = card;
  ctx.strokeStyle = hexWithAlpha(primary, 0.2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(120, 240, 520, 280, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = text;
  ctx.font = '800 24px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Surfaces & Typography', 150, 280);
  ctx.fillStyle = muted;
  ctx.font = '500 16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Background ${bg}`, 150, 320);
  ctx.fillText(`Surface ${card}`, 150, 350);
  ctx.fillText(`Text ${text}`, 150, 380);
  ctx.fillText(`Muted ${muted}`, 150, 410);

  // Swatch circles
  const circles = [primary, secondary, accent, base];
  circles.forEach((c, idx) => {
    const x = 220 + idx * 100;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, 520, 38, 0, Math.PI * 2);
    ctx.fill();
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas export failed; no blob returned.'));
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
};

const renderStripPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const swatches = [
    brand.primary,
    brand.secondary,
    brand.accent,
    theme.baseColor,
    foundation['neutral-2'],
    foundation['neutral-4'],
    foundation['neutral-6'],
    foundation['neutral-8'],
  ].filter(Boolean).slice(0, 8).map((c) => normalizeHex(c));

  const canvas = document.createElement('canvas');
  canvas.width = 1500;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1500, 420);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`${safeName} • Swatch Strip`, 60, 60);

  swatches.forEach((color, idx) => {
    const x = 40 + idx * 170;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, 80, 140, 240, 22);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 14px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(color.toUpperCase(), x + 70, 340);
    ctx.textAlign = 'start';
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas export failed; no blob returned.'));
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
};

const buildPaletteCardSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const base = normalizeHex(theme.baseColor || '#6366f1');
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces['background'] || '#0b1021');
  const card = normalizeHex(surfaces['card-panel-surface'] || '#111827');
  const text = normalizeHex(typography['text-strong'] || '#0f172a');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');

  const header = escapeXml(safeName);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="${secondary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" rx="32" fill="${bg}" />
  <rect x="60" y="60" width="1080" height="680" rx="28" fill="${card}" stroke="${hexWithAlpha(primary, 0.13)}" stroke-width="2"/>
  <rect x="60" y="140" width="1080" height="18" rx="9" fill="${hexWithAlpha(primary, 0.13)}"/>
  <rect x="60" y="100" width="360" height="28" rx="14" fill="${hexWithAlpha(primary, 0.2)}"/>
  <text x="80" y="120" fill="${text}" font-family="Inter, system-ui" font-weight="700" font-size="18">${header}</text>
  <text x="80" y="170" fill="${muted}" font-family="Inter, system-ui" font-weight="500" font-size="14">Base ${base} • ${escapeXml(theme.mode)} • ${theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light')}</text>
  <rect x="720" y="200" width="360" height="320" rx="24" fill="url(#grad)" opacity="0.9"/>
  <text x="760" y="250" fill="#fff" font-family="Inter, system-ui" font-size="32" font-weight="800">Primary</text>
  <text x="760" y="290" fill="#fff" font-family="Inter, system-ui" font-size="18" font-weight="600">${primary}</text>
  <text x="760" y="330" fill="#fff" font-family="Inter, system-ui" font-size="18" font-weight="600">${secondary}</text>
  <text x="760" y="370" fill="#fff" font-family="Inter, system-ui" font-size="18" font-weight="600">${accent}</text>
  <rect x="120" y="240" width="520" height="280" rx="24" fill="${card}" stroke="${primary}33" stroke-width="2"/>
  <text x="150" y="280" fill="${text}" font-family="Inter, system-ui" font-size="24" font-weight="800">Surfaces & Typography</text>
  <text x="150" y="320" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Background ${bg}</text>
  <text x="150" y="350" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Surface ${card}</text>
  <text x="150" y="380" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Text ${text}</text>
  <text x="150" y="410" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Muted ${muted}</text>
  <circle cx="220" cy="520" r="38" fill="${primary}" />
  <circle cx="320" cy="520" r="38" fill="${secondary}" />
  <circle cx="420" cy="520" r="38" fill="${accent}" />
  <circle cx="520" cy="520" r="38" fill="${base}" />
</svg>`;
};

const buildStripSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const primaries = [
    brand.primary,
    brand.secondary,
    brand.accent,
    theme.baseColor,
    foundation['neutral-2'],
    foundation['neutral-4'],
    foundation['neutral-6'],
    foundation['neutral-8'],
  ].filter(Boolean);

  const swatches = primaries.slice(0, 8).map((color) => normalizeHex(color));
  const rects = swatches.map((color, idx) => {
    const x = 40 + idx * 170;
    return `<g>
      <rect x="${x}" y="80" width="140" height="240" rx="22" fill="${color}" />
      <text x="${x + 70}" y="340" fill="#0f172a" font-family="Inter, system-ui" font-size="14" font-weight="700" text-anchor="middle">${color.toUpperCase()}</text>
    </g>`;
  }).join('\\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1500" height="420" viewBox="0 0 1500 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="1500" height="420" rx="32" fill="#f8fafc" />
  <text x="60" y="60" fill="#0f172a" font-family="Inter, system-ui" font-size="22" font-weight="800">${escapeXml(safeName)} • Swatch Strip</text>
  ${rects}
</svg>`;
};

const getPrintTimestamps = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return { date, dateTime: `${date} ${time}` };
};

// --- Presets ---
const presets = [
  { name: 'Midnight Indigo', base: '#6366f1', mode: 'Monochromatic', dark: true },
  { name: 'Beef Ritual', base: '#7b241c', mode: 'Monochromatic', dark: true },
  { name: 'Solar Flare', base: '#f59e0b', mode: 'Analogous', dark: false },
  { name: 'Terracotta Sunrise', base: '#e2725b', mode: 'Analogous', dark: false },
  { name: 'Vapor Dream', base: '#ff8b94', mode: 'Tertiary', dark: false },
  { name: 'Nuclear Winter', base: '#a7f432', mode: 'Apocalypse', dark: true },
  { name: 'Corporate Compliance', base: '#000000', mode: 'Monochromatic', dark: true },
];

export default function App() {
  const { notify } = useNotification();
  const isDev = import.meta.env.DEV;
  const isInternal = import.meta.env.VITE_INTERNAL === 'true';
  const [view, setView] = useState('palette');
  const [baseColor, setBaseColor] = useState('#7b241c');
  const [baseInput, setBaseInput] = useState('#7b241c');
  const [baseError, setBaseError] = useState('');
  const [mode, setMode] = useState('Monochromatic');
  const [themeMode, setThemeMode] = useState('dark'); // light | dark | pop
  const [printMode, setPrintMode] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');
  const [showContrast, setShowContrast] = useState(true);
  const [importedOverrides, setImportedOverrides] = useState(null);
  const [currentStage, setCurrentStage] = useState('Identity');
  const [harmonyIntensity, setHarmonyIntensity] = useState(100);
  const [apocalypseIntensity, setApocalypseIntensity] = useState(100);
  const [neutralCurve, setNeutralCurve] = useState(100);
  const [accentStrength, setAccentStrength] = useState(100);
  const [popIntensity, setPopIntensity] = useState(100);
  const [harmonyInput, setHarmonyInput] = useState(100);
  const [neutralInput, setNeutralInput] = useState(100);
  const [accentInput, setAccentInput] = useState(100);
  const [apocalypseInput, setApocalypseInput] = useState(100);
  const [popInput, setPopInput] = useState(100);
  const [activeTab, setActiveTab] = useState('Quick view');
  const [tokenPrefix, setTokenPrefix] = useState('');
  const [savedPalettes, setSavedPalettes] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(null);
  const [storageCorrupt, setStorageCorrupt] = useState(false);
  const [storageQuotaExceeded, setStorageQuotaExceeded] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportBlocked, setExportBlocked] = useState(false);
  const [printSupported, setPrintSupported] = useState(true);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [printMeta, setPrintMeta] = useState(() => getPrintTimestamps());
  const savedTitleRef = useRef('');
  const exportsSectionRef = useRef(null);
  const harmonyDebounceRef = useRef(null);
  const neutralDebounceRef = useRef(null);
  const accentDebounceRef = useRef(null);
  const apocalypseDebounceRef = useRef(null);
  const popDebounceRef = useRef(null);
  const savedPaletteInputRef = useRef(null);
  const listingCoverRef = useRef(null);
  const listingSwatchRef = useRef(null);
  const listingSnippetRef = useRef(null);
  const [showFineTune, setShowFineTune] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [chaosMenuOpen, setChaosMenuOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [projectEdit, setProjectEdit] = useState(null);
  const [projectExportStatus, setProjectExportStatus] = useState('');
  const [projectExporting, setProjectExporting] = useState(false);
  const [projectPenpotStatus, setProjectPenpotStatus] = useState('');
  const [projectPenpotExporting, setProjectPenpotExporting] = useState(false);
  const statusTimerRef = useRef(null);
  const pickerColor = baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor;

  // History state for undo/redo functionality
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const MAX_HISTORY = 50;
  // Controls the UI theme (preview background)
  // Usually we want this to sync with generated tokens for best preview, but nice to keep separate for inspection
  // For this UX, I will sync them. When you generate Dark Tokens, the UI becomes dark.

  const setStatusMessage = useCallback((message, tone = 'info') => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setSaveStatus(message);
    notify(message, tone);
    statusTimerRef.current = setTimeout(() => setSaveStatus(''), 2400);
  }, [notify]);

  // History management functions
  const addToHistory = useCallback((state) => {
    // If we're not at the end of history, truncate everything after current index
    const newHistory = history.slice(0, currentIndex + 1);
    // Add the new state
    newHistory.push(state);
    // Limit history to MAX_HISTORY items, removing oldest if necessary
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
      setCurrentIndex(MAX_HISTORY - 1);
    } else {
      setCurrentIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  }, [history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const prevState = history[currentIndex - 1];
      setCurrentIndex(prevIndex => prevIndex - 1);

      // Restore state from history
      setBaseColor(prevState.baseColor);
      setBaseInput(prevState.baseInput);
      setBaseError(prevState.baseError);
      setMode(prevState.mode);
      setThemeMode(prevState.themeMode);
      setPrintMode(prevState.printMode);
      setCustomThemeName(prevState.customThemeName);
      setHarmonyIntensity(prevState.harmonyIntensity);
      setApocalypseIntensity(prevState.apocalypseIntensity);
      setNeutralCurve(prevState.neutralCurve);
      setAccentStrength(prevState.accentStrength);
      setPopIntensity(prevState.popIntensity);
      setTokenPrefix(prevState.tokenPrefix);
      setImportedOverrides(prevState.importedOverrides);
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextState = history[currentIndex + 1];
      setCurrentIndex(prevIndex => prevIndex + 1);

      // Restore state from history
      setBaseColor(nextState.baseColor);
      setBaseInput(nextState.baseInput);
      setBaseError(nextState.baseError);
      setMode(nextState.mode);
      setThemeMode(nextState.themeMode);
      setPrintMode(nextState.printMode);
      setCustomThemeName(nextState.customThemeName);
      setHarmonyIntensity(nextState.harmonyIntensity);
      setApocalypseIntensity(nextState.apocalypseIntensity);
      setNeutralCurve(nextState.neutralCurve);
      setAccentStrength(nextState.accentStrength);
      setPopIntensity(nextState.popIntensity);
      setTokenPrefix(nextState.tokenPrefix);
      setImportedOverrides(nextState.importedOverrides);
    }
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Capture current state for history
  const captureState = useCallback(() => ({
    baseColor,
    baseInput,
    baseError,
    mode,
    themeMode,
    printMode,
    customThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix,
    importedOverrides,
  }), [
    baseColor, baseInput, baseError, mode, themeMode, printMode,
    customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve,
    accentStrength, popIntensity, tokenPrefix, importedOverrides
  ]);

  // Add current state to history when it changes significantly
  useEffect(() => {
    const currentState = captureState();
    // Only add to history if state has actually changed significantly
    if (history.length === 0 || JSON.stringify(history[currentIndex]) !== JSON.stringify(currentState)) {
      addToHistory(currentState);
    }
  }, [
    baseColor, baseInput, baseError, mode, themeMode, printMode,
    customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve,
    accentStrength, popIntensity, tokenPrefix, importedOverrides,
    addToHistory, captureState, history, currentIndex
  ]);

  const projectContext = useContext(ProjectContext);
  const isDark = themeMode === 'dark';
  useDarkClassSync(isDark);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    setHeaderOpen(mq.matches);
    const handler = (event) => {
      setHeaderOpen(event.matches);
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else {
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);
  useEffect(() => {
    if (!headerOpen) {
      setChaosMenuOpen(false);
      setOverflowOpen(false);
    }
  }, [headerOpen]);

  useEffect(() => {
    if (!isDev && activeTab === 'Exports') {
      setActiveTab('Quick view');
    }
  }, [activeTab, isDev]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateStage = () => {
      const hash = window.location.hash.replace('#', '');
      const matched = STAGE_DEFS.find((stage) => stage.id === hash);
      if (matched) {
        setCurrentStage(matched.label);
        return;
      }
      if (view === 'project') {
        setCurrentStage('Identity');
        return;
      }
      if (activeTab === 'Print assets') {
        setCurrentStage('Package');
        return;
      }
      if (activeTab === 'Exports' && isDev) {
        setCurrentStage('Export');
        return;
      }
      setCurrentStage('Validate');
    };
    updateStage();
    window.addEventListener('hashchange', updateStage);
    return () => window.removeEventListener('hashchange', updateStage);
  }, [activeTab, isDev, view]);

  const applySavedPalette = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;
    const sanitized = sanitizeHexInput(payload.baseColor, '#6366f1');
    setBaseColor(sanitized);
    setBaseInput(sanitized);
    setBaseError('');
    setMode(payload.mode || 'Monochromatic');
    const savedThemeMode = payload.themeMode || (payload.isDark ? 'dark' : 'light');
    setThemeMode(savedThemeMode);
    setPrintMode(Boolean(payload.printMode));
    setCustomThemeName(sanitizeThemeName(payload.customThemeName || '', ''));
    const nextHarmony = payload.harmonyIntensity ?? 100;
    const nextApoc = payload.apocalypseIntensity ?? 100;
    const nextNeutral = payload.neutralCurve ?? 100;
    const nextAccent = payload.accentStrength ?? 100;
    const nextPop = payload.popIntensity ?? 100;
    setHarmonyIntensity(nextHarmony);
    setApocalypseIntensity(nextApoc);
    setNeutralCurve(nextNeutral);
    setAccentStrength(nextAccent);
    setPopIntensity(nextPop);
    setTokenPrefix(sanitizePrefix(payload.tokenPrefix || ''));
    const savedOverrides = payload.importedOverrides;
    if (savedOverrides && typeof savedOverrides === 'object') {
      setImportedOverrides(savedOverrides);
    } else {
      setImportedOverrides(null);
    }
  }, []);

  const buildSpecFromSection = useCallback((section) => {
    if (!section || typeof section !== 'object') return null;
    const baseColor = sanitizeHexInput(section.baseHex || '#6366f1', '#6366f1');
    return {
      baseColor,
      mode: toGeneratorMode(section.mode || 'mono'),
      themeMode: section.paletteSpec?.themeMode || (section.paletteSpec?.isDark ? 'dark' : 'light'),
      isDark: section.paletteSpec?.isDark ?? (section.paletteSpec?.themeMode === 'dark'),
      printMode: Boolean(section.paletteSpec?.printMode),
      customThemeName: sanitizeThemeName(section.paletteSpec?.customThemeName || section.label || '', ''),
      harmonyIntensity: section.paletteSpec?.harmonyIntensity ?? 100,
      apocalypseIntensity: section.paletteSpec?.apocalypseIntensity ?? 100,
      neutralCurve: section.paletteSpec?.neutralCurve ?? 100,
      accentStrength: section.paletteSpec?.accentStrength ?? 100,
      popIntensity: section.paletteSpec?.popIntensity ?? 100,
      tokenPrefix: sanitizePrefix(section.paletteSpec?.tokenPrefix || ''),
      importedOverrides: section.paletteSpec?.importedOverrides ?? null,
    };
  }, []);

  const handleBaseColorChange = useCallback((value) => {
    setBaseInput(value);
    const sanitized = sanitizeHexInput(value);
    if (!sanitized) {
      setBaseError('Enter a hex value like #FF00FF or #ABC');
      return;
    }
    setBaseError('');
    setBaseColor(sanitized);
  }, []);

  useEffect(() => {
    try {
      const key = '__token-gen-check__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      setStorageAvailable(true);
    } catch (err) {
      console.warn('Local storage unavailable', err);
      setStorageAvailable(false);
      notify('Local storage is blocked in this session', 'warn');
    }
    setPrintSupported(typeof window !== 'undefined' && typeof window.print === 'function');
  }, [notify]);

  useEffect(() => {
    if (storageAvailable !== true) return;
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.saved);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (Array.isArray(parsed)) {
            const safe = parsed.filter((item) => item && typeof item === 'object');
            setSavedPalettes(safe);
          }
        } catch (parseErr) {
          console.warn('Saved palettes corrupted', parseErr);
          setStorageCorrupt(true);
        }
      }
      const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
      if (currentRaw) {
        try {
          const parsed = JSON.parse(currentRaw);
          applySavedPalette(parsed);
        } catch (parseErr) {
          console.warn('Current palette corrupted', parseErr);
          setStorageCorrupt(true);
          notify('Current palette could not be restored', 'warn');
        }
      }
    } catch (err) {
      console.warn('Failed to hydrate palette state', err);
      setStorageCorrupt(true);
      notify('Could not load saved palettes; storage may be blocked or corrupted', 'warn');
    }
  }, [applySavedPalette, notify, storageAvailable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefix = '#palette=';
    const hash = window.location.hash || '';
    if (!hash.startsWith(prefix)) return;
    try {
      const decoded = decodeURIComponent(escape(atob(hash.slice(prefix.length))));
      const payload = JSON.parse(decoded);
      applySavedPalette(payload);
      notify('Palette loaded from link', 'success');
    } catch (err) {
      console.warn('Failed to parse shared palette', err);
      notify('Share link was invalid', 'warn');
    }
  }, [applySavedPalette, notify]);

  useEffect(() => {
    if (storageAvailable !== true) return;
    try {
      const payload = {
        baseColor,
        mode,
        themeMode,
        printMode,
        customThemeName: sanitizeThemeName(customThemeName, ''),
        harmonyIntensity,
        apocalypseIntensity,
        neutralCurve,
        accentStrength,
        popIntensity,
        tokenPrefix: sanitizePrefix(tokenPrefix),
        importedOverrides: importedOverrides && Object.keys(importedOverrides).length ? importedOverrides : null,
      };
      localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist palette state', err);
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        setStorageQuotaExceeded(true);
        setStatusMessage('Storage quota exceeded — clear saved data to resume saving', 'warn');
      } else {
        setStorageAvailable(false);
        notify('Saving is unavailable; storage is blocked', 'warn');
      }
    }
  }, [baseColor, mode, themeMode, printMode, customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, popIntensity, tokenPrefix, importedOverrides, notify, storageAvailable, setStatusMessage]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const autoThemeName = useMemo(() => `${mode} ${themeMode === 'dark' ? 'Dark' : themeMode === 'pop' ? 'Pop' : 'Light'}`, [mode, themeMode]);
  const safeCustomThemeName = useMemo(() => sanitizeThemeName(customThemeName, ''), [customThemeName]);
  const displayThemeName = safeCustomThemeName || autoThemeName;
  const themeMaster = useMemo(() => buildTheme({
    name: displayThemeName,
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    apocalypseIntensity,
    harmonyIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    importedOverrides,
  }), [
    displayThemeName,
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    apocalypseIntensity,
    harmonyIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    importedOverrides,
  ]);
  const { tokens, finalTokens, orderedStack, currentTheme } = themeMaster;
  const paletteSnapshot = useMemo(() => ({
    name: displayThemeName,
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    customThemeName: sanitizeThemeName(customThemeName, ''),
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix: sanitizePrefix(tokenPrefix),
    importedOverrides: importedOverrides && Object.keys(importedOverrides).length ? importedOverrides : null,
    tokens,
    finalTokens,
    orderedStack,
  }), [
    displayThemeName,
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    customThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix,
    importedOverrides,
    tokens,
    finalTokens,
    orderedStack,
  ]);
  const serializePalette = useCallback(() => ({
    id: Date.now(),
    name: displayThemeName,
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    customThemeName: safeCustomThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix: sanitizePrefix(tokenPrefix),
    importedOverrides: importedOverrides && Object.keys(importedOverrides).length ? importedOverrides : null,
  }), [displayThemeName, baseColor, mode, themeMode, isDark, printMode, safeCustomThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, popIntensity, tokenPrefix, importedOverrides]);
  const shareState = useMemo(() => ({
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    customThemeName: safeCustomThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix: sanitizePrefix(tokenPrefix),
  }), [baseColor, mode, themeMode, isDark, printMode, safeCustomThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, popIntensity, tokenPrefix]);
  const { shareUrl } = useShareLink(shareState);
  const quickEssentials = useMemo(() => ([
    { key: 'Primary', color: tokens.brand.primary },
    { key: 'Secondary', color: tokens.brand.secondary },
    { key: 'Accent', color: tokens.brand.accent },
    { key: 'Base', color: baseColor },
    { key: 'Neutral 2', color: tokens.foundation.neutrals['neutral-2'] },
    { key: 'Neutral 4', color: tokens.foundation.neutrals['neutral-4'] },
    { key: 'Neutral 6', color: tokens.foundation.neutrals['neutral-6'] },
    { key: 'Neutral 8', color: tokens.foundation.neutrals['neutral-8'] },
    { key: 'Text strong', color: tokens.typography['text-strong'] },
    { key: 'Text muted', color: tokens.typography['text-muted'] },
  ]).filter(({ color }) => Boolean(color)), [tokens, baseColor]);
  const tabOptions = useMemo(() => (
    isDev
      ? ['Quick view', 'Full system', 'Print assets', 'Exports']
      : ['Quick view', 'Full system', 'Print assets']
  ), [isDev]);
  const tabIds = useMemo(() => ({
    'Quick view': 'tab-quick',
    'Full system': 'tab-full',
    'Print assets': 'tab-print',
    'Exports': 'tab-exports',
  }), []);
  const stageDefs = useMemo(() => (
    isDev ? STAGE_DEFS : STAGE_DEFS.filter((stage) => stage.id !== 'export')
  ), [isDev]);
  const getTabId = useCallback((tab) => tabIds[tab] || `tab-${tab.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`, [tabIds]);
  const handleStageNavigate = useCallback((event, stage) => {
    if (stage.tab) {
      setActiveTab(stage.tab);
    } else if (stage.id === 'validate' && !['Quick view', 'Full system'].includes(activeTab)) {
      setActiveTab('Quick view');
    }
    setCurrentStage(stage.label);
  }, [activeTab, setActiveTab, setCurrentStage]);
  const handleJumpToExports = useCallback(() => {
    if (!import.meta.env.DEV) return;
    requestAnimationFrame(() => {
      if (exportsSectionRef.current) {
        exportsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, []);

  const exportSavedPalettes = useCallback(() => {
    if (!savedPalettes.length) {
      setStatusMessage('No saved palettes to export', 'warn');
      return;
    }
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      palettes: savedPalettes,
    };
    exportJsonFile('apocapalette-saved-palettes', '', payload);
    setStatusMessage('Saved palettes exported', 'success');
  }, [savedPalettes, setStatusMessage]);

  const normalizeImportedPalette = useCallback((palette, index) => {
    if (!palette || typeof palette !== 'object') return null;
    const base = sanitizeHexInput(palette.baseColor, null);
    const modeName = typeof palette.mode === 'string' ? palette.mode : '';
    if (!base || !modeName) return null;
    const theme = ['light', 'dark', 'pop'].includes(palette.themeMode)
      ? palette.themeMode
      : (palette.isDark ? 'dark' : 'light');
    return {
      id: Number.isFinite(palette.id) ? palette.id : Date.now() + index,
      name: sanitizeThemeName(palette.name || `Imported ${index + 1}`, `Imported ${index + 1}`),
      baseColor: base,
      mode: modeName,
      themeMode: theme,
      isDark: theme === 'dark',
      printMode: Boolean(palette.printMode),
      customThemeName: sanitizeThemeName(palette.customThemeName || '', ''),
      harmonyIntensity: clampValue(palette.harmonyIntensity ?? 100, 50, 160),
      apocalypseIntensity: clampValue(palette.apocalypseIntensity ?? 100, 0, 200),
      neutralCurve: clampValue(palette.neutralCurve ?? 100, 60, 140),
      accentStrength: clampValue(palette.accentStrength ?? 100, 60, 140),
      popIntensity: clampValue(palette.popIntensity ?? 100, 60, 140),
      tokenPrefix: sanitizePrefix(palette.tokenPrefix || ''),
      importedOverrides: palette.importedOverrides ?? null,
    };
  }, []);

  const importSavedPalettes = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target.result || '');
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : parsed?.palettes;
        if (!Array.isArray(list)) {
          setStatusMessage('Invalid palette file format', 'warn');
          return;
        }
        const normalized = list
          .map((palette, index) => normalizeImportedPalette(palette, index))
          .filter(Boolean);
        if (!normalized.length) {
          setStatusMessage('No valid palettes found to import', 'warn');
          return;
        }
        setSavedPalettes((prev) => {
          const combined = [...normalized, ...prev];
          const byName = new Map();
          combined.forEach((palette) => {
            if (!palette?.name) return;
            if (!byName.has(palette.name)) byName.set(palette.name, palette);
          });
          const merged = Array.from(byName.values())
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
            .slice(0, 20);
          if (storageAvailable && !storageCorrupt) {
            localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(merged));
          }
          return merged;
        });
        if (storageAvailable && !storageCorrupt) {
          setStatusMessage(`Imported ${normalized.length} palette${normalized.length === 1 ? '' : 's'}`, 'success');
        } else {
          setStatusMessage('Imported palettes (storage blocked; save disabled)', 'warn');
        }
      } catch (err) {
        console.warn('Failed to import palettes', err);
        setStatusMessage('Failed to import palettes', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [normalizeImportedPalette, setStatusMessage, storageAvailable, storageCorrupt]);

  const triggerSavedPalettesImport = useCallback(() => {
    savedPaletteInputRef.current?.click();
  }, []);

  const saveCurrentPalette = useCallback(() => {
    if (storageAvailable !== true || storageCorrupt) {
      setStatusMessage('Saving is unavailable; storage is blocked', 'warn');
      return;
    }
    try {
      const payload = serializePalette();
      setSavedPalettes((prev) => {
        const filtered = prev.filter((item) => item.name !== payload.name);
        const next = [payload, ...filtered].slice(0, 20);
        localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(next));
        return next;
      });
      setStatusMessage('Palette saved to this browser', 'success');
    } catch (err) {
      console.warn('Failed to save palette', err);
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        setStorageQuotaExceeded(true);
        setStatusMessage('Storage quota exceeded — clear saved data to resume saving', 'warn');
      } else {
        setStatusMessage('Save failed — check storage permissions', 'error');
        setStorageCorrupt(true);
      }
    }
  }, [serializePalette, setStatusMessage, storageAvailable, storageCorrupt]);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.saved);
      localStorage.removeItem(STORAGE_KEYS.current);
      setSavedPalettes([]);
      setStorageCorrupt(false);
      setStorageQuotaExceeded(false);
      setStatusMessage('Saved data cleared', 'success');
    } catch (err) {
      console.warn('Failed to clear saved data', err);
      setStatusMessage('Failed to clear saved data', 'error');
    }
  }, [setStatusMessage]);

  const loadSavedPalette = useCallback((id) => {
    if (!id) return;
    const numericId = Number(id);
    const target = savedPalettes.find((item) => item.id === numericId);
    if (!target) {
      setStatusMessage('Saved palette not found', 'warn');
      return;
    }
    applySavedPalette(target);
    setStatusMessage(`Loaded "${target.name}"`, 'success');
  }, [savedPalettes, applySavedPalette, setStatusMessage]);

  const openProjectPalette = useCallback((section) => {
    if (!section || !projectContext) return;
    const paletteSpec = section.paletteSpec || buildSpecFromSection(section);
    if (!paletteSpec) {
      notify('Palette spec is missing', 'warn');
      return;
    }
    applySavedPalette(paletteSpec);
    setProjectEdit({
      sectionId: section.id,
      paletteName: section.label || paletteSpec.customThemeName || 'Palette',
      projectName: projectContext.projectName || 'Project',
      paletteSpec,
    });
    setView('palette');
  }, [applySavedPalette, buildSpecFromSection, notify, projectContext, setView]);

  const saveProjectPalette = useCallback((options = {}) => {
    if (!projectEdit || !projectContext) return;
    const snapshot = buildSectionSnapshotFromPalette(paletteSnapshot);
    if (!snapshot) {
      notify('Save failed — palette data is unavailable', 'warn');
      return;
    }
    const paletteSpec = snapshot.paletteSpec;
    const label = paletteSpec.customThemeName || projectEdit.paletteName || 'Palette';
    const timestamp = new Date().toISOString();
    if (options.asNew) {
      const newSection = {
        id: `section-${Date.now()}`,
        label,
        kind: 'season',
        locked: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...snapshot,
      };
      projectContext.setSections([...(projectContext.sections || []), newSection]);
      setProjectEdit({
        sectionId: newSection.id,
        paletteName: label,
        projectName: projectContext.projectName || 'Project',
        paletteSpec,
      });
      notify('Project palette saved as new', 'success');
      return;
    }
    projectContext.updateSection(projectEdit.sectionId, {
      label,
      updatedAt: timestamp,
      ...snapshot,
    });
    setProjectEdit((prev) => (prev ? { ...prev, paletteName: label, paletteSpec } : prev));
    notify('Project palette updated', 'success');
  }, [notify, paletteSnapshot, projectContext, projectEdit]);

  const cancelProjectEdit = useCallback(() => {
    if (!projectEdit) return;
    applySavedPalette(projectEdit.paletteSpec);
    setProjectEdit(null);
    setView('project');
  }, [applySavedPalette, projectEdit, setView]);

  const applyMoodBoardSpec = useCallback((paletteSpec) => {
    if (!paletteSpec || typeof paletteSpec !== 'object') return;
    applySavedPalette(paletteSpec);
    setView('palette');
  }, [applySavedPalette, setView]);

  const saveMoodBoardDraft = useCallback((cluster) => {
    if (!projectContext) return;
    const paletteSpec = cluster?.paletteSpec;
    if (!paletteSpec?.baseColor) {
      notify('Draft is missing a base color', 'warn');
      return;
    }
    const label = paletteSpec.customThemeName || cluster?.title || 'Palette';
    const themeMaster = buildTheme({
      name: label,
      baseColor: paletteSpec.baseColor,
      mode: paletteSpec.mode,
      themeMode: paletteSpec.themeMode,
      isDark: paletteSpec.isDark,
      printMode: false,
      apocalypseIntensity: paletteSpec.apocalypseIntensity ?? 100,
      harmonyIntensity: paletteSpec.harmonyIntensity ?? 100,
      neutralCurve: paletteSpec.neutralCurve ?? 100,
      accentStrength: paletteSpec.accentStrength ?? 100,
      popIntensity: paletteSpec.popIntensity ?? 100,
      importedOverrides: paletteSpec.importedOverrides ?? null,
    });
    const paletteState = {
      name: label,
      ...paletteSpec,
      tokens: themeMaster.tokens,
      finalTokens: themeMaster.finalTokens,
      orderedStack: themeMaster.orderedStack,
    };
    const snapshot = buildSectionSnapshotFromPalette(paletteState);
    if (!snapshot) {
      notify('Draft save failed — palette data unavailable', 'warn');
      return;
    }
    const timestamp = new Date().toISOString();
    const newSection = {
      id: `section-${Date.now()}`,
      label,
      kind: 'season',
      locked: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...snapshot,
    };
    projectContext.setSections([...(projectContext.sections || []), newSection]);
    notify('Draft palette added to project', 'success');
  }, [notify, projectContext]);

  const handleCssImport = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result || '');
      const { overrides, prefix } = buildOverridesFromCss(text);
      if (!Object.keys(overrides).length) {
        notify('No matching tokens found in that CSS file', 'warn');
        return;
      }
      setImportedOverrides(overrides);
      if (prefix) {
        setTokenPrefix(prefix);
      }
      const importedName = file.name.replace(/\.css$/i, '').trim();
      if (importedName) {
        setCustomThemeName(sanitizeThemeName(importedName, ''));
      }
      const primary = overrides['brand.primary'];
      const primaryHex = sanitizeHexInput(primary, null);
      if (primaryHex) {
        setBaseColor(primaryHex);
        setBaseInput(primaryHex);
        setBaseError('');
      }
      const inferred = inferThemeMode(overrides['surfaces.background'] || overrides['surfaces.page-background']);
      if (inferred) {
        setThemeMode(inferred);
      }
      notify('CSS theme imported', 'success');
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [notify, setBaseColor, setBaseInput, setBaseError, setCustomThemeName, setThemeMode, setTokenPrefix, setImportedOverrides]);
  const orderedSwatches = useMemo(
    () => orderedStack.map(({ name, value }) => ({ name, color: value })),
    [orderedStack]
  );
  const printAssetPack = useMemo(() => ([
    { icon: <ImageIcon size={14} />, name: 'Palette card', files: 'palette-card.svg + palette-card.png', note: 'Hero palette overview built from the print palette.' },
    { icon: <ImageIcon size={14} />, name: 'Swatch strip', files: 'swatch-strip.svg + swatch-strip.png', note: '8-swatch strip for quick brand references.' },
    { icon: <FileText size={14} />, name: 'Tokens JSON', files: 'tokens.json', note: 'Penpot-ready tokens including the print layer & foil markers.' },
  ]), []);
  const canvaPrintHexes = useMemo(() => {
    const readColor = (path, fallback) => {
      const val = finalTokens.print?.[path]?.value ?? fallback;
      return typeof val === 'string' ? normalizeHex(val, val) : null;
    };
    const baseList = [
      { name: 'Primary', path: 'brand/primary', fallback: tokens.brand.primary },
      { name: 'Secondary', path: 'brand/secondary', fallback: tokens.brand.secondary },
      { name: 'Accent', path: 'brand/accent', fallback: tokens.brand.accent },
      { name: 'CTA', path: 'brand/cta', fallback: tokens.brand.cta },
      { name: 'Background', path: 'surfaces/background', fallback: tokens.surfaces["background"] },
      { name: 'Surface', path: 'cards/card-panel-surface', fallback: tokens.cards["card-panel-surface"] },
      { name: 'Text', path: 'typography/text-strong', fallback: tokens.typography["text-strong"] },
      { name: 'Muted Text', path: 'typography/text-muted', fallback: tokens.typography["text-muted"] },
    ];
    return baseList.map((entry) => ({ name: entry.name, color: readColor(entry.path, entry.fallback) }))
      .filter(({ color }) => Boolean(color));
  }, [finalTokens, tokens]);
  const ctaBase = tokens.brand.cta || tokens.brand.primary;
  const ctaTextColor = useMemo(() => pickReadableText(ctaBase), [ctaBase]);
  const primaryTextColor = useMemo(() => pickReadableText(tokens.brand.primary), [tokens.brand.primary]);
  const neutralButtonText = useMemo(() => pickReadableText(tokens.cards['card-panel-surface'], '#0f172a', '#ffffff'), [tokens.cards]);
  const paletteRows = useMemo(() => ([
    { 
      title: 'Foundation Neutrals', 
      colors: Object.entries(tokens.foundation.neutrals).map(([name, color]) => ({ name, color }))
    },
    { 
      title: 'Foundation Accents', 
      colors: Object.entries(tokens.foundation.accents).map(([name, color]) => ({ name, color }))
    },
    { 
      title: 'Brand Core', 
      colors: ['primary', 'secondary', 'accent', 'accent-strong', 'cta', 'cta-hover'].map((key) => ({ name: key, color: tokens.brand[key] })).filter(({ color }) => Boolean(color))
    },
    { 
      title: 'Text Palette', 
      colors: ['heading', 'text-strong', 'text-body', 'text-muted', 'text-accent', 'text-accent-strong'].map((key) => ({ name: key, color: tokens.typography[key] })).filter(({ color }) => Boolean(color))
    },
    { 
      title: 'Status & Feedback', 
      colors: Object.entries(tokens.status).map(([name, color]) => ({ name, color }))
    }
  ]), [tokens]);


  const contrastChecks = useMemo(() => {
    const bg = finalTokens.surfaces.background;
    const card = finalTokens.cards['card-panel-surface'];
    const textStrong = finalTokens.typography['text-strong'];
    const textBody = finalTokens.typography['text-body'];
    const textMuted = finalTokens.typography['text-muted'];
    return [
      { label: 'Text on Background', fg: textStrong, bg, ratio: getContrastRatio(textStrong, bg) },
      { label: 'Text on Card', fg: textBody, bg: card, ratio: getContrastRatio(textBody, card) },
      { label: 'Muted on Card', fg: textMuted, bg: card, ratio: getContrastRatio(textMuted, card) },
    ].map((entry) => ({ ...entry, badge: getWCAGBadge(entry.ratio) }));
  }, [finalTokens]);

  const applyPreset = useCallback((presetName) => {
    const p = presets.find((x) => x.name === presetName);
    if (!p) return;
    setBaseColor(p.base);
    setMode(p.mode);
    setThemeMode(p.dark ? 'dark' : 'light');
    setCustomThemeName(p.name);
    setHarmonyIntensity(100);
    setNeutralCurve(100);
    setAccentStrength(100);
    setApocalypseIntensity(100);
    setStatusMessage(`Preset "${p.name}" applied`, 'success');
  }, [setStatusMessage]);

  const randomize = useCallback(() => {
    const hues = ['#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
    const nextBase = hues[Math.floor(Math.random() * hues.length)];
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const nextDark = Math.random() > 0.5;

    setBaseColor(nextBase);
    setMode(nextMode);
    setThemeMode(nextDark ? 'dark' : 'light');
    setHarmonyIntensity(Math.round(70 + Math.random() * 80));
    setNeutralCurve(Math.round(80 + Math.random() * 50));
    setAccentStrength(Math.round(80 + Math.random() * 50));

    if (nextMode === 'Apocalypse') {
      setApocalypseIntensity(Math.round(50 + Math.random() * 100));
    }
  }, []);

  const updatePrintMeta = useCallback(() => {
    const next = getPrintTimestamps();
    setPrintMeta(next);
    return next;
  }, []);
  const copyHexValue = useCallback(async (value, label = 'Value') => {
    const text = String(value ?? '').trim();
    if (!text) {
      notify('Nothing to copy', 'warn');
      return;
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Primary clipboard copy failed, using fallback', err);
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (fallbackErr) {
        console.warn('Copy failed', fallbackErr);
        notify('Copy failed — check browser permissions', 'warn');
        return;
      }
    }
    notify(`${label} copied`, 'success', 1600);
  }, [notify]);
  const copyAllEssentials = useCallback(async () => {
    const list = quickEssentials.map(({ color }) => normalizeHex(color, color)).filter(Boolean);
    if (!list.length) {
      notify('No colors to copy', 'warn');
      return;
    }
    await copyHexValue(list.join('\n'), 'Hex list');
  }, [copyHexValue, notify, quickEssentials]);
  const randomRitual = useCallback(() => {
    randomize();
    notify('Ritual complete. The colors are judging you.', 'info');
  }, [randomize, notify]);
  const debouncedHarmonyChange = useCallback((value) => {
    const next = clampValue(value, 50, 160);
    setHarmonyInput(next);
    if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
    harmonyDebounceRef.current = setTimeout(() => setHarmonyIntensity(next), 120);
  }, []);
  const debouncedNeutralChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    setNeutralInput(next);
    if (neutralDebounceRef.current) clearTimeout(neutralDebounceRef.current);
    neutralDebounceRef.current = setTimeout(() => setNeutralCurve(next), 120);
  }, []);
  const debouncedAccentChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    setAccentInput(next);
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    accentDebounceRef.current = setTimeout(() => setAccentStrength(next), 120);
  }, []);
  const debouncedApocalypseChange = useCallback((value) => {
    const next = clampValue(value, 20, 150);
    setApocalypseInput(next);
    if (apocalypseDebounceRef.current) clearTimeout(apocalypseDebounceRef.current);
    apocalypseDebounceRef.current = setTimeout(() => setApocalypseIntensity(next), 120);
  }, []);
  const debouncedPopChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    setPopInput(next);
    if (popDebounceRef.current) clearTimeout(popDebounceRef.current);
    popDebounceRef.current = setTimeout(() => setPopIntensity(next), 120);
  }, []);
  const crankApocalypse = useCallback(() => {
    const boostedApoc = 130;
    const boostedAccent = 120;
    setMode('Apocalypse');
    setThemeMode('dark');
    setPrintMode(false);
    setApocalypseIntensity(boostedApoc);
    setApocalypseInput(boostedApoc);
    setAccentStrength((prev) => Math.max(prev, boostedAccent));
    setAccentInput((prev) => Math.max(prev, boostedAccent));
    notify('Apocalypse cranked. Wear goggles.', 'warn');
  }, [notify]);

  const resetPalette = useCallback(() => {
    setBaseColor('#7b241c');
    setMode('Monochromatic');
    setThemeMode('dark');
    setPrintMode(false);
    setCustomThemeName('');
    setHarmonyIntensity(100);
    setApocalypseIntensity(100);
    setNeutralCurve(100);
    setAccentStrength(100);
    setPopIntensity(100);
    setTokenPrefix('');
    setImportedOverrides(null);
    notify('Palette has been reset', 'info');
  }, [notify]);
  
  const copyEssentialsList = useCallback(() => {
    copyAllEssentials();
    notify('Quick kit copied. Handle with care.', 'success');
  }, [copyAllEssentials, notify]);

  useEffect(() => {
    const handleBeforePrint = () => {
      const meta = updatePrintMeta();
      if (!savedTitleRef.current) savedTitleRef.current = document.title;
      document.title = `${displayThemeName} • ${meta.date}`;
    };
    const handleAfterPrint = () => {
      if (savedTitleRef.current) {
        document.title = savedTitleRef.current;
        savedTitleRef.current = '';
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [displayThemeName, updatePrintMeta]);

  const buildExportPayload = useCallback(() => buildPenpotPayload(
    finalTokens,
    orderedStack,
    {
      themeName: displayThemeName,
      mode,
      baseColor,
      isDark,
      printMode,
      generatedAt: new Date().toISOString(),
      tokenPrefix: tokenPrefix || undefined,
    },
    { namingPrefix: tokenPrefix }
  ), [finalTokens, orderedStack, displayThemeName, mode, baseColor, isDark, printMode, tokenPrefix]);

  const exportJson = (themeName, suffix = '') => {
    if (!import.meta.env.DEV) return;
    const penpotPayload = buildExportPayload();
    exportJsonFile(themeName, suffix, penpotPayload);
    const penpotTokens = toPenpotTokens(penpotPayload);
    exportJsonFile(themeName, `${suffix}-PENPOT`, penpotTokens);
  };

  const exportGenericJson = () => {
    if (!import.meta.env.DEV) return;
    const payload = buildGenericPayload(finalTokens, {
      themeName: displayThemeName,
      mode,
      baseColor,
      isDark,
      printMode,
      generatedAt: new Date().toISOString(),
      tokenPrefix: tokenPrefix || undefined,
    });
    exportJsonFile('generic-tokens', '', payload);
  };

  const exportWitchcraftJson = () => {
    if (!import.meta.env.DEV) return;
    const witchcraftPayload = buildWitchcraftPayload(finalTokens, displayThemeName, mode, isDark);
    exportJsonFile('witchcraft-theme', '', witchcraftPayload);
  };

  const exportFigmaTokensJson = () => {
    if (!import.meta.env.DEV) return;
    const payload = buildFigmaTokensPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    exportJsonFile('figma-tokens', '', payload);
  };

  const exportStyleDictionaryJson = () => {
    if (!import.meta.env.DEV) return;
    const payload = buildStyleDictionaryPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    exportJsonFile('style-dictionary', '', payload);
  };
  const exportCssVars = () => {
    if (!import.meta.env.DEV) return;
    const css = buildCssVariables(themeMaster, sanitizePrefix(tokenPrefix));
    const slug = slugifyFilename(displayThemeName || 'theme', 'theme');
    const filename = buildExportFilename(slug, '-tokens', 'css');
    downloadFile({ data: css, filename, mime: 'text/css' });
    setStatusMessage('CSS variables exported', 'success');
  };
  const exportUiThemeCss = () => {
    if (!import.meta.env.DEV) return;
    const slug = slugifyFilename(displayThemeName || 'theme', 'theme');
    const css = buildThemeCss(uiTheme, `:root.${themeClass}`);
    const filename = buildExportFilename(slug, '-ui-theme', 'css');
    downloadFile({ data: css, filename, mime: 'text/css' });
    setStatusMessage('UI theme CSS exported', 'success');
  };
  const exportDesignSpacePalette = () => {
    const palette = generateDesignSpacePalette(baseColor);
    palette.name = displayThemeName || 'Apocapalette Theme';
    const slug = slugifyFilename(displayThemeName || 'theme', 'theme');
    const filename = buildExportFilename(slug, '-designspace', 'json');
    downloadFile({ data: JSON.stringify(palette, null, 2), filename, mime: 'application/json' });
    setStatusMessage('DesignSpace palette exported', 'success');
  };
  const handleGenerateListingAssets = useCallback(async (options = {}) => {
    const {
      rootFolder = 'listing',
      includeMeta = true,
      zipName,
      successMessage = 'Listing assets generated',
    } = options;
    if (!import.meta.env.DEV) return;
    if (typeof Blob === 'undefined') {
      notify('File export is not supported in this browser', 'error');
      return;
    }
    const coverNode = listingCoverRef.current;
    const swatchNode = listingSwatchRef.current;
    if (!coverNode || !swatchNode) {
      notify('Listing asset templates are not ready', 'error');
      return;
    }
    const previewNode = document.querySelector('[data-testid="theme-preview-content"]')
      || document.querySelector('[data-testid="theme-preview-root"]');
    if (!previewNode) {
      notify('Preview panel could not be found', 'error');
      return;
    }
    try {
      const { toPng } = await import('html-to-image');
      const JSZip = (await import('jszip')).default;
      const toBytes = async (dataUrl) => {
        const res = await fetch(dataUrl);
        return new Uint8Array(await res.arrayBuffer());
      };
      const captureNode = async (node, options) => {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          ...options,
        });
        return toBytes(dataUrl);
      };
      const zip = new JSZip();
      const listingFolder = zip.folder(rootFolder || 'listing');
      if (!listingFolder) throw new Error('Failed to create listing folder');
      const coverPng = await captureNode(coverNode, {
        width: 1200,
        height: 1200,
        backgroundColor: tokens.surfaces.background,
      });
      listingFolder.file('cover.png', coverPng);
      const swatchPng = await captureNode(swatchNode, {
        width: 1600,
        height: 400,
        backgroundColor: tokens.surfaces.background,
      });
      listingFolder.file('swatches.png', swatchPng);
      const uiPng = await captureNode(previewNode, {
        width: 1600,
        height: 900,
        style: { width: '1600px', height: '900px' },
        backgroundColor: tokens.surfaces.background,
      });
      listingFolder.file('ui.png', uiPng);
      if (listingSnippetRef.current) {
        try {
          const snippetPng = await captureNode(listingSnippetRef.current, {
            width: 1200,
            height: 600,
            backgroundColor: tokens.surfaces.background,
          });
          listingFolder.file('tokens-snippet.png', snippetPng);
        } catch (err) {
          console.warn('Listing tokens snippet failed', err);
        }
      }
      if (includeMeta) {
        const meta = {
          themeName: displayThemeName,
          baseHex: normalizeHex(baseColor || '#000000', '#000000').toUpperCase(),
          harmonyMode: mode,
          themeMode,
          timestamp: new Date().toISOString(),
          version: 'v1',
        };
        listingFolder.file('meta.json', JSON.stringify(meta, null, 2));
      }
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const defaultName = buildExportFilename(
        slugifyFilename(displayThemeName || 'theme', 'theme'),
        '-listing-assets-v1',
        'zip'
      );
      exportAssets({ data: blob, filename: zipName || defaultName, mime: 'application/zip' });
      setStatusMessage(successMessage, 'success');
    } catch (err) {
      console.error('Listing assets export failed', err);
      notify('Listing assets export failed. Check console for details.', 'error');
    }
  }, [
    baseColor,
    displayThemeName,
    mode,
    notify,
    setStatusMessage,
    themeMode,
    tokens,
  ]);
  const handleDownloadThemePack = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    if (typeof Blob === 'undefined') {
      notify('File export is not supported in this browser', 'error');
      return;
    }
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const themeLabel = sanitizeThemeName(displayThemeName || 'Theme', 'Theme');
      const themeSlug = slugifyFilename(themeLabel, 'theme');
      const root = zip.folder(themeSlug);
      if (!root) throw new Error('Failed to create zip root folder');
      const baseHex = normalizeHex(baseColor || '#000000', '#000000').toUpperCase();
      const zipName = buildExportFilename(themeSlug, '-theme-pack-v1', 'zip');
      const { best, not: notFor } = getThemePackGuidance(mode);
      const themeModeLabel = themeMode || (isDark ? 'dark' : 'light');
      const readme = [
        `Theme name: ${themeLabel}`,
        `Base hex: ${baseHex}`,
        `Harmony mode: ${mode}`,
        `Theme mode: ${themeModeLabel}`,
        `Best for: ${best}`,
        `Not for: ${notFor}`,
        'Usage:',
        '- Use css/variables.css in your project',
        '- tokens.json is the canonical source',
        '- Import figma/tokens.json into Figma Tokens (if included)',
      ];
      if (printMode) {
        readme.splice(4, 0, 'Print mode: on');
      }
      root.file('README.txt', readme.join('\n'));

      const canonicalTokens = buildGenericPayload(finalTokens, {
        themeName: displayThemeName,
        mode,
        baseColor,
        isDark,
        printMode,
        generatedAt: new Date().toISOString(),
        tokenPrefix: tokenPrefix || undefined,
      });
      root.file('tokens.json', JSON.stringify(canonicalTokens, null, 2));

      root.folder('css')?.file(
        'variables.css',
        buildCssVariables(themeMaster, sanitizePrefix(tokenPrefix))
      );

      const figmaPayload = buildFigmaTokensPayload(finalTokens, {
        namingPrefix: tokenPrefix || undefined,
      });
      if (figmaPayload && Object.keys(figmaPayload).length > 0) {
        root.folder('figma')?.file('tokens.json', JSON.stringify(figmaPayload, null, 2));
      }

      let previewFolder = null;
      const addPreviewFile = (name, content) => {
        if (!content) return;
        if (!previewFolder) {
          previewFolder = root.folder('preview');
        }
        previewFolder?.file(name, content);
      };
      try {
        const paletteSvg = buildPaletteCardSvg(currentTheme);
        addPreviewFile('palette-card.svg', paletteSvg);
      } catch (err) {
        console.warn('Theme pack palette SVG failed', err);
      }
      try {
        const stripSvg = buildStripSvg(currentTheme);
        addPreviewFile('swatch-strip.svg', stripSvg);
      } catch (err) {
        console.warn('Theme pack strip SVG failed', err);
      }

      const [palettePng, stripPng] = await Promise.allSettled([
        renderPaletteCardPng(currentTheme),
        renderStripPng(currentTheme),
      ]);
      if (palettePng.status === 'fulfilled') {
        addPreviewFile('palette-card.png', palettePng.value);
      }
      if (stripPng.status === 'fulfilled') {
        addPreviewFile('swatch-strip.png', stripPng.value);
      }

      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      exportThemePack({ data: blob, filename: zipName, mime: 'application/zip' });
      setStatusMessage('Theme pack downloaded', 'success');
    } catch (err) {
      console.error('Theme pack export failed', err);
      notify('Theme pack export failed. Check console for details.', 'error');
    }
  }, [
    baseColor,
    currentTheme,
    displayThemeName,
    finalTokens,
    isDark,
    mode,
    notify,
    printMode,
    setStatusMessage,
    themeMode,
    themeMaster,
    tokenPrefix,
  ]);
  const copyShareLink = useCallback(async () => {
    try {
      if (!shareUrl) throw new Error('Share link unavailable');
      if (shareUrl.length > 1900) {
        notify('Share link too long; try shorter names/prefix', 'warn');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      notify('Share link copied', 'success');
    } catch (err) {
      console.warn('Failed to copy share link', err);
      notify('Could not copy share link', 'error');
    }
  }, [notify, shareUrl]);

  const exportAllAssets = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    if (typeof Blob === 'undefined') {
      const msg = 'File export is not supported in this browser';
      notify(msg, 'error');
      setExportError(msg);
      setExportBlocked(true);
      return;
    }
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) {
      const msg = 'Canvas is not supported; cannot render assets';
      notify(msg, 'error');
      setExportError(msg);
      setExportBlocked(true);
      return;
    }
    setExportError('');
    setExportBlocked(false);
    setIsExportingAssets(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const slug = slugifyFilename(currentTheme.name || 'theme', 'theme');
      const paletteSvg = buildPaletteCardSvg(currentTheme);
      const stripSvg = buildStripSvg(currentTheme);
      const [palettePng, stripPng] = await Promise.all([
        renderPaletteCardPng(currentTheme),
        renderStripPng(currentTheme),
      ]);

      const files = [
        { name: `${slug}/palette-card.svg`, data: encodeText(paletteSvg) },
        { name: `${slug}/palette-card.png`, data: palettePng },
        { name: `${slug}/swatch-strip.svg`, data: encodeText(stripSvg) },
        { name: `${slug}/swatch-strip.png`, data: stripPng },
        { name: `${slug}/tokens.json`, data: encodeText(JSON.stringify(buildExportPayload(), null, 2)) },
      ];

      const tarData = createTarArchive(files);
      const filename = buildExportFilename(slug, '-asset-pack', 'tar');
      exportAssets({ data: tarData, filename, mime: 'application/x-tar' });
    } catch (err) {
      notify('Asset export failed. Check console for details.', 'error', 4000);
      console.error('Asset export failed', err);
    } finally {
      setIsExportingAssets(false);
    }
  }, [buildExportPayload, currentTheme, notify]);

  const exportProjectPrintAssets = useCallback(async () => {
    if (!projectContext || projectExporting) return;
    const sections = projectContext.sections || [];
    if (!sections.length) {
      setProjectExportStatus('Add at least one palette to export.');
      return;
    }
    setProjectExporting(true);
    setProjectExportStatus('Preparing print assets…');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const projectSlug = slugifyFilename(projectContext.projectName || 'project', 'project');
      const root = zip.folder(projectSlug);
      if (!root) throw new Error('Failed to create project folder');
      const skipped = [];

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const paletteName = section?.label || `Palette ${i + 1}`;
        setProjectExportStatus(`Generating ${i + 1}/${sections.length}: ${paletteName}`);
        if (!section) {
          skipped.push(`(missing section ${i + 1})`);
          continue;
        }
        const paletteSpec = section.paletteSpec || buildSpecFromSection(section);
        if (!paletteSpec?.baseColor) {
          skipped.push(paletteName);
          continue;
        }
        const snapshotTokens = section.snapshot?.tokenSet || section.tokenSet || null;
        const themeMaster = snapshotTokens
          ? {
            finalTokens: snapshotTokens,
            currentTheme: {
              name: paletteName,
              mode: paletteSpec.mode,
              themeMode: paletteSpec.themeMode,
              isDark: paletteSpec.themeMode === 'dark',
              baseColor: paletteSpec.baseColor,
              tokens: snapshotTokens,
              printMode: Boolean(paletteSpec.printMode),
            },
          }
          : buildTheme({
            name: paletteName,
            baseColor: paletteSpec.baseColor,
            mode: paletteSpec.mode,
            themeMode: paletteSpec.themeMode,
            isDark: paletteSpec.isDark,
            printMode: paletteSpec.printMode,
            apocalypseIntensity: paletteSpec.apocalypseIntensity ?? 100,
            harmonyIntensity: paletteSpec.harmonyIntensity ?? 100,
            neutralCurve: paletteSpec.neutralCurve ?? 100,
            accentStrength: paletteSpec.accentStrength ?? 100,
            popIntensity: paletteSpec.popIntensity ?? 100,
            importedOverrides: paletteSpec.importedOverrides ?? null,
          });

        const theme = snapshotTokens ? themeMaster.currentTheme : themeMaster.currentTheme;
        const paletteSlug = slugifyFilename(paletteName, `palette-${i + 1}`);
        const paletteFolder = root.folder(paletteSlug);
        if (!paletteFolder) continue;

        try {
          paletteFolder.file('palette-card.svg', buildPaletteCardSvg(theme));
          paletteFolder.file('swatch-strip.svg', buildStripSvg(theme));
        } catch (err) {
          console.warn('Palette SVG export failed', err);
        }

        const [palettePng, stripPng] = await Promise.allSettled([
          renderPaletteCardPng(theme),
          renderStripPng(theme),
        ]);
        if (palettePng.status === 'fulfilled') {
          paletteFolder.file('palette-card.png', palettePng.value);
        }
        if (stripPng.status === 'fulfilled') {
          paletteFolder.file('swatch-strip.png', stripPng.value);
        }
        paletteFolder.file('tokens.json', JSON.stringify(theme.tokens, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const filename = buildExportFilename(projectSlug, '-print-assets', 'zip');
      exportThemePack({ data: blob, filename, mime: 'application/zip' });
      setProjectExportStatus(
        skipped.length
          ? `Completed with skips: ${skipped.join(', ')}`
          : 'Print assets downloaded'
      );
    } catch (err) {
      console.error('Project print assets export failed', err);
      setProjectExportStatus('Project export failed — see console.');
    } finally {
      setProjectExporting(false);
    }
  }, [buildSpecFromSection, projectContext, projectExporting, setProjectExportStatus]);

  const exportProjectPenpotPrintTokens = useCallback(async () => {
    if (!projectContext || projectPenpotExporting) return;
    const sections = projectContext.sections || [];
    if (!sections.length) {
      setProjectPenpotStatus('Add at least one palette to export.');
      return;
    }
    setProjectPenpotExporting(true);
    setProjectPenpotStatus('Preparing Penpot print tokens…');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const projectSlug = slugifyFilename(projectContext.projectName || 'project', 'project');
      const root = zip.folder(`${projectSlug}-penpot`);
      if (!root) throw new Error('Failed to create Penpot folder');
      const skipped = [];

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const paletteName = section?.label || `Palette ${i + 1}`;
        setProjectPenpotStatus(`Generating ${i + 1}/${sections.length}: ${paletteName}`);
        if (!section) {
          skipped.push(`(missing section ${i + 1})`);
          continue;
        }
        const paletteSpec = section.paletteSpec || buildSpecFromSection(section);
        if (!paletteSpec?.baseColor) {
          skipped.push(paletteName);
          continue;
        }
        const snapshotTokens = section.snapshot?.tokenSet || section.tokenSet;
        const printTokenSet = snapshotTokens?.print && typeof snapshotTokens.print === 'object'
          ? snapshotTokens.print
          : buildTheme({
            name: paletteName,
            baseColor: paletteSpec.baseColor,
            mode: paletteSpec.mode,
            themeMode: paletteSpec.themeMode,
            isDark: paletteSpec.isDark,
            printMode: true,
            apocalypseIntensity: paletteSpec.apocalypseIntensity ?? 100,
            harmonyIntensity: paletteSpec.harmonyIntensity ?? 100,
            neutralCurve: paletteSpec.neutralCurve ?? 100,
            accentStrength: paletteSpec.accentStrength ?? 100,
            popIntensity: paletteSpec.popIntensity ?? 100,
            importedOverrides: paletteSpec.importedOverrides ?? null,
          }).finalTokens?.print;
        const printTokens = buildPrintTokenTree(printTokenSet);
        if (!printTokens) {
          skipped.push(paletteName);
          continue;
        }

        const penpotPayload = buildPenpotPayload(
          printTokens,
          [],
          null,
          { namingPrefix: paletteSpec.tokenPrefix || undefined }
        );
        const penpotTokens = toPenpotTokens(penpotPayload);
        const paletteSlug = slugifyFilename(paletteName, `palette-${i + 1}`);
        root.file(`${paletteSlug}.json`, JSON.stringify(penpotTokens, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const filename = buildExportFilename(projectSlug, '-penpot-print-tokens', 'zip');
      exportThemePack({ data: blob, filename, mime: 'application/zip' });
      setProjectPenpotStatus(
        skipped.length
          ? `Completed with skips: ${skipped.join(', ')}`
          : 'Penpot print tokens downloaded'
      );
    } catch (err) {
      console.error('Project Penpot export failed', err);
      setProjectPenpotStatus('Penpot export failed — see console.');
    } finally {
      setProjectPenpotExporting(false);
    }
  }, [buildSpecFromSection, projectContext, projectPenpotExporting, setProjectPenpotStatus]);

  const exportSingleMoodBoardFromProject = useCallback((moodBoard) => {
    if (!projectContext) return;
    exportSingleMoodBoard(moodBoard, projectContext.projectName || 'project');
  }, [projectContext]);

  const exportAllMoodBoardsFromProject = useCallback(() => {
    if (!projectContext || !projectContext.moodBoards || projectContext.moodBoards.length === 0) return;
    exportMoodBoardCollection(projectContext.moodBoards, projectContext.projectName || 'project');
  }, [projectContext]);

  const exportDesignSpacePalettes = useCallback(() => {
    if (!projectContext || !projectContext.sections || projectContext.sections.length === 0) return;

    // Import the design space palette generator
    import('./lib/exports/designSpacePalette').then(({ generateDesignSpacePalette }) => {
      const palettes = projectContext.sections.map((section, index) => {
        // Generate a DesignSpace palette for each section
        const designSpacePalette = generateDesignSpacePalette(section.baseHex || '#6366f1');
        designSpacePalette.name = section.label || `Palette ${index + 1}`;
        return designSpacePalette;
      });

      // Create a ZIP file with all palettes
      import('jszip').then(({ default: JSZip }) => {
        const zip = new JSZip();
        const projectFolder = zip.folder(`${projectContext.projectName || 'project'}-designspace`);

        // Add each palette as a separate JSON file
        palettes.forEach((palette, index) => {
          const fileName = buildExportFilename(
            `${palette.name || `palette-${index + 1}`}`,
            '',
            'json',
            { sanitize: true }
          );
          projectFolder.file(fileName, JSON.stringify(palette, null, 2));
        });

        // Generate the ZIP file
        zip.generateAsync({ type: 'blob' }).then((content) => {
          const url = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.download = buildExportFilename(`${projectContext.projectName || 'project'}-designspace-palettes`, '', 'zip', { sanitize: true });
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
      });
    });
  }, [projectContext]);

  const handleDownloadThemePackWithPrint = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    const themeLabel = sanitizeThemeName(displayThemeName || 'Theme', 'Theme');
    const themeSlug = slugifyFilename(themeLabel, 'theme');
    await handleDownloadThemePack();
    if (!printMode) {
      notify('Run Forge assets (print pack) first', 'warn');
      return;
    }
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const root = zip.folder(themeSlug);
      if (!root) throw new Error('Failed to create zip root folder');
      try {
        const printTokens = buildExportPayload();
        root.file('tokens.json', JSON.stringify(printTokens, null, 2));
      } catch (err) {
        console.warn('CMYK print pack tokens failed', err);
      }
      try {
        const paletteSvg = buildPaletteCardSvg(currentTheme);
        root.file('palette-card.svg', paletteSvg);
      } catch (err) {
        console.warn('CMYK print pack palette SVG failed', err);
      }
      try {
        const stripSvg = buildStripSvg(currentTheme);
        root.file('swatch-strip.svg', stripSvg);
      } catch (err) {
        console.warn('CMYK print pack strip SVG failed', err);
      }
      const [palettePng, stripPng] = await Promise.allSettled([
        renderPaletteCardPng(currentTheme),
        renderStripPng(currentTheme),
      ]);
      if (palettePng.status === 'fulfilled') {
        root.file('palette-card.png', palettePng.value);
      }
      if (stripPng.status === 'fulfilled') {
        root.file('swatch-strip.png', stripPng.value);
      }
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const filename = buildExportFilename(themeSlug, '-cmyk-print-pack-v1', 'zip');
      exportThemePack({ data: blob, filename, mime: 'application/zip' });
      setStatusMessage('CMYK print pack downloaded', 'success');
    } catch (err) {
      console.error('CMYK print pack export failed', err);
      notify('CMYK print pack export failed. Check console for details.', 'error');
    }
  }, [
    buildExportPayload,
    currentTheme,
    displayThemeName,
    handleDownloadThemePack,
    notify,
    printMode,
    setStatusMessage,
  ]);

  const handleExportPdf = () => {
    if (!import.meta.env.DEV) return;
    if (typeof window.print !== 'function') {
      notify('Print is not supported in this browser', 'error');
      setExportError('Print is not supported in this browser');
      return;
    }
    const meta = updatePrintMeta();
    const originalTitle = document.title;
    savedTitleRef.current = originalTitle;
    document.title = `${displayThemeName} • ${meta.date}`;
    window.print();
    setTimeout(() => {
      if (savedTitleRef.current) {
        document.title = savedTitleRef.current;
        savedTitleRef.current = '';
      }
    }, 200);
  };

  const headerBackground = hexWithAlpha(tokens.surfaces['header-background'], 0.9);
  const headerGlowA = hexWithAlpha(tokens.brand.primary, 0.08);
  const headerGlowB = hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.06);
  const pageBackground = tokens.surfaces.background;
  const backgroundImage = [
    `radial-gradient(circle at 16% 14%, ${hexWithAlpha(tokens.brand.primary, 0.12)}, transparent 28%)`,
    `radial-gradient(circle at 82% 8%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.1)}, transparent 30%)`,
    `linear-gradient(180deg, ${hexWithAlpha(tokens.surfaces['background'], 0.75)} 0%, ${hexWithAlpha(pageBackground, 0.9)} 42%, ${pageBackground} 100%)`,
  ].join(', ');
  const backgroundSize = '140% 140%, 120% 120%, auto';
  const backgroundPosition = '0 0, 100% 0, 0 0';
  const quickBarBottom = 'max(12px, env(safe-area-inset-bottom, 12px))';
  const panelBase = tokens.cards['card-panel-surface'];
  const panelStrong = tokens.cards['card-panel-surface-strong'] || panelBase;
  const panelSoft = hexWithAlpha(panelBase, isDark ? 0.72 : 0.86);
  const panelGhost = hexWithAlpha(tokens.surfaces['background'], isDark ? 0.82 : 0.94);
  const panelBorder = tokens.cards['card-panel-border'];
  const panelText = tokens.textPalette?.['text-secondary'] || tokens.typography['text-strong'];
  const panelMuted = tokens.textPalette?.['text-tertiary'] || tokens.typography['text-muted'];
  const panelTextStrong = pickReadableText(panelStrong);
  const panelMutedStrong = getContrastRatio(panelMuted, panelStrong) >= 3.2
    ? panelMuted
    : hexWithAlpha(panelTextStrong, 0.72);
  const panelTextSoft = pickReadableText(panelSoft);
  const panelMutedSoft = getContrastRatio(panelMuted, panelSoft) >= 3.2
    ? panelMuted
    : hexWithAlpha(panelTextSoft, 0.72);
  const chipMinContrast = themeMode === 'pop' ? 1.6 : 1.25;
  const panelChipBase = tokens.cards['card-tag-bg'] || panelBase;
  const panelChipReference = getContrastRatio(panelChipBase, panelStrong) < getContrastRatio(panelChipBase, panelBase)
    ? panelStrong
    : panelBase;
  let panelChip = panelChipBase;
  if (getContrastRatio(panelChip, panelChipReference) < chipMinContrast) {
    const referenceL = hexToHsl(panelChipReference).l;
    const delta = referenceL > 50 ? -12 : 12;
    const adjusted = adjustHexLuminance(panelChipBase, delta);
    const boosted = adjustHexLuminance(panelChipBase, delta * 2);
    if (getContrastRatio(adjusted, panelChipReference) >= chipMinContrast) {
      panelChip = adjusted;
    } else if (getContrastRatio(boosted, panelChipReference) >= chipMinContrast) {
      panelChip = boosted;
    } else {
      panelChip = pickReadableText(panelChipReference, '#111827', '#f8fafc');
    }
  }
  const panelChipTextBase = tokens.cards['card-tag-text'] || panelText;
  const panelChipText = getContrastRatio(panelChipTextBase, panelChip) >= 4.5
    ? panelChipTextBase
    : pickReadableText(panelChip);
  const panelChipBorderBase = tokens.cards['card-tag-border'] || panelBorder;
  const panelChipBorder = getContrastRatio(panelChipBorderBase, panelChip) >= chipMinContrast
    ? panelChipBorderBase
    : hexWithAlpha(panelChipText, 0.35);
  const statusSuccess = tokens.status.success;
  const statusWarning = tokens.status.warning;
  const statusError = tokens.status.error;
  const statusInfo = tokens.status.info;
  const statusSuccessText = pickReadableText(statusSuccess);
  const statusWarningText = pickReadableText(statusWarning);
  const statusErrorText = pickReadableText(statusError);
  const statusInfoText = pickReadableText(statusInfo);
  const uiTheme = useMemo(() => ({
    '--page-background': pageBackground,
    '--page-background-image': backgroundImage,
    '--page-background-size': backgroundSize,
    '--page-background-position': backgroundPosition,
    '--panel-bg': panelBase,
    '--panel-bg-soft': panelSoft,
    '--panel-bg-strong': panelStrong,
    '--panel-bg-ghost': panelGhost,
    '--panel-border': panelBorder,
    '--panel-text': panelText,
    '--panel-muted': panelMuted,
    '--panel-text-strong': panelTextStrong,
    '--panel-muted-strong': panelMutedStrong,
    '--panel-text-soft': panelTextSoft,
    '--panel-muted-soft': panelMutedSoft,
    '--panel-accent': tokens.brand.primary,
    '--panel-accent-strong': tokens.brand.cta || tokens.brand.primary,
    '--panel-accent-text': ctaTextColor,
    '--panel-chip-bg': panelChip,
    '--panel-chip-border': panelChipBorder,
    '--panel-chip-text': panelChipText,
    '--panel-shadow': `0 22px 60px -48px ${hexWithAlpha(tokens.brand.primary, 0.45)}`,
    '--status-success': statusSuccess,
    '--status-success-text': statusSuccessText,
    '--status-success-border': hexWithAlpha(statusSuccess, 0.45),
    '--status-warning': statusWarning,
    '--status-warning-text': statusWarningText,
    '--status-warning-border': hexWithAlpha(statusWarning, 0.45),
    '--status-error': statusError,
    '--status-error-text': statusErrorText,
    '--status-error-border': hexWithAlpha(statusError, 0.45),
    '--status-info': statusInfo,
    '--status-info-text': statusInfoText,
    '--status-info-border': hexWithAlpha(statusInfo, 0.45),
    '--text-primary': tokens.typography?.['text-strong'] || tokens.typography?.heading || panelTextStrong,
    '--text-body': tokens.typography?.['text-body'] || panelText,
    '--text-muted': tokens.typography?.['text-muted'] || panelMuted,
    '--text-strong': tokens.typography?.['text-strong'] || panelTextStrong,
    '--heading': tokens.typography?.heading || tokens.typography?.['text-strong'] || panelTextStrong,
  }), [
    pageBackground,
    backgroundImage,
    backgroundSize,
    backgroundPosition,
    panelBase,
    panelSoft,
    panelStrong,
    panelGhost,
    panelBorder,
    panelChip,
    panelChipBorder,
    panelChipText,
    panelText,
    panelMuted,
    panelTextStrong,
    panelMutedStrong,
    panelTextSoft,
    panelMutedSoft,
    ctaTextColor,
    statusSuccess,
    statusWarning,
    statusError,
    statusInfo,
    statusSuccessText,
    statusWarningText,
    statusErrorText,
    statusInfoText,
    tokens,
  ]);

  const themeClass = useMemo(() => getThemeClassName(themeMode), [themeMode]);
  const themeCssText = useMemo(() => buildThemeCss(uiTheme, `:root.${themeClass}`), [uiTheme, themeClass]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    THEME_CLASSNAMES.forEach((name) => root.classList.remove(name));
    root.classList.add(themeClass);
    let styleTag = document.getElementById('theme-vars');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'theme-vars';
      document.head.appendChild(styleTag);
    }
    if (styleTag.textContent !== themeCssText) {
      styleTag.textContent = themeCssText;
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', pageBackground);
  }, [pageBackground, themeClass, themeCssText]);

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only trigger shortcuts when not typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

      // Prevent default for our shortcuts
      switch (event.key.toLowerCase()) {
        case 'r':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            randomRitual();
          }
          break;
        case 'f':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowFineTune(v => !v);
          }
          break;
        case 'h':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setHeaderOpen(v => !v);
          }
          break;
        case 'escape':
          // Close any open modals or menus
          setChaosMenuOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      className="min-h-screen transition-colors duration-500 app-theme"
    >
    <MoodBoardProvider>
      <>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 px-3 py-2 rounded"
          style={{ backgroundColor: tokens.brand.primary, color: primaryTextColor }}
        >
          Skip to content
        </a>
        <div 
          className="hidden print:flex items-start justify-between gap-6 max-w-7xl mx-auto px-6 py-4 mb-4 rounded-xl border print-header"
          style={{ 
            backgroundColor: tokens.cards["card-panel-surface"],
            color: tokens.typography["text-strong"],
            borderColor: tokens.cards["card-panel-border"]
          }}
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Theme</p>
            <p className="text-lg font-bold leading-tight">{displayThemeName}</p>
            <p className="text-xs panel-muted opacity-80">Base color: {baseColor.toUpperCase()}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Mode</p>
            <p className="text-sm font-bold">{mode}</p>
            <p className="text-xs panel-muted opacity-80">{printMeta.dateTime}</p>
          </div>
        </div>

        <IdentityStage
          tokens={tokens}
          primaryTextColor={primaryTextColor}
          headerBackground={headerBackground}
          headerGlowA={headerGlowA}
          headerGlowB={headerGlowB}
          isDark={isDark}
          view={view}
          setView={setView}
          saveCurrentPalette={saveCurrentPalette}
          savedPalettes={savedPalettes}
          loadSavedPalette={loadSavedPalette}
          exportSavedPalettes={exportSavedPalettes}
          importSavedPalettes={importSavedPalettes}
          triggerSavedPalettesImport={triggerSavedPalettesImport}
          savedPaletteInputRef={savedPaletteInputRef}
          storageAvailable={storageAvailable}
          storageCorrupt={storageCorrupt}
          storageQuotaExceeded={storageQuotaExceeded}
          clearSavedData={clearSavedData}
          customThemeName={customThemeName}
          setCustomThemeName={setCustomThemeName}
          autoThemeName={autoThemeName}
          tokenPrefix={tokenPrefix}
          setTokenPrefix={setTokenPrefix}
          saveStatus={saveStatus}
          importedOverrides={importedOverrides}
          sanitizeThemeName={sanitizeThemeName}
          sanitizePrefix={sanitizePrefix}
          projectEdit={projectEdit}
          onSaveProjectPalette={() => saveProjectPalette()}
          onSaveProjectPaletteAsNew={() => saveProjectPalette({ asNew: true })}
          onCancelProjectEdit={cancelProjectEdit}
        />

      {/* Quick controls bar (sticky when header collapsed) */}
      {!headerOpen && (
        <div
          className="fixed left-3 z-30"
          style={{ width: 'calc(100% - 24px)', maxWidth: '420px', bottom: quickBarBottom }}
        >
          <div
            className="rounded-2xl border panel-surface-soft backdrop-blur p-3 shadow-2xl flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 panel-surface-strong p-1.5 rounded-lg border flex-1">
                <input
                  type="color"
                  value={pickerColor}
                  onChange={(e) => handleBaseColorChange(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
                  aria-label="Choose base color"
                />
                <input
                  type="text"
                  value={baseInput}
                  onChange={(e) => handleBaseColorChange(e.target.value)}
                  className="w-full bg-transparent text-sm font-mono panel-text outline-none uppercase border-b border-transparent"
                  style={{ borderColor: baseError ? tokens.status.error : 'transparent' }}
                  aria-label="Base color hex value"
                  aria-invalid={Boolean(baseError)}
                />
              </div>
            </div>
            {baseError && <p className="text-xs font-semibold" style={{ color: tokens.status.error }} role="alert">{baseError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg panel-surface-strong text-sm border focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
                aria-label="Select style mode"
              >
                {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="flex panel-surface-strong p-1 rounded-lg border" role="group" aria-label="Theme mode">
                {[
                  { key: 'light', label: 'L' },
                  { key: 'dark', label: 'D' },
                  { key: 'pop', label: 'P' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setThemeMode(item.key)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      themeMode === item.key
                        ? 'panel-surface shadow-sm'
                        : ''
                    } panel-text focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2`}
                    style={themeMode === item.key ? { color: tokens.brand.primary } : undefined}
                    aria-pressed={themeMode === item.key}
                    aria-label={`Set theme mode to ${item.label}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-28 md:pb-12 space-y-10">
          {view === 'project' ? (
            <Suspense fallback={<div className="p-4 rounded-lg border panel-surface-soft text-sm">Loading Project...</div>}>
              <PaletteContext.Provider value={paletteSnapshot}>
                <ProjectView
                  onImportCss={handleCssImport}
                  onOpenPalette={openProjectPalette}
                  onDownloadPrintAssets={exportProjectPrintAssets}
                  onExportPenpotPrintTokens={exportProjectPenpotPrintTokens}
                  onExportDesignSpacePalettes={exportDesignSpacePalettes}
                  projectExportStatus={projectExportStatus}
                  projectExporting={projectExporting}
                  projectPenpotStatus={projectPenpotStatus}
                  projectPenpotExporting={projectPenpotExporting}
                />
              </PaletteContext.Provider>
            </Suspense>
          ) : (
            <>
          <div className="flex justify-center">
            <StageNav stages={stageDefs} currentStage={currentStage} onNavigate={handleStageNavigate} />
          </div>

          <BuildStage
            headerOpen={headerOpen}
            setHeaderOpen={setHeaderOpen}
            chaosMenuOpen={chaosMenuOpen}
            setChaosMenuOpen={setChaosMenuOpen}
            randomRitual={randomRitual}
            crankApocalypse={crankApocalypse}
            resetPalette={resetPalette}
            tokens={tokens}
            mode={mode}
            setMode={setMode}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            pickerColor={pickerColor}
            baseInput={baseInput}
            baseError={baseError}
            handleBaseColorChange={handleBaseColorChange}
            presets={presets}
            applyPreset={applyPreset}
            showFineTune={showFineTune}
            setShowFineTune={setShowFineTune}
            harmonyIntensity={harmonyIntensity}
            neutralCurve={neutralCurve}
            accentStrength={accentStrength}
            apocalypseIntensity={apocalypseIntensity}
            popIntensity={popIntensity}
            setHarmonyIntensity={setHarmonyIntensity}
            setNeutralCurve={setNeutralCurve}
            setAccentStrength={setAccentStrength}
            setApocalypseIntensity={setApocalypseIntensity}
            setPopIntensity={setPopIntensity}
            harmonyInput={harmonyInput}
            neutralInput={neutralInput}
            accentInput={accentInput}
            apocalypseInput={apocalypseInput}
            popInput={popInput}
            setHarmonyInput={setHarmonyInput}
            setNeutralInput={setNeutralInput}
            setAccentInput={setAccentInput}
            setApocalypseInput={setApocalypseInput}
            setPopInput={setPopInput}
            debouncedHarmonyChange={debouncedHarmonyChange}
            debouncedNeutralChange={debouncedNeutralChange}
            debouncedAccentChange={debouncedAccentChange}
            debouncedApocalypseChange={debouncedApocalypseChange}
            debouncedPopChange={debouncedPopChange}
            canUndo={canUndo}
            canRedo={canRedo}
            undo={undo}
            redo={redo}
          />
          <MoodBoard
            tokens={tokens}
            baseColor={baseColor}
            onApplyPaletteSpec={applyMoodBoardSpec}
            onSaveDraft={saveMoodBoardDraft}
            copyHexValue={copyHexValue}
            canSaveDraft={Boolean(projectContext)}
            onExportSingleMoodBoard={exportSingleMoodBoardFromProject}
            onExportAllMoodBoards={exportAllMoodBoardsFromProject}
          />

          <ValidateStage
            tokens={tokens}
            displayThemeName={displayThemeName}
            baseColor={baseColor}
            mode={mode}
            themeMode={themeMode}
            isDark={isDark}
            primaryTextColor={primaryTextColor}
            quickEssentials={quickEssentials}
            copyAllEssentials={copyAllEssentials}
            copyEssentialsList={copyEssentialsList}
            copyHexValue={copyHexValue}
            orderedSwatches={orderedSwatches}
            showContrast={showContrast}
            setShowContrast={setShowContrast}
            contrastChecks={contrastChecks}
            paletteRows={paletteRows}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            getTabId={getTabId}
            tabOptions={tabOptions}
            onJumpToExports={handleJumpToExports}
            showExports={isDev}
            isInternal={isInternal}
          />

          <PackageStage
            activeTab={activeTab}
            getTabId={getTabId}
            printMode={printMode}
            setPrintMode={setPrintMode}
            tokens={tokens}
            primaryTextColor={primaryTextColor}
            printAssetPack={printAssetPack}
            canvaPrintHexes={canvaPrintHexes}
          />

          {isDev && (
            <ExportStage
              activeTab={activeTab}
              getTabId={getTabId}
              exportsSectionRef={exportsSectionRef}
              handleJumpToExports={handleJumpToExports}
              copyShareLink={copyShareLink}
              overflowOpen={overflowOpen}
              setOverflowOpen={setOverflowOpen}
              tokens={tokens}
              ctaTextColor={ctaTextColor}
              primaryTextColor={primaryTextColor}
              finalTokens={finalTokens}
              printMode={printMode}
              isExportingAssets={isExportingAssets}
              exportError={exportError}
              exportBlocked={exportBlocked}
              printSupported={printSupported}
              neutralButtonText={neutralButtonText}
              exportAllAssets={exportAllAssets}
              handleExportPdf={handleExportPdf}
              exportJson={exportJson}
              exportGenericJson={exportGenericJson}
              exportFigmaTokensJson={exportFigmaTokensJson}
              exportStyleDictionaryJson={exportStyleDictionaryJson}
              exportCssVars={exportCssVars}
              exportUiThemeCss={exportUiThemeCss}
              exportWitchcraftJson={exportWitchcraftJson}
              exportDesignSpacePalette={exportDesignSpacePalette}
              onDownloadThemePack={handleDownloadThemePack}
              onDownloadThemePackWithPrint={handleDownloadThemePackWithPrint}
              onGenerateListingAssets={handleGenerateListingAssets}
              displayThemeName={displayThemeName}
              isInternal={isInternal}
            />
          )}
            </>
          )}
        </main>
        {/* Main Content */}
        {isDev && (
          <ListingAssetsCanvas
            tokens={tokens}
            baseColor={baseColor}
            mode={mode}
            themeMode={themeMode}
            displayThemeName={displayThemeName}
            coverRef={listingCoverRef}
            swatchRef={listingSwatchRef}
            snippetRef={listingSnippetRef}
          />
        )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 space-y-3 z-50">
        <button
          type="button"
          onClick={randomRitual}
          className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          aria-label="Generate random palette"
          title="Random Palette (R)"
        >
          <Shuffle size={20} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

    </>
  </MoodBoardProvider>
  </div>
);
}
