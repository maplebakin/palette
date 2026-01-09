# 🔧 SURGICAL REFACTOR ROADMAP: APOCAPALETTE

**Mission**: Transform App.jsx from a 2,722-line God Object into a clean, maintainable architecture.

**Status**: Planning Phase - DO NOT EXECUTE YET
**Estimated Total Effort**: 12-16 hours across 4 phases
**Safety Protocol**: Build and test after each phase

---

## 📊 CURRENT STATE SNAPSHOT

```
src/App.jsx:                 2,722 lines
  - 45 useState hooks
  - 15 useEffect hooks
  - 6 useRef hooks
  - 28 useMemo calculations
  - 500+ lines of export logic
  - 300+ lines of JSX

Component Prop Counts:
  - IdentityStage:    34 props
  - BuildStage:       28 props
  - ValidateStage:    25 props
  - PackageStage:     22 props
  - ExportStage:      18 props
```

---

## PHASE 1: STATE EXTRACTION (ZUSTAND)

**Goal**: Extract all 45 useState hooks into a centralized Zustand store
**Duration**: 3-4 hours
**Files Modified**: 1 new, 1 major edit

### 1.1 Pre-Flight Analysis

**Map the 45 useState hooks** (App.jsx:623-675):

#### Category A: Palette Generation State (GLOBAL)
```javascript
baseColor          // Line 624 - hex string
mode               // Line 625 - harmony mode
themeMode          // Line 626 - 'light' | 'dark' | 'pop'
printMode          // Line 627 - boolean
customThemeName    // Line 628 - string
importedOverrides  // Line 630 - object | null
tokenPrefix        // Line 643 - string
```

#### Category B: Intensity Controls (GLOBAL - with duplication issue)
```javascript
// Actual values (7 hooks)
harmonyIntensity      // Line 632
apocalypseIntensity   // Line 633
neutralCurve          // Line 634
accentStrength        // Line 635
popIntensity          // Line 636

// Display values (5 hooks - REMOVE during migration)
harmonyInput          // Line 637 - DUPLICATE
neutralInput          // Line 638 - DUPLICATE
accentInput           // Line 639 - DUPLICATE
apocalypseInput       // Line 640 - DUPLICATE
popInput              // Line 641 - DUPLICATE
```

**DECISION**: Eliminate dual state pattern. Use single source + debounced persistence.

#### Category C: Storage State (GLOBAL)
```javascript
savedPalettes           // Line 644 - array
saveStatus              // Line 645 - string
storageAvailable        // Line 646 - boolean | null
storageCorrupt          // Line 647 - boolean
storageQuotaExceeded    // Line 648 - boolean
exportError             // Line 649 - string
exportBlocked           // Line 650 - boolean
```

#### Category D: UI State (LOCAL - keep in components)
```javascript
view                    // Line 623 - 'palette' | 'project' (ROUTER - keep in App)
currentStage            // Line 631 - stage name (ROUTER - keep in App)
mobileStage             // Line 664 - mobile stage ID (LOCAL)
showContrast            // Line 629 - boolean (LOCAL or move to ValidateStage)
activeTab               // Line 642 - string (LOCAL - move to ValidateStage)
showFineTune            // Line 660 - boolean (LOCAL - move to BuildStage)
headerOpen              // Line 661 - boolean (LOCAL - keep in App for layout)
chaosMenuOpen           // Line 662 - boolean (LOCAL - move to BuildStage)
overflowOpen            // Line 663 - boolean (LOCAL - keep in App for mobile menu)
```

#### Category E: Export/Asset State (GLOBAL)
```javascript
printSupported          // Line 651 - boolean
isExportingAssets       // Line 652 - boolean
printMeta               // Line 653 - object
```

#### Category F: Project Integration State (GLOBAL)
```javascript
projectEdit             // Line 665 - object | null
projectExportStatus     // Line 666 - string
projectExporting        // Line 667 - boolean
projectPenpotStatus     // Line 668 - string
projectPenpotExporting  // Line 669 - boolean
```

**Migration Summary**:
- **MOVE TO STORE**: Categories A, B (simplified), C, E, F = ~30 state variables
- **KEEP IN APP.JSX**: view, currentStage, headerOpen, overflowOpen = 4 state variables
- **MOVE TO COMPONENTS**: mobileStage, showContrast, activeTab, showFineTune, chaosMenuOpen = 5 state variables

---

### 1.2 Create Zustand Store Structure

**Step 1.2.1**: Create store directory
```bash
mkdir -p src/store
```

**Step 1.2.2**: Create the main palette store
```bash
# This will be done with Write tool - creating new file
# Location: src/store/usePaletteStore.js
```

**File Structure** (`src/store/usePaletteStore.js`):
```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Slices:
// 1. paletteSlice    - baseColor, mode, themeMode, intensities
// 2. storageSlice    - savedPalettes, saveStatus, storage flags
// 3. exportSlice     - export state, asset generation state
// 4. projectSlice    - projectEdit, project export state

const createPaletteSlice = (set, get) => ({
  // Core palette state
  baseColor: '#7b241c',
  mode: 'Monochromatic',
  themeMode: 'dark',
  printMode: false,
  customThemeName: '',
  tokenPrefix: '',
  importedOverrides: null,

  // Intensity controls (single source of truth)
  harmonyIntensity: 100,
  apocalypseIntensity: 100,
  neutralCurve: 100,
  accentStrength: 100,
  popIntensity: 100,

  // Actions
  setBaseColor: (color) => set({ baseColor: color }),
  setMode: (mode) => set({ mode }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setPrintMode: (printMode) => set({ printMode }),
  setCustomThemeName: (name) => set({ customThemeName: name }),
  setTokenPrefix: (prefix) => set({ tokenPrefix: prefix }),
  setImportedOverrides: (overrides) => set({ importedOverrides: overrides }),

  // Debounced intensity setters (with cleanup)
  setHarmonyIntensity: (value) => set({ harmonyIntensity: value }),
  setApocalypseIntensity: (value) => set({ apocalypseIntensity: value }),
  setNeutralCurve: (value) => set({ neutralCurve: value }),
  setAccentStrength: (value) => set({ accentStrength: value }),
  setPopIntensity: (value) => set({ popIntensity: value }),

  // Bulk update (for loading saved palettes)
  loadPaletteSpec: (spec) => set({
    baseColor: spec.baseColor,
    mode: spec.mode,
    themeMode: spec.themeMode,
    printMode: spec.printMode ?? false,
    customThemeName: spec.customThemeName ?? '',
    tokenPrefix: spec.tokenPrefix ?? '',
    importedOverrides: spec.importedOverrides ?? null,
    harmonyIntensity: spec.harmonyIntensity ?? 100,
    apocalypseIntensity: spec.apocalypseIntensity ?? 100,
    neutralCurve: spec.neutralCurve ?? 100,
    accentStrength: spec.accentStrength ?? 100,
    popIntensity: spec.popIntensity ?? 100,
  }),

  // Serialization
  serializePalette: () => {
    const state = get();
    return {
      id: Date.now(),
      name: state.customThemeName || `${state.mode} ${state.themeMode}`,
      baseColor: state.baseColor,
      mode: state.mode,
      themeMode: state.themeMode,
      isDark: state.themeMode === 'dark',
      printMode: state.printMode,
      customThemeName: state.customThemeName,
      harmonyIntensity: state.harmonyIntensity,
      apocalypseIntensity: state.apocalypseIntensity,
      neutralCurve: state.neutralCurve,
      accentStrength: state.accentStrength,
      popIntensity: state.popIntensity,
      tokenPrefix: state.tokenPrefix,
      importedOverrides: state.importedOverrides,
    };
  },
});

const createStorageSlice = (set, get) => ({
  savedPalettes: [],
  saveStatus: '',
  storageAvailable: null,
  storageCorrupt: false,
  storageQuotaExceeded: false,

  setSavedPalettes: (palettes) => set({ savedPalettes: palettes }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setStorageAvailable: (available) => set({ storageAvailable: available }),
  setStorageCorrupt: (corrupt) => set({ storageCorrupt: corrupt }),
  setStorageQuotaExceeded: (exceeded) => set({ storageQuotaExceeded: exceeded }),

  // Save palette to localStorage
  saveCurrentPalette: () => {
    const state = get();
    if (!state.storageAvailable || state.storageCorrupt) {
      return { success: false, error: 'Storage unavailable' };
    }
    try {
      const palette = state.serializePalette();
      const filtered = state.savedPalettes.filter(p => p.name !== palette.name);
      const updated = [palette, ...filtered].slice(0, 20);
      localStorage.setItem('token-gen/saved-palettes', JSON.stringify(updated));
      set({ savedPalettes: updated, saveStatus: 'Saved' });
      return { success: true };
    } catch (err) {
      if (err?.name === 'QuotaExceededError') {
        set({ storageQuotaExceeded: true });
      }
      return { success: false, error: err.message };
    }
  },

  // Load palette by ID
  loadSavedPalette: (id) => {
    const state = get();
    const palette = state.savedPalettes.find(p => p.id === Number(id));
    if (!palette) return { success: false, error: 'Palette not found' };
    state.loadPaletteSpec(palette);
    return { success: true };
  },

  // Clear all saved data
  clearSavedData: () => {
    try {
      localStorage.removeItem('token-gen/saved-palettes');
      localStorage.removeItem('token-gen/current-palette');
      set({
        savedPalettes: [],
        storageCorrupt: false,
        storageQuotaExceeded: false
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
});

const createExportSlice = (set) => ({
  exportError: '',
  exportBlocked: false,
  printSupported: true,
  isExportingAssets: false,
  printMeta: {},

  setExportError: (error) => set({ exportError: error }),
  setExportBlocked: (blocked) => set({ exportBlocked: blocked }),
  setPrintSupported: (supported) => set({ printSupported: supported }),
  setIsExportingAssets: (exporting) => set({ isExportingAssets: exporting }),
  setPrintMeta: (meta) => set({ printMeta: meta }),
});

const createProjectSlice = (set) => ({
  projectEdit: null,
  projectExportStatus: '',
  projectExporting: false,
  projectPenpotStatus: '',
  projectPenpotExporting: false,

  setProjectEdit: (edit) => set({ projectEdit: edit }),
  setProjectExportStatus: (status) => set({ projectExportStatus: status }),
  setProjectExporting: (exporting) => set({ projectExporting: exporting }),
  setProjectPenpotStatus: (status) => set({ projectPenpotStatus: status }),
  setProjectPenpotExporting: (exporting) => set({ projectPenpotExporting: exporting }),
});

// Combine slices
export const usePaletteStore = create(
  persist(
    (set, get) => ({
      ...createPaletteSlice(set, get),
      ...createStorageSlice(set, get),
      ...createExportSlice(set),
      ...createProjectSlice(set),
    }),
    {
      name: 'token-gen/current-palette',
      partialize: (state) => ({
        // Only persist palette generation state
        baseColor: state.baseColor,
        mode: state.mode,
        themeMode: state.themeMode,
        printMode: state.printMode,
        customThemeName: state.customThemeName,
        tokenPrefix: state.tokenPrefix,
        importedOverrides: state.importedOverrides,
        harmonyIntensity: state.harmonyIntensity,
        apocalypseIntensity: state.apocalypseIntensity,
        neutralCurve: state.neutralCurve,
        accentStrength: state.accentStrength,
        popIntensity: state.popIntensity,
      }),
    }
  )
);

// Selectors (for optimized re-renders)
export const selectPaletteSpec = (state) => ({
  baseColor: state.baseColor,
  mode: state.mode,
  themeMode: state.themeMode,
  printMode: state.printMode,
  customThemeName: state.customThemeName,
  harmonyIntensity: state.harmonyIntensity,
  apocalypseIntensity: state.apocalypseIntensity,
  neutralCurve: state.neutralCurve,
  accentStrength: state.accentStrength,
  popIntensity: state.popIntensity,
  tokenPrefix: state.tokenPrefix,
  importedOverrides: state.importedOverrides,
});

export const selectIntensities = (state) => ({
  harmonyIntensity: state.harmonyIntensity,
  apocalypseIntensity: state.apocalypseIntensity,
  neutralCurve: state.neutralCurve,
  accentStrength: state.accentStrength,
  popIntensity: state.popIntensity,
});

export const selectStorageState = (state) => ({
  savedPalettes: state.savedPalettes,
  saveStatus: state.saveStatus,
  storageAvailable: state.storageAvailable,
  storageCorrupt: state.storageCorrupt,
  storageQuotaExceeded: state.storageQuotaExceeded,
});
```

**Step 1.2.3**: Install Zustand
```bash
npm install zustand
```

**Safety Check 1.2**:
```bash
npm run build
# Expected: Build succeeds (store not yet used, just created)
```

---

### 1.3 Create Computed Token Store

**Problem**: `themeMaster`, `tokens`, `finalTokens` are currently useMemo in App.jsx (lines 937-956)
**Solution**: Create a separate store for computed tokens that subscribes to palette changes

**Step 1.3.1**: Create token computation store
```bash
# Create src/store/useTokenStore.js
```

**File Structure** (`src/store/useTokenStore.js`):
```javascript
import { create } from 'zustand';
import { buildTheme } from '../lib/theme/engine.js';
import { usePaletteStore, selectPaletteSpec } from './usePaletteStore.js';

export const useTokenStore = create((set) => ({
  // Computed theme
  tokens: null,
  finalTokens: null,
  orderedStack: null,
  currentTheme: null,

  // Recompute tokens from palette spec
  computeTokens: (paletteSpec) => {
    const themeMaster = buildTheme({
      name: paletteSpec.customThemeName || `${paletteSpec.mode} ${paletteSpec.themeMode}`,
      baseColor: paletteSpec.baseColor,
      mode: paletteSpec.mode,
      themeMode: paletteSpec.themeMode,
      isDark: paletteSpec.themeMode === 'dark',
      printMode: paletteSpec.printMode,
      harmonyIntensity: paletteSpec.harmonyIntensity,
      apocalypseIntensity: paletteSpec.apocalypseIntensity,
      neutralCurve: paletteSpec.neutralCurve,
      accentStrength: paletteSpec.accentStrength,
      popIntensity: paletteSpec.popIntensity,
      importedOverrides: paletteSpec.importedOverrides,
    });

    set({
      tokens: themeMaster.tokens,
      finalTokens: themeMaster.finalTokens,
      orderedStack: themeMaster.orderedStack,
      currentTheme: themeMaster.currentTheme,
    });
  },
}));

// Hook to auto-compute tokens when palette changes
export const useTokenComputation = () => {
  const paletteSpec = usePaletteStore(selectPaletteSpec);
  const computeTokens = useTokenStore((state) => state.computeTokens);

  React.useEffect(() => {
    computeTokens(paletteSpec);
  }, [paletteSpec, computeTokens]);
};
```

**Safety Check 1.3**:
```bash
npm run build
# Expected: Build succeeds
```

---

### 1.4 Migrate App.jsx to Use Stores (Phase 1 - Read Only)

**Strategy**: Start by reading from store alongside existing useState (dual-read mode) to verify correctness

**Step 1.4.1**: Import store at top of App.jsx
```bash
# Manual edit required - add these imports after line 60 in App.jsx:
```

```javascript
import { usePaletteStore, selectPaletteSpec } from './store/usePaletteStore.js';
import { useTokenStore, useTokenComputation } from './store/useTokenStore.js';
```

**Step 1.4.2**: Add store hooks after existing useState declarations (around line 676)
```javascript
// NEW: Zustand store hooks (parallel to existing state)
const paletteStore = usePaletteStore();
const tokenStore = useTokenStore();
useTokenComputation(); // Auto-compute tokens when palette changes
```

**Step 1.4.3**: Test read equivalence
```bash
# Add temporary console.log to verify state matches:
# Add after line 690 in App.jsx:
console.log('State match check:', {
  baseColorMatch: baseColor === paletteStore.baseColor,
  modeMatch: mode === paletteStore.mode,
  tokensExist: !!tokenStore.tokens,
});
```

**Safety Check 1.4**:
```bash
npm run dev
# Open browser console
# Expected: "State match check" logs show true for all *Match properties
```

---

### 1.5 Migrate App.jsx to Use Stores (Phase 2 - Write Mode)

**Step 1.5.1**: Replace useState setters with store actions

**Find and Replace Operations**:

```bash
# Example pattern (DO NOT run sed yet - manual migration safer):
# Replace: setBaseColor(newColor)
# With: paletteStore.setBaseColor(newColor)
```

**Manual Migration Checklist** (src/App.jsx):

Line | Original | Replace With
-----|----------|-------------
624 | `const [baseColor, setBaseColor] = useState(...)` | `DELETE` (use store)
625 | `const [mode, setMode] = useState(...)` | `DELETE` (use store)
626 | `const [themeMode, setThemeMode] = useState(...)` | `DELETE` (use store)
627 | `const [printMode, setPrintMode] = useState(...)` | `DELETE` (use store)
628 | `const [customThemeName, setCustomThemeName] = useState(...)` | `DELETE` (use store)
630 | `const [importedOverrides, setImportedOverrides] = useState(...)` | `DELETE` (use store)
632-636 | Intensity useState hooks | `DELETE` (use store)
637-641 | Input useState hooks (harmonyInput, etc.) | `DELETE` (dual state eliminated)
643 | `const [tokenPrefix, setTokenPrefix] = useState(...)` | `DELETE` (use store)
644 | `const [savedPalettes, setSavedPalettes] = useState(...)` | `DELETE` (use store)
645-650 | Storage state hooks | `DELETE` (use store)
651-653 | Export state hooks | `DELETE` (use store)
665-669 | Project state hooks | `DELETE` (use store)

**Step 1.5.2**: Replace all references

**Search in App.jsx and replace**:
- `setBaseColor` → `paletteStore.setBaseColor`
- `setMode` → `paletteStore.setMode`
- `setThemeMode` → `paletteStore.setThemeMode`
- `baseColor` → `paletteStore.baseColor`
- `mode` → `paletteStore.mode`
- `themeMode` → `paletteStore.themeMode`
- etc.

**Step 1.5.3**: Update debounced handlers

**OLD** (lines 1119-1182):
```javascript
const debouncedHarmonyChange = useCallback((value) => {
  setHarmonyInput(value);
  if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
  harmonyDebounceRef.current = setTimeout(() => {
    setHarmonyIntensity(value);
  }, 120);
}, []);
```

**NEW**:
```javascript
const debouncedHarmonyChange = useCallback((value) => {
  if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
  harmonyDebounceRef.current = setTimeout(() => {
    paletteStore.setHarmonyIntensity(value);
  }, 120);
}, [paletteStore]);
```

**Step 1.5.4**: Remove dual-state sync useEffect

**DELETE** lines 910-916:
```javascript
useEffect(() => {
  setHarmonyInput(harmonyIntensity);
  // ...
}, [harmonyIntensity, ...]);
```

**Step 1.5.5**: Simplify flushDebounces

**OLD** (lines 1185-1207):
```javascript
const flushDebounces = useCallback(() => {
  if (harmonyDebounceRef.current) {
    clearTimeout(harmonyDebounceRef.current);
    setHarmonyIntensity(harmonyInput);
  }
  // ...
}, [harmonyInput, ...]);
```

**NEW**:
```javascript
const flushDebounces = useCallback(() => {
  // Just clear timeouts - store already has latest values
  if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
  if (neutralDebounceRef.current) clearTimeout(neutralDebounceRef.current);
  if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
  if (apocalypseDebounceRef.current) clearTimeout(apocalypseDebounceRef.current);
  if (popDebounceRef.current) clearTimeout(popDebounceRef.current);
}, []);
```

**Safety Check 1.5**:
```bash
npm run build
npm run dev
# Test:
# 1. Change base color - palette should regenerate
# 2. Adjust sliders - should update with 120ms debounce
# 3. Save palette - should persist to localStorage
# 4. Reload page - should restore from localStorage
```

---

### 1.6 Remove localStorage Persistence useEffect

**Problem**: App.jsx has massive persistence effect (lines 880-908) that fires on every state change

**Solution**: Zustand persist middleware handles this automatically

**DELETE** lines 880-908:
```javascript
useEffect(() => {
  if (storageAvailable !== true || storageCorrupt) return;
  try {
    const payload = { baseColor, mode, ... };
    localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));
  } catch (err) { ... }
}, [baseColor, mode, ...16 dependencies]);
```

**Safety Check 1.6**:
```bash
npm run dev
# Test:
# 1. Change palette settings
# 2. Close tab
# 3. Reopen - settings should persist
# 4. Check DevTools > Application > Local Storage
#    - Should see "token-gen/current-palette" with Zustand structure
```

---

### 1.7 Phase 1 Completion Checklist

- [ ] `src/store/usePaletteStore.js` created (30 state variables migrated)
- [ ] `src/store/useTokenStore.js` created (computed tokens)
- [ ] `zustand` installed in package.json
- [ ] App.jsx useState count reduced from 45 to ~10
- [ ] Dual state pattern (input + actual) eliminated
- [ ] localStorage persistence useEffect removed
- [ ] Build succeeds: `npm run build`
- [ ] Dev mode works: `npm run dev`
- [ ] Palette generation works (change base color, mode)
- [ ] Sliders work with debounce
- [ ] Save/load palettes works
- [ ] Page reload restores state

**Expected App.jsx Line Reduction**: 2,722 → ~2,500 lines (220 lines removed)

---

## PHASE 2: LOGIC EXTRACTION (THE ENGINE)

**Goal**: Move pure business logic out of App.jsx into dedicated modules
**Duration**: 4-5 hours
**Files Modified**: 5 new directories, 8+ new files, 1 major edit

### 2.1 Audit Logic in App.jsx

**Current Logic Locations**:

#### Token Generation Logic (ALREADY EXTRACTED ✓)
- `src/lib/tokens.js` (638 lines) - generateTokens, contrast checking
- `src/lib/theme/engine.js` (66 lines) - buildTheme wrapper
- **Status**: Already pure functions, no changes needed

#### Export Logic (NEEDS EXTRACTION ❌)
**Location**: App.jsx lines 1394-1912 (518 lines!)

**Functions to Extract**:
1. `handleDownloadJSON` (lines 1394-1419) → `src/lib/exports/exportJSON.js`
2. `handleDownloadCSS` (lines 1421-1480) → `src/lib/exports/exportCSS.js`
3. `handleDownloadImage` (lines 1482-1558) → `src/lib/exports/exportImage.js`
4. `handleDownloadSVG` (lines 1560-1603) → `src/lib/exports/exportSVG.js`
5. `triggerDownload` (lines 1605-1606) → `src/lib/exports/exportUtils.js`
6. `handleGenerateListingAssets` (lines 1698-1802) → `src/lib/exports/exportListingAssets.js`
7. `handleDownloadThemePack` (lines 1803-1912) → `src/lib/exports/exportThemePack.js`

#### Project Export Logic (NEEDS EXTRACTION ❌)
**Location**: App.jsx lines 1914-2167 (253 lines)

**Functions to Extract**:
1. `exportProjectPrintAssets` (lines 1989-2087) → `src/lib/exports/exportProjectPrint.js`
2. `exportProjectPenpotPrintTokens` (lines 2089-2167) → `src/lib/exports/exportPenpot.js`

#### Storage Logic (PARTIALLY IN STORE ✓)
- Save/load palettes → moved to usePaletteStore in Phase 1
- Project storage → already in `src/hooks/useProjectStorage.js`

#### Palette Operations (NEEDS EXTRACTION ❌)
**Location**: App.jsx lines 1100-1400 (300 lines)

**Functions to Extract**:
1. `applySavedPalette` (lines 1100-1116) → `src/lib/palette/paletteOperations.js`
2. `loadSavedPalette` (lines 1250-1260) → move to store
3. `openProjectPalette` (lines 1262-1277) → `src/lib/palette/projectIntegration.js`
4. `saveProjectPalette` (lines 1279-1316) → `src/lib/palette/projectIntegration.js`
5. `randomRitual` (lines 1389-1392) → `src/lib/palette/paletteGenerators.js`

---

### 2.2 Create Export Module Structure

**Step 2.2.1**: Create directory structure
```bash
mkdir -p src/lib/exports
mkdir -p src/lib/palette
```

**Step 2.2.2**: Create base export utilities
```bash
# Create src/lib/exports/exportUtils.js
```

**File Content** (`src/lib/exports/exportUtils.js`):
```javascript
/**
 * Triggers browser download of a file
 * @param {Blob|string} data - File data (Blob or data URL)
 * @param {string} filename - Filename with extension
 * @param {string} mime - MIME type
 */
export const triggerDownload = (data, filename, mime) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports data as downloadable asset
 * @param {Object} options
 * @param {Blob|string} options.data
 * @param {string} options.filename
 * @param {string} options.mime
 */
export const exportAssets = ({ data, filename, mime }) => {
  triggerDownload(data, filename, mime);
};

/**
 * Builds export filename with sanitization
 * @param {string} base - Base name (e.g., theme name)
 * @param {string} suffix - Suffix (e.g., '-tokens')
 * @param {string} ext - Extension (e.g., 'json')
 * @returns {string} Sanitized filename
 */
export const buildExportFilename = (base, suffix, ext) => {
  const sanitized = base.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  return `${sanitized}${suffix}.${ext}`;
};

/**
 * Slugifies filename for safe export
 * @param {string} name - Human-readable name
 * @param {string} fallback - Fallback if name is empty
 * @returns {string} Slugified name
 */
export const slugifyFilename = (name, fallback) => {
  if (!name || !name.trim()) return fallback;
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Normalizes hex color
 * @param {string} hex - Hex color
 * @param {string} fallback - Fallback color
 * @returns {string} Normalized 6-digit hex
 */
export const normalizeHex = (hex, fallback) => {
  if (!hex) return fallback;
  const clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    return `#${clean.split('').map(c => c + c).join('')}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return fallback;
};
```

**Safety Check 2.2**:
```bash
npm run build
# Expected: Build succeeds
```

---

### 2.3 Extract JSON Export

**Step 2.3.1**: Create JSON export module
```bash
# Create src/lib/exports/exportJSON.js
```

**File Content** (`src/lib/exports/exportJSON.js`):
```javascript
import { buildGenericPayload } from '../payloads.js';
import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Exports tokens as JSON file
 * @param {Object} options
 * @param {Object} options.finalTokens - Token object to export
 * @param {string} options.themeName - Theme display name
 * @param {string} options.mode - Harmony mode
 * @param {string} options.baseColor - Base hex color
 * @param {boolean} options.isDark - Dark mode flag
 * @param {boolean} options.printMode - Print mode flag
 * @param {string} options.tokenPrefix - Token prefix
 * @returns {Promise<void>}
 */
export const exportJSON = async (options) => {
  const {
    finalTokens,
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    tokenPrefix,
  } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const payload = buildGenericPayload(finalTokens, {
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    generatedAt: new Date().toISOString(),
    tokenPrefix: tokenPrefix || undefined,
  });

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-tokens',
    'json'
  );

  exportAssets({ data: blob, filename, mime: 'application/json' });
};
```

**Step 2.3.2**: Replace in App.jsx

**BEFORE** (lines 1394-1419):
```javascript
const handleDownloadJSON = useCallback(async () => {
  // ... 25 lines of logic
}, [dependencies]);
```

**AFTER**:
```javascript
import { exportJSON } from './lib/exports/exportJSON.js';

const handleDownloadJSON = useCallback(async () => {
  try {
    await exportJSON({
      finalTokens: tokenStore.finalTokens,
      themeName: paletteStore.customThemeName || `${paletteStore.mode} ${paletteStore.themeMode}`,
      mode: paletteStore.mode,
      baseColor: paletteStore.baseColor,
      isDark: paletteStore.themeMode === 'dark',
      printMode: paletteStore.printMode,
      tokenPrefix: paletteStore.tokenPrefix,
    });
    notify('JSON exported', 'success');
  } catch (err) {
    console.error('JSON export failed', err);
    notify('JSON export failed', 'error');
  }
}, [paletteStore, tokenStore, notify]);
```

**Safety Check 2.3**:
```bash
npm run dev
# Test: Click "Download JSON" in Export stage
# Expected: JSON file downloads successfully
```

---

### 2.4 Extract CSS Export

**Step 2.4.1**: Create CSS export module
```bash
# Create src/lib/exports/exportCSS.js
```

**File Content** (`src/lib/exports/exportCSS.js`):
```javascript
import { buildCSSVariables } from '../theme/cssExport.js';
import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Exports tokens as CSS variables file
 * @param {Object} options
 * @param {Object} options.finalTokens - Token object
 * @param {string} options.themeName - Theme name
 * @param {string} options.tokenPrefix - Optional prefix
 * @returns {Promise<void>}
 */
export const exportCSS = async (options) => {
  const { finalTokens, themeName, tokenPrefix } = options;

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const css = buildCSSVariables(finalTokens, { prefix: tokenPrefix });
  const blob = new Blob([css], { type: 'text/css' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-variables',
    'css'
  );

  exportAssets({ data: blob, filename, mime: 'text/css' });
};
```

**Step 2.4.2**: Replace in App.jsx (similar pattern to JSON)

**Safety Check 2.4**:
```bash
npm run dev
# Test: Click "Download CSS" in Export stage
# Expected: CSS file downloads with :root variables
```

---

### 2.5 Extract Image & SVG Exports

**Step 2.5.1**: Create image export module
```bash
# Create src/lib/exports/exportImage.js
```

**File Content** (`src/lib/exports/exportImage.js`):
```javascript
import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';

/**
 * Captures DOM node as PNG image
 * @param {HTMLElement} node - DOM element to capture
 * @param {Object} options - html-to-image options
 * @returns {Promise<Uint8Array>} Image bytes
 */
const captureNodeAsImage = async (node, options = {}) => {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    ...options,
  });
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
};

/**
 * Exports DOM element as PNG image
 * @param {Object} options
 * @param {HTMLElement} options.node - Element to capture
 * @param {string} options.themeName - Theme name for filename
 * @param {number} options.width - Image width
 * @param {number} options.height - Image height
 * @param {string} options.backgroundColor - Background color
 * @returns {Promise<void>}
 */
export const exportImage = async (options) => {
  const { node, themeName, width, height, backgroundColor } = options;

  if (!node) {
    throw new Error('Node is required for image export');
  }

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const imageBytes = await captureNodeAsImage(node, {
    width,
    height,
    backgroundColor,
  });

  const blob = new Blob([imageBytes], { type: 'image/png' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-preview',
    'png'
  );

  exportAssets({ data: blob, filename, mime: 'image/png' });
};
```

**Step 2.5.2**: Create SVG export module (similar pattern)

**Safety Check 2.5**:
```bash
npm run dev
# Test: Export preview as PNG
# Expected: PNG image downloads
```

---

### 2.6 Extract Theme Pack Export (Largest Function)

**Step 2.6.1**: Create theme pack module
```bash
# Create src/lib/exports/exportThemePack.js
```

**File Content**: Extract lines 1803-1912 from App.jsx into pure function

**Strategy**:
- Accept all dependencies as parameters (no closures)
- Return Promise
- Throw errors instead of using notify (caller handles notification)

**Signature**:
```javascript
export const exportThemePack = async (options) => {
  const {
    finalTokens,
    themeName,
    mode,
    baseColor,
    themeMode,
    isDark,
    printMode,
    tokenPrefix,
  } = options;

  // ... 100+ lines of ZIP generation logic
};
```

**Safety Check 2.6**:
```bash
npm run dev
# Test: Click "Download Theme Pack"
# Expected: ZIP file downloads with tokens.json, css/variables.css, README.txt
```

---

### 2.7 Extract Listing Assets Export

**Step 2.7.1**: Create listing assets module
```bash
# Create src/lib/exports/exportListingAssets.js
```

**Strategy**: Extract lines 1698-1802 from App.jsx

**Dependencies to Pass**:
- `listingCoverRef.current` → pass as parameter `coverNode`
- `listingSwatchRef.current` → pass as parameter `swatchNode`
- `tokens` → pass as parameter `tokens`
- `displayThemeName` → pass as parameter `themeName`

**Safety Check 2.7**:
```bash
npm run dev
# Test: Generate listing assets (dev mode only)
# Expected: ZIP with cover.png, swatches.png, ui.png
```

---

### 2.8 Phase 2 Completion Checklist

- [ ] `src/lib/exports/` directory created
- [ ] `exportUtils.js` created with shared utilities
- [ ] `exportJSON.js` created and integrated
- [ ] `exportCSS.js` created and integrated
- [ ] `exportImage.js` created and integrated
- [ ] `exportSVG.js` created and integrated
- [ ] `exportThemePack.js` created and integrated
- [ ] `exportListingAssets.js` created and integrated
- [ ] All 8 export functions work in dev mode
- [ ] Build succeeds: `npm run build`
- [ ] No console errors during exports

**Expected App.jsx Line Reduction**: ~2,500 → ~1,700 lines (800 lines removed)

---

## PHASE 3: COMPONENT DECOUPLING

**Goal**: Eliminate prop drilling by consuming stores directly in components
**Duration**: 3-4 hours
**Files Modified**: 6 stage components, 1 App.jsx update

### 3.1 Audit Current Prop Drilling

**Current Prop Counts** (App.jsx:2464-2722):

Component | Props | Lines
----------|-------|------
IdentityStage | 34 | 2464-2498
BuildStage | 28 | 2586-2614
ValidateStage | 25 | 2627-2651
PackageStage | 22 | 2652-2682
ExportStage | 18 | 2683-2707
ProjectView | 15 | 2708-2722

**Total Props Passed**: 142 prop assignments across 6 components

---

### 3.2 Refactor BuildStage (Pilot Component)

**Step 3.2.1**: Read current BuildStage
```bash
cat src/components/stages/BuildStage.jsx | head -50
```

**BEFORE** (lines 6-34):
```javascript
const BuildStage = ({
  headerOpen,
  setHeaderOpen,
  chaosMenuOpen,
  setChaosMenuOpen,
  randomRitual,
  crankApocalypse,
  tokens,
  mode,
  onModeChange,
  themeMode,
  onThemeModeChange,
  baseColor,
  onBaseColorChange,
  presets,
  applyPreset,
  showFineTune,
  setShowFineTune,
  harmonyInput,
  neutralInput,
  accentInput,
  apocalypseInput,
  popInput,
  debouncedHarmonyChange,
  debouncedNeutralChange,
  debouncedAccentChange,
  debouncedApocalypseChange,
  debouncedPopChange,
}) => (
  // ...
);
```

**AFTER**:
```javascript
import React, { useState, useCallback, useRef } from 'react';
import { usePaletteStore } from '../../store/usePaletteStore.js';
import { useTokenStore } from '../../store/useTokenStore.js';

const BuildStage = ({
  headerOpen,
  setHeaderOpen,
  randomRitual,
  crankApocalypse,
  presets,
  applyPreset,
}) => {
  // Local UI state
  const [chaosMenuOpen, setChaosMenuOpen] = useState(false);
  const [showFineTune, setShowFineTune] = useState(false);

  // Zustand store
  const baseColor = usePaletteStore((state) => state.baseColor);
  const mode = usePaletteStore((state) => state.mode);
  const themeMode = usePaletteStore((state) => state.themeMode);
  const setBaseColor = usePaletteStore((state) => state.setBaseColor);
  const setMode = usePaletteStore((state) => state.setMode);
  const setThemeMode = usePaletteStore((state) => state.setThemeMode);
  const harmonyIntensity = usePaletteStore((state) => state.harmonyIntensity);
  const setHarmonyIntensity = usePaletteStore((state) => state.setHarmonyIntensity);
  // ... other intensities

  const tokens = useTokenStore((state) => state.tokens);

  // Debounced handlers (moved from App.jsx)
  const harmonyDebounceRef = useRef(null);
  const debouncedHarmonyChange = useCallback((value) => {
    if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
    harmonyDebounceRef.current = setTimeout(() => {
      setHarmonyIntensity(value);
    }, 120);
  }, [setHarmonyIntensity]);
  // ... other debounced handlers

  return (
    // ... JSX unchanged
  );
};
```

**Prop Reduction**: 28 props → 6 props (22 props eliminated)

**Step 3.2.2**: Update App.jsx to remove BuildStage props

**BEFORE** (lines 2586-2614):
```javascript
<BuildStage
  headerOpen={headerOpen}
  setHeaderOpen={setHeaderOpen}
  chaosMenuOpen={chaosMenuOpen}
  setChaosMenuOpen={setChaosMenuOpen}
  // ... 24 more props
/>
```

**AFTER**:
```javascript
<BuildStage
  headerOpen={headerOpen}
  setHeaderOpen={setHeaderOpen}
  randomRitual={randomRitual}
  crankApocalypse={crankApocalypse}
  presets={presets}
  applyPreset={applyPreset}
/>
```

**Safety Check 3.2**:
```bash
npm run dev
# Navigate to Build stage
# Test:
# 1. Base color picker works
# 2. Mode dropdown changes palette
# 3. Theme mode buttons (L/D/P) work
# 4. Sliders adjust intensities with debounce
# 5. Fine-tune panel toggles
```

---

### 3.3 Add React.memo to BuildStage

**Step 3.3.1**: Wrap component export
```javascript
export default React.memo(BuildStage);
```

**Step 3.3.2**: Add prop comparator (optional, for deeper optimization)
```javascript
const propsAreEqual = (prevProps, nextProps) => {
  return (
    prevProps.headerOpen === nextProps.headerOpen &&
    prevProps.randomRitual === nextProps.randomRitual &&
    prevProps.crankApocalypse === nextProps.crankApocalypse &&
    prevProps.presets === nextProps.presets &&
    prevProps.applyPreset === nextProps.applyPreset
  );
};

export default React.memo(BuildStage, propsAreEqual);
```

**Safety Check 3.3**:
```bash
npm run dev
# Open React DevTools > Profiler
# Navigate between stages
# Expected: BuildStage should NOT re-render when switching to IdentityStage
```

---

### 3.4 Refactor Remaining Stages

**Step 3.4.1**: Apply same pattern to:
- [ ] IdentityStage (34 props → ~8 props)
- [ ] ValidateStage (25 props → ~5 props)
- [ ] PackageStage (22 props → ~4 props)
- [ ] ExportStage (18 props → ~6 props)

**For Each Component**:
1. Import `usePaletteStore`, `useTokenStore`
2. Replace props with store selectors
3. Move local UI state (like `showContrast`, `activeTab`) into component
4. Add `React.memo` wrapper
5. Update App.jsx to remove props

**Safety Check 3.4**:
```bash
npm run dev
# Test each stage:
# - Identity: Save/load palettes, rename theme
# - Validate: Contrast checks, accessibility panel
# - Package: Copy tokens, export buttons
# - Export: All export formats
```

---

### 3.5 Refactor IdentityStage (Special Case)

**Challenge**: IdentityStage has project integration (projectEdit state)

**Step 3.5.1**: Keep project-related props, migrate palette props

**AFTER**:
```javascript
const IdentityStage = ({
  // Project integration (keep as props)
  projectEdit,
  onSaveProjectPalette,
  onSaveProjectPaletteAsNew,
  onCancelProjectEdit,
  deactivateTheme,
}) => {
  // Get palette state from store
  const customThemeName = usePaletteStore((state) => state.customThemeName);
  const setCustomThemeName = usePaletteStore((state) => state.setCustomThemeName);
  const tokenPrefix = usePaletteStore((state) => state.tokenPrefix);
  const setTokenPrefix = usePaletteStore((state) => state.setTokenPrefix);
  const savedPalettes = usePaletteStore((state) => state.savedPalettes);
  const saveCurrentPalette = usePaletteStore((state) => state.saveCurrentPalette);
  const loadSavedPalette = usePaletteStore((state) => state.loadSavedPalette);
  const clearSavedData = usePaletteStore((state) => state.clearSavedData);
  const storageState = usePaletteStore((state) => ({
    storageAvailable: state.storageAvailable,
    storageCorrupt: state.storageCorrupt,
    storageQuotaExceeded: state.storageQuotaExceeded,
  }));

  const tokens = useTokenStore((state) => state.tokens);

  // ... component logic
};
```

**Prop Reduction**: 34 props → 5 props (29 props eliminated)

---

### 3.6 Phase 3 Completion Checklist

- [ ] BuildStage refactored (28 → 6 props)
- [ ] IdentityStage refactored (34 → 5 props)
- [ ] ValidateStage refactored (25 → 5 props)
- [ ] PackageStage refactored (22 → 4 props)
- [ ] ExportStage refactored (18 → 6 props)
- [ ] All stages wrapped in `React.memo()`
- [ ] App.jsx prop passing reduced by ~120 lines
- [ ] Build succeeds: `npm run build`
- [ ] All stage functionality works in dev mode
- [ ] React DevTools shows reduced re-renders

**Expected App.jsx Line Reduction**: ~1,700 → ~1,200 lines (500 lines removed)

---

## PHASE 4: APP.JSX SLIMDOWN

**Goal**: Reduce App.jsx to a Router and Layout Shell only
**Duration**: 2-3 hours
**Files Modified**: App.jsx major refactor

### 4.1 Define Final App.jsx Responsibilities

**KEEP in App.jsx**:
1. **Routing Logic**: view state ('palette' | 'project'), currentStage, hash navigation
2. **Layout Structure**: header, stage container, mobile navigation
3. **Top-Level Context Providers**: NotificationProvider, ProjectProvider
4. **Media Query Management**: headerOpen, overflowOpen (layout state)
5. **Global Handlers**: randomRitual, crankApocalypse, applyPreset (if used by multiple stages)

**REMOVE from App.jsx**:
1. ~~Palette state management~~ → **usePaletteStore** ✓
2. ~~Token computation~~ → **useTokenStore** ✓
3. ~~Export functions~~ → **src/lib/exports/** ✓
4. ~~Storage persistence~~ → **usePaletteStore middleware** ✓
5. ~~Debounce management~~ → **Individual stage components** ✓

---

### 4.2 Extract Remaining Helpers

**Step 4.2.1**: Move utility functions to dedicated files

**Current Helpers in App.jsx** (lines 738-810):
- `sanitizeThemeName` → move to `src/lib/utils/stringUtils.js`
- `sanitizePrefix` → move to `src/lib/utils/stringUtils.js`
- `buildSpecFromSection` → move to `src/lib/palette/projectIntegration.js`
- `buildSectionSnapshotFromPalette` → move to `src/lib/palette/projectIntegration.js`

**Step 4.2.2**: Create utility module
```bash
# Create src/lib/utils/stringUtils.js
```

**File Content**:
```javascript
/**
 * Sanitizes theme name for display and export
 * @param {string} input - Raw theme name
 * @param {string} fallback - Fallback name
 * @returns {string} Sanitized name
 */
export const sanitizeThemeName = (input, fallback) => {
  if (!input || typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 50);
};

/**
 * Sanitizes token prefix for CSS variables
 * @param {string} prefix - Raw prefix
 * @returns {string} Sanitized prefix (kebab-case)
 */
export const sanitizePrefix = (prefix) => {
  if (!prefix || typeof prefix !== 'string') return '';
  return prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
};
```

**Safety Check 4.2**:
```bash
npm run build
```

---

### 4.3 Extract Palette Generators

**Step 4.3.1**: Create palette generator module
```bash
# Create src/lib/palette/paletteGenerators.js
```

**File Content**:
```javascript
/**
 * Generates random palette parameters
 * @returns {Object} Random palette spec
 */
export const generateRandomPalette = () => {
  const randomHex = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
  const themeModes = ['light', 'dark', 'pop'];

  return {
    baseColor: randomHex(),
    mode: modes[Math.floor(Math.random() * modes.length)],
    themeMode: themeModes[Math.floor(Math.random() * themeModes.length)],
    harmonyIntensity: 70 + Math.floor(Math.random() * 60), // 70-130
    apocalypseIntensity: 80 + Math.floor(Math.random() * 40), // 80-120
    neutralCurve: 90 + Math.floor(Math.random() * 20), // 90-110
    accentStrength: 90 + Math.floor(Math.random() * 20), // 90-110
    popIntensity: 100,
  };
};

/**
 * "Cranks" apocalypse mode (maxes out intensity)
 * @param {Object} currentState - Current palette spec
 * @returns {Object} Updated spec with apocalypse cranked
 */
export const crankApocalypsePalette = (currentState) => ({
  ...currentState,
  mode: 'Apocalypse',
  apocalypseIntensity: 150,
  harmonyIntensity: 120,
});
```

**Step 4.3.2**: Replace in App.jsx

**BEFORE** (lines 1389-1392):
```javascript
const randomRitual = useCallback(() => {
  setBaseColor(/* random hex */);
  setMode(/* random mode */);
  // ...
}, [dependencies]);
```

**AFTER**:
```javascript
import { generateRandomPalette } from './lib/palette/paletteGenerators.js';

const randomRitual = useCallback(() => {
  const randomSpec = generateRandomPalette();
  paletteStore.loadPaletteSpec(randomSpec);
}, [paletteStore]);
```

**Safety Check 4.3**:
```bash
npm run dev
# Test: Click "Shuffle" button in Build stage
# Expected: Random palette generates
```

---

### 4.4 Simplify Theme Master Computation

**Problem**: App.jsx still has useMemo for themeMaster (lines 937-955)

**Solution**: This is now handled by useTokenStore - remove from App.jsx

**DELETE** lines 930-993:
```javascript
const intensityConfig = useMemo(() => ({ ... }), [...]);
const themeMaster = useMemo(() => buildTheme({ ... }), [...]);
const paletteSnapshot = useMemo(() => ({ ... }), [...]);
```

**REPLACE WITH**:
```javascript
// Token computation handled by useTokenStore
const tokens = useTokenStore((state) => state.tokens);
const finalTokens = useTokenStore((state) => state.finalTokens);
const orderedStack = useTokenStore((state) => state.orderedStack);
```

**Safety Check 4.4**:
```bash
npm run dev
# Test: Change base color
# Expected: Palette updates immediately
```

---

### 4.5 Move UI Theme Computation

**Problem**: App.jsx has massive uiTheme calculation (lines 2249-2377, 125 lines)

**Solution**: Extract to custom hook

**Step 4.5.1**: Create UI theme hook
```bash
# Create src/hooks/useUITheme.js
```

**File Content**:
```javascript
import { useMemo } from 'react';
import { useTokenStore } from '../store/useTokenStore.js';
import { usePaletteStore } from '../store/usePaletteStore.js';

/**
 * Computes UI theme CSS variables for app chrome
 * @returns {Object} CSS variable object and class names
 */
export const useUITheme = () => {
  const tokens = useTokenStore((state) => state.tokens);
  const themeMode = usePaletteStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';

  const uiTheme = useMemo(() => {
    if (!tokens) return {};

    // Extract 125 lines from App.jsx lines 2249-2377
    // ... all CSS variable calculations

    return {
      '--page-background': tokens.surfaces['page-background'],
      '--panel-base': tokens.surfaces['header-background'],
      // ... 50+ more variables
    };
  }, [tokens, isDark]);

  const themeClass = isDark ? 'dark' : 'light';

  return { uiTheme, themeClass };
};
```

**Step 4.5.2**: Use hook in App.jsx

**BEFORE** (lines 2249-2377):
```javascript
const uiTheme = useMemo(() => ({
  // 125 lines of CSS calculations
}), [30+ dependencies]);
```

**AFTER**:
```javascript
import { useUITheme } from './hooks/useUITheme.js';

const { uiTheme, themeClass } = useUITheme();
```

**Safety Check 4.5**:
```bash
npm run dev
# Expected: App chrome (header, panels) styles correctly
```

---

### 4.6 Move CSS Injection to Hook

**Problem**: Direct DOM manipulation in useEffect (lines 2382-2400)

**Solution**: Extract to custom hook with proper cleanup

**Step 4.6.1**: Create CSS injection hook
```bash
# Create src/hooks/useThemeCSS.js
```

**File Content**:
```javascript
import { useEffect } from 'react';

/**
 * Injects theme CSS variables into DOM
 * @param {Object} cssVars - CSS variable object
 * @param {string} themeClass - Theme class name ('light' | 'dark')
 */
export const useThemeCSS = (cssVars, themeClass) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const THEME_CLASSES = ['light', 'dark', 'pop'];

    // Update class
    THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(themeClass);

    // Inject CSS variables
    let styleTag = document.getElementById('theme-vars');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'theme-vars';
      document.head.appendChild(styleTag);
    }

    const cssText = `:root {${Object.entries(cssVars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n')}}`;
    styleTag.textContent = cssText;

    // Cleanup
    return () => {
      // Don't remove style tag - keep for next mount
    };
  }, [cssVars, themeClass]);
};
```

**Step 4.6.2**: Use in App.jsx

**DELETE** lines 2382-2400

**ADD**:
```javascript
import { useThemeCSS } from './hooks/useThemeCSS.js';

useThemeCSS(uiTheme, themeClass);
```

**Safety Check 4.6**:
```bash
npm run dev
# Check DevTools > Elements > <html>
# Expected: :root has CSS variables injected
```

---

### 4.7 Final App.jsx Structure

**Target Structure** (~500 lines):
```javascript
// Imports (30 lines)
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { usePaletteStore } from './store/usePaletteStore.js';
import { useTokenStore, useTokenComputation } from './store/useTokenStore.js';
import { useUITheme } from './hooks/useUITheme.js';
import { useThemeCSS } from './hooks/useThemeCSS.js';
import { generateRandomPalette, crankApocalypsePalette } from './lib/palette/paletteGenerators.js';
// ... stage imports

export default function App() {
  // Context
  const { notify } = useNotification();
  const projectContext = useContext(ProjectContext);

  // Stores
  const paletteStore = usePaletteStore();
  const tokenStore = useTokenStore();
  useTokenComputation(); // Auto-compute tokens

  // Routing state (keep in App)
  const [view, setView] = useState('palette');
  const [currentStage, setCurrentStage] = useState('Identity');

  // Layout state (keep in App)
  const [headerOpen, setHeaderOpen] = useState(true);
  const [overflowOpen, setOverflowOpen] = useState(false);

  // UI theme
  const { uiTheme, themeClass } = useUITheme();
  useThemeCSS(uiTheme, themeClass);

  // Media query for header (50 lines)
  useEffect(() => { /* ... */ }, []);

  // Hash navigation (30 lines)
  useEffect(() => { /* ... */ }, []);

  // Global handlers (30 lines)
  const randomRitual = useCallback(() => { /* ... */ }, [paletteStore]);
  const crankApocalypse = useCallback(() => { /* ... */ }, [paletteStore]);
  const applyPreset = useCallback(() => { /* ... */ }, [paletteStore]);

  // Render (300 lines)
  return (
    <NotificationProvider>
      <ProjectProvider>
        <div className={themeClass} style={uiTheme}>
          {/* Mobile nav */}
          {view === 'palette' && <MobileTopBar />}

          {/* Stage container */}
          <div className="stage-container">
            <IdentityStage
              projectEdit={paletteStore.projectEdit}
              onSaveProjectPalette={/* ... */}
            />
            <BuildStage
              headerOpen={headerOpen}
              setHeaderOpen={setHeaderOpen}
              randomRitual={randomRitual}
            />
            <ValidateStage />
            <PackageStage />
            <ExportStage />
          </div>

          {/* Project view */}
          {view === 'project' && (
            <PaletteContext.Provider value={{ /* ... */ }}>
              <ProjectView />
            </PaletteContext.Provider>
          )}
        </div>
      </ProjectProvider>
    </NotificationProvider>
  );
}
```

**Safety Check 4.7**:
```bash
wc -l src/App.jsx
# Expected: ~500-600 lines (down from 2,722)

npm run build
npm run dev
# Full integration test:
# 1. Generate random palette
# 2. Adjust sliders
# 3. Save palette
# 4. Load saved palette
# 5. Export JSON
# 6. Export CSS
# 7. Switch to project view
# 8. Create new project section
# 9. Open section in palette editor
```

---

### 4.8 Phase 4 Completion Checklist

- [ ] Utility functions extracted to `src/lib/utils/stringUtils.js`
- [ ] Palette generators extracted to `src/lib/palette/paletteGenerators.js`
- [ ] Project integration helpers extracted to `src/lib/palette/projectIntegration.js`
- [ ] UI theme hook created (`src/hooks/useUITheme.js`)
- [ ] CSS injection hook created (`src/hooks/useThemeCSS.js`)
- [ ] App.jsx themeMaster computation removed (handled by store)
- [ ] App.jsx useMemo hooks reduced to 0-2
- [ ] App.jsx useState hooks reduced to 4-6
- [ ] App.jsx useEffect hooks reduced to 3-5
- [ ] App.jsx line count: 500-600 lines
- [ ] Build succeeds: `npm run build`
- [ ] Full app functionality works
- [ ] No console errors or warnings

**Expected App.jsx Line Reduction**: ~1,200 → ~550 lines (650 lines removed)

---

## 🎯 FINAL RESULTS

### Before vs After

Metric | Before | After | Change
-------|--------|-------|-------
**App.jsx lines** | 2,722 | ~550 | **-80%**
**useState hooks** | 45 | 6 | **-87%**
**useEffect hooks** | 15 | 5 | **-67%**
**useMemo hooks** | 28 | 2 | **-93%**
**Files in codebase** | 45 | 65 | +20 (organized)
**Prop drilling** | 142 props | 30 props | **-78%**

### New Architecture

```
src/
├── App.jsx (550 lines) - Router & Layout Shell
├── store/
│   ├── usePaletteStore.js - Centralized state (30 variables)
│   └── useTokenStore.js - Computed tokens
├── lib/
│   ├── exports/ - 8 export modules (pure functions)
│   ├── palette/ - Palette operations & generators
│   ├── utils/ - String utilities
│   ├── tokens.js - Token generation (unchanged)
│   └── theme/ - Theme engine (unchanged)
├── hooks/
│   ├── useUITheme.js - UI theme computation
│   ├── useThemeCSS.js - CSS injection
│   ├── useProjectState.js - Project state (unchanged)
│   └── useDarkClassSync.js - Dark mode sync (unchanged)
└── components/
    └── stages/ - 6 stage components (React.memo, store consumers)
```

---

## 🔒 SAFETY PROTOCOL

After **EACH PHASE**, run these checks:

### Build Check
```bash
npm run build
```
**Expected**: No errors, warnings OK

### Dev Server Check
```bash
npm run dev
```
**Expected**: Starts on http://localhost:5173

### Type Check (if using TypeScript)
```bash
npm run type-check
```

### Smoke Tests (Manual)
1. **Palette Generation**: Change base color → palette updates
2. **Sliders**: Adjust intensity → debounced update (120ms)
3. **Save/Load**: Save palette → reload page → palette restores
4. **Export**: Download JSON → file downloads successfully
5. **Stage Navigation**: Click stages → content switches
6. **Project View**: Switch to project → sections display

---

## 🚨 ROLLBACK PROCEDURE

If any phase fails:

### Rollback Commands
```bash
# Discard uncommitted changes
git checkout src/App.jsx

# Revert last commit
git revert HEAD

# Return to specific commit
git reset --hard <commit-hash>
```

### Phase-by-Phase Commits
```bash
# After Phase 1
git add .
git commit -m "Phase 1: State extraction to Zustand - App.jsx 2722→2500 lines"

# After Phase 2
git commit -m "Phase 2: Logic extraction - export & palette ops - App.jsx 2500→1700 lines"

# After Phase 3
git commit -m "Phase 3: Component decoupling - eliminate prop drilling - App.jsx 1700→1200 lines"

# After Phase 4
git commit -m "Phase 4: App.jsx slimdown - final refactor - App.jsx 1200→550 lines"
```

---

## 📋 EXECUTION CHECKLIST

### Pre-Execution
- [ ] Create feature branch: `git checkout -b refactor/surgical-app-slimdown`
- [ ] Backup current codebase: `git stash push -u -m "Pre-refactor backup"`
- [ ] Ensure clean working directory: `git status`
- [ ] Run tests (if available): `npm test`
- [ ] Document current behavior (video recording or screenshots)

### Phase Execution
- [ ] Phase 1: State Extraction (3-4 hours)
  - [ ] Commit after completion
  - [ ] Run safety checks
- [ ] Phase 2: Logic Extraction (4-5 hours)
  - [ ] Commit after completion
  - [ ] Run safety checks
- [ ] Phase 3: Component Decoupling (3-4 hours)
  - [ ] Commit after completion
  - [ ] Run safety checks
- [ ] Phase 4: App.jsx Slimdown (2-3 hours)
  - [ ] Commit after completion
  - [ ] Run safety checks

### Post-Execution
- [ ] Full regression test (all features)
- [ ] Performance check (React DevTools Profiler)
- [ ] Bundle size check: `npm run build && ls -lh dist/assets`
- [ ] Create PR with detailed description
- [ ] Update documentation
- [ ] Celebrate! 🎉

---

## 📊 SUCCESS METRICS

### Performance Improvements (Expected)
- **Initial Load**: 10-15% faster (smaller bundle, less parsing)
- **Re-render Frequency**: 60-70% reduction (React.memo + granular selectors)
- **Slider Responsiveness**: No change (120ms debounce maintained)
- **State Updates**: 30-40% faster (Zustand vs useState cascade)

### Developer Experience Improvements
- **Feature Velocity**: 2-3x faster (clear separation of concerns)
- **Bug Fix Time**: 50% reduction (isolated logic, easier debugging)
- **Onboarding Time**: 60% reduction (clear architecture vs 2700-line file)
- **Test Coverage**: Easier to achieve (pure functions testable in isolation)

---

## 🎓 LESSONS LEARNED

This refactor demonstrates:

1. **God Object Anti-Pattern**: Single 2,722-line component becomes unmaintainable
2. **Dual State Complexity**: Input + actual value duplication creates race conditions
3. **Prop Drilling Hell**: 142 props across 6 components blocks optimization
4. **Side Effect Sprawl**: 15 useEffect hooks with complex dependencies = debugging nightmare
5. **Logic/UI Coupling**: Export logic in UI component = untestable, unreusable
6. **State Synchronization**: Multiple sources of truth = data consistency bugs

**Solution**: Zustand + pure functions + React.memo + composition = maintainable, performant architecture.

---

**End of Roadmap** - Ready for execution. Do not proceed without user approval.
