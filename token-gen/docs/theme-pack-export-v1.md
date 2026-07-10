# Apocapalette Theme Pack Export v1

Internal release note for the completed theme pack export work.

## Commits

- `4559f102` Complete theme pack export pipeline
- `8e858258` Ignore generated theme pack archives
- `1ba8c00a` Expose theme pack download in package stage

## What Shipped

- Production users can download the validated theme pack ZIP from the palette **Package** stage via **Download Theme Pack**.
- Product Forge, seller packaging, marketplace assets, and the broader development export panel remain private; only the vetted Theme Pack flow is public.
- Generated theme pack ZIPs are ignored with `token-gen/*theme-pack*.zip`.

## ZIP Contents

Each theme pack ZIP uses the theme slug as the root folder and includes:

- `README.md`
- `tokens.json`
- `css/variables.css`
- `figma/tokens.json`
- `penpot/tokens.json`
- `libreoffice/<theme-slug>.soc`
- `preview/palette-card.svg`
- `preview/swatch-strip.svg`
- Optional `preview/*.png` files when browser canvas export supports them

## Format Support

- CSS variables are generated from the active token stack.
- `tokens.json` is the canonical generic token payload.
- Figma token JSON is generated with the existing nested token payload builder.
- Penpot token JSON is generated from the Penpot payload and simplified for import/handoff.
- LibreOffice/OpenOffice `.soc` palettes are generated from valid colors extracted defensively from final tokens.

## Product Polish

- `README.md` was rewritten as a product-facing Markdown guide with file descriptions, usage notes, license/support guidance, and a "Made with Apocapalette" footer.
- `preview/palette-card.svg` was redesigned as a 1200x800 marketplace-ready preview with the theme name, Apocapalette label, tagline, swatches, token categories, and neutral scale.
- `preview/swatch-strip.svg` remains a focused swatch reference.

## Verification

- Release verification is recorded in the current release report and manifest; run `npm run test`, `npm run build`, and the GitHub Pages asset-path check before publishing.
- A real `Beef Ritual` artifact was generated and inspected locally; the ZIP was valid and contained all required files. The artifact remains local and ignored.

## Intentionally Untouched

- Dev-only `ExportStage` remains gated.
- Dev-only `ExportsPanel` bundle/listing/print-pack controls remain gated.
- Individual JSON/CSS/PDF/asset-pack export buttons were not exposed in production.
- Duplicate/unused exporter cleanup was not attempted.
- Token generation and export payload formats were not changed beyond the v1 pack additions.
