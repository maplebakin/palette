import { hexToHsl, hslToHex, normalizeHex } from '../colorUtils';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrapHue = (value) => ((value % 360) + 360) % 360;

const createSeededRandom = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const between = (rng, min, max) => min + (max - min) * rng();
const jitter = (rng, center, range) => center + (rng() * 2 - 1) * range;

const MIN_HUE_DISTANCE = 24;

const hueDistance = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

const isHueDistinct = (hue, hues, minDistance = MIN_HUE_DISTANCE) => (
  hues.every((existing) => hueDistance(existing, hue) >= minDistance)
);


const shuffle = (items, rng) => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

const getAdjacentOffsets = (type) => {
  switch (type) {
    case 'warm-drift':
      return [18, 34, 52];
    case 'cool-drift':
      return [-18, -34, -52];
    case 'deep':
      return [22, -28, 40];
    case 'bright':
      return [18, -18, 36];
    case 'smoky':
    default:
      return [16, -18, 32];
  }
};

const getGroundingHue = (type, rng) => {
  switch (type) {
    case 'cool-drift':
      return between(rng, 185, 205);
    case 'warm-drift':
      return between(rng, 95, 130);
    case 'deep':
      return between(rng, 110, 140);
    case 'bright':
      return between(rng, 100, 140);
    case 'smoky':
    default:
      return between(rng, 100, 130);
  }
};

const getCoolHue = (type, rng) => {
  if (type === 'cool-drift') return between(rng, 270, 295);
  if (type === 'warm-drift') return rng() < 0.6 ? between(rng, 200, 225) : between(rng, 270, 295);
  if (type === 'deep') return rng() < 0.5 ? between(rng, 200, 225) : between(rng, 270, 295);
  if (type === 'bright') return between(rng, 200, 230);
  return between(rng, 200, 225);
};

const isNeutralColor = (color) => {
  const { s } = hexToHsl(color);
  return s < 10;
};

const buildAnchorSwatches = (rng, {
  baseHue,
  type,
  satTarget,
  satJitter,
  lightTarget,
  lightJitter,
  count,
  existingHues = [],
}) => {
  const anchorHues = [];
  const jitterHue = (hue) => hue + between(rng, -4, 4);
  const anchorCount = Math.max(1, count);
  const canAdd = (hue) => (
    isHueDistinct(hue, existingHues) && isHueDistinct(hue, anchorHues)
  );

  const tryAdd = (hue) => {
    const wrapped = wrapHue(hue);
    if (!canAdd(wrapped)) return false;
    anchorHues.push(wrapped);
    return true;
  };

  if (anchorCount > 0) {
    tryAdd(jitterHue(baseHue));
  }
  getAdjacentOffsets(type).forEach((offset) => {
    if (anchorHues.length >= anchorCount) return;
    tryAdd(jitterHue(baseHue + offset));
  });

  if (anchorHues.length < anchorCount) {
    tryAdd(getGroundingHue(type, rng));
  }
  if (anchorHues.length < anchorCount) {
    tryAdd(getCoolHue(type, rng));
  }

  const extras = shuffle([60, -60, 90, -90, 120, -120, 150, -150], rng);
  extras.forEach((offset) => {
    if (anchorHues.length >= anchorCount) return;
    tryAdd(jitterHue(baseHue + offset));
  });

  let attempts = 0;
  while (anchorHues.length < anchorCount && attempts < 24) {
    tryAdd(between(rng, 0, 360));
    attempts += 1;
  }

  const swatches = anchorHues.slice(0, anchorCount).map((hue) => {
    const sat = clamp(jitter(rng, satTarget, satJitter), 0, 100);
    const light = clamp(jitter(rng, lightTarget, lightJitter), 0, 100);
    return hslToHex(hue, sat, light);
  });

  return { swatches, hues: anchorHues.slice(0, anchorCount) };
};

const selectSupportingFamilies = (type, rng) => {
  const selected = [];
  const add = (slot) => {
    if (!selected.some((item) => item.family === slot.family)) selected.push(slot);
  };

  switch (type) {
    case 'smoky':
      add({ family: 'neutral', variant: 'smoky-neutral' });
      add({ family: 'blue', variant: 'blue-grey' });
      if (rng() < 0.4) add({ family: 'green', variant: 'sage' });
      break;
    case 'deep': {
      add({ family: 'green', variant: 'forest' });
      add({ family: rng() < 0.5 ? 'blue' : 'purple', variant: 'deep-support' });
      if (rng() < 0.35) add({ family: 'neutral', variant: 'deep-neutral' });
      break;
    }
    case 'warm-drift':
      add({ family: 'green', variant: 'olive' });
      add({ family: 'neutral', variant: 'warm-neutral' });
      if (rng() < 0.45) add({ family: 'blue', variant: 'blue-green' });
      break;
    case 'cool-drift':
      add({ family: 'blue', variant: 'cool-blue' });
      add({ family: 'purple', variant: 'cool-purple' });
      if (rng() < 0.35) add({ family: 'neutral', variant: 'cool-neutral' });
      break;
    case 'bright': {
      add({ family: 'neutral', variant: 'bright-neutral' });
      const primary = rng() < 0.5 ? 'blue' : 'green';
      add({ family: primary, variant: 'bright-support' });
      if (rng() < 0.4) {
        add({ family: primary === 'blue' ? 'green' : 'blue', variant: 'bright-support' });
      }
      break;
    }
    default:
      add({ family: 'neutral', variant: 'neutral' });
      add({ family: 'blue', variant: 'blue-grey' });
      break;
  }

  return selected.slice(0, 3);
};

const buildSupportingColor = (rng, slot, baseHue, usedHues = []) => {
  const { family, variant } = slot;
  let hueMin = 0;
  let hueMax = 360;
  let satMin = 8;
  let satMax = 32;
  let lightMin = 20;
  let lightMax = 52;

  if (family === 'green') {
    hueMin = 90;
    hueMax = 150;
    satMin = 10;
    satMax = 32;
    lightMin = 18;
    lightMax = 48;
    if (variant === 'forest') {
      lightMax = 34;
      satMin = 12;
      satMax = 28;
    }
    if (variant === 'sage') {
      lightMin = 30;
      lightMax = 58;
      satMax = 24;
    }
    if (variant === 'olive') {
      hueMin = 95;
      hueMax = 130;
      lightMax = 44;
      satMax = 28;
    }
  }

  if (family === 'blue') {
    hueMin = 190;
    hueMax = 230;
    satMin = 10;
    satMax = 34;
    lightMin = 22;
    lightMax = 56;
    if (variant === 'blue-grey') {
      satMax = 22;
      lightMin = 30;
      lightMax = 62;
    }
    if (variant === 'blue-green') {
      hueMin = 190;
      hueMax = 210;
      satMax = 28;
      lightMax = 48;
    }
  }

  if (family === 'purple') {
    hueMin = 260;
    hueMax = 300;
    satMin = 12;
    satMax = 36;
    lightMin = 20;
    lightMax = 54;
    if (variant === 'cool-purple') {
      satMax = 38;
      lightMax = 50;
    }
  }

  if (family === 'neutral') {
    hueMin = wrapHue(baseHue + between(rng, -20, 20));
    hueMax = hueMin;
    satMin = 0;
    satMax = 12;
    lightMin = 24;
    lightMax = 82;
  }

  let attempts = 0;
  while (attempts < 12) {
    const hue = hueMin === hueMax ? hueMin : between(rng, hueMin, hueMax);
    if (family === 'neutral' || isHueDistinct(hue, usedHues)) {
      const sat = clamp(between(rng, satMin, satMax), 0, 100);
      const light = clamp(between(rng, lightMin, lightMax), 0, 100);
      return hslToHex(wrapHue(hue), sat, light);
    }
    attempts += 1;
  }
  const fallbackHue = hueMin === hueMax ? hueMin : between(rng, hueMin, hueMax);
  const fallbackSat = clamp(between(rng, satMin, satMax), 0, 100);
  const fallbackLight = clamp(between(rng, lightMin, lightMax), 0, 100);
  return hslToHex(wrapHue(fallbackHue), fallbackSat, fallbackLight);
};

const buildContrastColor = (rng, baseHue) => {
  const offsets = [140, 160, 200, 220];
  const offset = offsets[Math.floor(rng() * offsets.length)] || 160;
  const hue = wrapHue(baseHue + (rng() > 0.5 ? offset : -offset));
  const sat = clamp(between(rng, 16, 38), 0, 100);
  const light = clamp(between(rng, 16, 42), 0, 100);
  return hslToHex(hue, sat, light);
};

const buildNeutralColor = (rng, baseHue, warmthBias = 0) => {
  const hue = wrapHue(baseHue + warmthBias + between(rng, -12, 12));
  const sat = clamp(between(rng, 0, 10), 0, 100);
  const light = clamp(between(rng, 26, 84), 0, 100);
  return hslToHex(hue, sat, light);
};

const addColorWithConstraints = (produceColor, { usedColors, usedHues, enforceHue = true }) => {
  let attempts = 0;
  while (attempts < 12) {
    const color = produceColor();
    if (!color) {
      attempts += 1;
      continue;
    }
    const normalized = normalizeHex(color, color);
    if (usedColors.has(normalized)) {
      attempts += 1;
      continue;
    }
    if (enforceHue && !isNeutralColor(normalized)) {
      const { h } = hexToHsl(normalized);
      if (!isHueDistinct(h, usedHues)) {
        attempts += 1;
        continue;
      }
      usedHues.push(h);
    }
    usedColors.add(normalized);
    return normalized;
  }
  return null;
};

const buildPaletteSpec = (cluster, baseColor, themeMode) => ({
  baseColor,
  mode: cluster.mode,
  themeMode,
  isDark: themeMode === 'dark',
  printMode: false,
  customThemeName: cluster.title,
  harmonyIntensity: cluster.harmonyIntensity,
  apocalypseIntensity: 100,
  neutralCurve: cluster.neutralCurve,
  accentStrength: cluster.accentStrength,
  popIntensity: cluster.popIntensity,
  tokenPrefix: '',
  importedOverrides: null,
});

const buildSlotPlan = (type, rng) => {
  const anchorCount = 4 + Math.floor(rng() * 3);
  const supportingFamilies = selectSupportingFamilies(type, rng).slice(0, 2);
  const requiredCount = 1;
  const contrastCount = 1;
  const remaining = 10 - (requiredCount + anchorCount + supportingFamilies.length + contrastCount);
  const neutralCount = Math.max(0, remaining);

  return {
    anchorCount,
    supportingFamilies,
    neutralCount,
  };
};

const buildSlotsFromPlan = (plan) => {
  const slots = [];
  slots.push({ id: 'required', role: 'required', family: 'required', locked: false, color: null });
  for (let i = 0; i < plan.anchorCount; i += 1) {
    slots.push({ id: `anchor-${i + 1}`, role: 'anchor', family: 'anchor', locked: false, color: null });
  }
  plan.supportingFamilies.forEach((slot, index) => {
    slots.push({
      id: `support-${index + 1}`,
      role: 'supporting',
      family: slot.family,
      variant: slot.variant,
      locked: false,
      color: null,
    });
  });
  for (let i = 0; i < plan.neutralCount; i += 1) {
    slots.push({
      id: `neutral-${i + 1}`,
      role: 'neutral',
      family: 'neutral',
      variant: i === 0 ? 'highlight' : 'shadow',
      locked: false,
      color: null,
    });
  }
  slots.push({ id: 'contrast', role: 'contrast', family: 'contrast', locked: false, color: null });
  return slots;
};

const buildClusterDefinition = (type, base, rng) => {
  switch (type) {
    case 'smoky':
      return {
        id: 'smoky',
        title: 'Smoky',
        description: 'Lower saturation, mid-toned haze.',
        mode: 'Monochromatic',
        hueShift: 0,
        neutralBias: 6,
        satTarget: clamp(base.s * 0.5 + 6, 18, 42),
        lightTarget: clamp(base.l * 0.9 + 8, 42, 60),
        satJitter: 10,
        lightJitter: 8,
        harmonyIntensity: 85,
        neutralCurve: 110,
        accentStrength: 85,
        popIntensity: 80,
      };
    case 'bright':
      return {
        id: 'bright',
        title: 'Bright',
        description: 'High saturation, higher brightness.',
        mode: 'Tertiary',
        hueShift: between(rng, -6, 6),
        neutralBias: 2,
        satTarget: clamp(base.s * 1.15 + 12, 60, 95),
        lightTarget: clamp(base.l * 1.05 + 14, 55, 78),
        satJitter: 12,
        lightJitter: 10,
        harmonyIntensity: 125,
        neutralCurve: 90,
        accentStrength: 120,
        popIntensity: 125,
      };
    case 'deep':
      return {
        id: 'deep',
        title: 'Deep',
        description: 'Lower brightness, grounded saturation.',
        mode: 'Monochromatic',
        hueShift: between(rng, -4, 4),
        neutralBias: -6,
        satTarget: clamp(base.s * 0.7 + 8, 28, 60),
        lightTarget: clamp(base.l * 0.65 - 6, 14, 36),
        satJitter: 10,
        lightJitter: 8,
        harmonyIntensity: 88,
        neutralCurve: 120,
        accentStrength: 90,
        popIntensity: 75,
      };
    case 'warm-drift':
      return {
        id: 'warm-drift',
        title: 'Warm Drift',
        description: 'Hue shifted warmer, soft glow.',
        mode: 'Analogous',
        hueShift: between(rng, 16, 34),
        neutralBias: 12,
        satTarget: clamp(base.s * 0.95 + 10, 42, 78),
        lightTarget: clamp(base.l * 0.95 + 10, 40, 68),
        satJitter: 10,
        lightJitter: 10,
        harmonyIntensity: 112,
        neutralCurve: 100,
        accentStrength: 115,
        popIntensity: 110,
      };
    case 'cool-drift':
      return {
        id: 'cool-drift',
        title: 'Cool Drift',
        description: 'Hue shifted cooler, airy contrast.',
        mode: 'Analogous',
        hueShift: between(rng, -34, -16),
        neutralBias: -12,
        satTarget: clamp(base.s * 0.9 + 6, 34, 72),
        lightTarget: clamp(base.l * 0.9 + 6, 34, 62),
        satJitter: 10,
        lightJitter: 10,
        harmonyIntensity: 110,
        neutralCurve: 105,
        accentStrength: 110,
        popIntensity: 105,
      };
    default:
      return null;
  }
};

const deriveSeed = (seed, salt) => {
  let hash = seed >>> 0;
  for (let i = 0; i < salt.length; i += 1) {
    hash = Math.imul(hash ^ salt.charCodeAt(i), 0x45d9f3b) >>> 0;
  }
  return hash >>> 0;
};

export const getMoodClusterTypes = (options = {}) => {
  const includeCool = options.includeCool ?? true;
  const types = ['smoky', 'bright', 'deep', 'warm-drift'];
  if (includeCool) types.push('cool-drift');
  return types;
};

export const createMoodCluster = (baseHex, requiredHex, type, options = {}) => {
  const seed = Number.isFinite(options.seed) ? options.seed : Date.now();
  const rng = createSeededRandom(seed);
  const safeBase = normalizeHex(baseHex || '#6366f1');
  const base = hexToHsl(safeBase);
  const cluster = buildClusterDefinition(type, base, rng);
  if (!cluster) return null;

  const plan = buildSlotPlan(type, rng);
  const slots = buildSlotsFromPlan(plan);

  return regenerateMoodCluster({
    id: cluster.id,
    type,
    seed,
    title: cluster.title,
    description: cluster.description,
    slots,
    anchorCount: plan.anchorCount,
  }, {
    baseHex: safeBase,
    requiredHex,
    seed,
    forceAll: true,
  });
};

export const regenerateMoodCluster = (cluster, options = {}) => {
  const seed = Number.isFinite(options.seed) ? options.seed : (cluster.seed ?? Date.now());
  const rng = createSeededRandom(seed);
  const safeBase = normalizeHex(options.baseHex || cluster.baseHex || '#6366f1');
  const requiredHex = normalizeHex(options.requiredHex || safeBase, safeBase);
  const base = hexToHsl(safeBase);
  const clusterDef = buildClusterDefinition(cluster.type, base, rng);
  if (!clusterDef) return cluster;

  const nextSlots = cluster.slots.map((slot) => ({ ...slot }));
  let requiredSlot = nextSlots.find((slot) => slot.role === 'required');
  if (!requiredSlot) {
    requiredSlot = { id: 'required', role: 'required', family: 'required', locked: false, color: requiredHex };
    nextSlots.unshift(requiredSlot);
  }

  const shouldRegenerate = (slot) => {
    if (slot.role === 'required') return false;
    if (options.forceAll) return true;
    if (options.slotsToRegenerate) return options.slotsToRegenerate.includes(slot.id);
    return !slot.locked;
  };

  if (options.forceAll || !requiredSlot.locked) {
    requiredSlot.color = requiredHex;
  }

  const usedColors = new Set();
  const usedHues = [];
  const requiredColor = requiredSlot.color || requiredHex;
  if (requiredColor) {
    usedColors.add(requiredColor);
    if (!isNeutralColor(requiredColor)) {
      usedHues.push(hexToHsl(requiredColor).h);
    }
  }

  nextSlots.forEach((slot) => {
    if (slot.role === 'required') return;
    if (!shouldRegenerate(slot) && slot.color) {
      usedColors.add(slot.color);
      if (!isNeutralColor(slot.color)) {
        usedHues.push(hexToHsl(slot.color).h);
      }
    }
  });

  const anchorSlots = nextSlots.filter((slot) => slot.role === 'anchor');
  const anchorSlotsToRegen = anchorSlots.filter(shouldRegenerate);
  if (anchorSlotsToRegen.length) {
    const anchorSet = buildAnchorSwatches(rng, {
      baseHue: wrapHue(base.h + clusterDef.hueShift),
      type: cluster.type,
      satTarget: clusterDef.satTarget,
      satJitter: clusterDef.satJitter,
      lightTarget: clusterDef.lightTarget,
      lightJitter: clusterDef.lightJitter,
      count: anchorSlotsToRegen.length,
      existingHues: usedHues,
    });

    anchorSlotsToRegen.forEach((slot, index) => {
      const color = anchorSet.swatches[index];
      if (color && !usedColors.has(color)) {
        slot.color = color;
        usedColors.add(color);
        if (!isNeutralColor(color)) {
          usedHues.push(hexToHsl(color).h);
        }
      }
    });
  }

  nextSlots.filter((slot) => slot.role === 'supporting').forEach((slot) => {
    if (!shouldRegenerate(slot)) return;
    const color = addColorWithConstraints(() => buildSupportingColor(rng, slot, base.h, usedHues), {
      usedColors,
      usedHues,
    });
    if (color) slot.color = color;
  });

  nextSlots.filter((slot) => slot.role === 'contrast').forEach((slot) => {
    if (!shouldRegenerate(slot)) return;
    const color = addColorWithConstraints(() => buildContrastColor(rng, base.h), {
      usedColors,
      usedHues,
    });
    if (color) slot.color = color;
  });

  nextSlots.filter((slot) => slot.role === 'neutral').forEach((slot) => {
    if (!shouldRegenerate(slot)) return;
    const color = addColorWithConstraints(() => buildNeutralColor(rng, base.h, clusterDef.neutralBias || 0), {
      usedColors,
      usedHues,
      enforceHue: false,
    });
    if (color) slot.color = color;
  });

  nextSlots.forEach((slot) => {
    if (!slot.color) {
      slot.color = buildNeutralColor(rng, base.h, 0);
    }
  });

  const paletteSpec = buildPaletteSpec(clusterDef, requiredColor || safeBase, (clusterDef.lightTarget < 45 ? 'dark' : 'light'));

  return {
    ...cluster,
    seed,
    baseHex: safeBase,
    requiredHex: requiredColor || safeBase,
    title: clusterDef.title,
    description: clusterDef.description,
    paletteSpec,
    slots: nextSlots,
  };
};

export const generateMoodBoardClusters = (baseHex, options = {}) => {
  const seed = Number.isFinite(options.seed) ? options.seed : Date.now();
  const types = getMoodClusterTypes(options);
  return types
    .map((type, index) => createMoodCluster(baseHex, options.requiredHex, type, {
      seed: deriveSeed(seed, `${type}-${index}`),
    }))
    .filter(Boolean);
};
