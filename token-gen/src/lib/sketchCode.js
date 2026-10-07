import { SEMANTIC_PALETTE_ROLES } from './playgroundPalette.js';

export const buildSevenRoleSketchCode = ({ roles = {}, format = 'css' } = {}) => {
  const colors = Object.fromEntries([
    ...SEMANTIC_PALETTE_ROLES.map(({ id }) => [id, roles[id]]),
    ['border', roles.border],
    ['cta-text', roles.ctaText],
  ]);

  if (format === 'json') {
    return JSON.stringify({ colors }, null, 2);
  }

  if (format === 'tailwind') {
    const entries = Object.entries(colors)
      .map(([name, value]) => `      '${name}': '${value}',`)
      .join('\n');
    return `theme: {\n  extend: {\n    colors: {\n${entries}\n    },\n  },\n}`;
  }

  const declarations = Object.entries(colors)
    .map(([name, value]) => `  --color-${name}: ${value};`)
    .join('\n');
  return `:root {\n${declarations}\n}`;
};
