# Next Steps After Theme Pack Export v1

Concise handoff note after stabilizing Apocapalette Theme Pack Export v1.

## Completed Milestone

Theme Pack Export v1 is implemented, tested, documented, and production-visible from the palette Package stage.

Completed work includes:

- Validated theme pack ZIP export through `downloadThemePackArchive`.
- ZIP contents for CSS variables, generic JSON tokens, Figma tokens, Penpot tokens, LibreOffice `.soc`, README, and SVG previews.
- Product-facing generated `README.md`.
- Marketplace-ready `preview/palette-card.svg`.
- Production Package-stage **Download Theme Pack** button.
- Ignored generated `*theme-pack*.zip` artifacts.
- Internal release note, Beef Ritual product copy, and reusable product checklist.

## Next

### 1. Deploy and Live Verification

- Deploy the current production build.
- Verify the Package-stage **Download Theme Pack** button in a real browser.
- Download a fresh live ZIP and inspect the archive contents.
- Confirm production UI does not expose the broader dev-only export panel.

### 2. Beef Ritual Product Artifact Polish

- Generate the final Beef Ritual ZIP from the live app or production-equivalent browser.
- Compare final README and previews against `docs/beef-ritual-product-copy.md`.
- Create final shop listing title, description, tags, price, and license copy.
- Store final shop assets outside source control.

### 3. PNG Preview Generation

- Verify whether `preview/palette-card.png` and `preview/swatch-strip.png` generate in a live browser.
- If missing, determine whether the issue is browser support, canvas export behavior, or current rendering code.
- Keep SVG previews as the required baseline; treat PNGs as optional until live behavior is confirmed.

## Later

### Duplicate Exporter Cleanup

- Audit duplicate/unused exporters under `src/lib/exports/`.
- Keep the active `downloadThemePackArchive` path stable.
- Remove or consolidate only after product export behavior is locked down and covered.

### Bundle Size and Build Warnings

- Review Vite warnings for mixed static/dynamic imports.
- Consider code-splitting heavy export dependencies such as `jszip`.
- Update stale Browserslist/baseline data when dependency maintenance is in scope.
- Avoid bundling cleanups during product/export feature work.

## Keep Stable

- Do not broaden production export UI without a specific product reason.
- Do not change token generation as part of packaging polish.
- Do not commit generated ZIP artifacts.
- Keep Beef Ritual-specific marketing copy in docs/shop artifacts, not generic README generation.
