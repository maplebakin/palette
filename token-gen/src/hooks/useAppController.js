import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import useDarkClassSync from './useDarkClassSync.js';
import useShareLink from './useShareLink.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { ProjectContext } from '../context/ProjectContext.jsx';
import {
  adjustHexLuminance,
  buildOverridesFromCss,
  clampValue,
  getPrintTimestamps,
  inferThemeMode,
  normalizeImportedPalette,
  PRESETS,
  sanitizeHexInput,
  sanitizePrefix,
  sanitizeThemeName,
  STAGE_DEFS,
  STORAGE_KEYS,
} from '../lib/appState.js';
import {
  getContrastRatio,
  getWCAGBadge,
  hexToHsl,
  hexWithAlpha,
  normalizeHex,
  pickReadableText,
} from '../lib/colorUtils.js';
import { buildTheme } from '../lib/theme/engine.js';
import { buildThemeCss, getThemeClassName, THEME_CLASSNAMES } from '../lib/themeStyles.js';
import { buildSectionSnapshotFromPalette, toGeneratorMode } from '../lib/projectUtils.js';
import { exportMoodBoardCollection, exportSingleMoodBoard } from '../lib/exportMoodBoards.js';
import {
  buildPenpotExportPayload,
  exportCssVariablesFile,
  exportDesignSpacePaletteFile,
  exportFigmaTokensJson,
  exportGenericJsonTokens,
  exportPenpotJsonBundle,
  exportSavedPalettesJson,
  exportStyleDictionaryJson,
  exportUiThemeCssFile,
  exportWitchcraftJsonTokens,
} from '../lib/exports/tokenExports.js';
import {
  downloadThemePackArchive,
  downloadThemePackWithPrintArchive,
  exportAllAssetsPack,
  exportDesignSpacePalettesArchive,
  exportProjectPenpotPrintTokensArchive,
  exportProjectPrintAssetsArchive,
  generateListingAssetsArchive,
} from '../lib/exports/workflowExports.js';
import { useExportStore } from '../store/exportStore.js';
import { usePaletteStore } from '../store/paletteStore.js';
import { useProjectStore } from '../store/projectStore.js';
import { useUiStore } from '../store/uiStore.js';

export default function useAppController() {
  const { notify } = useNotification();
  const projectContext = useContext(ProjectContext);
  const isDev = import.meta.env.DEV;
  const isInternal = import.meta.env.VITE_INTERNAL === 'true';

  const paletteState = usePaletteStore(useShallow((state) => ({
    baseColor: state.baseColor,
    baseInput: state.baseInput,
    baseError: state.baseError,
    mode: state.mode,
    themeMode: state.themeMode,
    printMode: state.printMode,
    customThemeName: state.customThemeName,
    importedOverrides: state.importedOverrides,
    harmonyIntensity: state.harmonyIntensity,
    apocalypseIntensity: state.apocalypseIntensity,
    neutralCurve: state.neutralCurve,
    accentStrength: state.accentStrength,
    popIntensity: state.popIntensity,
    harmonyInput: state.harmonyInput,
    neutralInput: state.neutralInput,
    accentInput: state.accentInput,
    apocalypseInput: state.apocalypseInput,
    popInput: state.popInput,
    tokenPrefix: state.tokenPrefix,
    savedPalettes: state.savedPalettes,
    saveStatus: state.saveStatus,
    storageAvailable: state.storageAvailable,
    storageCorrupt: state.storageCorrupt,
    storageQuotaExceeded: state.storageQuotaExceeded,
    history: state.history,
    currentIndex: state.currentIndex,
    setBaseColor: state.setBaseColor,
    setBaseInput: state.setBaseInput,
    setBaseError: state.setBaseError,
    setMode: state.setMode,
    setThemeMode: state.setThemeMode,
    setPrintMode: state.setPrintMode,
    setCustomThemeName: state.setCustomThemeName,
    setImportedOverrides: state.setImportedOverrides,
    setHarmonyIntensity: state.setHarmonyIntensity,
    setApocalypseIntensity: state.setApocalypseIntensity,
    setNeutralCurve: state.setNeutralCurve,
    setAccentStrength: state.setAccentStrength,
    setPopIntensity: state.setPopIntensity,
    setHarmonyInput: state.setHarmonyInput,
    setNeutralInput: state.setNeutralInput,
    setAccentInput: state.setAccentInput,
    setApocalypseInput: state.setApocalypseInput,
    setPopInput: state.setPopInput,
    setTokenPrefix: state.setTokenPrefix,
    setSavedPalettes: state.setSavedPalettes,
    setSaveStatus: state.setSaveStatus,
    setStorageAvailable: state.setStorageAvailable,
    setStorageCorrupt: state.setStorageCorrupt,
    setStorageQuotaExceeded: state.setStorageQuotaExceeded,
    applySavedPalette: state.applySavedPalette,
    resetPaletteState: state.resetPaletteState,
    captureHistoryState: state.captureHistoryState,
    pushHistoryState: state.pushHistoryState,
    undo: state.undo,
    redo: state.redo,
  })));

  const uiState = useUiStore(useShallow((state) => ({
    view: state.view,
    currentStage: state.currentStage,
    activeTab: state.activeTab,
    showContrast: state.showContrast,
    showFineTune: state.showFineTune,
    headerOpen: state.headerOpen,
    chaosMenuOpen: state.chaosMenuOpen,
    overflowOpen: state.overflowOpen,
    setView: state.setView,
    setCurrentStage: state.setCurrentStage,
    setActiveTab: state.setActiveTab,
    setShowContrast: state.setShowContrast,
    setShowFineTune: state.setShowFineTune,
    setHeaderOpen: state.setHeaderOpen,
    setChaosMenuOpen: state.setChaosMenuOpen,
    setOverflowOpen: state.setOverflowOpen,
  })));

  const exportState = useExportStore(useShallow((state) => ({
    exportError: state.exportError,
    exportBlocked: state.exportBlocked,
    printSupported: state.printSupported,
    isExportingAssets: state.isExportingAssets,
    printMeta: state.printMeta,
    setExportError: state.setExportError,
    setExportBlocked: state.setExportBlocked,
    setPrintSupported: state.setPrintSupported,
    setIsExportingAssets: state.setIsExportingAssets,
    setPrintMeta: state.setPrintMeta,
  })));

  const projectState = useProjectStore(useShallow((state) => ({
    projectEdit: state.projectEdit,
    projectExportStatus: state.projectExportStatus,
    projectExporting: state.projectExporting,
    projectPenpotStatus: state.projectPenpotStatus,
    projectPenpotExporting: state.projectPenpotExporting,
    setProjectEdit: state.setProjectEdit,
    setProjectExportStatus: state.setProjectExportStatus,
    setProjectExporting: state.setProjectExporting,
    setProjectPenpotStatus: state.setProjectPenpotStatus,
    setProjectPenpotExporting: state.setProjectPenpotExporting,
  })));

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
  const statusTimerRef = useRef(null);

  const pickerColor = paletteState.baseColor.length === 9 && paletteState.baseColor.startsWith('#')
    ? paletteState.baseColor.slice(0, 7)
    : paletteState.baseColor;
  const isDark = paletteState.themeMode === 'dark';
  const canUndo = paletteState.currentIndex > 0;
  const canRedo = paletteState.currentIndex < paletteState.history.length - 1;

  useDarkClassSync(isDark);

  const setStatusMessage = useCallback((message, tone = 'info') => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    paletteState.setSaveStatus(message);
    notify(message, tone);
    statusTimerRef.current = setTimeout(() => paletteState.setSaveStatus(''), 2400);
  }, [notify, paletteState.setSaveStatus]);

  useEffect(() => {
    const currentHistoryState = paletteState.captureHistoryState();
    if (
      paletteState.history.length === 0
      || JSON.stringify(paletteState.history[paletteState.currentIndex]) !== JSON.stringify(currentHistoryState)
    ) {
      paletteState.pushHistoryState(currentHistoryState);
    }
  }, [
    paletteState.baseColor,
    paletteState.baseInput,
    paletteState.baseError,
    paletteState.mode,
    paletteState.themeMode,
    paletteState.printMode,
    paletteState.customThemeName,
    paletteState.harmonyIntensity,
    paletteState.apocalypseIntensity,
    paletteState.neutralCurve,
    paletteState.accentStrength,
    paletteState.popIntensity,
    paletteState.tokenPrefix,
    paletteState.importedOverrides,
    paletteState.captureHistoryState,
    paletteState.currentIndex,
    paletteState.history,
    paletteState.pushHistoryState,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(min-width: 768px)');
    uiState.setHeaderOpen(mq.matches);
    const handler = (event) => {
      uiState.setHeaderOpen(event.matches);
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
  }, [uiState.setHeaderOpen]);

  useEffect(() => {
    if (!uiState.headerOpen) {
      uiState.setChaosMenuOpen(false);
      uiState.setOverflowOpen(false);
    }
  }, [uiState.headerOpen, uiState.setChaosMenuOpen, uiState.setOverflowOpen]);

  useEffect(() => {
    if (!isDev && uiState.activeTab === 'Exports') {
      uiState.setActiveTab('Quick view');
    }
  }, [isDev, uiState.activeTab, uiState.setActiveTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateStage = () => {
      const hash = window.location.hash.replace('#', '');
      const matched = STAGE_DEFS.find((stage) => stage.id === hash);
      if (matched) {
        uiState.setCurrentStage(matched.label);
        return;
      }
      if (uiState.view === 'project') {
        uiState.setCurrentStage('Identity');
        return;
      }
      if (uiState.activeTab === 'Print assets') {
        uiState.setCurrentStage('Package');
        return;
      }
      if (uiState.activeTab === 'Exports' && isDev) {
        uiState.setCurrentStage('Export');
        return;
      }
      uiState.setCurrentStage('Validate');
    };
    updateStage();
    window.addEventListener('hashchange', updateStage);
    return () => window.removeEventListener('hashchange', updateStage);
  }, [isDev, uiState.activeTab, uiState.view, uiState.setCurrentStage]);

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
    paletteState.setBaseInput(value);
    const sanitized = sanitizeHexInput(value);
    if (!sanitized) {
      paletteState.setBaseError('Enter a hex value like #FF00FF or #ABC');
      return;
    }
    paletteState.setBaseError('');
    paletteState.setBaseColor(sanitized);
  }, [paletteState.setBaseColor, paletteState.setBaseError, paletteState.setBaseInput]);

  useEffect(() => {
    try {
      const key = '__token-gen-check__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      paletteState.setStorageAvailable(true);
    } catch (error) {
      console.warn('Local storage unavailable', error);
      paletteState.setStorageAvailable(false);
      notify('Local storage is blocked in this session', 'warn');
    }
    exportState.setPrintSupported(typeof window !== 'undefined' && typeof window.print === 'function');
  }, [exportState.setPrintSupported, notify, paletteState.setStorageAvailable]);

  useEffect(() => {
    if (paletteState.storageAvailable !== true) return;
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.saved);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (Array.isArray(parsed)) {
            const safe = parsed.filter((item) => item && typeof item === 'object');
            paletteState.setSavedPalettes(safe);
          }
        } catch (parseErr) {
          console.warn('Saved palettes corrupted', parseErr);
          paletteState.setStorageCorrupt(true);
        }
      }
      const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
      if (currentRaw) {
        try {
          const parsed = JSON.parse(currentRaw);
          paletteState.applySavedPalette(parsed);
        } catch (parseErr) {
          console.warn('Current palette corrupted', parseErr);
          paletteState.setStorageCorrupt(true);
          notify('Current palette could not be restored', 'warn');
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate palette state', error);
      paletteState.setStorageCorrupt(true);
      notify('Could not load saved palettes; storage may be blocked or corrupted', 'warn');
    }
  }, [
    notify,
    paletteState.storageAvailable,
    paletteState.applySavedPalette,
    paletteState.setSavedPalettes,
    paletteState.setStorageCorrupt,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefix = '#palette=';
    const hash = window.location.hash || '';
    if (!hash.startsWith(prefix)) return;
    try {
      const decoded = decodeURIComponent(escape(atob(hash.slice(prefix.length))));
      const payload = JSON.parse(decoded);
      paletteState.applySavedPalette(payload);
      notify('Palette loaded from link', 'success');
    } catch (error) {
      console.warn('Failed to parse shared palette', error);
      notify('Share link was invalid', 'warn');
    }
  }, [notify, paletteState.applySavedPalette]);

  useEffect(() => {
    if (paletteState.storageAvailable !== true) return;
    try {
      const payload = {
        baseColor: paletteState.baseColor,
        mode: paletteState.mode,
        themeMode: paletteState.themeMode,
        printMode: paletteState.printMode,
        customThemeName: sanitizeThemeName(paletteState.customThemeName, ''),
        harmonyIntensity: paletteState.harmonyIntensity,
        apocalypseIntensity: paletteState.apocalypseIntensity,
        neutralCurve: paletteState.neutralCurve,
        accentStrength: paletteState.accentStrength,
        popIntensity: paletteState.popIntensity,
        tokenPrefix: sanitizePrefix(paletteState.tokenPrefix),
        importedOverrides: paletteState.importedOverrides && Object.keys(paletteState.importedOverrides).length
          ? paletteState.importedOverrides
          : null,
      };
      localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist palette state', error);
      if (error?.name === 'QuotaExceededError' || error?.code === 22) {
        paletteState.setStorageQuotaExceeded(true);
        setStatusMessage('Storage quota exceeded — clear saved data to resume saving', 'warn');
      } else {
        paletteState.setStorageAvailable(false);
        notify('Saving is unavailable; storage is blocked', 'warn');
      }
    }
  }, [
    notify,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.themeMode,
    paletteState.printMode,
    paletteState.customThemeName,
    paletteState.harmonyIntensity,
    paletteState.apocalypseIntensity,
    paletteState.neutralCurve,
    paletteState.accentStrength,
    paletteState.popIntensity,
    paletteState.tokenPrefix,
    paletteState.importedOverrides,
    paletteState.storageAvailable,
    setStatusMessage,
    paletteState.setStorageAvailable,
    paletteState.setStorageQuotaExceeded,
  ]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    [harmonyDebounceRef, neutralDebounceRef, accentDebounceRef, apocalypseDebounceRef, popDebounceRef].forEach((ref) => {
      if (ref.current) clearTimeout(ref.current);
    });
  }, []);

  const autoThemeName = useMemo(
    () => `${paletteState.mode} ${paletteState.themeMode === 'dark' ? 'Dark' : paletteState.themeMode === 'pop' ? 'Pop' : 'Light'}`,
    [paletteState.mode, paletteState.themeMode]
  );
  const safeCustomThemeName = useMemo(
    () => sanitizeThemeName(paletteState.customThemeName, ''),
    [paletteState.customThemeName]
  );
  const displayThemeName = safeCustomThemeName || autoThemeName;

  const themeMaster = useMemo(() => buildTheme({
    name: displayThemeName,
    baseColor: paletteState.baseColor,
    mode: paletteState.mode,
    themeMode: paletteState.themeMode,
    isDark,
    printMode: paletteState.printMode,
    apocalypseIntensity: paletteState.apocalypseIntensity,
    harmonyIntensity: paletteState.harmonyIntensity,
    neutralCurve: paletteState.neutralCurve,
    accentStrength: paletteState.accentStrength,
    popIntensity: paletteState.popIntensity,
    importedOverrides: paletteState.importedOverrides,
  }), [
    displayThemeName,
    isDark,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.themeMode,
    paletteState.printMode,
    paletteState.apocalypseIntensity,
    paletteState.harmonyIntensity,
    paletteState.neutralCurve,
    paletteState.accentStrength,
    paletteState.popIntensity,
    paletteState.importedOverrides,
  ]);

  const { tokens, finalTokens, orderedStack, currentTheme } = themeMaster;

  const paletteSnapshot = useMemo(() => ({
    name: displayThemeName,
    baseColor: paletteState.baseColor,
    mode: paletteState.mode,
    themeMode: paletteState.themeMode,
    isDark,
    printMode: paletteState.printMode,
    customThemeName: sanitizeThemeName(paletteState.customThemeName, ''),
    harmonyIntensity: paletteState.harmonyIntensity,
    apocalypseIntensity: paletteState.apocalypseIntensity,
    neutralCurve: paletteState.neutralCurve,
    accentStrength: paletteState.accentStrength,
    popIntensity: paletteState.popIntensity,
    tokenPrefix: sanitizePrefix(paletteState.tokenPrefix),
    importedOverrides: paletteState.importedOverrides && Object.keys(paletteState.importedOverrides).length
      ? paletteState.importedOverrides
      : null,
    tokens,
    finalTokens,
    orderedStack,
  }), [
    displayThemeName,
    finalTokens,
    isDark,
    orderedStack,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.themeMode,
    paletteState.printMode,
    paletteState.customThemeName,
    paletteState.harmonyIntensity,
    paletteState.apocalypseIntensity,
    paletteState.neutralCurve,
    paletteState.accentStrength,
    paletteState.popIntensity,
    paletteState.tokenPrefix,
    paletteState.importedOverrides,
    tokens,
  ]);

  const serializePalette = useCallback(() => ({
    id: Date.now(),
    name: displayThemeName,
    baseColor: paletteState.baseColor,
    mode: paletteState.mode,
    themeMode: paletteState.themeMode,
    isDark,
    printMode: paletteState.printMode,
    customThemeName: safeCustomThemeName,
    harmonyIntensity: paletteState.harmonyIntensity,
    apocalypseIntensity: paletteState.apocalypseIntensity,
    neutralCurve: paletteState.neutralCurve,
    accentStrength: paletteState.accentStrength,
    popIntensity: paletteState.popIntensity,
    tokenPrefix: sanitizePrefix(paletteState.tokenPrefix),
    importedOverrides: paletteState.importedOverrides && Object.keys(paletteState.importedOverrides).length
      ? paletteState.importedOverrides
      : null,
  }), [
    displayThemeName,
    isDark,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.themeMode,
    paletteState.printMode,
    paletteState.harmonyIntensity,
    paletteState.apocalypseIntensity,
    paletteState.neutralCurve,
    paletteState.accentStrength,
    paletteState.popIntensity,
    paletteState.tokenPrefix,
    paletteState.importedOverrides,
    safeCustomThemeName,
  ]);

  const shareState = useMemo(() => ({
    baseColor: paletteState.baseColor,
    mode: paletteState.mode,
    themeMode: paletteState.themeMode,
    isDark,
    printMode: paletteState.printMode,
    customThemeName: safeCustomThemeName,
    harmonyIntensity: paletteState.harmonyIntensity,
    apocalypseIntensity: paletteState.apocalypseIntensity,
    neutralCurve: paletteState.neutralCurve,
    accentStrength: paletteState.accentStrength,
    popIntensity: paletteState.popIntensity,
    tokenPrefix: sanitizePrefix(paletteState.tokenPrefix),
  }), [
    isDark,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.themeMode,
    paletteState.printMode,
    paletteState.harmonyIntensity,
    paletteState.apocalypseIntensity,
    paletteState.neutralCurve,
    paletteState.accentStrength,
    paletteState.popIntensity,
    paletteState.tokenPrefix,
    safeCustomThemeName,
  ]);

  const { shareUrl } = useShareLink(shareState);

  const quickEssentials = useMemo(() => ([
    { key: 'Primary', color: tokens.brand.primary },
    { key: 'Secondary', color: tokens.brand.secondary },
    { key: 'Accent', color: tokens.brand.accent },
    { key: 'Base', color: paletteState.baseColor },
    { key: 'Neutral 2', color: tokens.foundation.neutrals['neutral-2'] },
    { key: 'Neutral 4', color: tokens.foundation.neutrals['neutral-4'] },
    { key: 'Neutral 6', color: tokens.foundation.neutrals['neutral-6'] },
    { key: 'Neutral 8', color: tokens.foundation.neutrals['neutral-8'] },
    { key: 'Text strong', color: tokens.typography['text-strong'] },
    { key: 'Text muted', color: tokens.typography['text-muted'] },
  ]).filter(({ color }) => Boolean(color)), [paletteState.baseColor, tokens]);

  const tabOptions = useMemo(() => (
    isDev
      ? ['Quick view', 'Full system', 'Print assets', 'Exports']
      : ['Quick view', 'Full system', 'Print assets']
  ), [isDev]);

  const tabIds = useMemo(() => ({
    'Quick view': 'tab-quick',
    'Full system': 'tab-full',
    'Print assets': 'tab-print',
    Exports: 'tab-exports',
  }), []);

  const stageDefs = useMemo(() => (
    isDev ? STAGE_DEFS : STAGE_DEFS.filter((stage) => stage.id !== 'export')
  ), [isDev]);

  const getTabId = useCallback(
    (tab) => tabIds[tab] || `tab-${tab.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`,
    [tabIds]
  );

  const handleStageNavigate = useCallback((event, stage) => {
    if (stage.tab) {
      uiState.setActiveTab(stage.tab);
    } else if (stage.id === 'validate' && !['Quick view', 'Full system'].includes(uiState.activeTab)) {
      uiState.setActiveTab('Quick view');
    }
    uiState.setCurrentStage(stage.label);
  }, [uiState]);

  const handleJumpToExports = useCallback(() => {
    if (!isDev) return;
    requestAnimationFrame(() => {
      if (exportsSectionRef.current) {
        exportsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [isDev]);

  const exportSavedPalettes = useCallback(() => {
    if (!paletteState.savedPalettes.length) {
      setStatusMessage('No saved palettes to export', 'warn');
      return;
    }
    exportSavedPalettesJson(paletteState.savedPalettes);
    setStatusMessage('Saved palettes exported', 'success');
  }, [paletteState.savedPalettes, setStatusMessage]);

  const importSavedPalettes = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const text = String(loadEvent.target.result || '');
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
        paletteState.setSavedPalettes((prev) => {
          const combined = [...normalized, ...prev];
          const byName = new Map();
          combined.forEach((palette) => {
            if (!palette?.name) return;
            if (!byName.has(palette.name)) byName.set(palette.name, palette);
          });
          const merged = Array.from(byName.values())
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
            .slice(0, 20);
          if (paletteState.storageAvailable && !paletteState.storageCorrupt) {
            localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(merged));
          }
          return merged;
        });
        if (paletteState.storageAvailable && !paletteState.storageCorrupt) {
          setStatusMessage(`Imported ${normalized.length} palette${normalized.length === 1 ? '' : 's'}`, 'success');
        } else {
          setStatusMessage('Imported palettes (storage blocked; save disabled)', 'warn');
        }
      } catch (error) {
        console.warn('Failed to import palettes', error);
        setStatusMessage('Failed to import palettes', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [paletteState, setStatusMessage]);

  const triggerSavedPalettesImport = useCallback(() => {
    savedPaletteInputRef.current?.click();
  }, []);

  const saveCurrentPalette = useCallback(() => {
    if (paletteState.storageAvailable !== true || paletteState.storageCorrupt) {
      setStatusMessage('Saving is unavailable; storage is blocked', 'warn');
      return;
    }
    try {
      const payload = serializePalette();
      paletteState.setSavedPalettes((prev) => {
        const filtered = prev.filter((item) => item.name !== payload.name);
        const next = [payload, ...filtered].slice(0, 20);
        localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(next));
        return next;
      });
      setStatusMessage('Palette saved to this browser', 'success');
    } catch (error) {
      console.warn('Failed to save palette', error);
      if (error?.name === 'QuotaExceededError' || error?.code === 22) {
        paletteState.setStorageQuotaExceeded(true);
        setStatusMessage('Storage quota exceeded — clear saved data to resume saving', 'warn');
      } else {
        setStatusMessage('Save failed — check storage permissions', 'error');
        paletteState.setStorageCorrupt(true);
      }
    }
  }, [paletteState, serializePalette, setStatusMessage]);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.saved);
      localStorage.removeItem(STORAGE_KEYS.current);
      paletteState.setSavedPalettes([]);
      paletteState.setStorageCorrupt(false);
      paletteState.setStorageQuotaExceeded(false);
      setStatusMessage('Saved data cleared', 'success');
    } catch (error) {
      console.warn('Failed to clear saved data', error);
      setStatusMessage('Failed to clear saved data', 'error');
    }
  }, [paletteState, setStatusMessage]);

  const loadSavedPalette = useCallback((id) => {
    if (!id) return;
    const numericId = Number(id);
    const target = paletteState.savedPalettes.find((item) => item.id === numericId);
    if (!target) {
      setStatusMessage('Saved palette not found', 'warn');
      return;
    }
    paletteState.applySavedPalette(target);
    setStatusMessage(`Loaded "${target.name}"`, 'success');
  }, [paletteState, setStatusMessage]);

  const openProjectPalette = useCallback((section) => {
    if (!section || !projectContext) return;
    const paletteSpec = section.paletteSpec || buildSpecFromSection(section);
    if (!paletteSpec) {
      notify('Palette spec is missing', 'warn');
      return;
    }
    paletteState.applySavedPalette(paletteSpec);
    projectState.setProjectEdit({
      sectionId: section.id,
      paletteName: section.label || paletteSpec.customThemeName || 'Palette',
      projectName: projectContext.projectName || 'Project',
      paletteSpec,
    });
    uiState.setView('palette');
  }, [buildSpecFromSection, notify, paletteState, projectContext, projectState, uiState]);

  const saveProjectPalette = useCallback((options = {}) => {
    if (!projectState.projectEdit || !projectContext) return;
    const snapshot = buildSectionSnapshotFromPalette(paletteSnapshot);
    if (!snapshot) {
      notify('Save failed — palette data is unavailable', 'warn');
      return;
    }
    const paletteSpec = snapshot.paletteSpec;
    const label = paletteSpec.customThemeName || projectState.projectEdit.paletteName || 'Palette';
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
      projectState.setProjectEdit({
        sectionId: newSection.id,
        paletteName: label,
        projectName: projectContext.projectName || 'Project',
        paletteSpec,
      });
      notify('Project palette saved as new', 'success');
      return;
    }
    projectContext.updateSection(projectState.projectEdit.sectionId, {
      label,
      updatedAt: timestamp,
      ...snapshot,
    });
    projectState.setProjectEdit((prev) => (prev ? { ...prev, paletteName: label, paletteSpec } : prev));
    notify('Project palette updated', 'success');
  }, [notify, paletteSnapshot, projectContext, projectState]);

  const cancelProjectEdit = useCallback(() => {
    if (!projectState.projectEdit) return;
    paletteState.applySavedPalette(projectState.projectEdit.paletteSpec);
    projectState.setProjectEdit(null);
    uiState.setView('project');
  }, [paletteState, projectState, uiState]);

  const applyMoodBoardSpec = useCallback((paletteSpec) => {
    if (!paletteSpec || typeof paletteSpec !== 'object') return;
    paletteState.applySavedPalette(paletteSpec);
    uiState.setView('palette');
  }, [paletteState, uiState]);

  const saveMoodBoardDraft = useCallback((cluster) => {
    if (!projectContext) return;
    const paletteSpec = cluster?.paletteSpec;
    if (!paletteSpec?.baseColor) {
      notify('Draft is missing a base color', 'warn');
      return;
    }
    const label = paletteSpec.customThemeName || cluster?.title || 'Palette';
    const draftThemeMaster = buildTheme({
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
    const paletteStateSnapshot = {
      name: label,
      ...paletteSpec,
      tokens: draftThemeMaster.tokens,
      finalTokens: draftThemeMaster.finalTokens,
      orderedStack: draftThemeMaster.orderedStack,
    };
    const snapshot = buildSectionSnapshotFromPalette(paletteStateSnapshot);
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
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target.result || '');
      const { overrides, prefix } = buildOverridesFromCss(text);
      if (!Object.keys(overrides).length) {
        notify('No matching tokens found in that CSS file', 'warn');
        return;
      }
      paletteState.setImportedOverrides(overrides);
      if (prefix) {
        paletteState.setTokenPrefix(prefix);
      }
      const importedName = file.name.replace(/\.css$/i, '').trim();
      if (importedName) {
        paletteState.setCustomThemeName(sanitizeThemeName(importedName, ''));
      }
      const primary = overrides['brand.primary'];
      const primaryHex = sanitizeHexInput(primary, null);
      if (primaryHex) {
        paletteState.setBaseColor(primaryHex);
        paletteState.setBaseInput(primaryHex);
        paletteState.setBaseError('');
      }
      const inferred = inferThemeMode(overrides['surfaces.background'] || overrides['surfaces.page-background']);
      if (inferred) {
        paletteState.setThemeMode(inferred);
      }
      notify('CSS theme imported', 'success');
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [notify, paletteState]);

  const orderedSwatches = useMemo(
    () => orderedStack.map(({ name, value }) => ({ name, color: value })),
    [orderedStack]
  );

  const printAssetPack = useMemo(() => ([
    { icon: ImageIcon, name: 'Palette card', files: 'palette-card.svg + palette-card.png', note: 'Hero palette overview built from the print palette.' },
    { icon: ImageIcon, name: 'Swatch strip', files: 'swatch-strip.svg + swatch-strip.png', note: '8-swatch strip for quick brand references.' },
    { icon: FileText, name: 'Tokens JSON', files: 'tokens.json', note: 'Penpot-ready tokens including the print layer & foil markers.' },
  ]), []);

  const canvaPrintHexes = useMemo(() => {
    const readColor = (path, fallback) => {
      const value = finalTokens.print?.[path]?.value ?? fallback;
      return typeof value === 'string' ? normalizeHex(value, value) : null;
    };
    return [
      { name: 'Primary', path: 'brand/primary', fallback: tokens.brand.primary },
      { name: 'Secondary', path: 'brand/secondary', fallback: tokens.brand.secondary },
      { name: 'Accent', path: 'brand/accent', fallback: tokens.brand.accent },
      { name: 'CTA', path: 'brand/cta', fallback: tokens.brand.cta },
      { name: 'Background', path: 'surfaces/background', fallback: tokens.surfaces.background },
      { name: 'Surface', path: 'cards/card-panel-surface', fallback: tokens.cards['card-panel-surface'] },
      { name: 'Text', path: 'typography/text-strong', fallback: tokens.typography['text-strong'] },
      { name: 'Muted Text', path: 'typography/text-muted', fallback: tokens.typography['text-muted'] },
    ].map((entry) => ({ name: entry.name, color: readColor(entry.path, entry.fallback) }))
      .filter(({ color }) => Boolean(color));
  }, [finalTokens, tokens]);

  const ctaBase = tokens.brand.cta || tokens.brand.primary;
  const ctaTextColor = useMemo(() => pickReadableText(ctaBase), [ctaBase]);
  const primaryTextColor = useMemo(() => pickReadableText(tokens.brand.primary), [tokens.brand.primary]);
  const neutralButtonText = useMemo(
    () => pickReadableText(tokens.cards['card-panel-surface'], '#0f172a', '#ffffff'),
    [tokens.cards]
  );

  const paletteRows = useMemo(() => ([
    { title: 'Foundation Neutrals', colors: Object.entries(tokens.foundation.neutrals).map(([name, color]) => ({ name, color })) },
    { title: 'Foundation Accents', colors: Object.entries(tokens.foundation.accents).map(([name, color]) => ({ name, color })) },
    { title: 'Brand Core', colors: ['primary', 'secondary', 'accent', 'accent-strong', 'cta', 'cta-hover'].map((key) => ({ name: key, color: tokens.brand[key] })).filter(({ color }) => Boolean(color)) },
    { title: 'Text Palette', colors: ['heading', 'text-strong', 'text-body', 'text-muted', 'text-accent', 'text-accent-strong'].map((key) => ({ name: key, color: tokens.typography[key] })).filter(({ color }) => Boolean(color)) },
    { title: 'Status & Feedback', colors: Object.entries(tokens.status).map(([name, color]) => ({ name, color })) },
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
    const preset = PRESETS.find((item) => item.name === presetName);
    if (!preset) return;
    paletteState.setBaseColor(preset.base);
    paletteState.setMode(preset.mode);
    paletteState.setThemeMode(preset.dark ? 'dark' : 'light');
    paletteState.setCustomThemeName(preset.name);
    paletteState.setHarmonyIntensity(100);
    paletteState.setNeutralCurve(100);
    paletteState.setAccentStrength(100);
    paletteState.setApocalypseIntensity(100);
    setStatusMessage(`Preset "${preset.name}" applied`, 'success');
  }, [paletteState, setStatusMessage]);

  const randomize = useCallback(() => {
    const hues = ['#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
    const nextBase = hues[Math.floor(Math.random() * hues.length)];
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const nextDark = Math.random() > 0.5;

    paletteState.setBaseColor(nextBase);
    paletteState.setMode(nextMode);
    paletteState.setThemeMode(nextDark ? 'dark' : 'light');
    paletteState.setHarmonyIntensity(Math.round(70 + Math.random() * 80));
    paletteState.setNeutralCurve(Math.round(80 + Math.random() * 50));
    paletteState.setAccentStrength(Math.round(80 + Math.random() * 50));

    if (nextMode === 'Apocalypse') {
      paletteState.setApocalypseIntensity(Math.round(50 + Math.random() * 100));
    }
  }, [paletteState]);

  const updatePrintMeta = useCallback(() => {
    const next = getPrintTimestamps();
    exportState.setPrintMeta(next);
    return next;
  }, [exportState]);

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
    } catch (error) {
      console.warn('Primary clipboard copy failed, using fallback', error);
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
      } catch (fallbackError) {
        console.warn('Copy failed', fallbackError);
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
  }, [notify, randomize]);

  const debouncedHarmonyChange = useCallback((value) => {
    const next = clampValue(value, 50, 160);
    paletteState.setHarmonyInput(next);
    if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
    harmonyDebounceRef.current = setTimeout(() => paletteState.setHarmonyIntensity(next), 120);
  }, [paletteState]);

  const debouncedNeutralChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    paletteState.setNeutralInput(next);
    if (neutralDebounceRef.current) clearTimeout(neutralDebounceRef.current);
    neutralDebounceRef.current = setTimeout(() => paletteState.setNeutralCurve(next), 120);
  }, [paletteState]);

  const debouncedAccentChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    paletteState.setAccentInput(next);
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    accentDebounceRef.current = setTimeout(() => paletteState.setAccentStrength(next), 120);
  }, [paletteState]);

  const debouncedApocalypseChange = useCallback((value) => {
    const next = clampValue(value, 20, 150);
    paletteState.setApocalypseInput(next);
    if (apocalypseDebounceRef.current) clearTimeout(apocalypseDebounceRef.current);
    apocalypseDebounceRef.current = setTimeout(() => paletteState.setApocalypseIntensity(next), 120);
  }, [paletteState]);

  const debouncedPopChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    paletteState.setPopInput(next);
    if (popDebounceRef.current) clearTimeout(popDebounceRef.current);
    popDebounceRef.current = setTimeout(() => paletteState.setPopIntensity(next), 120);
  }, [paletteState]);

  const crankApocalypse = useCallback(() => {
    const boostedApoc = 130;
    const boostedAccent = 120;
    paletteState.setMode('Apocalypse');
    paletteState.setThemeMode('dark');
    paletteState.setPrintMode(false);
    paletteState.setApocalypseIntensity(boostedApoc);
    paletteState.setApocalypseInput(boostedApoc);
    paletteState.setAccentStrength((prev) => Math.max(prev, boostedAccent));
    paletteState.setAccentInput((prev) => Math.max(prev, boostedAccent));
    notify('Apocalypse cranked. Wear goggles.', 'warn');
  }, [notify, paletteState]);

  const resetPalette = useCallback(() => {
    paletteState.resetPaletteState();
    notify('Palette has been reset', 'info');
  }, [notify, paletteState]);

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

  const exportJson = useCallback((themeName, suffix = '') => {
    if (!isDev) return;
    exportPenpotJsonBundle({
      finalTokens,
      orderedStack,
      themeName,
      suffix,
      mode: paletteState.mode,
      baseColor: paletteState.baseColor,
      isDark,
      printMode: paletteState.printMode,
      tokenPrefix: paletteState.tokenPrefix,
    });
  }, [finalTokens, isDev, isDark, orderedStack, paletteState.baseColor, paletteState.mode, paletteState.printMode, paletteState.tokenPrefix]);

  const exportGenericJson = useCallback(() => {
    if (!isDev) return;
    exportGenericJsonTokens({
      finalTokens,
      themeName: displayThemeName,
      mode: paletteState.mode,
      baseColor: paletteState.baseColor,
      isDark,
      printMode: paletteState.printMode,
      tokenPrefix: paletteState.tokenPrefix,
    });
  }, [displayThemeName, finalTokens, isDev, isDark, paletteState.baseColor, paletteState.mode, paletteState.printMode, paletteState.tokenPrefix]);

  const exportWitchcraftJson = useCallback(() => {
    if (!isDev) return;
    exportWitchcraftJsonTokens({
      finalTokens,
      themeName: displayThemeName,
      mode: paletteState.mode,
      isDark,
    });
  }, [displayThemeName, finalTokens, isDev, isDark, paletteState.mode]);

  const exportFigmaTokensFile = useCallback(() => {
    if (!isDev) return;
    exportFigmaTokensJson({
      finalTokens,
      tokenPrefix: paletteState.tokenPrefix,
    });
  }, [finalTokens, isDev, paletteState.tokenPrefix]);

  const exportStyleDictionaryFile = useCallback(() => {
    if (!isDev) return;
    exportStyleDictionaryJson({
      finalTokens,
      tokenPrefix: paletteState.tokenPrefix,
    });
  }, [finalTokens, isDev, paletteState.tokenPrefix]);

  const exportCssVars = useCallback(() => {
    if (!isDev) return;
    exportCssVariablesFile({
      themeMaster,
      themeName: displayThemeName,
      tokenPrefix: sanitizePrefix(paletteState.tokenPrefix),
    });
    setStatusMessage('CSS variables exported', 'success');
  }, [displayThemeName, isDev, paletteState.tokenPrefix, setStatusMessage, themeMaster]);

  const headerBackground = hexWithAlpha(tokens.surfaces['header-background'], 0.9);
  const headerGlowA = hexWithAlpha(tokens.brand.primary, 0.08);
  const headerGlowB = hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.06);
  const pageBackground = tokens.surfaces.background;
  const backgroundImage = [
    `radial-gradient(circle at 16% 14%, ${hexWithAlpha(tokens.brand.primary, 0.12)}, transparent 28%)`,
    `radial-gradient(circle at 82% 8%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.1)}, transparent 30%)`,
    `linear-gradient(180deg, ${hexWithAlpha(tokens.surfaces.background, 0.75)} 0%, ${hexWithAlpha(pageBackground, 0.9)} 42%, ${pageBackground} 100%)`,
  ].join(', ');
  const backgroundSize = '140% 140%, 120% 120%, auto';
  const backgroundPosition = '0 0, 100% 0, 0 0';
  const quickBarBottom = 'max(12px, env(safe-area-inset-bottom, 12px))';
  const panelBase = tokens.cards['card-panel-surface'];
  const panelStrong = tokens.cards['card-panel-surface-strong'] || panelBase;
  const panelSoft = hexWithAlpha(panelBase, isDark ? 0.72 : 0.86);
  const panelGhost = hexWithAlpha(tokens.surfaces.background, isDark ? 0.82 : 0.94);
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
  const chipMinContrast = paletteState.themeMode === 'pop' ? 1.6 : 1.25;
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
    backgroundImage,
    backgroundPosition,
    backgroundSize,
    ctaTextColor,
    pageBackground,
    panelBase,
    panelBorder,
    panelChip,
    panelChipBorder,
    panelChipText,
    panelGhost,
    panelMuted,
    panelMutedSoft,
    panelMutedStrong,
    panelSoft,
    panelStrong,
    panelText,
    panelTextSoft,
    panelTextStrong,
    statusError,
    statusErrorText,
    statusInfo,
    statusInfoText,
    statusSuccess,
    statusSuccessText,
    statusWarning,
    statusWarningText,
    tokens,
  ]);

  const themeClass = useMemo(() => getThemeClassName(paletteState.themeMode), [paletteState.themeMode]);
  const themeCssText = useMemo(() => buildThemeCss(uiTheme, `:root.${themeClass}`), [themeClass, uiTheme]);

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

  const exportUiThemeCss = useCallback(() => {
    if (!isDev) return;
    exportUiThemeCssFile({
      uiTheme,
      themeClass,
      themeName: displayThemeName,
    });
    setStatusMessage('UI theme CSS exported', 'success');
  }, [displayThemeName, isDev, setStatusMessage, themeClass, uiTheme]);

  const exportDesignSpacePalette = useCallback(() => {
    exportDesignSpacePaletteFile({
      baseColor: paletteState.baseColor,
      themeName: displayThemeName,
      mode: paletteState.mode,
      themeMode: paletteState.themeMode,
    });
    setStatusMessage('DesignSpace palette exported', 'success');
  }, [displayThemeName, paletteState.baseColor, paletteState.mode, paletteState.themeMode, setStatusMessage]);

  const handleGenerateListingAssets = useCallback(async (options = {}) => {
    const {
      rootFolder = 'listing',
      includeMeta = true,
      zipName,
      successMessage = 'Listing assets generated',
    } = options;
    if (!isDev) return;
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
      await generateListingAssetsArchive({
        coverNode,
        swatchNode,
        snippetNode: listingSnippetRef.current,
        previewNode,
        tokens,
        displayThemeName,
        baseColor: normalizeHex(paletteState.baseColor || '#000000', '#000000'),
        mode: paletteState.mode,
        themeMode: paletteState.themeMode,
        rootFolder,
        includeMeta,
        zipName,
      });
      setStatusMessage(successMessage, 'success');
    } catch (error) {
      console.error('Listing assets export failed', error);
      notify('Listing assets export failed. Check console for details.', 'error');
    }
  }, [displayThemeName, isDev, notify, paletteState.baseColor, paletteState.mode, paletteState.themeMode, setStatusMessage, tokens]);

  const handleDownloadThemePack = useCallback(async () => {
    if (!isDev) return;
    if (typeof Blob === 'undefined') {
      notify('File export is not supported in this browser', 'error');
      return;
    }
    try {
      await downloadThemePackArchive({
        finalTokens,
        themeMaster,
        currentTheme,
        displayThemeName,
        mode: paletteState.mode,
        baseColor: normalizeHex(paletteState.baseColor || '#000000', '#000000').toUpperCase(),
        isDark,
        printMode: paletteState.printMode,
        themeMode: paletteState.themeMode,
        tokenPrefix: paletteState.tokenPrefix,
      });
      setStatusMessage('Theme pack downloaded', 'success');
    } catch (error) {
      console.error('Theme pack export failed', error);
      notify('Theme pack export failed. Check console for details.', 'error');
    }
  }, [
    currentTheme,
    displayThemeName,
    finalTokens,
    isDev,
    isDark,
    notify,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.printMode,
    paletteState.themeMode,
    paletteState.tokenPrefix,
    setStatusMessage,
    themeMaster,
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
    } catch (error) {
      console.warn('Failed to copy share link', error);
      notify('Could not copy share link', 'error');
    }
  }, [notify, shareUrl]);

  const exportAllAssets = useCallback(async () => {
    if (!isDev) return;
    if (typeof Blob === 'undefined') {
      const message = 'File export is not supported in this browser';
      notify(message, 'error');
      exportState.setExportError(message);
      exportState.setExportBlocked(true);
      return;
    }
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) {
      const message = 'Canvas is not supported; cannot render assets';
      notify(message, 'error');
      exportState.setExportError(message);
      exportState.setExportBlocked(true);
      return;
    }
    exportState.setExportError('');
    exportState.setExportBlocked(false);
    exportState.setIsExportingAssets(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const penpotPayload = buildPenpotExportPayload({
        finalTokens,
        orderedStack,
        themeName: displayThemeName,
        mode: paletteState.mode,
        baseColor: paletteState.baseColor,
        isDark,
        printMode: paletteState.printMode,
        tokenPrefix: paletteState.tokenPrefix,
      });
      await exportAllAssetsPack({
        currentTheme,
        penpotPayload,
      });
    } catch (error) {
      notify('Asset export failed. Check console for details.', 'error', 4000);
      console.error('Asset export failed', error);
    } finally {
      exportState.setIsExportingAssets(false);
    }
  }, [
    currentTheme,
    displayThemeName,
    exportState,
    finalTokens,
    isDev,
    isDark,
    notify,
    orderedStack,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.printMode,
    paletteState.tokenPrefix,
  ]);

  const exportProjectPrintAssets = useCallback(async () => {
    if (!projectContext || projectState.projectExporting) return;
    const sections = projectContext.sections || [];
    if (!sections.length) {
      projectState.setProjectExportStatus('Add at least one palette to export.');
      return;
    }
    projectState.setProjectExporting(true);
    projectState.setProjectExportStatus('Preparing print assets…');
    try {
      const skipped = await exportProjectPrintAssetsArchive({
        projectName: projectContext.projectName || 'project',
        sections,
        buildSpecFromSection,
        onProgress: projectState.setProjectExportStatus,
      });
      projectState.setProjectExportStatus(
        skipped.length ? `Completed with skips: ${skipped.join(', ')}` : 'Print assets downloaded'
      );
    } catch (error) {
      console.error('Project print assets export failed', error);
      projectState.setProjectExportStatus('Project export failed — see console.');
    } finally {
      projectState.setProjectExporting(false);
    }
  }, [buildSpecFromSection, projectContext, projectState]);

  const exportProjectPenpotPrintTokens = useCallback(async () => {
    if (!projectContext || projectState.projectPenpotExporting) return;
    const sections = projectContext.sections || [];
    if (!sections.length) {
      projectState.setProjectPenpotStatus('Add at least one palette to export.');
      return;
    }
    projectState.setProjectPenpotExporting(true);
    projectState.setProjectPenpotStatus('Preparing Penpot print tokens…');
    try {
      const skipped = await exportProjectPenpotPrintTokensArchive({
        projectName: projectContext.projectName || 'project',
        sections,
        buildSpecFromSection,
        onProgress: projectState.setProjectPenpotStatus,
      });
      projectState.setProjectPenpotStatus(
        skipped.length ? `Completed with skips: ${skipped.join(', ')}` : 'Penpot print tokens downloaded'
      );
    } catch (error) {
      console.error('Project Penpot export failed', error);
      projectState.setProjectPenpotStatus('Penpot export failed — see console.');
    } finally {
      projectState.setProjectPenpotExporting(false);
    }
  }, [buildSpecFromSection, projectContext, projectState]);

  const exportSingleMoodBoardFromProject = useCallback((moodBoard) => {
    if (!projectContext) return;
    exportSingleMoodBoard(moodBoard, projectContext.projectName || 'project');
  }, [projectContext]);

  const exportAllMoodBoardsFromProject = useCallback(() => {
    if (!projectContext || !projectContext.moodBoards || projectContext.moodBoards.length === 0) return;
    exportMoodBoardCollection(projectContext.moodBoards, projectContext.projectName || 'project');
  }, [projectContext]);

  const exportDesignSpacePalettes = useCallback(async () => {
    if (!projectContext || !projectContext.sections || projectContext.sections.length === 0) return;
    await exportDesignSpacePalettesArchive({
      projectName: projectContext.projectName || 'project',
      sections: projectContext.sections,
    });
  }, [projectContext]);

  const handleDownloadThemePackWithPrint = useCallback(async () => {
    if (!isDev) return;
    const themeLabel = sanitizeThemeName(displayThemeName || 'Theme', 'Theme');
    const themeSlug = themeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
    await handleDownloadThemePack();
    if (!paletteState.printMode) {
      notify('Run Forge assets (print pack) first', 'warn');
      return;
    }
    try {
      const penpotPayload = buildPenpotExportPayload({
        finalTokens,
        orderedStack,
        themeName: displayThemeName,
        mode: paletteState.mode,
        baseColor: paletteState.baseColor,
        isDark,
        printMode: paletteState.printMode,
        tokenPrefix: paletteState.tokenPrefix,
      });
      await downloadThemePackWithPrintArchive({
        currentTheme,
        penpotPayload,
        themeSlug,
      });
      setStatusMessage('CMYK print pack downloaded', 'success');
    } catch (error) {
      console.error('CMYK print pack export failed', error);
      notify('CMYK print pack export failed. Check console for details.', 'error');
    }
  }, [
    currentTheme,
    displayThemeName,
    finalTokens,
    handleDownloadThemePack,
    isDev,
    isDark,
    notify,
    orderedStack,
    paletteState.baseColor,
    paletteState.mode,
    paletteState.printMode,
    paletteState.tokenPrefix,
    setStatusMessage,
  ]);

  const handleExportPdf = useCallback(() => {
    if (!isDev) return;
    if (typeof window.print !== 'function') {
      notify('Print is not supported in this browser', 'error');
      exportState.setExportError('Print is not supported in this browser');
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
  }, [displayThemeName, exportState, isDev, notify, updatePrintMeta]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
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
            uiState.setShowFineTune((value) => !value);
          }
          break;
        case 'h':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            uiState.setHeaderOpen((value) => !value);
          }
          break;
        case 'escape':
          uiState.setChaosMenuOpen(false);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [randomRitual, uiState.setChaosMenuOpen, uiState.setHeaderOpen, uiState.setShowFineTune]);

  return {
    isDev,
    isInternal,
    isDark,
    projectContext,
    canUndo,
    canRedo,
    pickerColor,
    autoThemeName,
    displayThemeName,
    quickBarBottom,
    headerBackground,
    headerGlowA,
    headerGlowB,
    exportsSectionRef,
    savedPaletteInputRef,
    listingCoverRef,
    listingSwatchRef,
    listingSnippetRef,
    paletteSnapshot,
    presets: PRESETS,
    stageDefs,
    tabOptions,
    quickEssentials,
    getTabId,
    handleStageNavigate,
    handleJumpToExports,
    buildSpecFromSection,
    handleBaseColorChange,
    applyPreset,
    randomRitual,
    crankApocalypse,
    resetPalette,
    copyHexValue,
    copyAllEssentials,
    copyEssentialsList,
    debouncedHarmonyChange,
    debouncedNeutralChange,
    debouncedAccentChange,
    debouncedApocalypseChange,
    debouncedPopChange,
    exportSavedPalettes,
    importSavedPalettes,
    triggerSavedPalettesImport,
    saveCurrentPalette,
    clearSavedData,
    loadSavedPalette,
    openProjectPalette,
    saveProjectPalette,
    cancelProjectEdit,
    applyMoodBoardSpec,
    saveMoodBoardDraft,
    handleCssImport,
    exportJson,
    exportGenericJson,
    exportWitchcraftJson,
    exportFigmaTokensJson: exportFigmaTokensFile,
    exportStyleDictionaryJson: exportStyleDictionaryFile,
    exportCssVars,
    exportUiThemeCss,
    exportDesignSpacePalette,
    handleGenerateListingAssets,
    handleDownloadThemePack,
    copyShareLink,
    exportAllAssets,
    exportProjectPrintAssets,
    exportProjectPenpotPrintTokens,
    exportSingleMoodBoardFromProject,
    exportAllMoodBoardsFromProject,
    exportDesignSpacePalettes,
    handleDownloadThemePackWithPrint,
    handleExportPdf,
    orderedSwatches,
    printAssetPack,
    canvaPrintHexes,
    ctaTextColor,
    primaryTextColor,
    neutralButtonText,
    paletteRows,
    contrastChecks,
    currentTheme,
    finalTokens,
    orderedStack,
    tokens,
    uiTheme,
    themeClass,
    themeCssText,
    sanitizeThemeName,
    sanitizePrefix,
    paletteState,
    uiState,
    exportState,
    projectState,
  };
}
