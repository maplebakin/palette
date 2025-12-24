import {
  type Color,
  converter,
  wcagLuminance
} from 'culori';
import { type Config, type Token, type TokenGroup } from './types';
import {
  adjustChroma,
  adjustHue,
  adjustLuminance,
  colorToHex,
  createHarmony,
  getDisplayColor,
  parseColor,
} from './colorUtils';

const oklch = converter('oklch');

const TOKEN_CATEGORIES = {
  'neutral': { type: 'color', figmaType: 'color', comment: 'Core neutral semantic color tokens' },
  'primary': { type: 'color', figmaType: 'color', comment: 'Core primary semantic color tokens' },
  'secondary': { type: 'color', figmaType: 'color', comment: 'Core secondary semantic color tokens' },
  'accent': { type: 'color', figmaType: 'color', comment: 'Core accent semantic color tokens' },
  'danger': { type: 'color', figmaType: 'color', comment: 'Core danger semantic color tokens for errors and warnings' },
  'info': { type: 'color', figmaType: 'color', comment: 'Core info semantic color tokens for informational messages' },
  'success': { type: 'color', figmaType: 'color', comment: 'Core success semantic color tokens for success states' },
  'warning': { type: 'color', figmaType: 'color', comment: 'Core warning semantic color tokens for warnings' },
};

function generateColorFamily(
    base: Color,
    printMode: 'oklab' | 'rgb',
    sliders: { l: number, c: number }
): Token[] {
  const baseOklch = oklch(base);
  const steps = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
  
  return steps.map(step => {
    const adjustedL = baseOklch.l > 0.4 ? (1 - step) : step;
    const lum = adjustLuminance(base, (adjustedL / baseOklch.l) * sliders.l);
    const finalColor = adjustChroma(lum, sliders.c);
    
    return {
      name: (1000 - Math.round(step * 1000)).toString(),
      path: [], // will be set later
      value: colorToHex(finalColor),
      originalValue: colorToHex(finalColor),
      type: 'color',
      figmaType: 'color',
      color: finalColor,
      displayColor: getDisplayColor(finalColor, printMode),
    };
  });
}

export function autoTuneContrast(fgToken: Token, bgToken: Token, targetRatio: number, printMode: 'oklab' | 'rgb'): [Token, Token] {
    let newFg = oklch(fgToken.color);
    let newBg = oklch(bgToken.color);

    let currentContrast = (Math.max(wcagLuminance(newFg), wcagLuminance(newBg)) + 0.05) / (Math.min(wcagLuminance(newFg), wcagLuminance(newBg)) + 0.05);

    if (currentContrast >= targetRatio) {
        return [fgToken, bgToken];
    }

    const maxIterations = 20;
    let iteration = 0;

    const fgIsLighter = wcagLuminance(newFg) > wcagLuminance(newBg);

    while (currentContrast < targetRatio && iteration < maxIterations) {
        if (fgIsLighter) {
            newFg = { ...newFg, l: Math.min(1, newFg.l + 0.05) };
            newBg = { ...newBg, l: Math.max(0, newBg.l - 0.05) };
        } else {
            newBg = { ...newBg, l: Math.min(1, newBg.l + 0.05) };
            newFg = { ...newFg, l: Math.max(0, newFg.l - 0.05) };
        }
        
        currentContrast = (Math.max(wcagLuminance(newFg), wcagLuminance(newBg)) + 0.05) / (Math.min(wcagLuminance(newFg), wcagLuminance(newBg)) + 0.05);
        iteration++;
    }
    
    const finalFg: Token = {
        ...fgToken,
        color: newFg,
        value: colorToHex(newFg),
        displayColor: getDisplayColor(newFg, printMode)
    };
    const finalBg: Token = {
        ...bgToken,
        color: newBg,
        value: colorToHex(newBg),
        displayColor: getDisplayColor(newBg, printMode)
    };

    return [finalFg, finalBg];
}


export function generateTokens(config: Config): TokenGroup {
  const { baseHex, harmony, sliders, light, dark, printMode, lockContrast, contrastTarget } = config;

  const baseColor = parseColor(baseHex);
  if (!baseColor) throw new Error('Invalid base hex color provided.');
  
  const harmonyColors = createHarmony(baseColor, harmony);

  const tokenSetup = {
    neutral: harmonyColors[0],
    primary: harmonyColors[1] || harmonyColors[0],
    secondary: harmonyColors[2] || harmonyColors[0],
    accent: harmonyColors[3] || harmonyColors[1] || harmonyColors[0],
    danger: { ...oklch(harmonyColors[0]), h: 20 },
    warning: { ...oklch(harmonyColors[0]), h: 60 },
    info: { ...oklch(harmonyColors[0]), h: 250 },
    success: { ...oklch(harmonyColors[0]), h: 145 },
  };

  const tokens: TokenGroup = {};

  for (const [category, color] of Object.entries(tokenSetup)) {
    const catSliders = {
        l: sliders.l * (category.match(/neutral|primary/) ? light.l : dark.l),
        c: sliders.c * (category.match(/neutral|primary/) ? light.c : dark.c),
        h: sliders.h * (category.match(/neutral|primary/) ? light.h : dark.h),
        s: sliders.s * (category.match(/neutral|primary/) ? light.s : dark.s),
    };
    
    const adjustedHueColor = adjustHue(color, catSliders.h);
    const family = generateColorFamily(adjustedHueColor, printMode, catSliders);

    const categoryTokens: TokenGroup = {};
    for (const token of family) {
      token.path = [category, token.name];
      categoryTokens[token.name] = token;
    }
    
    tokens[category] = {
        ...TOKEN_CATEGORIES[category as keyof typeof TOKEN_CATEGORIES],
        ...categoryTokens,
    };
  }
  
    // Post-process for contrast locking if enabled
    if (lockContrast) {
        // Example: Lock contrast for a primary button
        const buttonToken = tokens.primary['500'] as Token;
        const buttonTextToken = tokens.neutral['50'] as Token;
        const [newText, newBg] = autoTuneContrast(buttonTextToken, buttonToken, contrastTarget, printMode);
        tokens.primary['500'] = newBg;
        tokens.neutral['50'] = newText;

        // Example: Lock contrast for body text on background
        const bodyText = tokens.neutral['950'] as Token;
        const bodyBg = tokens.neutral['50'] as Token;
        const [newBodyText, newBodyBg] = autoTuneContrast(bodyText, bodyBg, contrastTarget, printMode);
        tokens.neutral['950'] = newBodyText;
        tokens.neutral['50'] = newBodyBg;
    }

  return tokens;
}
