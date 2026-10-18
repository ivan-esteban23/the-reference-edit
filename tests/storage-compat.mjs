// Storage compatibility: values written in the shape the published pre-migration build uses must be
// read by that build and by this one the same way, and neither may rewrite them on boot.
// 91f89ec is the last commit before the TypeScript migration; 746988f predates the collection features.
import assert from 'node:assert/strict';
import {assets, browser, gitFile, report, serve} from './browser.mjs';

const premigration = process.env.PREMIGRATION_REVISION || '91f89ec19b5f6652de0cc56a42f168421f1db582';

const files = await assets();
const keys = {
  favorites: 'visual-edit-favorites-v1',
  theme: 'visual-edit-theme',
  language: 'visual-edit-language',
  personal: 'reference-edit-personal-sources-v1',
  notes: 'reference-edit-directory-notes-v1',
  folders: 'reference-edit-collection-folders-v1',
  recent: 'reference-edit-recently-viewed-v1',
};

const favoriteURLs = ['https://www.032c.com/', 'https://www.anothermag.com/'];
const personalSource = {id: 'fixture-source', favorite: true, name: 'Fixture Studio', url: 'https://fixture.example.org/', description: 'A personal source written by the earlier build.', category: 'Print', country: 'Japan', tags: 'fixture', image: ''};
const directoryNote = {url: favoriteURLs[0], text: 'Paper stock and grid notes.'};
const folder = {id: 'fixture-folder', name: 'Fixture Atelier', directory: [favoriteURLs[1]], personal: [personalSource.id]};
const stored = {
  [keys.favorites]: JSON.stringify(favoriteURLs),
  [keys.theme]: 'dark',
  [keys.language]: 'es',
  [keys.personal]: JSON.stringify({version: 1, sources: [personalSource]}),
  [keys.notes]: JSON.stringify({version: 1, notes: [directoryNote]}),
  [keys.folders]: JSON.stringify({version: 1, folders: [folder]}),
  [keys.recent]: JSON.stringify({version: 1, items: [favoriteURLs[1], favoriteURLs[0]]}),
};

const readBack = `JSON.stringify(Object.fromEntries(${JSON.stringify(Object.keys(stored))}.map(name=>[name,localStorage.getItem(name)])))`;
const warningsHidden = "['personal-warning','folder-warning','directory-notes-warning','collection-storage-warning'].every(id=>document.querySelector('#'+id).hidden)";

async function verify(label, page) {
  const {evaluate: ev, call, navigate, close} = page;
  const result = {label, checks: [], passed: false};
  try {
    await call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: false});
    await navigate();
    for (const [name, value] of Object.entries(stored)) await ev(`localStorage.setItem(${JSON.stringify(name)},${JSON.stringify(value)})`);
    // Boot again on data the other build owns; nothing here is written by this page.
    await navigate('', true);
    assert.equal(await ev(`document.documentElement.dataset.theme`), 'dark', `${label}: stored theme not applied`);
    assert.equal(await ev('document.documentElement.lang'), 'es', `${label}: stored language not applied`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('.favorite-source[aria-pressed="true"]')].map(b=>b.dataset.url)`), favoriteURLs, `${label}: stored favorites not restored`);
    assert.equal(await ev(warningsHidden), true, `${label}: a stored payload was rejected`);
    await ev("document.querySelector('#mobile-saved').click()");
    assert.deepEqual(await ev(`[...document.querySelectorAll('#personal-list .collection-source h3 a')].map(a=>a.textContent)`), ['032c', 'AnOther'], `${label}: stored directory favorites missing`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('#personal-list .personal-source h3 a')].map(a=>[a.textContent,a.href])`), [['Fixture Studio', personalSource.url]], `${label}: stored personal source missing`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('#personal-list .directory-note-text')].map(p=>p.textContent)`), [directoryNote.text], `${label}: stored note missing`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('#folder-list .folder-row')].map(r=>r.dataset.folderId)`), [folder.id], `${label}: stored folder missing`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('#recently-viewed-list .recent-source h3 a')].map(a=>a.textContent)`), ['AnOther', '032c'], `${label}: stored history missing`);
    assert.deepEqual(JSON.parse(await ev(readBack)), stored, `${label}: a stored value was rewritten on boot`);
    result.checks.push('pre-migration shaped values read');
    // A second boot proves the first one left byte-identical values and stays idempotent.
    await navigate('', true);
    assert.deepEqual(JSON.parse(await ev(readBack)), stored, `${label}: a stored value changed on the second boot`);
    assert.equal(await ev(warningsHidden), true, `${label}: a payload was rejected on the second boot`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('.favorite-source[aria-pressed="true"]')].map(b=>b.dataset.url)`), favoriteURLs, `${label}: favorites changed on the second boot`);
    assert.deepEqual(page.exceptions, [], `${label}: page exceptions`);
    result.passed = true;
  } finally {
    await close();
    await report(`storage-compat-${label}`, result);
  }
  return result;
}

const result = {checks: [], passed: false, builds: []};
try {
  const oldFiles = new Map(files);
  oldFiles.set('/index.html', gitFile(premigration, 'dist/index.html'));
  const old = await verify('premigration', await browser((req, res) => serve(oldFiles, req, res)));
  const current = await verify('typescript', await browser((req, res) => serve(files, req, res)));
  result.builds = [old.label, current.label];
  console.log('Pre-migration favorites, notes, folders, history, theme and language read identically by both builds');
  result.passed = true;
} catch (error) {
  result.error = error.stack;
  process.exitCode = 1;
}
finally {await report('storage-compat', result);}
