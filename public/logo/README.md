# Gatherly Logo Files

This directory holds the official Gatherly brand assets.

## Expected files

| File | Purpose | Status |
|---|---|---|
| `gatherly-light.png` | Full logo (wordmark + mark) for light backgrounds | **Pending — paste your file here** |
| `gatherly-dark.png` | Full logo for dark backgrounds (wordmark in white) | **Pending** |
| `gatherly-mark.png` | Calendar-G mark only (square crop, for icon generation) | **Pending** |

> [!IMPORTANT]
> The current logo lives at `public/logo.png` (light) and `public/logo-dark.png` (dark).
> Once you paste files here, run the icon-generation script:
> ```
> node scripts/generate-icons.mjs
> ```
> This crops `gatherly-mark.png` to produce `src/app/icon.png`,
> `src/app/apple-icon.png`, and `src/app/favicon.ico`.

## Usage notes

- **`BrandLogo` component** (`src/components/ui/BrandLogo.tsx`) renders the light logo
  by default and switches to the dark variant under `[data-theme="dark"]` or
  `prefers-color-scheme: dark`.
- Files should be PNG, 2× or higher resolution. Max 300 KB (Next.js `next/image`
  serves optimised copies; originals over 300 KB are re-compressed automatically).
- The wordmark is **dark navy** (`#0e1a4a`). On dark theme, use the white-wordmark
  variant (`gatherly-dark.png`).
