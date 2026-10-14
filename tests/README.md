# Local regression checks

The maintained site is the buildless `dist/` directory. No installation or build step is required. These tests use Node's built-in APIs and a local Chromium executable; they create isolated temporary browser profiles and remove them afterward.

From the repository root:

```sh
node tests/service-worker.mjs
node tests/site.mjs
```

For a focused interaction/keyboard rerun, use `node tests/site.mjs --interactions-only`; that mode explicitly omits the layout matrix.

Set `CHROMIUM` if Chromium is not at `/usr/bin/chromium`. JSON results go to `/tmp/reference-regression-results/`; set `RESULTS_DIR` to change that location. Loopback server/browser permissions may be needed in a sandbox.

The migration fixture defaults to commit `746988f` (version 43, shell v2). To also check the earlier version 42 installation:

```sh
OLD_REVISION=228912190b90435c10a9acbc12b99f068e33c6bf RESULTS_DIR=/tmp/reference-regression-v42 node tests/service-worker.mjs
```

Worker checks use the actual historical HTML/worker, redirects, interrupted asset downloads, delayed headers/body, HTTP errors and offline navigations. Offline cases disconnect the local server as well as enabling browser network emulation. They never bypass or unregister the service worker. A test-only HTML marker proves the new document was cached and displayed. Favorites, theme, language, shared filters, cache cleanup and reload counts are checked.

UI checks cover 96 viewport/text/language/theme combinations with disclosures expanded, exact preservation of all 58 source records, translated search, combined filters/counts/reset, preference persistence, native keyboard disclosure control, print expansion/restoration, keyboard focus and accessible control names. Text sizing changes the root font to 200%; this is not browser zoom. Source links are checked for preserved destinations and valid URL schemes; external providers are not visited. This is focused Chromium regression coverage, not a complete accessibility audit or physical-device installation test.
