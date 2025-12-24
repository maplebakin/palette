import {
  formatHex,
  formatRgb,
  modeOklch,
  modeRgb,
  parse,
  converter,
  type Color,
} from 'culori';

const oklch = converter('oklch');
const rgb = converter('rgb');

export function createHarmony(baseColor: Color, harmony: { mode: string, reverse?: boolean }): Color[] {
  const baseOklch = oklch(baseColor);
  if (!baseOklch) throw new Error('Invalid base color for harmony generation.');

  const hues: number[] = [baseOklch.h || 0];
  const count = 5;
  const step = 360 / 12;

  switch (harmony.mode) {
    case 'complementary':
      hues.push(hues[0] + 180);
      break;
    case 'analogous':
      hues.push(hues[0] - step, hues[0] + step);
      break;
    case 'triadic':
      hues.push(hues[0] + 120, hues[0] + 240);
      break;
    case 'split-complementary':
      hues.push(hues[0] + 180 - step, hues[0] + 180 + step);
      break;
    case 'rectangle':
      hues.push(hues[0] + step * 2, hues[0] + 180, hues[0] + 180 + step * 2);
      break;
    case 'square':
      hues.push(hues[0] + 90, hues[0] + 180, hues[0] + 270);
      break;
    default: // default to analogous
      hues.push(hues[0] - step, hues[0] + step);
      break;
  }

  const uniqueHues = [...new Set(hues)].sort((a, b) => a - b);
  const finalHues = harmony.reverse ? uniqueHues.reverse() : uniqueHues;

  return finalHues.map(h => ({
      ...baseOklch,
      h: (h + 360) % 360,
    }));
}

export function adjustLuminance(color: Color, adjustment: number): Color {
  const oklchColor = oklch(color);
  return {
    ...oklchColor,
    l: Math.max(0, Math.min(1, oklchColor.l * adjustment)),
  };
}

export function adjustChroma(color: Color, adjustment: number): Color {
  const oklchColor = oklch(color);
  return {
    ...oklchColor,
    c: Math.max(0, oklchColor.c * adjustment),
  };
}

export function adjustHue(color: Color, adjustment: number): Color {
    const oklchColor = oklch(color);
    return {
        ...oklchColor,
        h: ((oklchColor.h || 0) + adjustment + 360) % 360,
    }
}

export function getDisplayColor(color: Color, printMode: 'oklab' | 'rgb' = 'rgb'): Color {
    if (printMode === 'oklab') {
        const oklchColor = oklch(color);
        return {
            mode: 'oklch',
            l: oklchColor.l,
            c: oklchColor.c,
            h: oklchColor.h,
        };
    }
    return rgb(color);
}

export const colorToHex = (color: Color): string => formatHex(color);
export const colorToRgbString = (color: Color): string => formatRgb(color);

export function isValidHex(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  const stripped = hex.startsWith('#') ? hex.substring(1) : hex;
  return [3, 4, 6, 8].includes(stripped.length) && !isNaN(parseInt(stripped, 16));
}

export function parseColor(hex: string): Color | null {
    if (!isValidHex(hex)) return null;
    return parse(hex) || null;
}
