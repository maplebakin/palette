import { describe, it, expect } from 'vitest';
import { buildThemeCss, getThemeClassName } from './themeStyles';

describe('themeStyles', () => {
  it('builds CSS variables under the provided selector', () => {
    const css = buildThemeCss({
      '--panel-bg': '#111111',
      '--page-background': '#ffffff',
    }, ':root.theme-dark');
    expect(css).toContain(':root.theme-dark');
    expect(css).toContain('--panel-bg: #111111;');
    expect(css).toContain('--page-background: #ffffff;');
  });

  it('maps theme modes to class names', () => {
    expect(getThemeClassName('dark')).toBe('theme-dark');
    expect(getThemeClassName('pop')).toBe('theme-pop');
    expect(getThemeClassName('light')).toBe('theme-light');
    expect(getThemeClassName('unknown')).toBe('theme-light');
  });
});
