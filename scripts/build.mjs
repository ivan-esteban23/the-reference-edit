// Builds the deployable site from src/ into dist/.
// The output stays a single self-contained index.html on purpose: prepare-pages.mjs only
// rewrites root-relative URLs inside index.html and sw.js, and sw.js precaches a fixed SHELL
// list that OFFLINE_STATUS requires in full. Hashed chunks would break both.
import {cp, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {transformWithOxc} from 'vite';

/** @type {RegExp} */
const SOURCE_RECORD = /<article\b[^>]*class="source"[\s\S]*?<\/article>/g;
const EXPECTED_RECORDS = 58;
// These directories hold the authored code that gets inlined instead of copied as files.
const INLINED_DIRECTORIES = ['ts', 'styles'];
/** @type {RegExp} */
const INLINED_STYLE = /<style data-src="([^"]+)"><\/style>/g;
/** @type {RegExp} */
const INLINED_SCRIPT = /<script data-src="([^"]+)"><\/script>/g;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src');
const published = path.join(root, 'dist');

/**
 * @param {string} file relative to src/
 * @returns {Promise<string>}
 */
async function load(file) {
  const code = await readFile(path.join(source, file), 'utf8');
  if (!file.endsWith('.ts')) return code;
  // Transform only: bundling would rename top-level bindings, and these files share one
  // global lexical scope exactly like the classic <script> tags they replace. OXC picks the
  // TypeScript loader from the .ts extension.
  const {code: js} = await transformWithOxc(code, file);
  if (/^\s*(?:interface|type)\s|:\s*(?:string|number|boolean)\s*[;=)]/m.test(js)) {
    throw new Error(`${file} still contains TypeScript syntax after transformation`);
  }
  return js;
}

/**
 * @param {string} code
 * @param {string} label
 */
function assertEmbeddable(code, label) {
  if (code.includes('</script')) throw new Error(`${label} contains a script end tag`);
}

// Build into a scratch directory first: a failing transform must never leave dist/ half written,
// because prepare-pages.mjs and the Pages publish job both read it as the published site.
const staging = await mkdtemp(path.join(tmpdir(), 'reference-build-'));
const output = path.join(staging, 'dist');
await cp(source, output, {recursive: true, errorOnExist: true, force: false,
  filter: entry => {
    const relative = path.relative(source, entry);
    return relative === '' || !INLINED_DIRECTORIES.includes(relative.split(path.sep)[0] ?? '');
  }});

const htmlPath = path.join(output, 'index.html');
let html = await readFile(htmlPath, 'utf8');

/**
 * @param {string} markup
 * @param {RegExp} pattern
 * @param {(file: string) => Promise<string>} render
 * @returns {Promise<{markup: string, count: number}>}
 */
async function inline(markup, pattern, render) {
  let count = 0;
  for (const tag of [...markup.matchAll(pattern)]) {
    const file = tag[1];
    if (file === undefined) continue;
    markup = markup.replace(tag[0], await render(file));
    count++;
  }
  return {markup, count};
}

const styles = await inline(html, INLINED_STYLE, async file => {
  const rawCss = await load(file);
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([;{},])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;}/g, '}').trim();
  if (css.includes('</style')) throw new Error(`${file} contains a style end tag`);
  return `<style>${css}</style>`;
});
const scripts = await inline(styles.markup, INLINED_SCRIPT, async file => {
  const js = await load(file);
  assertEmbeddable(js, file);
  return `<script>${js}</script>`;
});
html = scripts.markup;
const inlined = {styles: styles.count, scripts: scripts.count};

await writeFile(htmlPath, html);

const records = html.match(SOURCE_RECORD) ?? [];
if (records.length !== EXPECTED_RECORDS) {
  throw new Error(`Expected ${EXPECTED_RECORDS} curated source records, built ${records.length}`);
}
if (html.includes('data-src=')) {
  throw new Error('An inline placeholder survived the build');
}

const built = await readdir(output, {recursive: true, withFileTypes: true});
await rm(published, {recursive: true, force: true});
await cp(output, published, {recursive: true});
await rm(staging, {recursive: true, force: true});
console.log(`Built dist/: ${built.filter(entry => entry.isFile()).length} files, ${records.length} source records, `
  + `${inlined.styles} inlined stylesheets, ${inlined.scripts} inlined scripts.`);
