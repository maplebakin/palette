import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, parseColor } from './colorConversion.js';

/**
 * colorTheory.js
 * Contains palette generation algorithms based on color theory relationships.
 * Each generator returns an array of HEX strings.
 */

const deg = (h) => ((h % 360) + 360) % 360;

/**
 * Rotate hue by a given amount.
 */
const rotateHue = (hex, amount) => {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ h: deg(h + amount), s, l }));
};

/**
 * Shift lightness slightly to create shades/tints.
 */
const shiftLightness = (hex, delta) => {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ h, s, l: Math.max(0, Math.min(100, l + delta)) }));
};

const randomGoldenRatio = (() => {
  const phi = 0.618033988749895;
  let seed = Math.random();
  return () => {
    seed += phi;
    seed %= 1;
    return seed;
  };
})();

const aiPleasantHues = [
  [12, 58, 92, 196],
  [42, 180, 284],
  [322, 28, 194],
  [11, 138, 265],
  [310, 44, 120, 220],
];

function generateMonochromatic(base, count) {
  const { h, s, l } = rgbToHsl(hexToRgb(base));
  const result = new Set([base]);
  const spread = 12;
  let step = 1;
  while (result.size < count) {
    result.add(rgbToHex(hslToRgb({ h, s, l: Math.max(0, Math.min(100, l + spread * step)) })));
    if (result.size >= count) break;
    result.add(rgbToHex(hslToRgb({ h, s, l: Math.max(0, Math.min(100, l - spread * step)) })));
    step += 1;
  }
  return Array.from(result).slice(0, count);
}

function generateAnalogous(base, count) {
  const { h, s, l } = rgbToHsl(hexToRgb(base));
  const spacing = 360 / Math.max(count, 3);
  return Array.from({ length: count }, (_, idx) => rgbToHex(hslToRgb({ h: deg(h + (idx - Math.floor(count / 2)) * spacing), s, l })));
}

function generateComplementary(base, count) {
  const complement = rotateHue(base, 180);
  const palette = [base, complement];
  let idx = 1;
  while (palette.length < count) {
    palette.push(shiftLightness(palette[idx % 2], (idx % 4 < 2 ? 12 : -12) * Math.ceil(idx / 2)));
    idx += 1;
  }
  return palette.slice(0, count);
}

function generateSplitComplementary(base, count) {
  const palette = [base];
  palette.push(rotateHue(base, 150));
  palette.push(rotateHue(base, -150));
  while (palette.length < count) {
    palette.push(shiftLightness(palette[palette.length % 3], palette.length % 2 === 0 ? 10 : -10));
  }
  return palette.slice(0, count);
}

function generateTriadic(base, count) {
  const palette = [base, rotateHue(base, 120), rotateHue(base, 240)];
  while (palette.length < count) {
    palette.push(shiftLightness(palette[palette.length % 3], palette.length % 2 === 0 ? 12 : -12));
  }
  return palette.slice(0, count);
}

function generateTetradic(base, count) {
  const palette = [base];
  const increments = [90, 180, 270];
  for (const inc of increments) {
    palette.push(rotateHue(base, inc));
  }
  while (palette.length < count) {
    palette.push(shiftLightness(palette[palette.length % 4], palette.length % 2 === 0 ? 14 : -14));
  }
  return palette.slice(0, count);
}

function generateRandom(count) {
  const colors = [];
  for (let i = 0; i < count; i += 1) {
    const hue = randomGoldenRatio() * 360;
    const saturation = 0.45 + randomGoldenRatio() * 0.45;
    const lightness = 0.4 + randomGoldenRatio() * 0.35;
    colors.push(
      rgbToHex(
        hslToRgb({
          h: hue,
          s: Math.round(saturation * 100),
          l: Math.round(lightness * 100),
        })
      )
    );
  }
  return colors;
}

function generateAiInspired(base, count) {
  const baseHsl = rgbToHsl(hexToRgb(base));
  const palette = new Set([base]);
  const candidates = aiPleasantHues[Math.floor(randomGoldenRatio() * aiPleasantHues.length)];
  const offset = randomGoldenRatio() * 360;
  for (const hue of candidates) {
    const generated = rgbToHex(
      hslToRgb({ h: deg(hue + offset), s: Math.max(35, baseHsl.s), l: Math.min(65, Math.max(35, baseHsl.l)) })
    );
    palette.add(generated);
  }
  const paletteArr = Array.from(palette);
  let idx = 0;
  while (paletteArr.length < count) {
    const source = paletteArr[idx % paletteArr.length];
    paletteArr.push(shiftLightness(source, idx % 2 === 0 ? 10 : -10));
    idx += 1;
  }
  return paletteArr.slice(0, count);
}

/**
 * Extract dominant colors from an image using a lightweight quantization.
 * Uses median-cut style bucketing for performance on client devices.
 * @param {HTMLImageElement} img
 * @param {number} count
 * @returns {Promise<string[]>}
 */
export function extractFromImage(img, count = 5) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      resolve(Array.from({ length: count }, () => '#808080'));
      return;
    }
    const width = (canvas.width = 200);
    const ratio = img.width ? img.height / img.width : 1;
    const height = (canvas.height = Math.max(1, Math.round(ratio * 200)));
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = `${Math.round(r / 16)}-${Math.round(g / 16)}-${Math.round(b / 16)}`;
      const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
    const sorted = Array.from(buckets.values())
      .filter((bucket) => bucket.count > 10)
      .sort((a, b) => b.count - a.count)
      .slice(0, count);

    const colors = sorted.map((bucket) =>
      rgbToHex({
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      })
    );
    while (colors.length < count) {
      colors.push(colors[colors.length - 1] || '#808080');
    }
    resolve(colors);
  });
}

/**
 * General palette builder orchestrating locked colors.
 * @param {string} mode
 * @param {string} base
 * @param {number} count
 * @param {string[]} lockedColors
 * @returns {string[]}
 */
export function generatePalette(mode, base, count, lockedColors = []) {
  const normalizedBase = parseColor(base);
  let generated = [];
  switch (mode) {
    case 'analogous':
      generated = generateAnalogous(normalizedBase, count);
      break;
    case 'complementary':
      generated = generateComplementary(normalizedBase, count);
      break;
    case 'split-complementary':
      generated = generateSplitComplementary(normalizedBase, count);
      break;
    case 'triadic':
      generated = generateTriadic(normalizedBase, count);
      break;
    case 'tetradic':
      generated = generateTetradic(normalizedBase, count);
      break;
    case 'random':
      generated = generateRandom(count);
      break;
    case 'ai':
      generated = generateAiInspired(normalizedBase, count);
      break;
    case 'monochromatic':
    default:
      generated = generateMonochromatic(normalizedBase, count);
      break;
  }

  if (lockedColors.length) {
    const palette = [...generated];
    lockedColors.forEach(({ index, hex }) => {
      if (index < palette.length) {
        palette[index] = hex;
      }
    });
    return palette;
  }
  return generated;
}

export default {
  generatePalette,
  extractFromImage,
};
