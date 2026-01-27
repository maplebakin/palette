/**
 * Generates a DesignSpace-compatible palette from a seed color.
 * Print-friendly, accessible, and ritualistic/mystical in tone.
 */

// --- Inline Helper Functions ---

function hexToHsl(hex) {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;

  const num = parseInt(expanded, 16);
  let r = ((num >> 16) & 255) / 255;
  let g = ((num >> 8) & 255) / 255;
  let b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLuminance(hex) {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;

  const num = parseInt(expanded, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const toLinear = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrast(fg, bg) {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function adjustLightnessForContrast(baseHsl, bgHex, targetContrast, direction = 'auto') {
  const bgLum = getLuminance(bgHex);
  let { h, s, l } = baseHsl;

  // Determine direction if auto
  if (direction === 'auto') {
    direction = bgLum > 0.5 ? 'darken' : 'lighten';
  }

  const step = direction === 'darken' ? -2 : 2;
  const limit = direction === 'darken' ? 5 : 95;

  let candidate = hslToHex(h, s, l);
  let iterations = 0;
  const maxIterations = 50;

  while (getContrast(candidate, bgHex) < targetContrast && iterations < maxIterations) {
    l += step;
    if ((direction === 'darken' && l <= limit) || (direction === 'lighten' && l >= limit)) {
      break;
    }
    candidate = hslToHex(h, s, l);
    iterations++;
  }

  return candidate;
}

function createWarmGray(lightness, saturation = 8) {
  // Warm gray with a slight amber/sepia undertone (hue ~30-40)
  const warmHue = 35;
  return hslToHex(warmHue, saturation, lightness);
}

// --- Main Generator Function ---

export function generateDesignSpacePalette(seedColor) {
  const seed = hexToHsl(seedColor);

  // Canvas and surface backgrounds - warm off-whites with mystical warmth
  // Using parchment-like tones for print-friendliness
  const canvasBackground = createWarmGray(97, 12);      // Very light warm cream
  const panelBackground = createWarmGray(94, 10);       // Slightly darker warm
  const surfaceBackground = createWarmGray(99, 8);      // Near white with warmth

  // Brand colors derived from seed using split-complementary for mystical harmony
  const brandPrimary = seedColor;

  // Split-complementary: shift hue by ~150° and ~210° for ethereal harmony
  const brandSecondary = hslToHex(
    (seed.h + 150) % 360,
    Math.min(seed.s * 0.85, 65),  // Slightly desaturated for print
    Math.max(35, Math.min(55, seed.l))
  );

  const brandAccent = hslToHex(
    (seed.h + 210) % 360,
    Math.min(seed.s * 0.9, 70),
    Math.max(40, Math.min(60, seed.l * 1.1))
  );

  // Text colors - ensure accessibility
  const textPrimaryBase = { h: 30, s: 25, l: 15 }; // Deep warm brown-black
  const textPrimary = adjustLightnessForContrast(
    textPrimaryBase,
    canvasBackground,
    4.5,
    'darken'
  );

  const textSecondary = hslToHex(30, 15, 40); // Muted warm gray for secondary text

  // Text on brand - ensure sufficient contrast against brandPrimary
  const brandLum = getLuminance(brandPrimary);
  const textOnBrand = brandLum > 0.4
    ? hslToHex(30, 20, 12)   // Dark warm text for light brands
    : hslToHex(40, 15, 96);  // Light warm text for dark brands

  // Interactive states - derived from brand with adjusted intensity
  const interactiveDefault = hslToHex(seed.h, Math.min(seed.s, 60), 45);
  const interactiveHover = hslToHex(seed.h, Math.min(seed.s * 1.1, 70), 38);
  const interactiveActive = hslToHex(seed.h, Math.min(seed.s * 1.15, 75), 32);

  // Status colors - mystical but functional, print-friendly
  // Using earthy, alchemical tones rather than harsh primaries
  const statusSuccess = hslToHex(145, 45, 38);   // Deep forest/herb green
  const statusWarning = hslToHex(38, 75, 45);    // Amber/goldenrod
  const statusError = hslToHex(8, 60, 42);       // Burnt sienna/oxide red

  // Neutrals - all warm grays for consistency
  const neutralBorder = createWarmGray(78, 10);
  const neutralDivider = createWarmGray(88, 8);
  const neutralDisabled = createWarmGray(70, 6);

  // Shadows - dark warm grays (simulating transparency with darker hex)
  // shadow100 is lighter (simulates higher transparency)
  // shadow200 is darker (simulates lower transparency)
  const neutralShadow100 = createWarmGray(55, 12);  // ~30% opacity simulation
  const neutralShadow200 = createWarmGray(35, 15);  // ~50% opacity simulation

  return {
    canvasBackground,
    panelBackground,
    surfaceBackground,
    textPrimary,
    textSecondary,
    textOnBrand,
    brandPrimary,
    brandSecondary,
    brandAccent,
    interactiveDefault,
    interactiveHover,
    interactiveActive,
    statusSuccess,
    statusWarning,
    statusError,
    neutralBorder,
    neutralDivider,
    neutralDisabled,
    neutralShadow100,
    neutralShadow200,
    name: 'Apocapalette Theme',
    mode: 'light',
  };
}
