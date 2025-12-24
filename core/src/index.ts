import { type Config, type Outputs } from './types';
import { generateTokens, autoTuneContrast } from './tokens';
import { buildFigmaTokens, buildVscodeTheme } from './payloads';
import { validateConfig, DEFAULT_CONFIG } from './config';
import { randomizeConfig } from './randomization';

export function generate(config: Partial<Config>): Outputs {
  const validated = validateConfig(config);
  const tokens = generateTokens(validated);

  const vscodeTheme = buildVscodeTheme(tokens, 'Apocapalette');
  const figmaTokens = buildFigmaTokens(tokens);

  return {
    tokens,
    vscodeTheme,
    figmaTokens,
  };
}

export * from './types';
export {
    validateConfig,
    DEFAULT_CONFIG,
    randomizeConfig,
    generateTokens,
    autoTuneContrast,
    buildFigmaTokens,
    buildVscodeTheme,
    // color utils
    createHarmony,
    adjustLuminance,
    adjustChroma,
    adjustHue,
    getDisplayColor,
    colorToHex,
    colorToRgbString,
    isValidHex,
    parseColor
};
