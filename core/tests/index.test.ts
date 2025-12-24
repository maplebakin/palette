import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_CONFIG } from '../src/index';

describe('Main generate function', () => {
  it('should generate all outputs correctly from a config', () => {
    const outputs = generate(DEFAULT_CONFIG);

    // Check for presence of all top-level keys
    expect(outputs.tokens).toBeDefined();
    expect(outputs.vscodeTheme).toBeDefined();
    expect(outputs.figmaTokens).toBeDefined();

    // Quick validation of nested content
    expect(outputs.tokens.primary).toBeDefined();
    expect(outputs.vscodeTheme.colors['editor.background']).toBeDefined();
    expect(Object.keys(outputs.figmaTokens).length).toBeGreaterThan(0);
  });

  it('should work with an empty config, using defaults', () => {
    const outputs = generate({});
    expect(outputs).toBeDefined();
    expect(outputs.vscodeTheme.name).toBe('Apocapalette');
  });
});
