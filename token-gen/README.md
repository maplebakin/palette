# ApocaPalette — Design System Palette Generator

ApocaPalette is a browser-based palette generator for creating, reviewing, saving, and downloading vetted design-system Theme Packs.

## Features

- Live palette generation from a base color, harmony modes, presets, and light/dark/pop themes
- Fine-tuning controls, visual preview, WCAG contrast checks, and color-vision previews
- Browser-local palette saves, project capture, and mood boards
- Public Theme Pack ZIP download from the **Package** stage
- Keyboard shortcuts and visible focus states

## Public Theme Pack

The public Package stage downloads a reviewed Theme Pack ZIP for the selected modes. Each ZIP includes:

- `tokens.json` — generic token payload
- `css/variables.css` — CSS custom properties
- `figma/tokens.json` — Figma Tokens-compatible data
- `penpot/tokens.json` — Penpot handoff data
- `libreoffice/<theme>.soc` — LibreOffice/OpenOffice palette
- `README.md` and SVG preview assets

Product Forge, SKU generation, marketplace listing assets, seller packaging, print/PDF tooling, and broad JSON/CSS export utilities are private seller tools. They are available only in development or builds with `VITE_PRIVATE_FORGE=true`; they are not part of the public application contract.

## Requirements

- Node `^20.19.0 || >=22.12.0`
- npm, using the committed `package-lock.json`

## Installation and Scripts

```bash
npm install
```

- `npm run dev` — start Vite with HMR
- `npm run build` — build for a root-hosted static server
- `npm run preview` — serve the built output locally
- `npm run lint` — run ESLint
- `npm run test` — run Vitest
- `npm run export:soc -- --input <file> --out <file-or-directory>` — run the local SOC CLI

## Public Product Flow

1. Choose a base color, harmony mode, and theme mode.
2. Refine the palette and review the preview and contrast checks.
3. Open **Package**, select the reviewed modes, and download the Theme Pack.

The Package stage only includes modes that have been reviewed in the current palette session. Product Forge and other seller workflows remain private.

## Storage, Privacy, and Project Limits

Palette saves, the current palette, projects, and saved mood boards stay in browser `localStorage`; ApocaPalette has no account, analytics, server-side storage, or sync. These data areas are separate. The public app can load an existing `.apocaproject.json`, but it does not currently offer project-file backup/export. Keep imported project files elsewhere.

The app has no service worker, so offline use is not guaranteed after a first visit.

## Deployment and Environment

This repository deploys to `https://maplebakin.github.io/palette/`. GitHub Actions builds it with:

```bash
VITE_BASE=/palette/ npm run build
```

Local development defaults to `/` and is unaffected.

- `VITE_BASE` — public asset base path
- `VITE_PRIVATE_FORGE=true` — enables private seller/development tooling in a production-equivalent build; do not set it for the public site
- `VITE_INTERNAL=true` — enables internal-only copy where supported; it does not grant private Forge access
- `VITE_DEV_PORT`, `VITE_DEV_HOST`, and `VITE_HMR_*` — optional local Vite overrides

## SOC CLI

The SOC CLI is a local developer workflow, not part of the public UI. It requires an input and output path. In `--single-file` project mode, `--out` must be a filename:

```bash
npm run export:soc -- --input zephyr-guidebook.apocaproject.json --out ./zephyr-guidebook.soc --project --single-file
```

## Development Notes

The app uses React, Vite, Zustand, Tailwind CSS, Vitest, and React Testing Library. The core token and export helpers have unit coverage; run lint, test, build, and the Pages smoke check before release.

## License and Support

UNLICENSED / all rights reserved. See `LICENSE` for terms.

For support, contact streamthreadsystems@gmail.com. See `SUPPORT.md` for response expectations.
