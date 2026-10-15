# Mobile editorial cover validation

Replaced the small mobile thumbnail with a full-proportion portrait beside the headline. The introduction, directory actions and research labels follow below; the image credit stays directly below the portrait. At 390×844 the portrait is about 149×189px (previously 88×112px), with search at 875px and the first curated card at 1,423px. Enlarged text switches to a stacked cover when there is insufficient room for two columns; mobile action labels wrap. Desktop layout and all 58 curated records remain unchanged.

The existing 96-case Chromium layout matrix now checks heading/credit/action text bounds and heading/image overlap. It caught and verified the fix for action-label overflow at 320px with 200% text. The site suite passed all eleven check groups, and Pages preparation passed its four groups including offline navigation, preferences and assets. Mobile, narrow-screen, enlarged-text and desktop captures were visually inspected; the manifest mobile capture was refreshed. The worker key is `visual-edit-shell-editorial-cover-v1`. Physical-phone/Safari testing and publication are pending merge.

# Automatic publishing and compact mobile layout validation

Added `.github/workflows/pages.yml`: all regression suites run on PRs and main pushes, while publication is restricted to successful runs on `main`. A standalone Node script prepares project-prefixed Pages snapshots outside the checkout and preserves all source records/binary assets. The publishing job updates the existing Pages source branch without rewriting history, then explicitly requests a Pages build using the workflow's contents/pages permissions. `DEPLOYMENT.md` documents operation and first-run verification. Live Actions publication still requires its first successful main run; local checks do not establish workflow-token permission readiness.

The mobile hero retains the original typography, portrait and credit with a shorter translated introduction and compact portrait. Export/sharing tools and access definitions use disclosures. Empty personal collections hide introductory/empty-state prose on mobile while keeping Add source and Backup/restore available; populated collections retain their content. The new source worker key is `visual-edit-shell-mobile-layout-v1`. Refreshed mobile/desktop install captures reflect the current layout.

At 390×844 with normal text, measured search position decreased from about 1,562px to 878px, the first card from 2,504px to 1,425px, and the hero height from 1,106px to 528px. Home/directory captures were visually inspected. All 58 curated records are unchanged.

Passed locally: site (96 layouts, eleven check groups), personal sources (96 layouts, ten groups), backup/import (96 layouts, eight groups), worker migration/navigation (twelve groups), injected worker-storage failures (ten tests), and Pages preparation (four groups covering project paths, cache cleanup, assets, installability, persistence and offline navigation). Workflow YAML parsed successfully and `git diff --check` passed. Safari/Firefox and physical-device testing of the new layout are outstanding. The current phone site remains unchanged until publication after merge.

# Personal source backup and restore validation

Added a compact “Backup and restore” disclosure in My sources. JSON export includes all personal records, metadata, image URLs and favorites, regardless of search/favorites filters. Import validates versioned backups up to 5 MB, previews counts and requires confirmation. It adds new canonical URLs while preserving existing records and favorites, skips duplicates and assigns fresh IDs. Confirmation rereads current storage to preserve other-tab changes. Invalid data is rejected before writes; failed writes preserve the collection and selected file for retry. All controls/messages support the six existing languages.

`node tests/personal-backup.mjs`: PASS, eight check groups and 96 import-dialog layout/language/theme/text-size cases, including actual online/offline downloads, restoration into an empty collection, preview/cancel, duplicate URLs, colliding IDs, inert text, invalid/unsafe/oversized files, quota retry, other-tab changes and offline import. A deferred dialog-close race found during the rejection tests was fixed so a stale close event cannot invalidate a newly reopened import dialog. The final mobile import preview was visually inspected.

Regressions passed: `node tests/site.mjs` (96 layouts, ten check groups); `node tests/personal-sources.mjs` (96 layouts, ten groups); and `node tests/service-worker.mjs` (twelve checks). All 58 curated records are byte-identical to their pre-feature state. Syntax checks and `git diff --check` pass. The worker key is `visual-edit-shell-backup-v1`; no static assets, dependencies or build step were added.

Current evidence: `/tmp/reference-regression-results/personal-backup.json` and `/tmp/reference-backup-results/mobile-import.png`. Testing used Chromium, not Safari/physical devices. Backups transfer personal text records and image URLs manually; remote image files, curated favorites and automatic synchronization are outside this feature.

# Accessibility and footer polish validation

Personal edit/delete controls now include the localized action and source name in `aria-label`; visible button text stays compact. All six footer translations now describe the saved offline fonts/cover and logos cached on later online visits, replacing the outdated embedded-assets wording. The worker key is `visual-edit-shell-audit-v2` to refresh the updated HTML. All 58 curated records are unchanged.

Passed: `node tests/personal-sources.mjs` (ten functional groups, 96 layout/language/theme/text-size cases, including contextual edit/delete labels); `node tests/site.mjs --interactions-only` (ten check groups, with the layout matrix intentionally omitted); `node tests/service-worker.mjs` (twelve checks); six-language footer readback in Chromium; and `git diff --check`. The earlier full layout results remain recorded below.

# Focused audit validation

Implemented the top two low-risk patches from `tests/AUDIT.md`: externalized both embedded fonts without changing their bytes, and aligned manifest, Apple install and localized browser titles with “The Reference Edit.” The manifest short name is “Reference.” The fonts remain in the required offline shell; the worker cache key is `visual-edit-shell-audit-v1`.

HTML decreased from 2,330,812 to 559,799 bytes (76.0%). Required-shell size decreased from 2,708,215 to 2,265,443 bytes (16.3%). These are uncompressed file sizes. Fonts, typography, all 58 curated article records, screenshots, icons and manifest fields outside naming are preserved.

Passed: both full Chromium layout matrices (192 cases total), ten UI check groups, ten personal-source functional groups, twelve worker/migration/offline groups, and all ten injected storage-failure tests. Both extracted fonts match the historical bytes and load in online/offline navigation tests. Chromium manifest parsing, install names, screenshot URLs and font MIME types passed; all six final browser titles were checked after their label update. `git diff --check` passed.

Safari/Firefox, physical-device installation and deployment remain untested. The audit records the prioritized remaining accessibility/context and explanatory-copy follow-ups; only the top two patches were implemented.

# Personal source collection validation

Added “My sources” before the curated cards, with add/edit/confirmed-delete, its own search and favorites filter, and optional category, country, tags and image URL. Name, HTTP(S) website URL and description are required. Interface labels support all six existing languages; user content is preserved. The collection uses `reference-edit-personal-sources-v1` separately from curated favorites. There is no backend, dependency or build step.

User content renders as text, URLs accept only HTTP(S), and external images use no-referrer requests and are not saved for offline use. Duplicate personal URLs are rejected. A failed write keeps stored data and the open form intact. Unreadable existing data is reported without overwriting it. Deletion has a cancelable confirmation and focus restoration; Escape closes the editor.

All 58 curated article records are byte-identical to the pre-feature state, including the image URLs introduced earlier. Personal favorites/search operate independently of curated favorites/search and Markdown export. Personal text records remain available and editable offline once the app shell is cached. The worker cache key is now `visual-edit-shell-personal-sources-v1` so existing installs receive the updated HTML; no new shell assets were added.

- `node tests/personal-sources.mjs`: PASS, ten functional check groups and 96 form layout/language/theme/text-size combinations. Covers CRUD, required fields and safe URLs, inert text, metadata search, duplicates, personal favorites, reload persistence, quota errors, corrupt storage, real Escape handling, offline creation and unchanged curated records. The final mobile capture was visually inspected after widening the personal search input.
- `node tests/site.mjs`: PASS, all 96 existing layout cases and nine check groups.
- `node tests/service-worker.mjs`: PASS, all 12 migration/offline/navigation check groups.
- `node --test tests/worker-storage.mjs`: PASS, all ten storage-failure tests.
- `git diff --check`: PASS.

Current JSON evidence is in `/tmp/reference-regression-results/`; the mobile capture is `/tmp/reference-personal-results/mobile.png`. Validation used Chromium. Safari, physical-device use and production deployment were not tested. Personal records remain local to the browser/app; they do not sync across devices or appear in the curated favorites export.

# Storage resilience validation — 14 October 2026

The worker cache version is now `visual-edit-shell-external-images-v3`. Runtime Cache Storage open/read/write failures no longer prevent a successful network response from reaching the page or its assets. A navigation cache-write failure returns the fresh HTML instead of falling back to a stale document. Failed storage reads during offline navigation return the existing reconnect response when no usable shell can be retrieved. Offline-status messages return `ready: false` on storage errors. Failed obsolete-cache cleanup does not block client claiming; explicit update messages retain their worker lifetime with `waitUntil`.

Installation remains strict: failed shell downloads or writes cannot activate an incomplete replacement. Opaque responses remain excluded from image caching; redirected navigation responses are still reconstructed, and the four-second deadline still covers reading the complete body. No application HTML, source records, image files or manifest fields changed during this step.

- `node --test tests/worker-storage.mjs`: PASS, ten tests with injected storage/quota/read errors, opaque responses, offline fallback and event lifetime checks against the actual worker source.
- `node tests/service-worker.mjs`: PASS, all 12 browser check groups, including historical migration, redirected navigation, delayed headers/body, image caching and offline recovery.
- `node tests/site.mjs`: PASS, all 96 layout cases and nine check groups, including image-byte parity and exact source-record preservation except the earlier image URL substitutions.
- Worker/test syntax checks and `git diff --check`: PASS.

These tests use Node failure injection and Chromium; they do not establish Safari compatibility or reproduce real Safari quota eviction. A macOS/iOS Safari and Home Screen manual checklist is in `tests/README.md`. No production deployment or physical-device test was performed.

# Install screenshot validation — 14 October 2026

Added real Chromium captures under `dist/screenshots/`: mobile directory (390×844 PNG, 46,238 bytes) and desktop home page (1440×900 PNG, 234,658 bytes). Both were visually inspected and declared in the manifest with `sizes`, `type`, `form_factor` and descriptive labels. All existing manifest fields are unchanged.

Chromium's `Page.getAppManifest` parsed the updated manifest without errors. Both screenshot URLs returned HTTP 200 with `image/png`, decoded successfully, and matched their declared dimensions and PNG headers. The application HTML is byte-identical to the state after image extraction. The only worker change is its cache version, now `visual-edit-shell-external-images-v2`, to refresh the cached manifest; screenshots are not added to the offline shell.

`node tests/service-worker.mjs`: PASS, all 12 check groups. `git diff --check`: PASS. The earlier 96-case UI run remains recorded below; it was not repeated for this manifest-only feature. Android's actual install dialog and physical-device installation were not tested.

# Image extraction validation — 14 October 2026

Extracted all 60 embedded images into SHA-256-addressed files under `dist/images/`, preserving the original binary bytes. HTML shrank from 3,424,048 to 2,311,542 bytes (32.5%). HTML plus external image files totals 3,146,300 bytes; these are uncompressed file sizes, not measured transfer times. Embedded fonts remain unchanged. No dependencies or build step were added.

The worker cache version is `visual-edit-shell-external-images-v1`. The cover and favicon join the existing seven shell assets; the 58 source logos cache on demand during controlled online visits. A logo that has not been cached needs an online revisit. Failed image downloads are not cached; cache-write failures do not discard a successful image response.

- `node tests/site.mjs`: PASS, 96 layout cases and nine check groups. All 60 extracted image files match the historical image bytes; restoring their original data URLs makes all 58 article records byte-identical. Every page image decodes; the existing interaction, persistence, keyboard, print and accessible-name checks pass.
- `node tests/service-worker.mjs`: PASS, 12 check groups. Failed installation recovery, historical-worker upgrade, first offline cover, on-demand logo caching, failed image download/retry, online/error/slow-header/slow-body/offline reloads, redirects, preference preservation and unrelated-cache preservation pass. All page images decode during navigation scenarios after logos have been cached.
- Current JSON results: `/tmp/reference-regression-results/site.json` and `/tmp/reference-regression-results/service-worker.json`. Validation uses Chromium on local HTTP, not Safari/Firefox, production deployment or physical-device installation. Cache-write/quota failure handling is defensive code, not a simulated quota test.

The earlier bug-fix report below describes the previous implementation and its historical test runs.

# Local bug-fix validation — 14 October 2026

Inspected clean local `main` at `746988f5781dced727f59a37dcd0f61bdf349db6`, recent history, tracked project files, ancestor instructions and Sites' local-only workflow. There is no package manifest, generated source tree or build command: `dist/` is the maintained buildless source. No pre-existing uncommitted changes were present. This task did not commit, push, deploy, open a PR or update the vault.

## Reproduced bugs and focused fixes

- Navigation timeout ended when response headers arrived. With immediate headers and a body delayed eight seconds, the old worker held up reload for approximately 9.5 seconds. The worker now retains its four-second abort deadline through reading the complete body, then stores/returns an unredirected response. Its shell key is bumped from v2 to v3. This establishes one concrete stall cause; the original prior-session localhost stall was not independently tied to that same cause.
- Language changes translated source text but did not rerun the search predicate. Searching `Free` in English returned two records; changing to Spanish incorrectly kept both visible until another input event recomputed zero matches. `setLocale` now calls the existing `update()` function after translation so visibility, counts and controls agree.

Changed production files: `dist/index.html` (one function call sequence) and `dist/sw.js` (navigation body handling and cache version). No CSS, branding, source content, dependencies or deployment configuration changed. Added dependency-free tests and their documentation under `tests/`.

## Final results

- `node tests/service-worker.mjs`: PASS, 10 checks, actual v43 (mobile-shell v2) to v3 migration.
- `OLD_REVISION=228912190b90435c10a9acbc12b99f068e33c6bf RESULTS_DIR=/tmp/reference-regression-v42 node tests/service-worker.mjs`: PASS, the same 10 checks from v42.
- Both migration runs retained two favorites, explicit dark mode, Spanish and a shared Japan filter. Failed asset installation retained the usable old worker/cache; successful retry activated the new worker and removed the old app cache while preserving an unrelated cache. The first upgraded document loaded offline. Online/error/delayed-header/delayed-body/offline reloads passed without loops; leaving the app document and reopening `/index.html` offline passed. Redirected online `/index.html` passed. All seven shell assets and offline-ready messaging were verified.
- Offline tests disconnect the server as well as enabling CDP offline emulation. Page-level emulation alone was observed to leave worker fetches online, so earlier emulation-only evidence is insufficient for these checks. No worker bypass or unregister calls are used.
- `node tests/site.mjs`: PASS, 96 cases (320/390/768/1440 px × normal/200% root text × six languages × light/dark), with disclosures expanded. No document overflow, clipped label text, tested control overlaps or excessive sticky-search height. Decorative rotated disclosure icons are excluded from label-text bounds. Reviewed 320 px English header, 390 px Spanish dark directory and 320 px Japanese 200% screenshots.
- UI regressions passed: translated search in all six languages; combined search/category/country/coverage/access/favorites; active counts and removable chips; Reset; favorite/theme/language persistence; shared filter restoration; real Enter/Space disclosure activation; print detail expansion/restoration; real Tab traversal and visible focus including the compact language selector; sticky-search/fixed-navigation clearance; 200 named accessible controls; local anchor targets and source-link URL schemes.
- All 58 source record elements remain byte-identical to the baseline, including metadata, links and embedded images. No count discrepancy. Four inline scripts and the worker compile; no page JavaScript exceptions. `node --check` for test files and `git diff --check` pass.

Machine-readable results: `/tmp/reference-regression-results/site.json`, `/tmp/reference-regression-results/service-worker.json`, `/tmp/reference-regression-v42/service-worker.json`. Representative screenshots and pre-edit backups are in `/tmp/reference-audit/`. These temporary files may be cleared by the OS; the reproducible tests remain in this checkout.

## Limits

Chromium on localhost, using real historical/current assets and simulated host-style redirects. No production-origin deployment or migration, physical-device PWA installation, full browser restart, Safari/Firefox run, screen-reader audit or full accessibility certification. Text enlargement uses root font sizing, not browser zoom. External provider pages were not visited; their original URLs/images/metadata were preserved. Cache quota/storage failures and every possible long-running network condition are outside this focused regression coverage.
