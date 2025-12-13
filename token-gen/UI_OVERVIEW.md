# Palette Generator UI Overview

## Layout at a Glance
- **Page shell**: full-height container tinted by the generated `page-background`; header uses `header-background` with blur and border tokens.
- **Header**: brand icon on a gradient from `brand.gradient-start` → `brand.secondary` → `brand.gradient-end`; includes base color inputs (color picker + hex), harmony mode pills, dark/light toggle, and a CTA button styled from `brand.cta`/`brand.cta-hover`.
- **Body**: scrollable main area with a live preview card followed by token swatch sections.

## Live Preview Card
- **Shell**: background uses `surfaces.background`; border uses `surfaces.surface-plain-border`.
- **Fake nav bar**: thin top bar with colored dots for visual hierarchy.
- **Content grid**: sidebar placeholders tinted with brand/text tokens, plus a primary preview card using `cards.card-panel-surface` and `cards.card-panel-border`; heading/body text use `typography.heading` and `typography.text-body`; buttons show brand primary/accent and borders.
- **Entity tile**: shows secondary/entity hues for quick contrast checking.

## Controls
- **Base color input**: updates the generated palette in real time.
- **Harmony selector**: Monochromatic/Analogous/Complementary/Tertiary pills re-hue surfaces/backgrounds and accents according to mode offsets.
- **Theme toggle**: Light/Dark switch drives `isDark`, syncing the UI tint with generated tokens.
- **Export JSON**: downloads the current token object with names/values as shown in the sections.

## Token Sections
- Each section is a grid of `ColorSwatch` items showing name and hex value; clicking copies the value and flashes a checkmark.
- Sections cover Foundation (neutrals, accents), Brand/Core, Text Palette, Typography, Borders, Surfaces, Cards/Tags, Glass, Entity, Status, Admin, Back-Compat Aliases, Dawn overrides, and Legacy palette.

## Component Notes
- `Section` renders a titled block with an icon and a responsive grid.
- `ColorSwatch` handles copy-to-clipboard and computes text color (light/dark) for readability.
- Header/preview styling uses generated tokens instead of hard-coded Tailwind colors to mirror real-world application of the palette.***
