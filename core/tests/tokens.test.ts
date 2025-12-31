import { describe, it, expect } from 'vitest';
import { generateTokens, autoTuneContrast } from '../src/tokens';
import { DEFAULT_CONFIG } from '../src/config';
import type { TokenGroup, Token } from '../src/types';
import { parseColor } from '../src/colorUtils';
import { wcagLuminance } from 'culori';

describe('tokens', () => {
  describe('generateTokens', () => {
    it('should generate a token group with the correct structure', () => {
      const tokens = generateTokens(DEFAULT_CONFIG);
      expect(tokens.primary).toBeDefined();
      expect(tokens.neutral).toBeDefined();
      expect(tokens.accent).toBeDefined();
    });

    it('should contain color families with multiple shades', () => {
        const tokens = generateTokens(DEFAULT_CONFIG);
        const primaryFamily = tokens.primary as TokenGroup;
        // Check for a few shades
        expect(primaryFamily['100']).toBeDefined();
        expect(primaryFamily['500']).toBeDefined();
        expect(primaryFamily['900']).toBeDefined();
    });

    it('each token should have a valid hex value', () => {
        const tokens = generateTokens(DEFAULT_CONFIG);
        const primary500 = (tokens.primary as TokenGroup)['500'] as Token;
        expect(primary500.value).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('locks contrast when enabled', () => {
        const tokens = generateTokens({ ...DEFAULT_CONFIG, lockContrast: true, contrastTarget: 4.5 });
        const primary500 = (tokens.primary as TokenGroup)['500'] as Token;
        const neutral50 = (tokens.neutral as TokenGroup)['50'] as Token;
        const lum1 = wcagLuminance(primary500.color);
        const lum2 = wcagLuminance(neutral50.color);
        const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('autoTuneContrast', () => {
    it('should adjust colors to meet contrast ratio', () => {
        const lowContrastFgColor = parseColor('#888888')!;
        const lowContrastBgColor = parseColor('#999999')!;

        const fgToken: Token = { name: 'fg', path: ['test', 'fg'], value: '#888888', originalValue: '', type: 'color', figmaType: 'color', color: lowContrastFgColor, displayColor: lowContrastFgColor };
        const bgToken: Token = { name: 'bg', path: ['test', 'bg'], value: '#999999', originalValue: '', type: 'color', figmaType: 'color', color: lowContrastBgColor, displayColor: lowContrastBgColor };

        const originalLum1 = wcagLuminance(fgToken.color);
        const originalLum2 = wcagLuminance(bgToken.color);
        const originalContrast = (Math.max(originalLum1, originalLum2) + 0.05) / (Math.min(originalLum1, originalLum2) + 0.05);
        expect(originalContrast).toBeLessThan(4.5);

        const [newFgToken, newBgToken] = autoTuneContrast(fgToken, bgToken, 4.5, 'rgb');

        const newLum1 = wcagLuminance(newFgToken.color);
        const newLum2 = wcagLuminance(newBgToken.color);
        const newContrast = (Math.max(newLum1, newLum2) + 0.05) / (Math.min(newLum1, newLum2) + 0.05);
        
        expect(newFgToken.value).not.toEqual(fgToken.value);
        expect(newBgToken.value).not.toEqual(bgToken.value);
        expect(newContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should not adjust colors if contrast ratio is already met', () => {
        const highContrastFgColor = parseColor('#000000')!;
        const highContrastBgColor = parseColor('#ffffff')!;

        const fgToken: Token = { name: 'fg', path: ['test', 'fg'], value: '#000000', originalValue: '', type: 'color', figmaType: 'color', color: highContrastFgColor, displayColor: highContrastFgColor };
        const bgToken: Token = { name: 'bg', path: ['test', 'bg'], value: '#ffffff', originalValue: '', type: 'color', figmaType: 'color', color: highContrastBgColor, displayColor: highContrastBgColor };

        const [newFgToken, newBgToken] = autoTuneContrast(fgToken, bgToken, 7, 'rgb');

        expect(newFgToken.value).toEqual(fgToken.value);
        expect(newBgToken.value).toEqual(bgToken.value);
    });
  });
});
