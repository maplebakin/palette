import { type Config, type Harmony } from './types';
import { DEFAULT_CONFIG } from './config';

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const HARMONY_MODES: Harmony['mode'][] = [
  'complementary',
  'analogous',
  'triadic',
  'split-complementary',
  'rectangle',
  'square',
];

export function randomizeConfig(partialConfig?: Partial<Config>): Config {
  const randomHue = random(0, 360);
  const randomSaturation = random(0.4, 1);
  const randomLightness = random(0.4, 0.8);

  // Simple HSL to Hex conversion for randomization
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const baseHex = hslToHex(randomHue, randomSaturation * 100, randomLightness * 100);

  const harmony: Harmony = {
    mode: HARMONY_MODES[Math.floor(Math.random() * HARMONY_MODES.length)],
    reverse: Math.random() > 0.5,
  };

  const newConfig: Config = {
    ...DEFAULT_CONFIG,
    ...partialConfig,
    baseHex,
    harmony,
    sliders: {
      h: random(0.8, 1.2),
      s: random(0.8, 1.2),
      l: random(0.8, 1.2),
      c: random(0.8, 1.2),
    },
    light: {
        h: random(0.8, 1.2),
        s: random(0.8, 1.2),
        l: random(0.8, 1.2),
        c: random(0.8, 1.2),
    },
    dark: {
        h: random(0.8, 1.2),
        s: random(0.8, 1.2),
        l: random(0.8, 1.2),
        c: random(0.8, 1.2),
    },
  };

  return newConfig;
}
