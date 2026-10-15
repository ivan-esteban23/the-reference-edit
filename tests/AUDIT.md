# Focused performance, installation and offline audit

Scope: the buildless `dist/` application after the image extraction, manifest screenshots, storage resilience and personal-source work. This pass implements two patches.

| Priority | Finding | Result |
| --- | --- | --- |
| 1 | Two embedded TrueType fonts still dominated the HTML and were retransferred with every online HTML reload. | Extracted both unchanged font binaries to content-addressed `dist/fonts/` files. They remain required offline-shell assets. Font weights, `font-display: swap`, font licenses and typography are unchanged. |
| 2 | Manifest/Apple install labels still used “The Visual Edit”; browser titles still used “Pinterest Alternatives.” | Manifest name and Apple title now use “The Reference Edit,” with the compact short name “Reference.” Browser titles retain their translated descriptions with the current product name in all six languages. Icons, screenshots, shortcuts, scope, start URL and colors are unchanged. |
| 3 | Repeated personal-source edit/delete controls have generic accessible names. | Follow-up: include the source name in their accessible labels. Controls already have labels and working keyboard focus; this is a contextual improvement, not a failed existing accessibility assertion. |
| 4 | Safari/Firefox behavior and physical-device installation are unverified. | Follow-up: execute the Safari/Home Screen checklist in `README.md` and equivalent Firefox offline navigation checks. No additional browser-specific worker rewrite was justified by this audit. |
| 5 | The footer still describes visual assets as embedded, although assets now live in local files. | Follow-up: update the explanatory sentence and its translations. This does not change offline behavior. |

## Measured file sizes

| Measurement | Before this audit | After |
| --- | ---: | ---: |
| HTML | 2,330,812 bytes | 559,799 bytes |
| Required offline shell | 2,708,215 bytes, 9 entries | 2,265,443 bytes, 11 entries |

HTML is 76.0% smaller. The required shell is 16.3% smaller because binary font files avoid base64 overhead. Extracted fonts total 1,328,240 bytes. These are uncompressed file sizes, not measured network timings. First use still downloads the required fonts; subsequent controlled visits can reuse the shell cache. Screenshots and on-demand logos are outside the required-shell size.

## Validation

- Both fonts match their original binary bytes and load successfully in Chromium. Worker checks verify that both fonts remain loaded across upgrade, offline, delayed and failed navigation cases.
- `node tests/site.mjs`: PASS, 96 layout cases and ten check groups.
- `node tests/personal-sources.mjs`: PASS, 96 form layout cases and ten functional check groups.
- `node tests/service-worker.mjs`: PASS, all 12 check groups.
- `node --test tests/worker-storage.mjs`: PASS, all ten failure-injection tests.
- Chromium parsed the manifest without errors. Install naming, screenshot serving and `font/ttf` HTTP responses were verified. A final browser check verified all six localized page titles.
- All 58 curated article records remain byte-identical to their pre-audit state. Manifest fields outside the two naming fields are unchanged. `git diff --check` passed.

The worker key is `visual-edit-shell-audit-v1`; its cache-first shell path serves the fonts without changing the navigation strategy. No font conversion, dependency, build tool or application feature was added. Actual Android/Safari installation and production deployment were not tested.
