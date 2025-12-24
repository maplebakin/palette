import { describe, it, expect } from 'vitest';
import { validateConfig, DEFAULT_CONFIG, DEFAULT_BASE_HEX } from '../src/config';

describe('config', () => {
  describe('validateConfig', () => {
    it('should return the default config if no config is provided', () => {
      expect(validateConfig({})).toEqual(DEFAULT_CONFIG);
    });

    it('should merge partial config with defaults', () => {
      const partial = { baseHex: '#ff0000' };
      const validated = validateConfig(partial);
      expect(validated.baseHex).toBe('#ff0000');
      expect(validated.harmony).toEqual(DEFAULT_CONFIG.harmony);
    });

    it('should reset to default hex if an invalid one is provided', () => {
        const partial = { baseHex: 'invalid-hex' };
        const validated = validateConfig(partial);
        expect(validated.baseHex).toBe(DEFAULT_BASE_HEX);
    });

    it('should clamp contrastTarget to be within [1, 21]', () => {
        const validatedLow = validateConfig({ contrastTarget: 0.5 });
        expect(validatedLow.contrastTarget).toBe(1);

        const validatedHigh = validateConfig({ contrastTarget: 25 });
        expect(validatedHigh.contrastTarget).toBe(21);
    });
  });
});
