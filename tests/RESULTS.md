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
