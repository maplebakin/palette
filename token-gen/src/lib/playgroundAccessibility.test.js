import { describe, expect, it } from 'vitest';
import { buildPlaygroundContrastChecks } from './playgroundAccessibility.js';

describe('buildPlaygroundContrastChecks', () => {
  it('measures all six named pairs and keeps failing combinations marked as failures', () => {
    const checks = buildPlaygroundContrastChecks({
      background: '#ffffff',
      surface: '#ffffff',
      text: '#777777',
      muted: '#888888',
      cta: '#777777',
      ctaText: '#777777',
      accent: '#999999',
      border: '#eeeeee',
    });

    expect(checks.map(({ label }) => label)).toEqual([
      'Text on background',
      'Muted text on background',
      'Text on surface',
      'Button label on CTA',
      'Accent links on background',
      'Border on background',
    ]);
    expect(checks.find(({ id }) => id === 'button-cta')).toMatchObject({ passes: false, minimumRatio: 4.5 });
    expect(checks.find(({ id }) => id === 'border-background')).toMatchObject({ passes: false, minimumRatio: 3 });
  });
});
