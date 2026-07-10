# Theme Pack Export v1 Follow-Up Status

Concise status note after stabilizing Apocapalette Theme Pack Export v1 and converting the first product outputs into buyer-ready packages.

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

## Completed Follow-Up

- Product Forge can now generate buyer-ready individual kits, bundles, and mini palettes with `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, `tags.txt`, marketplace preview SVGs, and mode-aware package structure.
- Beef Ritual, Cobalt Chapel, and Strange Systems Starter Pair were regenerated from the current Product Forge path.
- Fresh ZIP artifacts were validated with `unzip -t`.
- Product folder docs now include license/support files and marketplace preview assets.

## Remaining Release Work

- Deploy with `VITE_BASE=/palette/` for GitHub Pages.
- Verify the public Package-stage **Download Theme Pack** button in a real browser after deployment.
- Confirm production UI does not expose Product Forge, seller packaging, marketplace assets, or broader development export controls.
- Convert generated SVG preview assets to PNG/JPG only if required by a marketplace.
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
