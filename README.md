# The Reference Edit

**The Reference Edit** is a self-contained editorial directory and progressive web application for visual research, fashion references, and moodboarding. It curates **58 sources** across independent magazines, historical garment archives, street style photography, Asian fashion intelligence, and visual organization tools, localized in six languages (`en`, `es`, `ja`, `ko`, `zh-Hans`, `zh-Hant`) with offline shell caching and local-first personal collection tools.

## Quick Start

Requires **Node.js >= 22** and a local Chromium/Chrome installation for headless browser regression suites.

```bash
# Install dependencies cleanly from package-lock.json
npm ci

# Fast static verification (TypeScript typechecks + production build)
npm run check

# Build the self-contained site into dist/
npm run build

# Run the full verification suite (typecheck, build, and all Node + headless Chromium suites)
npm test
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run typecheck` | Runs TypeScript checks across `tsconfig.json` (source modules) and `tsconfig.legacy.json`. |
| `npm run build` | Transforms and inlines `src/styles/app.css` and `src/ts/*.ts` into a self-contained `dist/index.html` and copies static assets to `dist/`. |
| `npm run check` | Runs `npm run typecheck && npm run build` for fast pre-commit verification. |
| `npm test` | Runs `typecheck`, `build`, and all automated verification suites in `tests/`. |

## Project Layout

- `src/` — Authored source files:
  - `src/index.html` — Editorial markup, 58 curated source records, SEO/Open Graph/Twitter metadata, and JSON-LD structured data.
  - `src/styles/app.css` — Responsive editorial layout, light/dark themes, print stylesheet, and container queries.
  - `src/ts/` — Client-side TypeScript modules (`directory.ts`, `collection.ts`, `gallery.ts`, `theme-language.ts`, `i18n*.ts`).
  - `src/data/` — Catalog data (`references.json` for editorial gallery items and `sources.json` for structured directory metadata).
  - `src/images/`, `src/fonts/`, `src/icons/`, `src/screenshots/` — Self-hosted visual assets, fonts, PWA icons, and social preview cards.
  - `src/sw.js` & `src/manifest.webmanifest` — Offline service worker and PWA web app manifest.
- `scripts/` — Build and publishing utilities:
  - `scripts/build.mjs` — Builds `dist/` from `src/` and verifies record/placeholder invariants.
  - `scripts/prepare-pages.mjs` — Rewrites root-relative paths in `dist/` for GitHub Pages subpath hosting (`/the-reference-edit/`).
  - `scripts/generate-seo.mjs` — Extracts and synchronizes structured source metadata and JSON-LD in `src/index.html`.
- `tests/` — End-to-end headless Chromium and Node regression suites (`site.mjs`, `a11y.mjs`, `search-discovery.mjs`, `responsive.mjs`, `service-worker.mjs`, `pages.mjs`, `workflows.mjs`, and collection/backup suites).

## Deployment & Verification Reference

- See [`DEPLOYMENT.md`](DEPLOYMENT.md) for GitHub Pages deployment, CI workflow (`.github/workflows/ci.yml`), Pages publishing (`.github/workflows/pages.yml`), and Dependabot maintenance (`.github/dependabot.yml`).
- See [`tests/RESULTS.md`](tests/RESULTS.md) for historical regression and archive verification notes.
