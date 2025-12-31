# Theme Improvement Plan

## Current State Summary
- Theme variables are computed in `src/App.jsx` as `uiTheme` and applied inline to the React root along with inline background styles.
- `useEffect` updates `document.documentElement` and `body` background colors, but the full page styling still depends on inline styles on the React root.
- Shared panel styles rely on CSS variables in `src/index.css`, while many surfaces still pass inline border/background colors.
- Share link generation exists in `src/App.jsx`, and WCAG contrast checks exist, but accessibility tooling is limited to contrast badges.
- Palette persistence is local-only (localStorage), with no import/export flow for cross-device portability.

## Files To Modify
- `src/App.jsx` (central theme wiring, share link hook usage, palette import/export)
- `src/index.css` (global theme classes, background variables)
- `src/components/stages/IdentityStage.jsx` (palette import/export UI)
- `src/components/ContrastPanel.jsx` (contrast warning banner)
- `src/components/stages/ValidateStage.jsx` (accessibility module placement)
- `src/components/ExportsPanel.jsx` and `src/components/stages/ExportStage.jsx` (optional UI for UI-theme CSS export)
- `src/hooks/useShareLink.js` (new share URL hook)
- `src/lib/themeStyles.js` (new CSS variable builder helper)
- `src/lib/accessibility.js` (color-vision simulation helpers)
- `src/components/ColorVisionPanel.jsx` (new accessibility UI)
- `src/lib/tokens.test.js` (extend token-gen tests)
- `/home/maddie/Documents/code/Palette/core/tests/tokens.test.ts` (extend core token tests)
- `tests/` (new theming helper tests)

## Global Theming Refactor Steps
1. Create a theme CSS helper that outputs computed CSS variables and can be reused for export.
2. Update `App.jsx` to inject a `<style>` tag with variables for the active theme class, and apply `theme-light`/`theme-dark`/`theme-pop` to `<html>`.
3. Move background styling to CSS variables and apply them in `src/index.css` to `html`, `body`, and `.app-theme`.
4. Remove redundant inline background/border styling on panels where existing classes already map to variables.
5. Expand the theme `useEffect` to update theme class + `meta[name="theme-color"]` on theme changes.

## Additional Enhancements (Future Scope)
- Cross-device sync: optional backend storage with auth, or a thin sync service; front-end will need conflict resolution UI.
- Figma integration: export bundle aligned to Tokens Studio + plugin metadata.
- CLI/API: expose palette generation and UI-theme CSS via a headless CLI (`node bin/palette-cli.js`) and a lightweight REST endpoint.
- Accessibility: more contrast checks (buttons/links), dynamic warnings per stage, and saved accessibility reports.

## Timeline & Complexity
- Global theming refactor: 0.5–1 day (medium complexity, broad CSS touch points).
- Palette import/export + share hook: 0.5 day (medium complexity).
- Accessibility module + warnings: 0.5–1 day (medium complexity, UI + color math).
- Tests + validation: 0.5 day (low/medium complexity).

