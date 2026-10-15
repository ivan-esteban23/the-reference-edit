# Local regression checks

The maintained site is the buildless `dist/` directory. No installation or build step is required. These tests use Node's built-in APIs and a local Chromium executable; they create isolated temporary browser profiles and remove them afterward.

[Deployment instructions](../DEPLOYMENT.md) describe the GitHub workflow and Pages snapshot preparation. PRs run tests without publishing; successful test runs on `main` prepare the hosted paths, update the Pages source branch and request a Pages build.

From the repository root:

```sh
node tests/service-worker.mjs
node tests/site.mjs
node tests/chooser.mjs
node --test tests/worker-storage.mjs
node tests/collection.mjs
node tests/personal-sources.mjs
node tests/personal-backup.mjs
node tests/collection-backup.mjs
node tests/source-notes.mjs
node tests/pages.mjs
```

For a focused interaction/keyboard rerun, use `node tests/site.mjs --interactions-only`; that mode explicitly omits the layout matrix.

Set `CHROMIUM` if Chromium is not at `/usr/bin/chromium`. JSON results go to `/tmp/reference-regression-results/`; set `RESULTS_DIR` to change that location. Loopback server/browser permissions may be needed in a sandbox.

The migration fixture defaults to commit `746988f` (version 43, shell v2). To also check the earlier version 42 installation:

```sh
OLD_REVISION=228912190b90435c10a9acbc12b99f068e33c6bf RESULTS_DIR=/tmp/reference-regression-v42 node tests/service-worker.mjs
```

Worker checks use the actual historical HTML/worker, redirects, interrupted asset downloads, delayed headers/body, HTTP errors and offline navigations. Offline cases disconnect the local server as well as enabling browser network emulation. They never bypass or unregister the service worker. A test-only HTML marker proves the new document was cached and displayed. Favorites, theme, language, shared filters, cache cleanup and reload counts are checked.

UI checks cover 96 viewport/text/language/theme combinations with disclosures expanded, exact preservation of all 58 source records, translated search, combined filters/counts/reset, preference persistence, native keyboard disclosure control, print expansion/restoration, keyboard focus and accessible control names. Text sizing changes the root font to 200%; this is not browser zoom. Source links are checked for preserved destinations and valid URL schemes; external providers are not visited. This is focused Chromium regression coverage, not a complete accessibility audit or physical-device installation test.

Images live in content-addressed files under `dist/images/`; keep their names in sync with their SHA-256 prefix when replacing an image. The cover and favicon are precached; source logos cache on demand during controlled visits. Logos not yet cached need an online visit, while the offline directory and cover remain available. The worker cache version must change when app assets change.

Fonts live in content-addressed `dist/fonts/` files and are required offline-shell assets. Keep each filename in sync with its SHA-256 prefix and update the worker shell list/version when replacing a font. Font licenses remain in the HTML. UI checks verify both font binaries against the historical fixture and require loaded fonts; worker checks require loaded fonts during navigation fallback. See [the focused audit](AUDIT.md) for current size measurements, install naming and follow-ups.

The source-record check permits only image URL substitutions against the historical fixture: it verifies all 60 extracted images byte-for-byte, restores the original data URLs, and then compares all 58 article records exactly. Browser checks also decode every page image. Worker checks exercise the cover on the first offline reload, logo caching, failed image downloads and retry, and image decoding during offline and slow/error navigation fallback.

Before expanding disclosures for the 96-case layout matrix, the site suite checks the default 390px mobile entry: search must start before 1,000px and the first source before 1,550px. It also verifies the collection destination is initially hidden and directory tools can be expanded with their actions visible. These bounds target the previous excessively long entry without constraining enlarged-text layouts. All 58 records remain in the directory. The layout matrix also checks cover heading, credit and action text bounds, and prevents the heading from overlapping the portrait.

`pages.mjs` runs the actual publication preparer into a fresh temporary directory, verifies source/binary preservation and tests the project-prefix URLs in Chromium. It checks old-preview cache cleanup without deleting unrelated caches, manifest and worker scope, icons/screenshots, fonts/images, installability, saved preferences and offline navigation. It does not publish or simulate GitHub Actions permissions.

`worker-storage.mjs` runs the actual worker in Node's VM with injected Cache API failures and native Fetch response objects. Its ten tests cover quota errors, unavailable/unreadable storage, useful offline fallback, opaque image rejection from caching, strict installation, activation cleanup failure and offline-status replies. These are deterministic failure tests, not Safari or real quota simulations. Runtime storage failures must allow successful online responses through; installation still requires all shell writes to succeed. The four-second navigation deadline stays active through the full HTML body, and navigation responses are reconstructed to remove redirect metadata.

Open “Collection” on mobile or “My collection” in the desktop header to see saved directory entries and every source you add together. “All,” “From directory” and “Added by me” filter that view; shared search covers both kinds, and Favorites only narrows personal records while retaining directory favorites. Collection controls do not change directory filters. The collection count combines directory favorites and all personal records; the directory Favorites filter and Markdown export still cover only directory entries. “View in directory” returns to a full curated record. Name, website URL and short description are required; category, country, tags and an HTTP(S) image URL are optional. External images are not stored for offline use. Text records work offline after the app shell is cached. The collection is local to the current browser/app, without account or cross-device sync.

Open “Backup and restore” in My collection. “Export collection (.json)” includes every added source, optional metadata and personal favorite state, plus every stored directory favorite URL and its notes, regardless of active filters. Notes for unsaved sources are retained and exported too. “Import collection” accepts both the complete format and older personal-source files. The existing Markdown export remains available for reading/exporting directory favorites, rather than restoration. External images are represented by URLs; image binaries, accounts and automatic sync are not included.

Complete backups now use `{format:"the-reference-edit-collection",version:2,exportedAt,directoryFavorites:[url],sources:[...],directoryNotes:[{url,text}]}`. Version 1 complete backups remain importable without changing notes. Older application versions reject version 2 rather than silently dropping its notes. Legacy `{format:"the-reference-edit-personal-sources",version:1,...,sources:[...]}` files restore personal records without changing directory favorites. Files up to 5 MB are accepted. Validation checks the whole document before preview/confirmation; unsafe URLs or unsupported versions cause no writes. Preview reports new directory favorites, new personal records, duplicates and directory URLs absent from the current curated catalog. Unknown directory URLs are reported and skipped. Existing personal records/favorite states win; new records receive fresh IDs.

Confirmation rereads favorites, personal sources and notes. Changes are additive, with rollback attempted if a later storage write fails. If storage also blocks rollback, the dialog explicitly reports an incomplete import, preserves the selected file and allows retry; duplicate detection makes retry safe. Existing records are never deliberately replaced. This is not a transaction across three localStorage keys, nor a guarantee against simultaneous writes from other tabs. Closing the file dialog without confirmation makes no changes. Export/import work offline after the shell is cached.


Storage key `reference-edit-personal-sources-v1` contains `{version:1,sources:[...]}`, separately from curated favorites. Writes read the latest stored collection before changing one record. Invalid stored data is preserved and reported; a failed write preserves both stored data and the open form. User content renders through DOM text APIs, and source/image URLs accept only HTTP(S). Data entered by the user stays unchanged when the interface language changes.

`personal-sources.mjs` runs ten functional check groups and 96 form layout/language/theme/text-size cases. It covers CRUD, URL validation, inert user text, optional metadata, duplicate detection, search/favorites, persistence, storage failure recovery, corrupt-data preservation, keyboard dismissal/focus and offline editing. It also verifies all 58 curated DOM records remain unchanged after personal-source operations. A current mobile capture goes to `/tmp/reference-personal-results/mobile.png`; JSON results use the normal results directory.

`personal-backup.mjs` runs eight backup check groups and 96 import-dialog layout/language/theme/text-size cases. It tests real JSON downloads, restore into an empty collection, preview/cancel, non-destructive merges, URL/ID collisions, invalid/oversized files, quota-failure retry, other-tab changes and offline import/export. The current mobile capture is `/tmp/reference-backup-results/mobile-import.png`; JSON results use the normal results directory. Temporary imported files and download directories are removed after the run.

## Manual Safari checks (not automated)

Use current macOS Safari and an iPhone/iPad Safari installation over HTTPS. Record the OS/browser versions and repeat the core checks in an Add to Home Screen installation.

1. Start with empty site storage, load online, then revisit online after the worker takes control so source logos can cache. Confirm the cover and logos render, and offline status reports ready.
2. Save two favorites, select a language, theme and country filter. Disconnect the network; reload `/` and `/index.html`, then close and reopen the installed app. Confirm the directory, cover, cached logos and preferences survive.
3. With a prior version installed, publish the new version to a test origin. Check that upgrade preserves preferences, shows the new document offline and avoids reload loops. Interrupt a shell asset download during an update; confirm the old installation stays usable, then retry online.
4. Test a host that redirects `/index.html` to `/`. Repeat online navigation, offline reload and reopening from outside the app document.
5. On a controllable test server, delay headers and then the HTML body beyond four seconds in separate cases. With a cached shell present, confirm fallback arrives around the deadline; also test an HTTP 503.
6. Clear/evict site storage after installation and reconnect. Confirm online navigation recovers; an offline visit with no retained shell cannot work. Check storage-restricted/private browsing where available: the online page should remain usable, and unavailable storage must not leave the offline-status request unanswered. Quota-write failure is covered by the injected tests until reproduced on a real Safari device.

`collection.mjs` runs seven functional groups and 96 collection layout/language/theme/text-size cases. It covers both navigation entry points, empty-state guidance, prior-format data without writes/migration, combined counts, origin filters, shared search, independent directory filters, browser history, directory details, removal/edit/delete, keyboard focus, cross-tab storage notifications, failed/corrupt favorite storage and offline persistence. Current captures go to `/tmp/reference-collection-results/`. Directory records are represented by separate `.collection-source` cards, so the 58 original `.source` records remain intact. Existing storage formats are retained; JSON version 1 files remain importable alongside the new version 2 export.

`collection-backup.mjs` verifies real complete and directory-only downloads, fresh-device restoration of both stores, mixed duplicates and missing catalog URLs, existing metadata/favorite preservation, malformed/unsafe files, corrupt destination data, latest-storage rechecks, failures in either write, rollback failure/retry, and complete offline export/restore. It also checks 96 populated-preview viewport/text-size/theme/language cases. Captures go to `/tmp/reference-complete-backup-results/`.

Research guides consolidate reading, project routes, workflow and the reference record into `#routes`. Three native disclosures cover inspiration, topic research and moodboards; `#notes` retains one shared record template. Historic `#workflow` and `#landscape` fragments open their matching guides, and native keyboard controls/print expansion are covered by the site suite. The 96-case layout matrix includes expanded guide headings and body copy. Pages checks also open the moodboard guide offline from the collection view.

“Help me choose” is a collapsed disclosure in the directory introduction, also linked from each research guide. Four fixed goals each map to three existing catalog URLs. Suggestions reuse translated source purposes and access notes; PureRef uses its existing editorial-selection description. They are editorial recommendations, not personalized rankings. Goal choices remain in page memory; favorites use the existing storage/collection/backup path. “View in directory” clears filters, opens the full record and focuses its link. Provider websites still require internet.

`chooser.mjs` checks all four recommendation sets, exact catalog preservation before saving, save/remove/persistence and collection counts, quota-failure warnings, focus, independent filters, full-record navigation, guide links, translation and 96 expanded chooser layouts. It also disconnects the server for offline recommendation/saving/navigation checks. Current mobile evidence is `/tmp/reference-chooser-results/mobile.png`. Pages tests also open and use the chooser offline under the project prefix.

Saved directory cards in My collection offer Add note / Edit note. Notes are plain text, at most 2,000 characters, and participate in collection search. Clear the editor and save to remove a note; removing the favorite keeps its note for re-saving later. Notes use `reference-edit-directory-notes-v1` with `{version:1,notes:[{url,text}]}`. Note writes reread current storage, preserve other notes and detect a same-note change since the editor opened. Failed writes/corrupt storage preserve the draft and existing data. No note text is placed in URLs or translated.

Version 2 imports validate note URLs/text before writes, add missing note URLs, keep existing notes, and report added/skipped note counts. Retained notes need not belong to a currently saved/available catalog entry. Existing rollback/retry handling now includes the notes key. JSON backups include notes; the legacy directory Markdown export remains separate.

`source-notes.mjs` checks note CRUD/search/plain-text safety, focus, retention/re-saving, quota/corrupt storage, same-note conflicts, unrelated changes, version 2 restore, version 1 compatibility, notes-only backups, import validation/rollback, 96 editor layouts and offline editing/export/restore. Current editor capture: `/tmp/reference-notes-results/mobile.png`. Pages checks also verify a note survives offline under the project prefix.
