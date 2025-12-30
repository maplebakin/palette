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

### Exporting a LibreOffice Palette

A script is included to export a custom color palette (`.soc`) for LibreOffice (Draw, Impress, Writer). This allows you to use your generated theme colors directly within LibreOffice.

**Usage:**

```bash
npm run export:soc -- --input <path/to/palette.json> --out <path/to/your-palette.soc> --name "My Palette Name"
```

- `--input`: Path to the JSON file containing the color palette (e.g., `new-theme-template.json`).
- `--out`: Path to write the output `.soc` file.
- `--name`: The name of the palette as it will appear in LibreOffice.

**Installation in LibreOffice:**

1.  Locate your LibreOffice user profile folder.
    -   **Linux:** `~/.config/libreoffice/4/user/config/`
    -   **Windows:** `%APPDATA%\LibreOffice\4\user\config\`
    -   **macOS:** `~/Library/Application Support/LibreOffice/4/user/config/`
2.  Copy your generated `.soc` file into this `config` directory.
3.  Restart LibreOffice. The new palette will be available in the color pickers.

## Project Mode

The Project Mode feature allows you to manage multiple color palettes within a single project, save them, and export them collectively or individually to LibreOffice `.soc` files.

**Activating Project Mode:**

Click the "Project Mode" button located at the bottom-right of the application interface. This will switch the view to the project management interface.

**Project File Format:**

Projects are saved as `.apocaproject.json` files. These files contain project settings (e.g., neutral color cap, max colors, near-duplicate threshold) and a list of palettes, each with its own ID, label, role, anchor color, generator mode, locked status, and optionally a list of specific colors.

**Managing Projects:**

-   **New Project:** Click "New Project" to start a fresh project with default settings.
-   **Load Project:** Click the "Choose File" button to select and load an existing `.apocaproject.json` file from your local system.
-   **Save Project:** Click "Save Project" to download the current project as a `.apocaproject.json` file to your local system.

**Managing Palettes within a Project:**

-   **Add Palette:** Click "Add Palette" to add a new, empty palette to your current project. You can then edit its details.
-   **Edit Palette:** Each palette is displayed as a card. You can edit its label, role, and anchor hex directly within the card.
-   **Remove Palette:** Click the "Remove" button on a palette card to delete it from the project.

**Exporting Palettes from Project Mode:**

-   **Export Single .soc:** This option generates one `.soc` file containing all colors from all palettes in the project. Colors are deduplicated and neutral-throttled across the entire project. Names are prefixed with their respective palette labels (e.g., "Winter / Background").
-   **Export Per-Palette .soc:** This option generates a `.zip` file. Inside the zip, there will be a separate `.soc` file for each palette in your project, along with an `index.json` file listing all the generated `.soc` files.

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
