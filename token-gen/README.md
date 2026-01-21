# Token Gen — Design System Palette Generator

A Vite + React app for generating design tokens (brand, surfaces, text, glass, status, print-safe) with live WCAG checks and exportable assets (Penpot/Witchcraft JSON, SVG/PNG pack, PDF/print mode).

## 🚀 Features

- **Live palette generation** from base color with multiple harmony modes, dark/light toggle, and presets
- **Save/load palettes** locally with prefixable token exports for handoff
- **WCAG contrast diagnostics** and print mode (CMYK-safe) with foil markers
- **Multiple export formats**: Penpot-ready JSON, Figma Tokens JSON, Style Dictionary JSON, Generic JSON, Witchcraft theme JSON, bundled SVG/PNG asset pack, and browser print/PDF
- **Tailwind-powered UI** with clipboard-friendly swatches and accessibility-focused focus states
- **Project Mode** for managing multiple color palettes within a single project
- **Keyboard shortcuts** for enhanced productivity (R: random palette, F: fine-tune, H: header toggle)
- **Real-time preview** with dark/light mode switching
- **Accessibility features** including skip links and keyboard navigation

## 🛠️ Requirements

- Node 18+ recommended (tested with Node 20 via CI)
- npm (uses `package-lock.json`)

## 📦 Installation

```bash
npm install
```

## ▶️ Scripts

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — production bundle to `dist/`
- `npm run preview` — serve the built bundle
- `npm run lint` — ESLint (flat config) across the repo
- `npm run test` — Vitest suite for utilities, payload builders, and UI primitives

## 🎨 Core Functionality

### Palette Generation
- Base color selection with color picker and hex input
- Multiple harmony modes: Monochromatic, Analogous, Complementary, Tertiary, Apocalypse
- Intensity controls for harmony, apocalypse, neutral curve, accent strength, and pop intensity
- Real-time preview of generated color swatches
- Dark/light mode toggle with automatic contrast adjustments

### Theme Modes
- Light mode: Standard color presentation
- Dark mode: Optimized for dark backgrounds
- Pop mode: High-contrast, vibrant color scheme

### Export Options
- **Penpot JSON**: Ready-to-use format for Penpot design tool
- **Figma Tokens JSON**: Compatible with Figma's design token system
- **Style Dictionary JSON**: For cross-platform design systems
- **Generic JSON**: Universal format for any platform
- **Witchcraft JSON**: Specialized format for Witchcraft design system
- **CSS Variables**: CSS custom properties export
- **SVG/PNG Assets**: Visual swatch packs for documentation
- **PDF/Print**: Print-ready color documentation

### Project Mode
Manage multiple palettes within a single project:
- Create new projects with custom settings
- Load existing project files (.apocaproject.json)
- Add/remove/edit individual palettes within projects
- Export all palettes as a single .soc file or individually

## 🎯 Keyboard Shortcuts

- `R` - Generate random palette
- `F` - Toggle fine-tune controls
- `H` - Toggle header visibility
- `Escape` - Close any open modals or menus
- `Tab` - Navigate through interactive elements
- `Enter/Space` - Activate buttons and controls

## 📁 Project Structure

```
token-gen/
├── public/                 # Static assets
├── src/
│   ├── components/         # React UI components
│   ├── lib/               # Utility functions and business logic
│   │   ├── exports/       # Export functionality modules
│   │   ├── palette/       # Palette generation logic
│   │   └── theme/         # Theme generation utilities
│   ├── store/             # State management (zustand stores)
│   ├── hooks/             # Custom React hooks
│   ├── context/           # React context providers
│   └── assets/            # Static assets
├── docs/                  # Documentation
├── tests/                 # Test files
├── dist/                  # Build output (generated)
├── package.json
└── README.md
```

## 🔧 Development Notes

### Architecture
- **State Management**: Zustand for global state management
- **Styling**: Tailwind CSS with custom theme integration
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint with React hooks and best practices
- **Build Tool**: Vite for fast development and optimized builds

### Accessibility Features
- Full keyboard navigation support
- Proper ARIA attributes and roles
- Sufficient color contrast ratios
- Focus management and skip links
- Screen reader compatibility

### Performance Optimizations
- Memoization for expensive calculations
- Efficient re-rendering with proper React patterns
- Lazy loading for heavy components
- Optimized color calculations

## 🏗️ Building for Production

1. Run `npm run lint` to check for code issues
2. Run `npm run test` to ensure all tests pass
3. Run `npm run build` to create production bundle
4. Serve the `dist/` folder contents via a web server

## 📋 Export Formats Explained

### Penpot JSON
Optimized for Penpot design tool integration with proper token structure and metadata.

### Figma Tokens JSON
Follows W3C Design Tokens Community Group format for Figma compatibility.

### Style Dictionary JSON
Structured for use with Amazon's Style Dictionary tool for cross-platform consistency.

### Generic JSON
Simple, flat structure suitable for most custom implementations.

### Witchcraft JSON
Specialized format for the Witchcraft design system with extended metadata.

## 🧪 Testing

The project includes comprehensive tests covering:
- Utility functions (color manipulation, validation)
- Component rendering and interaction
- Export functionality
- Payload builders
- UI primitives

Run tests with `npm run test` or `npm run test -- --watch` for continuous testing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Run `npm run test` and `npm run lint`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

Licensed under MIT. See `LICENSE` file for full license text.

## 🆘 Support

For support, please refer to `SUPPORT.md` in the repository.

## 🔄 Changelog

### Recent Updates
- Added keyboard shortcuts for enhanced productivity
- Implemented floating action buttons for quick access
- Enhanced color utility functions to handle RGBA values
- Improved error handling and validation
- Added comprehensive contrast checking
- Refined UI with better accessibility
- Optimized performance for large color sets

---

*Built with ❤️ using React, Vite, Tailwind CSS, and Zustand*