// Builds the deployable site from src/ into dist/.
// The output stays a single self-contained index.html on purpose: prepare-pages.mjs only
// rewrites root-relative URLs inside index.html and sw.js, and sw.js precaches a fixed SHELL
// list that OFFLINE_STATUS requires in full. Hashed chunks would break both.
import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** @type {RegExp} */
const SOURCE_RECORD = /<article\b[^>]*class="source"[\s\S]*?<\/article>/g;
const EXPECTED_RECORDS = 58;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src');
const output = path.join(root, 'dist');

await rm(output, {recursive: true, force: true});
await mkdir(path.dirname(output), {recursive: true});
await cp(source, output, {recursive: true, errorOnExist: true, force: false});

const html = await readFile(path.join(output, 'index.html'), 'utf8');
const records = html.match(SOURCE_RECORD) ?? [];
if (records.length !== EXPECTED_RECORDS) {
  throw new Error(`Expected ${EXPECTED_RECORDS} curated source records, built ${records.length}`);
}

const built = await readdir(output, {recursive: true});
console.log(`Built dist/: ${built.length} files, ${records.length} source records.`);
