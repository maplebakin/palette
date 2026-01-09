import { useEffect } from 'react';
import { THEME_CLASSNAMES, buildThemeCss } from '../lib/themeStyles';

/**
 * Injects theme CSS variables into the DOM and manages theme classes on the root element.
 * @param {object} uiTheme - The object containing CSS variables for the UI theme.
 * @param {string} themeClass - The class name representing the current theme ('light', 'dark', 'pop').
 */
export const useThemeCSS = (uiTheme, themeClass) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    THEME_CLASSNAMES.forEach((name) => root.classList.remove(name));
    root.classList.add(themeClass);

    let styleTag = document.getElementById('theme-vars');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'theme-vars';
      document.head.appendChild(styleTag);
    }

    const themeCssText = buildThemeCss(uiTheme, `:root.${themeClass}`);
    if (styleTag.textContent !== themeCssText) {
      styleTag.textContent = themeCssText;
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', uiTheme['--page-background']);

    // Cleanup is not strictly necessary here as we want the theme to persist.
    // However, if the component were to unmount and theme persistence wasn't desired,
    // a cleanup function could remove the style tag and classes.
    return () => {
      // Optional cleanup
    };
  }, [uiTheme, themeClass]);
};