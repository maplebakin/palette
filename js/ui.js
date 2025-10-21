import { hexToRgb, rgbToHex, rgbToHsl, rgbToCmyk, approximateName } from './colorConversion.js';

export function showToast(message, variant = 'default') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}

export function renderPalette(container, colors, activeIndex = 0) {
  container.innerHTML = '';
  colors.forEach((color, index) => {
    const card = document.createElement('article');
    card.className = 'color-card';
    card.dataset.index = index;
    card.setAttribute('role', 'listitem');
    card.setAttribute('draggable', 'true');
    card.setAttribute('aria-selected', index === activeIndex);
    if (color.locked) {
      card.classList.add('locked');
    }

    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = color.hex;
    swatch.dataset.action = 'select-color';
    card.appendChild(swatch);

    const info = document.createElement('div');
    info.className = 'color-info';
    const title = document.createElement('strong');
    title.textContent = color.hex;
    info.appendChild(title);

    const rgb = hexToRgb(color.hex);
    const hsl = rgbToHsl(rgb);
    const cmyk = rgbToCmyk(rgb);

    const metaList = [
      `RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`,
      `HSL ${hsl.h}, ${hsl.s}%, ${hsl.l}%`,
      `CMYK ${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`,
      approximateName(color.hex),
    ];
    metaList.forEach((text) => {
      const span = document.createElement('span');
      span.textContent = text;
      info.appendChild(span);
    });

    const actions = document.createElement('div');
    actions.className = 'color-actions';
    const copyHex = document.createElement('button');
    copyHex.textContent = 'Copy HEX';
    copyHex.dataset.action = 'copy-hex';
    const copyRgb = document.createElement('button');
    copyRgb.textContent = 'Copy RGB';
    copyRgb.dataset.action = 'copy-rgb';
    const copyHsl = document.createElement('button');
    copyHsl.textContent = 'Copy HSL';
    copyHsl.dataset.action = 'copy-hsl';
    const copyCmyk = document.createElement('button');
    copyCmyk.textContent = 'Copy CMYK';
    copyCmyk.dataset.action = 'copy-cmyk';
    const lockBtn = document.createElement('button');
    lockBtn.textContent = color.locked ? 'Unlock' : 'Lock';
    lockBtn.dataset.action = 'toggle-lock';
    lockBtn.className = 'lock-btn';
    lockBtn.setAttribute('aria-pressed', color.locked);
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.action = 'delete-color';

    actions.append(copyHex, copyRgb, copyHsl, copyCmyk, lockBtn, deleteBtn);
    info.appendChild(actions);
    card.appendChild(info);

    container.appendChild(card);
  });
}

export function renderLibrary(container, palettes) {
  container.innerHTML = '';
  if (!palettes.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No palettes saved yet.';
    container.appendChild(empty);
    return;
  }
  palettes.forEach((palette) => {
    const card = document.createElement('article');
    card.className = 'palette-card';
    card.dataset.id = palette.id;
    const name = document.createElement('h3');
    name.textContent = palette.name;
    card.appendChild(name);
    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    (palette.tags || []).forEach((tag) => {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = tag;
      tagList.appendChild(badge);
    });
    if (tagList.childNodes.length) {
      card.appendChild(tagList);
    }

    const swatches = document.createElement('div');
    swatches.className = 'swatches';
    palette.colors.forEach((hex) => {
      const swatch = document.createElement('span');
      swatch.style.background = hex;
      swatch.title = hex;
      swatches.appendChild(swatch);
    });
    card.appendChild(swatches);

    const actions = document.createElement('div');
    actions.className = 'color-actions';
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.dataset.action = 'load-palette';
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.action = 'delete-palette';
    actions.append(loadBtn, deleteBtn);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

export function renderPreview(container, palette) {
  container.innerHTML = '';
  const [primary = '#6C5CE7', secondary = '#00B894', accent = '#FFE66D', neutral = '#1F2933'] = palette;
  const cards = [
    {
      title: 'Landing Hero',
      description: 'Primary call to action and hero background using the palette.',
      background: `linear-gradient(135deg, ${primary}, ${accent})`,
      text: '#ffffff',
      buttonBg: secondary,
      buttonColor: '#ffffff',
    },
    {
      title: 'Dashboard Widget',
      description: 'Neutral card with accent headline and subtle button.',
      background: '#ffffff',
      text: neutral,
      buttonBg: accent,
      buttonColor: '#111827',
      border: primary,
    },
    {
      title: 'Marketing Banner',
      description: 'Bold gradient background with high-contrast callout.',
      background: `linear-gradient(160deg, ${secondary}, ${primary})`,
      text: '#ffffff',
      buttonBg: '#ffffff',
      buttonColor: primary,
    },
  ];

  cards.forEach((card) => {
    const element = document.createElement('div');
    element.className = 'preview-card';
    element.style.background = card.background;
    if (card.border) {
      element.style.border = `2px solid ${card.border}`;
    }
    element.style.color = card.text;
    const heading = document.createElement('h4');
    heading.textContent = card.title;
    const copy = document.createElement('p');
    copy.textContent = card.description;
    const button = document.createElement('button');
    button.className = 'btn primary';
    button.textContent = 'Action';
    button.style.background = card.buttonBg;
    button.style.color = card.buttonColor;
    element.append(heading, copy, button);
    container.appendChild(element);
  });
}

export function renderContrastGrid(container, palette, contrastFn) {
  container.innerHTML = '';
  for (let i = 0; i < palette.length; i += 1) {
    for (let j = i + 1; j < palette.length; j += 1) {
      const hexA = palette[i];
      const hexB = palette[j];
      const ratio = contrastFn(hexA, hexB);
      const item = document.createElement('div');
      item.className = 'contrast-item';
      const heading = document.createElement('strong');
      heading.textContent = `${hexA} vs ${hexB}`;
      const sample = document.createElement('div');
      sample.className = 'sample';
      const textSample = document.createElement('span');
      textSample.style.background = hexA;
      textSample.style.color = hexB;
      textSample.textContent = 'Aa';
      const textSampleInverse = document.createElement('span');
      textSampleInverse.style.background = hexB;
      textSampleInverse.style.color = hexA;
      textSampleInverse.textContent = 'Aa';
      sample.append(textSample, textSampleInverse);
      const ratioInfo = document.createElement('span');
      ratioInfo.textContent = `Contrast Ratio: ${ratio}`;
      const badge = document.createElement('span');
      badge.className = 'badge';
      const passesAA = ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail';
      const passesAAA = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AAA Large' : '';
      badge.textContent = [passesAA, passesAAA].filter(Boolean).join(' · ') || 'Below AA';
      item.append(heading, sample, ratioInfo, badge);
      container.appendChild(item);
    }
  }
}

export function renderShadeTintGrid(container, hex) {
  container.innerHTML = '';
  const rgb = hexToRgb(hex);
  const toHex = (factor) => {
    const mix = (channel) => Math.round(channel + (255 - channel) * factor);
    return rgbToHex({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) });
  };
  const toShade = (factor) => {
    const mix = (channel) => Math.round(channel * (1 - factor));
    return rgbToHex({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) });
  };

  const variations = [
    { label: 'Shade 30%', hex: toShade(0.3) },
    { label: 'Shade 15%', hex: toShade(0.15) },
    { label: 'Base', hex },
    { label: 'Tint 15%', hex: toHex(0.15) },
    { label: 'Tint 30%', hex: toHex(0.3) },
  ];

  variations.forEach((variant) => {
    const button = document.createElement('button');
    button.style.background = variant.hex;
    button.dataset.hex = variant.hex;
    button.title = variant.label;
    container.appendChild(button);
  });
}
