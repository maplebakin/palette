import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { FileText, Image } from 'lucide-react';
import ProjectView from './components/ProjectView';
import { StageNav } from './components/stages/StageLayout';
import IdentityStage from './components/stages/IdentityStage';
import BuildStage from './components/stages/BuildStage';
import ValidateStage from './components/stages/ValidateStage';
import PackageStage from './components/stages/PackageStage';
import ExportStage from './components/stages/ExportStage';
import useDarkClassSync from './hooks/useDarkClassSync';
import { useNotification } from './context/NotificationContext.jsx';
import { PaletteContext } from './context/PaletteContext.jsx';
import {
  escapeXml,
  getContrastRatio,
  getWCAGBadge,
  hexToRgb,
  hexWithAlpha,
  normalizeHex,
  pickReadableText,
} from './lib/colorUtils';
import { addPrintMode, buildOrderedStack, generateTokens, orderedSwatchSpec } from './lib/tokens';
import { buildGenericPayload, buildPenpotPayload, buildWitchcraftPayload, buildFigmaTokensPayload, buildStyleDictionaryPayload } from './lib/payloads';

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
const downloadFile = (filename, content, mime = 'text/plain') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
const buildCssVariables = (stack, prefix = '') => {
  const safePrefix = prefix ? `${prefix}-` : '';
  const lines = stack.map(({ path, value }) => `  --${safePrefix}${path.replace(/\./g, '-')}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
};

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

const applyTokenOverrides = (baseTokens, overrides) => {
  if (!overrides || Object.keys(overrides).length === 0) return baseTokens;
  const next = typeof structuredClone === 'function'
    ? structuredClone(baseTokens)
    : JSON.parse(JSON.stringify(baseTokens));
  Object.entries(overrides).forEach(([path, value]) => {
    const parts = path.split('.');
    let current = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    current[parts[parts.length - 1]] = value;
  });
  return next;
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
  const [showFineTune, setShowFineTune] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [chaosMenuOpen, setChaosMenuOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const statusTimerRef = useRef(null);
  const harmonyDebounceRef = useRef(null);
  const neutralDebounceRef = useRef(null);
  const accentDebounceRef = useRef(null);
  const apocalypseDebounceRef = useRef(null);
  const popDebounceRef = useRef(null);
  const pickerColor = baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor;
  // Controls the UI theme (preview background)
  // Usually we want this to sync with generated tokens for best preview, but nice to keep separate for inspection
  // For this UX, I will sync them. When you generate Dark Tokens, the UI becomes dark.

  const setStatusMessage = useCallback((message, tone = 'info') => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setSaveStatus(message);
    notify(message, tone);
    statusTimerRef.current = setTimeout(() => setSaveStatus(''), 2400);
  }, [notify]);

  const isDark = themeMode === 'dark';
  const uiIsDark = themeMode === 'dark';
  useDarkClassSync(uiIsDark);
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
      if (activeTab === 'Exports') {
        setCurrentStage('Export');
        return;
      }
      setCurrentStage('Validate');
    };
    updateStage();
    window.addEventListener('hashchange', updateStage);
    return () => window.removeEventListener('hashchange', updateStage);
  }, [activeTab, view]);

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
    setHarmonyInput(nextHarmony);
    setApocalypseInput(nextApoc);
    setNeutralInput(nextNeutral);
    setAccentInput(nextAccent);
    setPopInput(nextPop);
    setTokenPrefix(sanitizePrefix(payload.tokenPrefix || ''));
    const savedOverrides = payload.importedOverrides;
    if (savedOverrides && typeof savedOverrides === 'object') {
      setImportedOverrides(savedOverrides);
    } else {
      setImportedOverrides(null);
    }
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

  useEffect(() => {
    setHarmonyInput(harmonyIntensity);
    setNeutralInput(neutralCurve);
    setAccentInput(accentStrength);
    setApocalypseInput(apocalypseIntensity);
    setPopInput(popIntensity);
  }, [harmonyIntensity, neutralCurve, accentStrength, apocalypseIntensity, popIntensity]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
    if (neutralDebounceRef.current) clearTimeout(neutralDebounceRef.current);
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    if (apocalypseDebounceRef.current) clearTimeout(apocalypseDebounceRef.current);
    if (popDebounceRef.current) clearTimeout(popDebounceRef.current);
  }, []);

  const autoThemeName = useMemo(() => `${mode} ${themeMode === 'dark' ? 'Dark' : themeMode === 'pop' ? 'Pop' : 'Light'}`, [mode, themeMode]);
  const safeCustomThemeName = useMemo(() => sanitizeThemeName(customThemeName, ''), [customThemeName]);
  const displayThemeName = safeCustomThemeName || autoThemeName;
  const tokens = useMemo(() => {
    const generated = generateTokens(baseColor, mode, themeMode, apocalypseIntensity, {
      harmonyIntensity,
      neutralCurve,
      accentStrength,
      popIntensity,
    });
    return applyTokenOverrides(generated, importedOverrides);
  }, [baseColor, mode, themeMode, apocalypseIntensity, harmonyIntensity, neutralCurve, accentStrength, popIntensity, importedOverrides]);
  const paletteSnapshot = useMemo(() => ({
    baseColor,
    mode,
    tokens,
  }), [baseColor, mode, tokens]);
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
  const buildShareHash = useCallback(() => {
    const json = JSON.stringify(shareState);
    const encoded = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : '';
    return encoded ? `#palette=${encoded}` : '';
  }, [shareState]);
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
  const tabOptions = useMemo(() => (['Quick view', 'Full system', 'Print assets', 'Exports']), []);
  const tabIds = useMemo(() => ({
    'Quick view': 'tab-quick',
    'Full system': 'tab-full',
    'Print assets': 'tab-print',
    'Exports': 'tab-exports',
  }), []);
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
    requestAnimationFrame(() => {
      if (exportsSectionRef.current) {
        exportsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
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
  const finalTokens = useMemo(
    () => (printMode ? addPrintMode(tokens, baseColor, mode, isDark) : tokens),
    [tokens, printMode, baseColor, mode, isDark]
  );
  const currentTheme = useMemo(() => ({
    name: displayThemeName,
    mode,
    themeMode,
    isDark,
    baseColor,
    tokens: finalTokens,
    printMode,
  }), [displayThemeName, mode, themeMode, isDark, baseColor, finalTokens, printMode]);
  const orderedStack = useMemo(() => buildOrderedStack(finalTokens), [finalTokens]);
  const orderedSwatches = useMemo(
    () => orderedStack.map(({ name, value }) => ({ name, color: value })),
    [orderedStack]
  );
  const printAssetPack = useMemo(() => ([
    { icon: <Image size={14} />, name: 'Palette card', files: 'palette-card.svg + palette-card.png', note: 'Hero palette overview built from the print palette.' },
    { icon: <Image size={14} />, name: 'Swatch strip', files: 'swatch-strip.svg + swatch-strip.png', note: '8-swatch strip for quick brand references.' },
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
  const ctaTextColor = useMemo(() => pickReadableText(tokens.brand.primary), [tokens.brand.primary]);
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

  const exportJson = (filename) => {
    const penpotPayload = buildExportPayload();
    downloadFile(filename, JSON.stringify(penpotPayload, null, 2), 'application/json');
  };

  const exportGenericJson = (filename) => {
    const payload = buildGenericPayload(finalTokens, {
      themeName: displayThemeName,
      mode,
      baseColor,
      isDark,
      printMode,
      generatedAt: new Date().toISOString(),
      tokenPrefix: tokenPrefix || undefined,
    });
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  };

  const exportWitchcraftJson = (filename) => {
    const witchcraftPayload = buildWitchcraftPayload(finalTokens, displayThemeName, mode, isDark);
    downloadFile(filename, JSON.stringify(witchcraftPayload, null, 2), 'application/json');
  };

  const exportFigmaTokensJson = (filename) => {
    const payload = buildFigmaTokensPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  };

  const exportStyleDictionaryJson = (filename) => {
    const payload = buildStyleDictionaryPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  };
  const exportCssVars = () => {
    const css = buildCssVariables(orderedStack, sanitizePrefix(tokenPrefix));
    const slugBase = sanitizeThemeName(displayThemeName || 'theme', 'theme');
    const slug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
    downloadFile(`${slug}-tokens.css`, css, 'text/css');
    setStatusMessage('CSS variables exported', 'success');
  };

  const copyShareLink = useCallback(async () => {
    try {
      const hash = buildShareHash();
      if (!hash) throw new Error('Share link unavailable');
      const url = `${window.location.origin}${window.location.pathname}${hash}`;
      if (url.length > 1900) {
        notify('Share link too long; try shorter names/prefix', 'warn');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
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
  }, [buildShareHash, notify]);

  const exportAllAssets = useCallback(async () => {
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
      const slugBase = sanitizeThemeName(currentTheme.name || 'theme', 'theme');
      const slug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
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
      const blob = new Blob([tarData], { type: 'application/x-tar' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slug}-asset-pack.tar`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify('Asset export failed. Check console for details.', 'error', 4000);
      console.error('Asset export failed', err);
    } finally {
      setIsExportingAssets(false);
    }
  }, [buildExportPayload, currentTheme, notify]);

  const handleExportPdf = () => {
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
  const pageBackground = printMode ? '#fdfdf9' : tokens.surfaces['page-background'];
  const backgroundImage = printMode
    ? 'radial-gradient(circle at 25% 25%, #f0f0f0 1px, transparent 1px), radial-gradient(circle at 75% 75%, #e0e0e0 1px, transparent 1px)'
    : [
        `radial-gradient(circle at 16% 14%, ${hexWithAlpha(tokens.brand.primary, 0.12)}, transparent 28%)`,
        `radial-gradient(circle at 82% 8%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.1)}, transparent 30%)`,
        `linear-gradient(180deg, ${hexWithAlpha(tokens.surfaces['background'], 0.75)} 0%, ${hexWithAlpha(tokens.surfaces['page-background'], 0.9)} 42%, ${tokens.surfaces['page-background']} 100%)`,
      ].join(', ');
  const backgroundSize = printMode ? '40px 40px, 40px 40px' : '140% 140%, 120% 120%, auto';
  const backgroundPosition = printMode ? '0 0, 0 0' : '0 0, 100% 0, 0 0';
  const quickBarBottom = 'max(12px, env(safe-area-inset-bottom, 12px))';
  const panelBase = tokens.cards['card-panel-surface'];
  const panelStrong = tokens.cards['card-panel-surface-strong'] || panelBase;
  const panelSoft = hexWithAlpha(panelBase, isDark ? 0.72 : 0.86);
  const panelGhost = hexWithAlpha(tokens.surfaces['background'], isDark ? 0.82 : 0.94);
  const panelBorder = tokens.cards['card-panel-border'];
  const panelChip = tokens.cards['card-tag-bg'] || panelBase;
  const panelChipBorder = tokens.cards['card-tag-border'] || panelBorder;
  const panelChipText = tokens.cards['card-tag-text'] || tokens.typography['text-strong'];
  const uiTheme = useMemo(() => ({
    '--panel-bg': panelBase,
    '--panel-bg-soft': panelSoft,
    '--panel-bg-strong': panelStrong,
    '--panel-bg-ghost': panelGhost,
    '--panel-border': panelBorder,
    '--panel-text': tokens.typography['text-strong'],
    '--panel-muted': tokens.typography['text-muted'],
    '--panel-accent': tokens.brand.primary,
    '--panel-accent-strong': tokens.brand.cta || tokens.brand.primary,
    '--panel-accent-text': ctaTextColor,
    '--panel-chip-bg': panelChip,
    '--panel-chip-border': panelChipBorder,
    '--panel-chip-text': panelChipText,
    '--panel-shadow': `0 22px 60px -48px ${hexWithAlpha(tokens.brand.primary, 0.45)}`,
  }), [panelBase, panelSoft, panelStrong, panelGhost, panelBorder, panelChip, panelChipBorder, panelChipText, ctaTextColor, tokens]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = pageBackground;
    document.body.style.backgroundColor = pageBackground;
    document.body.style.color = tokens.typography['text-strong'];
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', pageBackground);
  }, [pageBackground, tokens]);

  return (
      <div 
        className={`min-h-screen transition-colors duration-500 app-theme ${uiIsDark ? 'dark' : ''}`}
        style={{
          ...uiTheme,
          backgroundColor: pageBackground,
          backgroundImage,
          backgroundSize,
          backgroundPosition,
        }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 px-3 py-2 rounded"
          style={{ backgroundColor: tokens.brand.primary, color: ctaTextColor }}
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
            <p className="text-xs text-slate-500 dark:text-slate-300 opacity-80">Base color: {baseColor.toUpperCase()}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Mode</p>
            <p className="text-sm font-bold">{mode}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300 opacity-80">{printMeta.dateTime}</p>
          </div>
        </div>

        <IdentityStage
          tokens={tokens}
          ctaTextColor={ctaTextColor}
          headerBackground={headerBackground}
          headerGlowA={headerGlowA}
          headerGlowB={headerGlowB}
          isDark={isDark}
          view={view}
          setView={setView}
          saveCurrentPalette={saveCurrentPalette}
          savedPalettes={savedPalettes}
          loadSavedPalette={loadSavedPalette}
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
        />

      {/* Quick controls bar (sticky when header collapsed) */}
      {!headerOpen && (
        <div
          className="fixed left-3 z-30"
          style={{ width: 'calc(100% - 24px)', maxWidth: '420px', bottom: quickBarBottom }}
        >
          <div
            className="rounded-2xl border panel-surface-soft backdrop-blur p-3 shadow-2xl flex flex-col gap-2"
            style={{ borderColor: tokens.cards["card-panel-border"] }}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 panel-surface-strong p-1.5 rounded-lg border flex-1">
                <input
                  type="color"
                  value={pickerColor}
                  onChange={(e) => handleBaseColorChange(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  aria-label="Choose base color"
                />
                <input
                  type="text"
                  value={baseInput}
                  onChange={(e) => handleBaseColorChange(e.target.value)}
                  className={`w-full bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 outline-none uppercase ${baseError ? 'border-b border-rose-500' : ''}`}
                  aria-label="Base color hex value"
                  aria-invalid={Boolean(baseError)}
                />
              </div>
            </div>
            {baseError && <p className="text-xs text-rose-600 font-semibold" role="alert">{baseError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg panel-surface-strong text-sm border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
                    } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                    style={themeMode === item.key
                      ? { color: tokens.brand.primary }
                      : { color: tokens.typography['text-muted'] }}
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
                <ProjectView onImportCss={handleCssImport} />
              </PaletteContext.Provider>
            </Suspense>
          ) : (
            <>
          <div className="flex justify-center">
            <StageNav stages={STAGE_DEFS} currentStage={currentStage} onNavigate={handleStageNavigate} />
          </div>

          <BuildStage
            headerOpen={headerOpen}
            setHeaderOpen={setHeaderOpen}
            chaosMenuOpen={chaosMenuOpen}
            setChaosMenuOpen={setChaosMenuOpen}
            randomRitual={randomRitual}
            crankApocalypse={crankApocalypse}
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
            harmonyInput={harmonyInput}
            neutralInput={neutralInput}
            accentInput={accentInput}
            apocalypseInput={apocalypseInput}
            popInput={popInput}
            debouncedHarmonyChange={debouncedHarmonyChange}
            debouncedNeutralChange={debouncedNeutralChange}
            debouncedAccentChange={debouncedAccentChange}
            debouncedApocalypseChange={debouncedApocalypseChange}
            debouncedPopChange={debouncedPopChange}
          />

          <ValidateStage
            tokens={tokens}
            displayThemeName={displayThemeName}
            baseColor={baseColor}
            mode={mode}
            themeMode={themeMode}
            isDark={isDark}
            ctaTextColor={ctaTextColor}
            quickEssentials={quickEssentials}
            copyAllEssentials={copyAllEssentials}
            copyEssentialsList={copyEssentialsList}
            copyHexValue={copyHexValue}
            orderedSwatches={orderedSwatches}
            showContrast={showContrast}
            setShowContrast={setShowContrast}
            contrastChecks={contrastChecks}
            finalTokens={finalTokens}
            paletteRows={paletteRows}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            getTabId={getTabId}
            tabOptions={tabOptions}
            onJumpToExports={handleJumpToExports}
            isInternal={isInternal}
          />

          <PackageStage
            activeTab={activeTab}
            getTabId={getTabId}
            printMode={printMode}
            setPrintMode={setPrintMode}
            tokens={tokens}
            ctaTextColor={ctaTextColor}
            printAssetPack={printAssetPack}
            canvaPrintHexes={canvaPrintHexes}
          />

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
            exportWitchcraftJson={exportWitchcraftJson}
            displayThemeName={displayThemeName}
            isInternal={isInternal}
          />
            </>
          )}
        </main>
        {/* Main Content */}
      </div>
  );
}
