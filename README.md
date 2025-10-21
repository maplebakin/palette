# Palette Studio

Palette Studio is a fully featured color palette generator and organizer built with vanilla HTML, CSS, and JavaScript. It implements advanced color-theory generation modes, export options, and a robust local library for storing your favorite palettes.

## Features

- **Palette generation modes**: monochromatic, analogous, complementary, split-complementary, triadic, tetradic, random, AI-inspired, and image extraction.
- **Flexible inputs**: HEX field, RGB/HSL sliders, native color picker, and optional screen eyedropper.
- **Detailed color data**: HEX, RGB, HSL, CMYK approximations, human-friendly names, copy buttons, and lock toggles.
- **Interactive tools**: drag-and-drop reordering, individual adjustments with shade/tint suggestions, manual color insertion, per-color deletion, undo/redo, keyboard shortcuts, and accessibility contrast checks.
- **Preview & accessibility**: real-time UI previews, WCAG contrast ratios with AA/AAA indicators, and shade/tint generation.
- **Palette library**: name palettes, assign tags, search/filter, and persist everything locally via IndexedDB (with localStorage fallback).
- **Export options**: PNG image, CSS/SCSS variables, JSON, shareable URLs, Adobe ASE, and lightweight PDF summaries.
- **Responsive theming**: adaptive layout from mobile to desktop with light/dark themes and smooth transitions.

## Getting Started

Open `index.html` in any modern browser. The application runs entirely client-side and requires no build step.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| Space | Generate new palette |
| S | Save current palette |
| E | Open export menu |
| C | Copy first color HEX |
| L | Lock/Unlock focused color |
| ←/→ | Navigate colors |

## Development Notes

- Source is organized under `css/` and `js/` as self-contained modules.
- Palettes are stored using IndexedDB when available, with a seamless localStorage fallback.
- Export utilities implement pure browser APIs—no external dependencies are required.
- The PDF exporter writes a compact, single-page PDF with color blocks and labels via raw PDF syntax.

## Browser Support

Tested in latest Chromium-based browsers and Firefox. EyeDropper and file system APIs gracefully degrade if unavailable.
