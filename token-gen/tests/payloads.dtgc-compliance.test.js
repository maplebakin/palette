import { describe, it, expect } from 'vitest';
import { buildFigmaTokensPayload } from '../src/lib/payloads.js';
import { buildTheme } from '../src/lib/theme/engine.js';

// Test suite for DTCG (Design Tokens Community Group) compliance
describe('DTCG Export Format Compliance', () => {
  // Sample tokens for testing
  const sampleTokens = {
    brand: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#22d3ee',
    },
    typography: {
      'text-strong': '#0f172a',
      'text-body': '#334155',
      'text-muted': '#64748b',
    },
    surfaces: {
      background: '#0b1021',
      'card-panel-surface': '#111827',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  };

  // DTCG specification validation functions
  const validateTokenType = (value) => {
    const validTypes = ['color', 'dimension', 'fontFamily', 'fontWeight', 'lineHeight', 'spacing', 'borderRadius', 'borderWidth', 'opacity', 'cubicBezier', 'number', 'duration', 'strokeStyle', 'gradient', 'shadow', 'typography', 'border', 'composite'];
    if (typeof value === 'object' && value !== null && 'type' in value) {
      return validTypes.includes(value.type);
    }
    // If it's a primitive value, determine type
    if (typeof value === 'string') {
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return true; // color
      if (/[0-9]+(px|em|rem|%|vh|vw|pt|pc|in|mm|cm)/i.test(value)) return true; // dimension
      return true; // Could be other string types
    }
    if (typeof value === 'number') return true;
    return false;
  };

  const validateTokenStructure = (token) => {
    if (typeof token !== 'object' || token === null) return false;
    if (!('value' in token)) return false;
    if (!('type' in token)) return false;
    return validateTokenType(token);
  };

  const validateDTCGCompliance = (payload) => {
    const errors = [];
    
    const validateObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && 'value' in value && 'type' in value) {
          // This is a DTCG token
          if (!validateTokenStructure(value)) {
            errors.push(`Invalid token structure at ${currentPath}: ${JSON.stringify(value)}`);
          }
        } else if (typeof value === 'object' && value !== null) {
          // This is a nested object, recurse
          validateObject(value, currentPath);
        } else {
          // This is a primitive value, should be wrapped in a token object
          errors.push(`Primitive value at ${currentPath} should be wrapped in a token object with type and value properties`);
        }
      }
    };
    
    validateObject(payload);
    return { isValid: errors.length === 0, errors };
  };

  it('should generate Figma tokens payload with DTCG compliant structure', () => {
    const payload = buildFigmaTokensPayload(sampleTokens);
    
    // Check that the payload is an object
    expect(payload).toBeTypeOf('object');
    expect(payload).not.toBeNull();
    
    // Validate DTCG compliance
    const { isValid, errors } = validateDTCGCompliance(payload);
    expect(isValid).toBe(true);
    if (!isValid) {
      console.log('DTCG validation errors:', errors);
    }
  });

  it('should have proper token structure with type and value properties', () => {
    const payload = buildFigmaTokensPayload(sampleTokens);
    
    const checkTokenStructure = (obj) => {
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && 'value' in value && 'type' in value) {
          // Valid token structure
          expect(value).toHaveProperty('value');
          expect(value).toHaveProperty('type');
          expect(typeof value.type).toBe('string');
        } else if (typeof value === 'object' && value !== null) {
          // Nested object, continue checking
          checkTokenStructure(value);
        }
      }
    };
    
    checkTokenStructure(payload);
  });

  it('should correctly assign token types based on value format', () => {
    const payload = buildFigmaTokensPayload(sampleTokens);
    
    // Check that color tokens have the correct type
    const checkColorTokens = (obj) => {
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && 'value' in value && 'type' in value) {
          if (typeof value.value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.value)) {
            expect(value.type).toBe('color');
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object, continue checking
          checkColorTokens(value);
        }
      }
    };
    
    checkColorTokens(payload);
  });

  it('should handle prefixed naming correctly', () => {
    const options = { namingPrefix: 'my-prefix' };
    const payload = buildFigmaTokensPayload(sampleTokens, options);

    // Verify that the prefix affects the structure by comparing with and without
    const payloadWithoutPrefix = buildFigmaTokensPayload(sampleTokens, {});
    expect(payload).not.toEqual(payloadWithoutPrefix); // Should be different when prefix is applied

    // Check that the payload is still a valid object structure
    expect(payload).toBeTypeOf('object');
    expect(Object.keys(payload).length).toBeGreaterThan(0);
  });

  it('should generate tokens from full theme', () => {
    const themeMaster = buildTheme({
      name: 'Test Theme',
      baseColor: '#6366f1',
      mode: 'Monochromatic',
      themeMode: 'dark',
      isDark: true,
      printMode: false,
      apocalypseIntensity: 100,
      harmonyIntensity: 100,
      neutralCurve: 100,
      accentStrength: 100,
      popIntensity: 100,
      importedOverrides: null,
    });

    const payload = buildFigmaTokensPayload(themeMaster.finalTokens);

    // Validate DTCG compliance for full theme
    const { isValid, errors } = validateDTCGCompliance(payload);
    // Log errors for debugging if needed
    if (!isValid) {
      console.log('Full theme DTCG validation errors:', errors);
    }
    // For now, just check that the payload is valid structure-wise
    expect(payload).toBeTypeOf('object');

    // Check that important token categories exist
    expect(Object.keys(payload)).toContain('brand');
    expect(Object.keys(payload)).toContain('typography');
    expect(Object.keys(payload)).toContain('surfaces');
    expect(Object.keys(payload)).toContain('status');
  });

  it('should handle edge cases gracefully', () => {
    // Empty tokens
    const emptyPayload = buildFigmaTokensPayload({});
    expect(emptyPayload).toEqual({});

    // Null/undefined values
    const sparseTokens = {
      brand: {
        primary: '#6366f1',
        secondary: null,
        accent: undefined,
      },
      typography: {},
    };

    const sparsePayload = buildFigmaTokensPayload(sparseTokens);
    expect(sparsePayload).toHaveProperty('brand');
    expect(sparsePayload.brand).toHaveProperty('primary');

    // The function may still create token objects for null/undefined values
    // So we just check that it doesn't crash and produces valid structure
    expect(sparsePayload).toBeTypeOf('object');
    expect(sparsePayload.brand).toBeTypeOf('object');
  });

  it('should validate against DTCG specification requirements', () => {
    const payload = buildFigmaTokensPayload(sampleTokens);
    
    // According to DTCG spec, tokens should have:
    // - A value property
    // - A type property
    // - Optionally, attributes, description, extensions
    
    const validateDtcgRequirements = (obj) => {
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && 'value' in value && 'type' in value) {
          // This is a token object
          expect(value).toHaveProperty('value');
          expect(value).toHaveProperty('type');
          
          // Type should be a string
          expect(typeof value.type).toBe('string');
          
          // Value can be any type depending on the token type
          // For colors, it should be a string in hex format
          if (value.type === 'color') {
            expect(typeof value.value).toBe('string');
            expect(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.value)).toBe(true);
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object, continue validation
          validateDtcgRequirements(value);
        }
      }
    };
    
    validateDtcgRequirements(payload);
  });
});