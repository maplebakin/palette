import { describe, it, expect } from 'vitest';
import { generateTokens } from '../src/tokens';
import { buildVscodeTheme, buildFigmaTokens } from '../src/payloads';
import { DEFAULT_CONFIG } from '../src/config';

describe('payloads', () => {
  const tokens = generateTokens(DEFAULT_CONFIG);

  describe('buildVscodeTheme', () => {
    const theme = buildVscodeTheme(tokens);

    it('should create a theme with a name and type', () => {
      expect(theme.name).toBe('Apocapalette Theme');
      expect(theme.type).toMatch(/light|dark/);
    });

    it('should have a colors section with valid hex values', () => {
      expect(theme.colors).toBeDefined();
      expect(theme.colors['editor.background']).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.colors['foreground']).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have a tokenColors section for syntax highlighting', () => {
      expect(theme.tokenColors).toBeInstanceOf(Array);
      expect(theme.tokenColors.length).toBeGreaterThan(0);
      expect(theme.tokenColors[0].scope).toBeDefined();
      expect(theme.tokenColors[0].settings.foreground).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('buildFigmaTokens', () => {
    const figmaTokens = buildFigmaTokens(tokens);

    it('should create a figma tokens file with correct structure', () => {
        expect(figmaTokens['neutral.500']).toBeDefined();
    });

    it('each token should have a value and type', () => {
        const token = figmaTokens['primary.500']['500'];
        expect(token.value).toMatch(/^#[0-9a-f]{6}$/i);
        expect(token.type).toBe('color');
    });
  });
});
