import { useEffect } from 'react';

/**
 * Injects theme CSS variables into DOM
 * @param {Object} cssVars - CSS variable object
 * @param {string} themeClass - Theme class name ('light' | 'dark')
 */
export const useThemeCSS = (cssVars, themeClass) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const THEME_CLASSES = ['light', 'dark', 'pop'];

    // Update class
    THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(themeClass);

    // Inject CSS variables
    let styleTag = document.getElementById('theme-vars');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'theme-vars';
      document.head.appendChild(styleTag);
    }

    const cssText = `:root {${Object.entries(cssVars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n')}}`;
    styleTag.textContent = cssText;

    // Update theme-color meta tag
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', cssVars['--page-background']);

    // Cleanup
    return () => {
      // Don't remove style tag - keep for next mount
    };
  }, [cssVars, themeClass]);
};