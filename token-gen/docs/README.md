# ApocaPalette User Guide

## Getting Started

- Choose a base hex color, harmony mode, theme mode, and any fine-tuning values.
- Review the generated preview, swatches, contrast checks, and color-vision previews.
- Name the theme if useful; the token prefix is retained in palette configuration and private Forge workflows.

## Saving and Projects

- **Save** stores the current palette in this browser. Up to 20 saved palettes are kept.
- **Load saved…** restores a saved palette configuration.
- Project View captures palettes locally and can load an existing `.apocaproject.json` file.
- Palette saves, projects, and saved mood boards are separate browser-local data. The public app does not currently provide project-file backup/export; keep imported project JSON elsewhere.

## Public Theme Pack

- Open the **Package** stage after reviewing a palette.
- Download the vetted Theme Pack ZIP for the reviewed modes you select. It contains CSS variables, generic tokens JSON, Figma Tokens JSON, Penpot JSON, a LibreOffice/OpenOffice palette, README, and SVG previews.
- Product Forge, SKU generation, marketplace assets, print/PDF, and broad developer export controls are private seller tools and are not available in the public app.
- Downloads require browser Blob support. Clipboard and storage behavior depends on browser permissions.

## Accessibility and Keyboard

- Use the skip link to reach main content.
- Controls expose labels, focus states, and pressed states where relevant.
- Contrast diagnostics and color-vision previews support review, but final accessibility should always be checked in the target product.
- `R` generates a random palette, `F` toggles fine tuning, and `H` toggles the header outside text inputs.

## FAQ

- **Why did saving fail?** Browser storage may be blocked or full. The app will show a warning.
- **Where is my Theme Pack?** Check the browser downloads folder; the browser may request download permission.
- **Does it work offline?** No offline guarantee is made: the app has no service worker or account sync.
- **Can I back up a project?** The public app can load project JSON but does not currently export one. Palette-save import/export is separate from Project View.

## Support

Contact streamthreadsystems@gmail.com with browser/OS, repro steps, and screenshots where possible. See `SUPPORT.md` for response expectations.
