# Theme Pack Product Checklist

Reusable checklist for turning a generated Apocapalette theme pack into a shop-ready digital product.

## Pre-Export Checks

- [ ] Theme has a clear name and slug.
- [ ] Base color, harmony mode, and theme mode are intentional.
- [ ] Token prefix is short, readable, and product-safe.
- [ ] Key swatches look distinct enough for listing previews.
- [ ] Text/background pairs pass the intended contrast checks.
- [ ] Print mode is only enabled if the product needs print/CMYK extras.

## ZIP Contents Checks

- [ ] ZIP root folder uses the expected theme slug.
- [ ] `README.md` is present.
- [ ] `tokens.json` is present.
- [ ] `css/variables.css` is present.
- [ ] `figma/tokens.json` is present.
- [ ] `penpot/tokens.json` is present.
- [ ] `libreoffice/<theme-slug>.soc` is present.
- [ ] `preview/palette-card.svg` is present.
- [ ] `preview/swatch-strip.svg` is present.
- [ ] Optional PNG previews are present or intentionally absent.
- [ ] Archive opens cleanly with no ZIP integrity errors.

## README Checks

- [ ] Theme name appears at the top.
- [ ] Short description explains what the pack is.
- [ ] Included files are listed clearly.
- [ ] CSS variables usage is explained.
- [ ] JSON token usage is explained.
- [ ] Figma token note is included.
- [ ] Penpot token note is included.
- [ ] LibreOffice `.soc` usage is included.
- [ ] Preview file note is included.
- [ ] License/usage placeholder or final terms are included.
- [ ] Footer says `Made with Apocapalette`.

## Preview Image Checks

- [ ] `palette-card.svg` displays the theme name.
- [ ] `palette-card.svg` includes Apocapalette label/tagline.
- [ ] Main palette swatches are visible and readable.
- [ ] Token/category labels are present where practical.
- [ ] `swatch-strip.svg` shows a clean swatch reference.
- [ ] Preview files are suitable for a listing gallery or product screenshot.

## Shop Listing Copy Checks

- [ ] Product title is concise and searchable.
- [ ] Short description is clear in one or two sentences.
- [ ] Long description explains audience, use cases, and included formats.
- [ ] Included-files copy matches the actual ZIP.
- [ ] Ideal-use cases are specific.
- [ ] Tags/keywords include format terms and style terms.
- [ ] Tone fits the theme without overselling.

## Pricing and Licensing Checks

- [ ] Price is set for single-theme sale.
- [ ] Bundle/intro price is documented if applicable.
- [ ] License allows the intended customer uses.
- [ ] Resale/redistribution boundaries are explicit.
- [ ] Any required attribution terms are clear.

## Final Release Checks

- [ ] Fresh ZIP generated from current app/export flow.
- [ ] ZIP inspected after generation.
- [ ] Generated ZIP artifact is ignored by git.
- [ ] Product copy and README agree on included files.
- [ ] Screenshots/previews match the final theme.
- [ ] Tests/build status is known before publishing.
- [ ] Final shop listing assets are stored outside source control if generated.
