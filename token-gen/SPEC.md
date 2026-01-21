# ApocaPalette Token Generator Specification

## Overview

The ApocaPalette Token Generator is a comprehensive color palette generation system that creates harmonious color schemes based on various algorithms and parameters. This document outlines the core functionality, color harmony modes, and export formats supported by the system.

## Color Harmony Modes

### Monochromatic
- **Description**: Creates variations of a single hue with different saturations and lightness levels
- **Characteristics**: 
  - Secondary hue shift: +8°
  - Accent hue shift: -8°
  - Secondary saturation multiplier: 0.9
  - Accent saturation multiplier: 0.95
  - Surface mixing: 8%
  - Background mixing: 6%
- **Best for**: Calm product UI, editorial systems
- **Not ideal for**: High-energy multi-brand palettes

### Analogous
- **Description**: Uses colors adjacent to the base color on the color wheel
- **Characteristics**:
  - Secondary hue shift: -30°
  - Accent hue shift: +28°
  - Secondary saturation multiplier: 1.05
  - Accent saturation multiplier: 1.15
  - Surface mixing: 28%
  - Background mixing: 20%
- **Best for**: Warm storytelling, immersive UI
- **Not ideal for**: Strictly neutral enterprise systems

### Complementary
- **Description**: Uses colors opposite to the base color on the color wheel
- **Characteristics**:
  - Secondary hue shift: +180°
  - Accent hue shift: -150°
  - Secondary saturation multiplier: 1.08
  - Accent saturation multiplier: 1.2
  - Surface mixing: 34%
  - Background mixing: 28%
- **Best for**: Bold CTA contrast, marketing
- **Not ideal for**: Subtle, low-contrast brands

### Tertiary
- **Description**: Uses three colors evenly spaced around the color wheel
- **Characteristics**:
  - Secondary hue shift: +120°
  - Accent hue shift: -120°
  - Secondary saturation multiplier: 1.12
  - Accent saturation multiplier: 1.18
  - Surface mixing: 38%
  - Background mixing: 32%
- **Best for**: Playful multi-accent products
- **Not ideal for**: Minimal single-accent systems

### Apocalypse
- **Description**: Experimental mode that creates highly saturated, contrasting palettes
- **Characteristics**:
  - Secondary hue shift: +180°
  - Accent hue shift: +180°
  - Secondary saturation multiplier: 2.0 × intensity
  - Accent saturation multiplier: 2.2 × intensity
  - Surface mixing: min(0.6, 0.45 × intensity)
  - Background mixing: min(0.55, 0.35 × intensity)
- **Best for**: Experimental visuals, game UI
- **Not ideal for**: Conservative enterprise apps

## Core Parameters

### Theme Modes
- **Light**: Light-themed interface with light backgrounds
- **Dark**: Dark-themed interface with dark backgrounds
- **Pop**: Vibrant, high-contrast theme with enhanced saturation

### Intensity Controls
- **Harmony Intensity**: Controls the spread of harmonious colors (50-160%)
- **Neutral Curve**: Adjusts the depth of neutral colors (60-140%)
- **Accent Strength**: Controls the punch of accent colors (60-140%)
- **Apocalypse Intensity**: Special control for Apocalypse mode (20-150%)
- **Pop Intensity**: Controls the vibrancy of Pop mode (60-140%)

## Token Categories

### Foundation
- **Neutrals**: A 10-step ladder of neutral colors (neutral-0 to neutral-9)
- **Accents**: Harmonious accent colors (accent-1 to accent-ink)
- **Status**: Semantic colors for feedback (success, warning, error, info)

### Brand
- **Primary**: Main brand color
- **Secondary**: Supporting brand color
- **Accent**: Highlight color
- **Accent Strong**: Enhanced accent color
- **CTA**: Call-to-action color
- **CTA Hover**: Hover state for CTA
- **Gradient Start/End**: Colors for gradients
- **Link Color**: Link text color
- **Focus Ring**: Focus indicator color

### Typography
- **Heading**: Heading text color
- **Text Strong**: Strong body text
- **Text Body**: Regular body text
- **Text Muted**: Muted text
- **Text Hint**: Hint text
- **Text Disabled**: Disabled text
- **Text Accent**: Accent text
- **Text Accent Strong**: Strong accent text
- **Footer Text**: Footer text
- **Footer Text Muted**: Muted footer text

### Surfaces
- **Background**: Main background
- **Page Background**: Page-level background
- **Header Background**: Header background
- **Surface Plain**: Basic surface
- **Surface Plain Border**: Border for plain surfaces

### Cards
- **Card Panel Surface**: Card background
- **Card Panel Surface Strong**: Strong card background
- **Card Panel Border**: Card border
- **Card Panel Border Soft**: Soft card border
- **Card Panel Border Strong**: Strong card border
- **Card Tag Background**: Tag background
- **Card Tag Text**: Tag text
- **Card Tag Border**: Tag border

### Glass
- **Glass Surface**: Glass effect surface
- **Glass Surface Strong**: Strong glass surface
- **Glass Border**: Glass border
- **Glass Border Strong**: Strong glass border
- **Glass Hover**: Hover state for glass
- **Glass Shadow**: Glass shadow
- **Glass Highlight**: Glass highlight
- **Glass Glow**: Glass glow effect
- **Glass Shadow Soft/Strong**: Shadow variations
- **Glass Blur Radius**: Blur effect
- **Glass Noise Opacity**: Noise overlay

### Entity
- **Entity Card Surface**: Entity card background
- **Entity Card Border**: Entity card border
- **Entity Card Glow**: Entity card glow
- **Entity Card Highlight**: Entity card highlight
- **Entity Card Heading**: Entity card heading text

### Status
- **Success**: Success state color
- **Warning**: Warning state color
- **Error**: Error state color
- **Info**: Info state color
- **Success Strong**: Strong success color
- **Warning Strong**: Strong warning color
- **Error Strong**: Strong error color

### Admin
- **Admin Surface Base**: Admin panel surface
- **Admin Accent**: Admin accent color

### Aliases
- Various alias tokens for backward compatibility

### Dawn
- Override tokens for light-themed interfaces

## Export Formats

### Penpot Tokens
- **Format**: JSON object with categorized token sets
- **Structure**: Organized by semantic categories (brand, typography, surfaces, etc.)
- **Naming**: Supports prefixed naming conventions
- **Metadata**: Includes generation metadata

### Generic Payload
- **Format**: Comprehensive JSON with all token categories
- **Structure**: Flattened hierarchy with swatch mapping
- **Metadata**: Extended metadata with generation parameters

### Figma Tokens
- **Format**: JSON following Design Tokens Community Group (DTCG) specification
- **Structure**: Nested object structure with type/value pairs
- **Naming**: Supports prefixed naming conventions

### Style Dictionary
- **Format**: JSON following Style Dictionary format
- **Structure**: Nested object structure with type/value pairs
- **Naming**: Supports prefixed naming conventions

### Witchcraft Theme
- **Format**: Specialized JSON for Witchcraft theming system
- **Structure**: Settings object with semantic color assignments
- **Metadata**: Theme category and mode information

### CSS Variables
- **Format**: CSS variable declarations
- **Structure**: `--namespace-token-name: value` format
- **Naming**: Supports custom namespace prefixes

## Print Mode

When print mode is enabled, the system generates CMYK-safe color variants optimized for printing:

- **CMYK Safety**: Colors are adjusted to avoid problematic CMYK combinations
- **High Contrast**: Ensures readability in print
- **Foil Ready**: Includes special tokens for foil stamping
- **Paper Safe**: Optimized for paper media

## API Functions

### Core Generation
- `generateTokens(baseColor, mode, themeMode, apocalypseIntensity, options)`
- `addPrintMode(tokens, baseColor, mode, isDark)`
- `buildOrderedStack(tokens)`

### Export Functions
- `buildPenpotPayload(tokens, orderedHandoff, meta, options)`
- `buildGenericPayload(tokens, meta)`
- `buildFigmaTokensPayload(tokens, options)`
- `buildStyleDictionaryPayload(tokens, options)`
- `buildWitchcraftPayload(tokens, themeName, mode, isDark)`
- `buildCssVariables(themeMaster, prefix)`

### Utility Functions
- `hexToHsl(hex)` - Convert hex to HSL
- `hslToHex(h, s, l)` - Convert HSL to hex
- `getColor(baseHsl, hueShift, satMult, lightSet, lightShift)` - Generate color with adjustments
- `getContrastRatio(fg, bg)` - Calculate WCAG contrast ratio
- `pickReadableText(bgHex, light, dark, threshold)` - Select readable text color