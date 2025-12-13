# Token Gen — Design System Palette Generator

A Vite + React app for generating design tokens (brand, surfaces, text, glass, status, print-safe) with live WCAG checks and exportable assets (Penpot/Witchcraft JSON, SVG/PNG pack, PDF/print mode).

## Features
- Live palette generation from base color with multiple harmony modes, dark/light toggle, and presets.
- Save/load palettes locally with prefixable token exports for handoff.
- WCAG contrast diagnostics and print mode (CMYK-safe) with foil markers.
- Exports: Penpot-ready JSON, Figma Tokens JSON, Style Dictionary JSON, Generic JSON, Witchcraft theme JSON, bundled SVG/PNG asset pack, and browser print/PDF.
- Tailwind-powered UI with clipboard-friendly swatches and accessibility-focused focus states.

## Requirements
- Node 18+ recommended (tested with Node 20 via CI).
- npm (uses `package-lock.json`).

## Scripts
- `npm run dev` — start Vite dev server with HMR.
- `npm run build` — production bundle to `dist/`.
- `npm run preview` — serve the built bundle.
- `npm run lint` — ESLint (flat config) across the repo.
- `npm run test` — Vitest suite for utilities, payload builders, and UI primitives.

## Docs
- See `docs/README.md` for user guides, exports, FAQ, accessibility, and troubleshooting.

## Internal vs Distribution Builds
- Set `VITE_INTERNAL=true` in your `.env.local` to expose project-specific features (Witchcraft JSON, admin/legacy/dawn sections).
- Omit `VITE_INTERNAL` (default) for distribution builds; UI hides those internal exports/sections and you can use the Generic JSON export for consumers.

## Development Notes
- Dark mode is class-based; toggling updates `html` and `body` for consistent Tailwind theming.
- Clipboard/export flows rely on browser APIs (clipboard, canvas, Blob, print); intended for browser use, not SSR.
- Tailwind purging is driven by `tailwind.config.js` (`index.html`, `src/**/*.{js,jsx,ts,tsx}`).
- SSR: not supported; render in the browser. Tested on latest Chrome/Firefox/Safari; clipboard requires HTTPS or localhost.
- Accessibility: header/controls/swatches are keyboard-focusable; contrast diagnostics are live. Validate custom flows if you extend components.

## Production Checklist
- Run `npm ci`, `npm run lint`, and `npm run build` (CI workflow mirrors this).
- Host over HTTPS for clipboard access; verify asset exports in the target browser.
- Confirm the bundled MIT license and support terms fit your distribution needs.

## Support & License
- Support expectations live in `SUPPORT.md`.
- Licensed under MIT (see `LICENSE`).
