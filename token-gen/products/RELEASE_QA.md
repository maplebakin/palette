# Product Release QA

Last checked: 2026-07-04

## Current SKUs

- Beef Ritual Website & Brand Color Kit
  - ZIP: `products/beef-ritual/Beef-Ritual-Website-Brand-Color-Kit.zip`
  - Size: 216 KB
  - Coverage: Light, Dark, and Pop mode folders plus combined all-mode references
  - Folder docs: `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, `tags.txt`
  - Preview assets: `preview/`, `marketplace-preview/marketplace-cover.svg`

- Cobalt Chapel Website & Brand Color Kit
  - ZIP: `products/cobalt-chapel/Cobalt-Chapel-Website-Brand-Color-Kit.zip`
  - Size: 216 KB
  - Coverage: Light, Dark, and Pop mode folders plus combined all-mode references
  - Folder docs: `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, `tags.txt`
  - Preview assets: `preview/`, `marketplace-preview/marketplace-cover.svg`

- Strange Systems Starter Pair
  - ZIP: `products/strange-systems-starter-pair/Strange-Systems-Starter-Pair.zip`
  - Size: 432 KB
  - Coverage: Nested Beef Ritual and Cobalt Chapel Theme Pack ZIPs
  - Folder docs: `README.md`, `USAGE.txt`, `LICENSE.txt`, `SUPPORT.txt`, `shop-listing.md`, `tags.txt`
  - Preview assets: `preview/`, `marketplace-preview/marketplace-cover.svg`, `marketplace-preview/bundle-comparison.svg`

## Verification Completed

- `unzip -t products/*/*.zip` passes for all generated product ZIPs.
- Buyer-facing product folders do not contain placeholder, draft, internal, TODO, or final-shop language.
- Product package sizes are below Etsy's 20 MB per-file digital download limit.
- Product package docs include support contact and license terms.
- SVG preview assets are present for all SKUs.

## Release Checklist

- Convert SVG marketplace preview assets to PNG/JPG only when a target marketplace requires raster images.
- Upload the ZIP named in each SKU section, not older ignored theme-pack artifacts.
- Use `shop-listing.md` as listing source copy and `tags.txt` as the keyword seed.
- Re-run `npm run lint`, `npm run test`, `npm run build`, and `unzip -t products/*/*.zip` before adding or updating SKUs.
