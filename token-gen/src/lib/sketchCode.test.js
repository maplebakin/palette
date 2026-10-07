import { describe, expect, it } from 'vitest';
import { buildSevenRoleSketchCode } from './sketchCode.js';

const roles = {
  background: '#111111',
  surface: '#222222',
  text: '#333333',
  heading: '#444444',
  muted: '#555555',
  accent: '#666666',
  cta: '#777777',
  border: '#888888',
  ctaText: '#ffffff',
};

describe('buildSevenRoleSketchCode', () => {
  it('copies seven roles and the two derived values as CSS custom properties', () => {
    const code = buildSevenRoleSketchCode({ roles });
    expect(code).toContain(':root {');
    expect(code).toContain('--color-background: #111111;');
    expect(code).toContain('--color-cta: #777777;');
    expect(code).toContain('--color-border: #888888;');
    expect(code).toContain('--color-cta-text: #ffffff;');
    expect(code.match(/--color-/g)).toHaveLength(9);
  });

  it('supports JSON and Tailwind v3 snippets', () => {
    expect(JSON.parse(buildSevenRoleSketchCode({ roles, format: 'json' })).colors['cta-text']).toBe('#ffffff');
    expect(buildSevenRoleSketchCode({ roles, format: 'tailwind' })).toContain("'accent': '#666666'");
    expect(buildSevenRoleSketchCode({ roles, format: 'tailwind' })).toContain("'border': '#888888'");
  });
});
