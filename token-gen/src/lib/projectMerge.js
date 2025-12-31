import { TinyColor } from '@ctrl/tinycolor';
import { colord, extend } from 'colord';
import labPlugin from 'colord/plugins/lab';

extend([labPlugin]);

/**
 * Merges colors from all sections of a project, deduplicates, and filters them.
 * @param {import('./projectSchema').Project} project
 * @returns {Array<{name: string, hex: string}>}
 */
export function mergeProjectColors(project) {
  const { sections } = project;
  const safeSettings = project.settings && typeof project.settings === 'object' ? project.settings : {};
  const allColors = [];

  // 1. Combine all colors from all sections
  sections.forEach(section => {
    if (section.tokens) {
      Object.entries(section.tokens).forEach(([role, hex]) => {
        allColors.push({
          name: `${section.label} / ${role}`,
          hex: new TinyColor(hex).toHexString(),
          isRole: true,
          isAnchor: hex.toLowerCase() === section.baseHex.toLowerCase(),
          sectionLabel: section.label,
        });
      });
    }
    if (section.colors) {
      section.colors.forEach(color => {
        // Avoid adding duplicates from tokens
        if (!Object.values(section.tokens || {}).includes(color.hex)) {
          allColors.push({
            name: `${section.label} / ${color.name}`,
            hex: new TinyColor(color.hex).toHexString(),
            isRole: false,
            isAnchor: color.hex.toLowerCase() === section.baseHex.toLowerCase(),
            sectionLabel: section.label,
          });
        }
      });
    }
  });

  // 2. Near-duplicate removal
  const nearDupThreshold = Number.isFinite(safeSettings.nearDupThreshold) ? safeSettings.nearDupThreshold : 2.0;
  const anchorsAlwaysKeep = typeof safeSettings.anchorsAlwaysKeep === 'boolean' ? safeSettings.anchorsAlwaysKeep : true;
  const finalColors = [];

  allColors.forEach(color => {
    let isNearDuplicate = false;
    for (let i = 0; i < finalColors.length; i++) {
      const finalColor = finalColors[i];
      const deltaE = colord(color.hex).delta(finalColor.hex);

      if (deltaE < nearDupThreshold) {
        isNearDuplicate = true;
        // If the new color is an anchor and the existing one is not, replace it.
        if ((color.isAnchor && anchorsAlwaysKeep) && !finalColor.isAnchor) {
          finalColors[i] = color;
        }
        // If both are anchors, or neither are, we keep the first one.
        break;
      }
    }

    if (!isNearDuplicate) {
      finalColors.push(color);
    }
  });
  
  // 3. Remove exact duplicates by name
  const uniqueByName = [];
  const seenNames = new Set();
  finalColors.forEach(c => {
    if(!seenNames.has(c.name)) {
      uniqueByName.push(c);
      seenNames.add(c.name);
    }
  });


  // 4. Neutral throttling
  const neutralCap = Number.isFinite(safeSettings.neutralCap) ? safeSettings.neutralCap : 8;
  const neutrals = finalColors.filter(c => new TinyColor(c.hex).toHsl().s < 0.12);
  const nonNeutrals = finalColors.filter(c => new TinyColor(c.hex).toHsl().s >= 0.12);

  const throttledNeutrals = [];
  if (neutrals.length > neutralCap) {
    const roleNeutrals = neutrals.filter(n => n.isRole);
    const otherNeutrals = neutrals.filter(n => !n.isRole);

    throttledNeutrals.push(...roleNeutrals.slice(0, neutralCap));
    
    if (throttledNeutrals.length < neutralCap) {
      throttledNeutrals.push(...otherNeutrals.slice(0, neutralCap - throttledNeutrals.length));
    }
  } else {
    throttledNeutrals.push(...neutrals);
  }

  const cappedColors = [...nonNeutrals, ...throttledNeutrals];

  // 5. Cap total colors
  const maxColors = Number.isFinite(safeSettings.maxColors) ? safeSettings.maxColors : 40;
  if (cappedColors.length > maxColors) {
    // Simple slice for now, could be more sophisticated
    cappedColors.length = maxColors;
  }
  
  // 6. Sort colors
  cappedColors.sort((a, b) => {
    if (a.isRole && !b.isRole) return -1;
    if (!a.isRole && b.isRole) return 1;
    if (a.isAnchor && !b.isAnchor) return -1;
    if (!a.isAnchor && b.isAnchor) return 1;
    
    const hueA = new TinyColor(a.hex).toHsv().h;
    const hueB = new TinyColor(b.hex).toHsv().h;
    if (hueA !== hueB) {
      return hueA - hueB;
    }
    
    const lumA = new TinyColor(a.hex).getLuminance();
    const lumB = new TinyColor(b.hex).getLuminance();
    return lumB - lumA;
  });


  return cappedColors.map(({ name, hex }) => ({ name, hex }));
}
