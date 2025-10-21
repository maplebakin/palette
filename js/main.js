import { generatePalette, extractFromImage } from './colorTheory.js';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, contrastRatio, parseColor, rgbToCmyk } from './colorConversion.js';
import { savePalette, deletePalette, listPalettes, filterPalettes } from './storage.js';
import {
  renderPalette,
  renderLibrary,
  renderPreview,
  renderContrastGrid,
  renderShadeTintGrid,
  showToast,
} from './ui.js';
import {
  exportCssVariables,
  exportScssVariables,
  exportJson,
  exportUrl,
  exportPng,
  exportPdf,
  exportAse,
} from './export.js';

const paletteList = document.getElementById('palette-list');
const libraryGrid = document.getElementById('library-grid');
const searchInput = document.getElementById('search-input');
const tagFilterInput = document.getElementById('tag-filter');
const hexInput = document.getElementById('hex-input');
const colorPicker = document.getElementById('color-picker');
const modeSelect = document.getElementById('mode-select');
const colorCountInput = document.getElementById('color-count');
const generateBtn = document.getElementById('generate-btn');
const saveBtn = document.getElementById('save-palette');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const addColorBtn = document.getElementById('add-color');
const adjustBtn = document.getElementById('adjust-btn');
const previewBtn = document.getElementById('preview-btn');
const contrastBtn = document.getElementById('contrast-btn');
const imageInput = document.getElementById('image-input');
const eyedropperBtn = document.getElementById('eyedropper-btn');
const adjustDialog = document.getElementById('adjust-dialog');
const previewDialog = document.getElementById('preview-dialog');
const contrastDialog = document.getElementById('contrast-dialog');
const tagDialog = document.getElementById('tag-dialog');
const previewArea = document.getElementById('preview-area');
const contrastGrid = document.getElementById('contrast-grid');
const shadeTintGrid = document.getElementById('shade-tint-grid');
const adjustColorCode = document.getElementById('adjust-color-code');
const adjustHue = document.getElementById('adjust-h');
const adjustSat = document.getElementById('adjust-s');
const adjustLight = document.getElementById('adjust-l');
const paletteNameInput = document.getElementById('palette-name');
const paletteTagsInput = document.getElementById('palette-tags');
const themeToggle = document.getElementById('theme-toggle');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

const RGB_SLIDERS = document.querySelectorAll('.rgb-group .slider');
const HSL_SLIDERS = document.querySelectorAll('.hsl-group .slider');

const state = {
  colors: [],
  selectedIndex: 0,
  mode: 'monochromatic',
  baseColor: '#6C5CE7',
  history: [],
  future: [],
  savedPalettes: [],
};

function pushHistory() {
  state.history.push(JSON.stringify({ colors: state.colors, selectedIndex: state.selectedIndex }));
  if (state.history.length > 50) {
    state.history.shift();
  }
  state.future = [];
}

function restoreSnapshot(snapshot) {
  const parsed = JSON.parse(snapshot);
  state.colors = parsed.colors;
  state.selectedIndex = parsed.selectedIndex;
}

function updateHistory(action) {
  if (action === 'undo' && state.history.length) {
    const snapshot = state.history.pop();
    state.future.push(JSON.stringify({ colors: state.colors, selectedIndex: state.selectedIndex }));
    restoreSnapshot(snapshot);
    const reference = state.colors[state.selectedIndex]?.hex || state.colors[0]?.hex || state.baseColor;
    if (reference) syncInputsFromHex(reference);
    render();
    showToast('Undo');
  } else if (action === 'redo' && state.future.length) {
    const snapshot = state.future.pop();
    state.history.push(JSON.stringify({ colors: state.colors, selectedIndex: state.selectedIndex }));
    restoreSnapshot(snapshot);
    const reference = state.colors[state.selectedIndex]?.hex || state.colors[0]?.hex || state.baseColor;
    if (reference) syncInputsFromHex(reference);
    render();
    showToast('Redo');
  }
}

function syncInputsFromHex(hex) {
  hexInput.value = hex;
  colorPicker.value = hex;
  const rgb = hexToRgb(hex);
  RGB_SLIDERS.forEach((slider) => {
    const range = slider.querySelector('input[type="range"]');
    const number = slider.querySelector('input[type="number"]');
    const channel = slider.dataset.channel;
    range.value = rgb[channel];
    number.value = rgb[channel];
  });
  const hsl = rgbToHsl(rgb);
  HSL_SLIDERS.forEach((slider) => {
    const range = slider.querySelector('input[type="range"]');
    const number = slider.querySelector('input[type="number"]');
    const channel = slider.dataset.channel;
    range.value = hsl[channel];
    number.value = hsl[channel];
  });
  state.baseColor = hex;
}

function applyPalette(hexes) {
  const previous = state.colors;
  state.colors = hexes.map((hex, index) => ({
    hex,
    locked: previous[index]?.locked || false,
  }));
  colorCountInput.value = state.colors.length;
  state.selectedIndex = 0;
  render();
}

function generateFromState() {
  if (state.mode === 'image') {
    showToast('Upload an image to extract colors', 'error');
    return;
  }
  const count = Number(colorCountInput.value);
  const locked = state.colors
    .map((color, index) => (color.locked ? { index, hex: color.hex } : null))
    .filter(Boolean);
  const palette = generatePalette(state.mode, state.baseColor, count, locked);
  pushHistory();
  applyPalette(palette);
  showToast('Palette refreshed');
}

function render() {
  renderPalette(paletteList, state.colors, state.selectedIndex);
  renderPreview(previewArea, state.colors.map((color) => color.hex));
  renderContrastGrid(contrastGrid, state.colors.map((color) => color.hex), contrastRatio);
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.body.classList.contains('theme-dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
}

async function loadLibrary() {
  state.savedPalettes = await listPalettes();
  renderLibrary(libraryGrid, state.savedPalettes);
}

function openAdjustDialog() {
  const color = state.colors[state.selectedIndex];
  if (!color) return;
  const hsl = rgbToHsl(hexToRgb(color.hex));
  adjustColorCode.textContent = color.hex;
  adjustHue.value = hsl.h;
  adjustSat.value = hsl.s;
  adjustLight.value = hsl.l;
  renderShadeTintGrid(shadeTintGrid, color.hex);
  adjustDialog.showModal();
}

function applyAdjustment() {
  const color = state.colors[state.selectedIndex];
  if (!color) return;
  pushHistory();
  const hex = rgbToHex(
    hslToRgb({
      h: Number(adjustHue.value),
      s: Number(adjustSat.value),
      l: Number(adjustLight.value),
    })
  );
  color.hex = hex;
  syncInputsFromHex(hex);
  render();
  showToast('Color adjusted');
}

function addColor(hex) {
  if (state.colors.length >= 10) {
    showToast('Maximum 10 colors allowed', 'error');
    return;
  }
  const sanitized = parseColor(hex);
  pushHistory();
  state.colors.push({ hex: sanitized, locked: false });
  state.selectedIndex = state.colors.length - 1;
  colorCountInput.value = state.colors.length;
  render();
  showToast('Color added');
}

function deleteColor(index) {
  if (state.colors.length <= 2) {
    showToast('Palettes must contain at least two colors', 'error');
    return;
  }
  pushHistory();
  state.colors.splice(index, 1);
  state.selectedIndex = Math.max(0, state.selectedIndex - 1);
  colorCountInput.value = state.colors.length;
  render();
  showToast('Color removed');
}

async function saveCurrentPalette() {
  if (!state.colors.length) return;
  paletteNameInput.value = '';
  paletteTagsInput.value = '';
  tagDialog.showModal();
  const result = await new Promise((resolve) => {
    tagDialog.addEventListener(
      'close',
      () => resolve(tagDialog.returnValue === 'apply'),
      { once: true }
    );
  });
  if (!result) return;
  const name = paletteNameInput.value.trim() || `Palette ${new Date().toLocaleString()}`;
  const tags = paletteTagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const payload = {
    id: crypto.randomUUID(),
    name,
    colors: state.colors.map((color) => color.hex),
    tags,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
  await savePalette(payload);
  state.savedPalettes = await listPalettes();
  renderLibrary(libraryGrid, state.savedPalettes);
  showToast('Palette saved', 'success');
}

function handleExport(type) {
  const palette = state.colors.map((color) => color.hex);
  switch (type) {
    case 'png':
      exportPng(palette);
      break;
    case 'css':
      exportCssVariables(palette);
      break;
    case 'scss':
      exportScssVariables(palette);
      break;
    case 'json':
      exportJson(palette);
      break;
    case 'ase':
      exportAse(palette);
      break;
    case 'pdf':
      exportPdf(palette);
      break;
    case 'url':
      exportUrl(palette);
      showToast('Shareable URL copied');
      break;
    default:
      break;
  }
}

function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  document.body.classList.toggle('theme-light');
  updateThemeButton();
  localStorage.setItem('palette-theme', document.body.classList.contains('theme-dark') ? 'dark' : 'light');
}

function handleKeyboardShortcuts(event) {
  const targetIsInput = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
  if (targetIsInput) return;
  switch (event.key.toLowerCase()) {
    case ' ':
      event.preventDefault();
      generateFromState();
      break;
    case 's':
      event.preventDefault();
      saveCurrentPalette();
      break;
    case 'e':
      event.preventDefault();
      exportBtn.click();
      break;
    case 'c':
      event.preventDefault();
      navigator.clipboard
        .writeText(state.colors[0]?.hex || '')
        .then(() => showToast('Copied first HEX'))
        .catch(() => showToast('Clipboard unavailable', 'error'));
      break;
    case 'l':
      event.preventDefault();
      const color = state.colors[state.selectedIndex];
      if (color) {
        color.locked = !color.locked;
        render();
        showToast(color.locked ? 'Color locked' : 'Color unlocked');
      }
      break;
    case 'arrowright':
      event.preventDefault();
      state.selectedIndex = Math.min(state.colors.length - 1, state.selectedIndex + 1);
      render();
      break;
    case 'arrowleft':
      event.preventDefault();
      state.selectedIndex = Math.max(0, state.selectedIndex - 1);
      render();
      break;
    default:
      break;
  }
}

function handlePaletteClick(event) {
  const card = event.target.closest('.color-card');
  if (!card) return;
  const index = Number(card.dataset.index);
  const color = state.colors[index];
  if (!color) return;
  const action = event.target.dataset.action;
  if (action === 'copy-hex') {
    navigator.clipboard.writeText(color.hex)
      .then(() => showToast('HEX copied'))
      .catch(() => showToast('Clipboard unavailable', 'error'));
  } else if (action === 'copy-rgb') {
    const rgb = hexToRgb(color.hex);
    navigator.clipboard
      .writeText(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)
      .then(() => showToast('RGB copied'))
      .catch(() => showToast('Clipboard unavailable', 'error'));
  } else if (action === 'copy-hsl') {
    const hsl = rgbToHsl(hexToRgb(color.hex));
    navigator.clipboard
      .writeText(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)
      .then(() => showToast('HSL copied'))
      .catch(() => showToast('Clipboard unavailable', 'error'));
  } else if (action === 'copy-cmyk') {
    const cmyk = rgbToCmyk(hexToRgb(color.hex));
    navigator.clipboard
      .writeText(`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`)
      .then(() => showToast('CMYK copied'))
      .catch(() => showToast('Clipboard unavailable', 'error'));
  } else if (action === 'toggle-lock') {
    color.locked = !color.locked;
    render();
    showToast(color.locked ? 'Color locked' : 'Color unlocked');
  } else if (action === 'delete-color') {
    deleteColor(index);
  } else if (action === 'select-color') {
    state.selectedIndex = index;
    render();
  } else if (!action) {
    state.selectedIndex = index;
    render();
  }
}

function handleDragAndDrop() {
  let draggedIndex = null;
  let dragSnapshot = null;
  let reordered = false;
  paletteList.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.color-card');
    if (!card) return;
    draggedIndex = Number(card.dataset.index);
    dragSnapshot = JSON.stringify({ colors: state.colors, selectedIndex: state.selectedIndex });
    reordered = false;
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  });
  paletteList.addEventListener('dragend', (event) => {
    const card = event.target.closest('.color-card');
    if (card) card.classList.remove('dragging');
    if (dragSnapshot && reordered) {
      state.history.push(dragSnapshot);
      if (state.history.length > 50) state.history.shift();
      state.future = [];
      showToast('Reordered color');
    }
    dragSnapshot = null;
    draggedIndex = null;
    reordered = false;
    render();
  });
  paletteList.addEventListener('dragover', (event) => {
    event.preventDefault();
    const targetCard = event.target.closest('.color-card');
    if (!targetCard || draggedIndex === null) return;
    const targetIndex = Number(targetCard.dataset.index);
    if (targetIndex === draggedIndex) return;
    const oldIndex = draggedIndex;
    const dragged = state.colors.splice(draggedIndex, 1)[0];
    state.colors.splice(targetIndex, 0, dragged);
    draggedIndex = targetIndex;
    reordered = true;
    const draggingEl = paletteList.querySelector('.color-card.dragging');
    if (draggingEl) {
      if (targetIndex > oldIndex) {
        paletteList.insertBefore(draggingEl, targetCard.nextSibling);
      } else {
        paletteList.insertBefore(draggingEl, targetCard);
      }
    }
  });
}

function initSliders(sliders, transformFn) {
  sliders.forEach((slider) => {
    const range = slider.querySelector('input[type="range"]');
    const number = slider.querySelector('input[type="number"]');
    const handler = (value) => {
      const min = Number(range.min);
      const max = Number(range.max);
      const sanitized = Math.min(max, Math.max(min, Number(value)));
      range.value = sanitized;
      number.value = sanitized;
      transformFn();
    };
    range.addEventListener('input', (event) => handler(event.target.value));
    number.addEventListener('input', (event) => handler(event.target.value));
  });
}

function updateBaseFromRgb() {
  const values = Array.from(RGB_SLIDERS).reduce((acc, slider) => {
    const channel = slider.dataset.channel;
    const number = slider.querySelector('input[type="number"]');
    acc[channel] = Number(number.value);
    return acc;
  }, {});
  const hex = rgbToHex(values);
  syncInputsFromHex(hex);
}

function updateBaseFromHsl() {
  const values = Array.from(HSL_SLIDERS).reduce((acc, slider) => {
    const channel = slider.dataset.channel;
    const number = slider.querySelector('input[type="number"]');
    acc[channel] = Number(number.value);
    return acc;
  }, {});
  const hex = rgbToHex(hslToRgb(values));
  syncInputsFromHex(hex);
}

function attachExportHandlers() {
  exportBtn.addEventListener('click', () => {
    exportBtn.parentElement.classList.toggle('open');
  });
  document.addEventListener('click', (event) => {
    if (!exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportBtn.parentElement.classList.remove('open');
    }
  });
  exportMenu.addEventListener('click', (event) => {
    const type = event.target.dataset.export;
    if (!type) return;
    exportBtn.parentElement.classList.remove('open');
    handleExport(type);
  });
}

function attachLibraryHandlers() {
  libraryGrid.addEventListener('click', async (event) => {
    const card = event.target.closest('.palette-card');
    if (!card) return;
    const id = card.dataset.id;
    if (event.target.dataset.action === 'load-palette') {
      const palette = state.savedPalettes.find((item) => item.id === id);
      if (!palette) return;
      pushHistory();
      state.colors = palette.colors.map((hex) => ({ hex, locked: false }));
      colorCountInput.value = state.colors.length;
      syncInputsFromHex(state.colors[0].hex);
      render();
      showToast('Palette loaded', 'success');
    } else if (event.target.dataset.action === 'delete-palette') {
      await deletePalette(id);
      state.savedPalettes = await listPalettes();
      renderLibrary(libraryGrid, state.savedPalettes);
      showToast('Palette deleted', 'success');
    }
  });
}

function attachSearchHandlers() {
  const performFilter = async () => {
    const results = await filterPalettes({ query: searchInput.value, tag: tagFilterInput.value });
    renderLibrary(libraryGrid, results);
  };
  searchInput.addEventListener('input', performFilter);
  tagFilterInput.addEventListener('input', performFilter);
}

function initializeTheme() {
  const saved = localStorage.getItem('palette-theme');
  if (saved === 'dark') {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-light');
  }
  updateThemeButton();
}

function initializeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('palette')) {
    const colors = params.get('palette').split(',').map((hex) => parseColor(hex));
    state.colors = colors.map((hex) => ({ hex, locked: false }));
    colorCountInput.value = state.colors.length;
    syncInputsFromHex(state.colors[0]);
    render();
    showToast('Palette imported from URL');
    return true;
  }
  return false;
}

function handleImageUpload(file) {
  const img = new Image();
  const reader = new FileReader();
  reader.onload = (event) => {
    img.onload = async () => {
      const colors = await extractFromImage(img, Number(colorCountInput.value));
      pushHistory();
      applyPalette(colors);
      syncInputsFromHex(colors[0]);
      showToast('Palette extracted from image');
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function attachEyedropper() {
  if (!('EyeDropper' in window)) {
    eyedropperBtn.disabled = true;
    eyedropperBtn.textContent = 'Eyedropper N/A';
    return;
  }
  eyedropperBtn.addEventListener('click', async () => {
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      syncInputsFromHex(result.sRGBHex);
      showToast('Picked color');
    } catch (error) {
      console.error(error);
    }
  });
}

function attachDialogs() {
  adjustDialog.addEventListener('close', () => {
    if (adjustDialog.returnValue === 'apply') {
      applyAdjustment();
    }
  });
  shadeTintGrid.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const hex = event.target.dataset.hex;
    if (!hex) return;
    syncInputsFromHex(hex);
    const hsl = rgbToHsl(hexToRgb(hex));
    adjustHue.value = hsl.h;
    adjustSat.value = hsl.s;
    adjustLight.value = hsl.l;
    adjustDialog.close('apply');
  });
  previewBtn.addEventListener('click', () => {
    renderPreview(previewArea, state.colors.map((color) => color.hex));
    previewDialog.showModal();
  });
  contrastBtn.addEventListener('click', () => {
    renderContrastGrid(contrastGrid, state.colors.map((color) => color.hex), contrastRatio);
    contrastDialog.showModal();
  });
  adjustBtn.addEventListener('click', openAdjustDialog);
}

function attachKeyboard() {
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

function attachUndoRedo() {
  undoBtn.addEventListener('click', () => updateHistory('undo'));
  redoBtn.addEventListener('click', () => updateHistory('redo'));
}

function init() {
  initializeTheme();
  attachEyedropper();
  attachExportHandlers();
  attachLibraryHandlers();
  attachSearchHandlers();
  attachDialogs();
  handleDragAndDrop();
  attachKeyboard();
  attachUndoRedo();

  initSliders(RGB_SLIDERS, updateBaseFromRgb);
  initSliders(HSL_SLIDERS, updateBaseFromHsl);

  hexInput.addEventListener('change', () => {
    try {
      const hex = parseColor(hexInput.value);
      syncInputsFromHex(hex);
    } catch (error) {
      showToast('Invalid HEX value', 'error');
    }
  });

  colorPicker.addEventListener('input', (event) => {
    syncInputsFromHex(event.target.value);
  });

  modeSelect.addEventListener('change', (event) => {
    state.mode = event.target.value;
    if (state.mode === 'image') {
      showToast('Upload an image to extract colors');
    }
  });

  colorCountInput.addEventListener('input', () => {
    const value = Number(colorCountInput.value);
    if (value < 2 || value > 10) {
      showToast('Palette size must be between 2 and 10', 'error');
      colorCountInput.value = Math.min(10, Math.max(2, value));
      return;
    }
    if (value !== state.colors.length) {
      if (value > state.colors.length) {
        const difference = value - state.colors.length;
        for (let i = 0; i < difference; i += 1) {
          state.colors.push({ hex: state.colors[state.colors.length - 1].hex, locked: false });
        }
      } else {
        state.colors = state.colors.slice(0, value);
      }
      render();
    }
  });

  generateBtn.addEventListener('click', () => {
    if (state.mode === 'image') {
      if (!imageInput.files.length) {
        showToast('Please upload an image first', 'error');
        return;
      }
      handleImageUpload(imageInput.files[0]);
    } else {
      generateFromState();
    }
  });

  imageInput.addEventListener('change', () => {
    if (modeSelect.value === 'image' && imageInput.files.length) {
      handleImageUpload(imageInput.files[0]);
    }
  });

  paletteList.addEventListener('click', handlePaletteClick);

  addColorBtn.addEventListener('click', () => {
    const input = prompt('Enter a HEX, RGB, or HSL color value');
    if (!input) return;
    try {
      addColor(input);
    } catch (error) {
      showToast('Invalid color input', 'error');
    }
  });

  saveBtn.addEventListener('click', saveCurrentPalette);
  themeToggle.addEventListener('click', toggleTheme);

  if (!initializeFromQuery()) {
    const initialPalette = generatePalette(state.mode, state.baseColor, Number(colorCountInput.value));
    state.colors = initialPalette.map((hex) => ({ hex, locked: false }));
    syncInputsFromHex(state.baseColor);
    render();
  }
  loadLibrary();
}

init();
