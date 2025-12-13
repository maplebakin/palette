# Token Gen User Guide

## Getting Started
- Install: `npm install` then run `npm run dev` and open the provided localhost URL.
- Core inputs: choose a base hex color, pick a harmony mode, toggle light/dark, and adjust the sliders for harmony spread, neutral depth, accent punch, or Apocalypse intensity (when applicable).
- Name your theme or leave the auto label (e.g., "Analogous Light"); optionally set a token prefix for exports (e.g., `brand`).

## Saving & Loading Palettes
- Click **Save palette** to store the current configuration in your browser (localStorage). Up to 20 recent saves are kept.
- Use the **Load saved…** dropdown to restore a palette; this rehydrates color, mode, toggles, sliders, and prefix.
- Notes: saved palettes are browser-local; clearing storage removes them. When storage is blocked, a toast message will warn you.

## Exports & Integrations
- Asset pack: SVG/PNG palette card + swatch strip + tokens JSON (Penpot-friendly) bundled as a `.tar`.
- JSON formats:
  - Penpot JSON (with handoff order and optional prefix)
  - Generic JSON
  - Witchcraft JSON (internal flag)
  - **Figma Tokens JSON**
  - **Style Dictionary JSON**
- Print/PDF: enable **Print Mode** for CMYK-safe tokens and foil markers, then export PDF or assets. Clipboard/canvas exports require HTTPS or localhost.
- If a browser API is unavailable (clipboard, storage, canvas/Blob), the app will warn you and disable related actions where possible.

## Accessibility & Keyboard
- Skip link jumps to main content; primary controls are keyboard-focusable.
- Sliders, toggles, and harmony buttons expose ARIA labels and pressed states. Status messages (saves/exports) announce via `aria-live`.
- Contrast diagnostics are live; verify custom palettes against WCAG if you adjust tokens heavily.

## FAQ
- **Why did saving fail?** Your browser may block localStorage (private mode or policies). Try a standard window or allow storage.
- **Where are my exports?** Check your browser downloads folder; some browsers require allowing multiple automatic downloads.
- **Does it work offline?** Local functionality works once assets are cached, but first load and updates need network access.
- **Can I customize token names?** Use the Token Prefix input; exports will include that prefix in supported formats.

## Troubleshooting
- If the UI fails to render, the built-in error screen offers a reload button. Persisting issues: run `npm run lint` and `npm test`.
- For clipboard issues, ensure you are on HTTPS or localhost and allow clipboard permissions.

## Support
- See `SUPPORT.md` for response expectations. When opening issues, include browser/OS, repro steps, and screenshots.***
