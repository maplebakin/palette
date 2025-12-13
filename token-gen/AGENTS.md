# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React app; `main.jsx` mounts the app and imports global styles, and `App.jsx` contains the token generator logic and UI.
- `src/index.css` defines Tailwind base utilities and light/dark body styles; `App.css` contains legacy Vite styles (safe to clean up if unused).
- `public/` and `index.html` host the Vite entry shell; config lives in `vite.config.js`, `tailwind.config.js`, and `postcss.config.js`.
- Reusable color helpers already live in `App.jsx`; consider extracting future utilities into `src/lib/` for clarity as the app grows.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start Vite dev server with HMR.
- `npm run build` — production bundle to `dist/`.
- `npm run preview` — serve the built bundle locally for smoke testing.
- `npm run lint` — run ESLint across the repo.

## Coding Style & Naming Conventions
- JavaScript/JSX with 2-space indent, semicolons, and single quotes (matches existing files).
- Prefer functional React components and hooks; keep stateful logic near UI while isolating reusable helpers.
- File naming: components in `PascalCase.jsx`, utilities in `camelCase.js`, CSS/Tailwind layers in `kebab-case`.
- Tailwind classes live inline in JSX; keep custom CSS minimal and colocated.
- ESLint (see `eslint.config.js`) is the source of truth; fix or justify any warnings. Unused vars must be removed unless intentionally ALL_CAPS for globals.

## Testing Guidelines
- No automated test suite is configured yet; rely on `npm run dev` plus manual QA in the browser.
- Before opening a PR, run `npm run lint` and spot-check primary flows: base color input, harmony mode selection, dark/light toggle, and token copy interactions.
- If adding tests later, align file names with source files (e.g., `App.test.jsx` beside `App.jsx`) and aim for meaningful coverage of color math and UI state.

## Commit & Pull Request Guidelines
- Use concise, imperative commit messages (`add dark-mode toggle`, `fix token copy state`).
- Keep PRs small and focused; include a short summary, screenshots/GIFs for UI changes, and any related issue links.
- Ensure lint/build pass before requesting review and call out any TODOs or follow-ups explicitly.
