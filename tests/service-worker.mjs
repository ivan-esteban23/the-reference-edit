import assert from 'node:assert/strict';
import vm from 'node:vm';
import {assets, baseline, browser, gitFile, pause, report, serve} from './browser.mjs';

const files = await assets(), oldFiles = new Map(files);
for (const name of ['index.html', 'sw.js']) oldFiles.set('/' + name, gitFile(baseline, 'dist/' + name));
for (const [map, revision] of [[oldFiles, 'old'], [files, 'new']]) {
  map.set('/index.html', Buffer.from(map.get('/index.html').toString().replace('<head>', `<head><meta name="test-revision" content="${revision}">`)));
}
const cacheName = map => map.get('/sw.js').toString().match(/const CACHE='([^']+)'/)[1];
const oldCache = cacheName(oldFiles), newCache = cacheName(files);
const oldShell = vm.runInNewContext(oldFiles.get('/sw.js').toString().match(/const SHELL=(\[[^;]+\]);/)[1]);
const newShell = vm.runInNewContext(files.get('/sw.js').toString().match(/const SHELL=(\[[^;]+\]);/)[1]);
// Only content-addressed page images use this worker's on-demand caching route.
const galleryAssets = ['/data/references.json',...JSON.parse(files.get('/data/references.json')).references.filter(r=>r.assetStatus==='available').map(r=>r.image)];
assert.ok(galleryAssets.every(path=>newShell.includes(path)), 'Gallery assets must be in the required offline shell');
const imagePaths = [...files.keys()].filter(path=>/^\/images\/image-[a-f0-9]{16}\.(?:png|jpg|gif|ico|svg)$/.test(path));
const logoPath = imagePaths.find(path=>!newShell.includes(path));
assert.notEqual(oldCache, newCache, 'Migration fixture must have an older shell version');
new vm.Script(files.get('/sw.js').toString());
let revision = 'old', mode = 'online', connected = true;
const result = {baseline, oldCache, newCache, serviceWorkerBypassed: false, checks: []};
const page = await browser((req, res, later) => {
  // Block the server as well: page-level CDP offline emulation alone may leave worker fetches online.
  if (!connected) {req.socket.destroy(); return;}
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (mode === 'image-error' && pathname === logoPath) {res.writeHead(503); res.end(); return;}
  if (mode === 'broken-install' && pathname === galleryAssets[1]) {res.writeHead(503); res.end(); return;}
  if (mode === 'error' && (pathname === '/' || pathname === '/index.html')) {res.writeHead(503); res.end(); return;}
  if (pathname === '/index.html') {res.writeHead(302, {Location: '/'}); res.end(); return;}
  if (pathname === '/' && mode.startsWith('slow-')) {
    if (mode === 'slow-body') {res.writeHead(200, {'Content-Type': 'text/html'}); res.write('<!doctype html>');}
    later(() => {if (!res.destroyed) {if (res.headersSent) res.end(files.get('/index.html')); else serve(files, req, res);}}, 8000);
    return;
  }
  serve(revision === 'old' ? oldFiles : files, req, res);
});
const {evaluate: ev, call, until, navigate} = page;
const check = (name, detail = {}) => {result.checks.push({name, ...detail}); console.log(name);};
const offline = value => {connected = !value; return call('Network.emulateNetworkConditions', {offline: value, latency: 0, downloadThroughput: -1, uploadThroughput: -1});};
try {
  await navigate();
  await until('!!navigator.serviceWorker.controller', 'Old worker did not claim page');
  await until(`caches.open(${JSON.stringify(oldCache)}).then(c=>c.keys()).then(k=>k.length===${oldShell.length})`, 'Old offline shell incomplete');
  const saved = await ev(`(()=>{
    document.querySelector('.favorite-source').click();document.querySelectorAll('.source')[2].querySelector('.favorite-source').click();
    const oldTheme=document.querySelector('[data-theme-choice=dark]');
    if(oldTheme)oldTheme.click();else{if(document.documentElement.dataset.theme==='dark')document.querySelector('[data-theme-toggle]').click();document.querySelector('[data-theme-toggle]').click();}
    const l=document.querySelector('#language');l.value='es';l.dispatchEvent(new Event('change'));
    const c=document.querySelector('#country-filter');c.value='Japan';c.dispatchEvent(new Event('change'));
    return {...localStorage};})()`);
  assert.equal(JSON.parse(saved['visual-edit-favorites-v1']).length, 2);
  await ev("caches.open('unrelated-project-cache').then(c=>c.put('/unrelated',new Response('keep')))");
  revision = 'new'; mode = 'broken-install';
  const oldActive = await ev(`new Promise(async(resolve,reject)=>{
    const r=await navigator.serviceWorker.getRegistration(),previous=r.active;
    const timer=setTimeout(()=>reject(Error('Failed install test timed out')),15000);
    r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(w.state==='redundant'){clearTimeout(timer);resolve(r.active===previous);}});},{once:true});await r.update();})`);
  assert.ok(oldActive);
  assert.ok(await ev(`caches.keys().then(k=>k.includes(${JSON.stringify(oldCache)}))`));
  await offline(true); await navigate('', true);
  assert.equal(await ev("document.querySelector('[name=test-revision]').content"), 'old');
  await offline(false); check('Failed install retains usable old worker and offline shell');
  mode = 'online';
  const initialNavigations = page.navigations.length;
  await ev(`new Promise(async(resolve,reject)=>{
    const r=await navigator.serviceWorker.getRegistration();const previous=r.active;
    const timer=setTimeout(()=>reject(Error('Upgrade timed out')),15000);
    navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve(true);},{once:true});
    await r.update();if(r.active!==previous&&navigator.serviceWorker.controller===r.active){clearTimeout(timer);resolve(true);}})`);
  await until(`caches.keys().then(k=>k.includes(${JSON.stringify(newCache)})&&!k.includes(${JSON.stringify(oldCache)}))`, 'Cache cleanup failed');
  await pause(300); assert.equal(page.navigations.length, initialNavigations, 'Automatic update caused unexpected reloads');
  check('Upgrade activates and removes old app cache without reload loops');
  async function verify() {
    assert.ok(await ev("document.fonts.size===2&&[...document.fonts].every(f=>f.status==='loaded')"), 'Offline shell fonts unavailable');
    assert.deepEqual(await ev('({...localStorage})'), saved, 'Preferences changed');
    assert.deepEqual(await ev(`({revision:document.querySelector('[name=test-revision]').content,lang:document.documentElement.lang,theme:document.documentElement.dataset.theme,favorites:favoriteKeys.size,country:document.querySelector('#country-filter').value,controlled:!!navigator.serviceWorker.controller})`),
      {revision: 'new', lang: 'es', theme: 'dark', favorites: 2, country: 'Japan', controlled: true});
  }
  await offline(true); await navigate('', true); await verify();
  assert.ok(await ev("document.querySelector('.cover-image img').decode().then(()=>true)"), 'Precached cover unavailable on first offline reload');
  await until("document.querySelectorAll('.editorial-card img').length===3");
  assert.ok(await ev("Promise.all([...document.querySelectorAll('.editorial-card img')].map(i=>i.decode())).then(()=>true)"));
  check('First reload after upgrade displays new revision offline; preferences and shared filters retained');
  await offline(false);
  mode = 'online'; await navigate('', true);
  assert.ok(await ev("Promise.all([...document.images].map(i=>i.decode())).then(()=>true)"), 'External images did not decode');
  await until(`caches.open(${JSON.stringify(newCache)}).then(async c=>(await Promise.all(${JSON.stringify(imagePaths)}.map(p=>c.match(p)))).every(Boolean))`, 'On-demand images were not cached');
  check('Cover is precached; all source logos cache on demand after a controlled online visit');
  // An HTTP failure must not poison a logo cache entry, and a later visit can retry it.
  await ev(`caches.open(${JSON.stringify(newCache)}).then(c=>c.delete(${JSON.stringify(logoPath)}))`);
  mode = 'image-error';
  assert.equal(await ev(`fetch(${JSON.stringify(logoPath)}).then(r=>r.status)`), 503);
  assert.equal(await ev(`caches.open(${JSON.stringify(newCache)}).then(c=>c.match(${JSON.stringify(logoPath)})).then(Boolean)`), false);
  mode = 'online';
  assert.equal(await ev(`fetch(${JSON.stringify(logoPath)}).then(r=>r.status)`), 200);
  check('Failed image downloads stay uncached and succeed on retry');
  for (const scenario of ['online', 'error', 'slow-headers', 'slow-body', 'offline']) {
    mode = scenario === 'offline' ? 'online' : scenario;
    if (scenario === 'offline') await offline(true);
    const before = page.navigations.length, durationMs = await navigate('', true);
    await verify(); await pause(250);
    assert.ok(await ev("Promise.all([...document.images].map(i=>i.decode())).then(()=>true)"), `${scenario}: cached images unavailable`);
    assert.equal(page.navigations.length, before + 1, 'Reload loop');
    if (scenario.startsWith('slow-')) assert.ok(durationMs < 6500, `${scenario}: fallback took ${durationMs}ms (4s network budget)`);
    check(scenario + ' reload', {durationMs});
  }
  await call('Page.navigate', {url: 'about:blank'});
  await until("location.href==='about:blank'&&document.readyState==='complete'", 'App document did not close');
  await navigate('/index.html#directory?country=Japan'); await verify(); check('Reopen /index.html offline after leaving the app document');
  await offline(false); mode = 'online';
  await navigate('/index.html#directory?country=Japan', true); await verify(); check('Online redirected /index.html navigation');
  const cache = await ev(`(async()=>{
    const keys=await caches.keys(),shell=await caches.open(${JSON.stringify(newCache)});
    const ready=await new Promise(resolve=>{const m=new MessageChannel();m.port1.onmessage=e=>{m.port1.close();resolve(e.data.ready);};navigator.serviceWorker.controller.postMessage({type:'OFFLINE_STATUS'},[m.port2]);});
    return {keys,assets:(await shell.keys()).length,ready};})()`);
  assert.equal(cache.assets, newShell.length + imagePaths.filter(path=>!newShell.includes(path)).length); assert.ok(cache.ready); assert.ok(cache.keys.includes('unrelated-project-cache')); assert.ok(!cache.keys.includes(oldCache));
  assert.deepEqual(page.exceptions, []); result.cache = cache; result.passed = true;
} catch (error) {result.passed = false; result.error = error.stack; process.exitCode = 1;}
finally {await page.close(); await report('service-worker', result);}
