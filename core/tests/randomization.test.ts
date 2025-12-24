import { describe, it, expect } from 'vitest';
import { randomizeConfig } from '../src/randomization';
import { isValidHex } from '../src/colorUtils';

describe('randomization', () => {
  describe('randomizeConfig', () => {
    it('should generate a valid config', () => {
      const config = randomizeConfig();
      expect(config).toBeDefined();
      expect(isValidHex(config.baseHex)).toBe(true);
      expect(config.harmony.mode).toBeTypeOf('string');
    });

    it('should be different on subsequent calls', () => {
      const config1 = randomizeConfig();
      const config2 = randomizeConfig();
      expect(config1.baseHex).not.toEqual(config2.baseHex);
    });

    it('should respect partial config passed to it', () => {
        const partial = { printMode: 'oklab' as const };
        const config = randomizeConfig(partial);
        expect(config.printMode).toBe('oklab');
        expect(isValidHex(config.baseHex)).toBe(true); // still randomizes the rest
    });
  });
});
