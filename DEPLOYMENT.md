# Publishing the website

The authored source is `src/` (HTML template, stylesheet, TypeScript scripts, i18n data, assets). `dist/` is the built site that GitHub Pages serves, committed to the repository so the publishing job needs no toolchain:

https://ivan-esteban23.github.io/the-reference-edit/

## Building

```sh
npm ci
npm run typecheck
npm run build
```

`scripts/build.mjs` inlines the stylesheet and every TypeScript script into a single self-contained `dist/index.html`; no bundled chunks are produced on purpose, because the Pages preparation and the worker precache list only understand the single-file layout (see `Pages path handling` below). The test job runs `git diff --exit-code -- dist` after `npm run build`, so a committed `dist/` that the build cannot reproduce fails the pull request. Never edit `dist/index.html` by hand: change `src/` and rebuild. `dist/sw.js` is still copied verbatim from `src/sw.js`.

The Pages setting remains **Deploy from a branch → `preview/phone` → `/ (root)`**. Despite its historical name, that branch is generated deployment output. Do not merge it into `main` or edit the generated files manually.

## Automatic publication

`.github/workflows/pages.yml` runs the regression suites for pull requests and pushes to `main`. After a successful test run on `main`, it:

1. Prepares a fresh static snapshot outside the checkout with `scripts/prepare-pages.mjs`.
2. Updates the generated `preview/phone` branch using a normal commit/push, preserving its history.
3. Explicitly requests a GitHub Pages build. This is necessary because pushes made with the workflow's `GITHUB_TOKEN` do not trigger Pages builds automatically.

Publication uses the workflow token with `contents: write` and `pages: write`, without a personal access token or repository secret. PR tests have read-only repository access and cannot publish. A failed test blocks the publishing job. Publishing requests are serialized for `main`.

On first merge of the workflow, inspect **Actions → Test and publish website**, then the Pages build. The publishing job must succeed and the Pages build must complete before claiming that a merge is live. A successful local test alone does not validate GitHub's deployment permissions. If repository policy denies the workflow token's requested permissions, adjust the Actions policy in GitHub rather than adding credentials to source.

The workflow can also be run manually from `main` using **Actions → Test and publish website → Run workflow**. If the explicit Pages-build request fails after the deployment-branch push, rerun the failed job; it is safe to prepare a new snapshot and commit. The existing live site stays available until Pages publishes a successful build.

## Pages path handling

The application source uses root URLs. Pages hosts this project below `/the-reference-edit/`, so the preparation script adjusts the manifest, worker scope, shell paths and root links in the generated output. Curated source records and all binary assets remain unchanged. It scopes worker caches to this Pages application and cleans up the previous phone-preview cache, preserving unrelated origin caches. User storage stays on the same origin and is not reset by publication.

To prepare a local snapshot without modifying the source checkout:

```sh
pages_directory=$(mktemp -d)
node scripts/prepare-pages.mjs "$pages_directory/site" /the-reference-edit/ "$(git rev-parse HEAD)"
```

The output directory must be fresh and outside the checkout. The script does no transpilation, dependency installation or font/image conversion. The site continues to work directly from `dist/` for normal local development.

`node tests/pages.mjs` verifies scoped routing, manifest/worker registration, installability, cache cleanup, fonts/images, local favorites/personal records and offline navigation against the prepared snapshot.


## Editorial gallery catalog and offline paths

`dist/data/references.json` is copied byte-for-byte into the prepared snapshot. The preparation script scopes the HTML's catalog URL and worker shell URLs; it does not rewrite image paths inside this JSON. The gallery explicitly resolves each validated canonical `/images/references/...` value relative to the application root derived from its catalog URL, so the same catalog works at `/` and `/the-reference-edit/`.

The catalog and all three local editorial JPEGs are required precache assets. Bump the source worker cache version whenever the UI, catalog or an illustration changes. Failed downloads/writes leave an existing worker installation active; offline gallery availability requires a completed installation and retained browser cache. Pages and worker migration tests exercise the project path, offline images and upgrades. The gallery test runs in the existing read-only CI test job; publication conditions and permissions remain unchanged.
