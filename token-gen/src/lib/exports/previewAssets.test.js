import { describe, expect, it } from 'vitest';
import { buildTheme } from '../theme/engine.js';
import { buildPaletteCardSvg } from './previewAssets.js';

describe('preview assets', () => {
  it('builds a marketplace-ready palette card SVG with theme and token context', () => {
    const theme = buildTheme({
      name: 'Beef Ritual',
      baseColor: '#8b2f24',
      mode: 'Apocalypse',
      themeMode: 'dark',
      isDark: true,
    });

    const svg = buildPaletteCardSvg(theme.currentTheme);

    expect(svg).toContain('<svg width="1200" height="800"');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Beef Ritual');
    expect(svg).toContain('APOCAPALETTE THEME PACK');
    expect(svg).toContain('Main palette');
    expect(svg).toContain('Token categories');
    expect(svg).toContain('CSS, JSON, Figma, Penpot, LibreOffice');
    expect(svg).toContain('Preview artwork');
  });
});
