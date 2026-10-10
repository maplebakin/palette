// Validate the actual files offered as a paid marketplace kit.
// This code deliberately calculates contrast separately from the palette engine.
const HEX = /^#[0-9a-f]{6}$/i;
const REQUIRED_PAIRS = [
  ['body / background', 'typography-text-body', 'surfaces-background', 7],
  ['body / card', 'typography-text-body', 'cards-card-panel-surface', 7],
  ['heading / background', 'typography-heading', 'surfaces-background', 7],
  ['heading / card', 'typography-heading', 'cards-card-panel-surface', 7],
  ['muted / background', 'typography-text-muted', 'surfaces-background', 4.5],
  ['muted / card', 'typography-text-muted', 'cards-card-panel-surface', 4.5],
  ['accent / background', 'brand-accent', 'surfaces-background', 4.5],
  ['button label / button', 'actions-primary-foreground', 'actions-primary', 4.5],
];

const rgbBytes = hex => [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16));
const relativeLuminance = hex => {
  const channels = rgbBytes(hex).map(byte => {
    const value = byte / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const wcagRatio = (a, b) => {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

export const auditMarketplaceKitMode = ({ flatTokens, css, gpl, ase, prefix }) => {
  const failures = [];
  const expected = new Map();
  for (const { key, hex } of flatTokens) {
    if (!HEX.test(hex)) failures.push('Invalid hex for ' + key);
    if (expected.has(key)) failures.push('Duplicate flattened token ' + key);
    expected.set(key, hex.toLowerCase());
  }
  if (!expected.size) failures.push('No colour tokens were exported');

  for (const [label, foreground, background, threshold] of REQUIRED_PAIRS) {
    const a = expected.get(foreground);
    const b = expected.get(background);
    if (!a || !b || !HEX.test(a) || !HEX.test(b)) {
      failures.push('Missing required release contrast pair: ' + label);
      continue;
    }
    const ratio = wcagRatio(a, b);
    if (ratio < threshold) {
      failures.push(label + ' is ' + ratio.toFixed(2) + ':1 (needs ' + threshold + ':1)');
    }
  }

  const cssValues = new Map();
  for (const match of css.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (cssValues.has(match[1])) failures.push('Duplicate CSS variable ' + match[1]);
    cssValues.set(match[1], match[2].toLowerCase());
  }
  for (const [key, hex] of expected) {
    if (cssValues.get(prefix + '-' + key) !== hex) failures.push('CSS mismatch: ' + key);
  }
  if (cssValues.size !== expected.size) failures.push('CSS token count differs from JSON tokens');

  const gplColors = new Map();
  if (!gpl.startsWith('GIMP Palette\n')) failures.push('GPL header missing');
  for (const line of gpl.split(/\r?\n/).slice(4)) {
    if (!line.trim()) continue;
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) { failures.push('Unparseable GPL swatch'); continue; }
    const hex = '#' + match.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
    if (gplColors.has(match[4])) failures.push('Duplicate GPL swatch ' + match[4]);
    gplColors.set(match[4], hex);
  }
  for (const [key, hex] of expected) {
    if (gplColors.get(key) !== hex) failures.push('GPL mismatch: ' + key);
  }
  if (gplColors.size !== expected.size) failures.push('GPL swatch count differs from JSON tokens');

  // Independently parse ASEF block count, UTF-16BE names and 32-bit RGB channels.
  try {
    const bytes = ase instanceof Uint8Array ? ase : new Uint8Array(ase);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = String.fromCharCode(...bytes.slice(0, 4));
    if (magic !== 'ASEF') throw new Error('Invalid ASE header');
    const blockCount = view.getUint32(8, false);
    if (blockCount !== expected.size) failures.push('ASE swatch count differs from JSON tokens');
    const aseColors = new Map();
    let offset = 12;
    for (let i = 0; i < blockCount; i += 1) {
      const type = view.getUint16(offset, false);
      const size = view.getUint32(offset + 2, false);
      const end = offset + 6 + size;
      if (type !== 0xc001 || end > bytes.length) throw new Error('Invalid ASE block');
      let cursor = offset + 6;
      const nameLength = view.getUint16(cursor, false);
      cursor += 2;
      let name = '';
      for (let j = 0; j < nameLength - 1; j += 1) {
        name += String.fromCharCode(view.getUint16(cursor, false));
        cursor += 2;
      }
      cursor += 2;
      const model = String.fromCharCode(...bytes.slice(cursor, cursor + 4));
      cursor += 4;
      if (model !== 'RGB ') throw new Error('Non-RGB ASE block');
      const channels = [0, 1, 2].map(index => Math.round(view.getFloat32(cursor + index * 4, false) * 255));
      if (channels.some(value => value < 0 || value > 255)) throw new Error('Invalid ASE channel');
      const hex = '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('');
      if (aseColors.has(name)) failures.push('Duplicate ASE swatch ' + name);
      aseColors.set(name, hex);
      offset = end;
    }
    if (offset !== bytes.length) failures.push('Unexpected bytes after ASE blocks');
    for (const [key, hex] of expected) {
      if (aseColors.get(key) !== hex) failures.push('ASE mismatch: ' + key);
    }
  } catch (error) {
    failures.push('ASE parse error: ' + error.message);
  }

  if (failures.length) {
    throw new Error('Marketplace kit release QA failed: ' + failures.slice(0, 12).join('; '));
  }
  return { tokenCount: expected.size, checkedPairs: REQUIRED_PAIRS.length };
};
