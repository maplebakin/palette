import { type Config, type Harmony, type Sliders } from './types';
import { isValidHex, parseColor } from './colorUtils';

export const DEFAULT_BASE_HEX = '#007bff';

export const DEFAULT_HARMONY: Harmony = {
  mode: 'complementary',
  reverse: false,
};

export const DEFAULT_SLIDERS: Sliders = {
  h: 1,
  s: 1,
  l: 1,
  c: 1,
};

export const DEFAULT_CONFIG: Config = {
  baseHex: DEFAULT_BASE_HEX,
  harmony: DEFAULT_HARMONY,
  sliders: DEFAULT_SLIDERS,
  light: DEFAULT_SLIDERS,
  dark: DEFAULT_SLIDERS,
  printMode: 'rgb',
  lockContrast: false,
  contrastTarget: 4.5,
};

export function validateConfig(config: Partial<Config>): Config {
    const validatedConfig = { ...DEFAULT_CONFIG, ...config };

    if (!isValidHex(validatedConfig.baseHex) || !parseColor(validatedConfig.baseHex)) {
        validatedConfig.baseHex = DEFAULT_BASE_HEX;
    }

    validatedConfig.harmony = { ...DEFAULT_HARMONY, ...config.harmony };
    validatedConfig.sliders = { ...DEFAULT_SLIDERS, ...config.sliders };
    validatedConfig.light = { ...DEFAULT_SLIDERS, ...config.light };
    validatedConfig.dark = { ...DEFAULT_SLIDERS, ...config.dark };
    validatedConfig.contrastTarget = Math.max(1, Math.min(21, validatedConfig.contrastTarget || DEFAULT_CONFIG.contrastTarget));
    
    return validatedConfig;
}
