import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assets,browser,serve,report,repo} from './browser.mjs';

const temporary=await mkdtemp(path.join(tmpdir(),'reference-pages-')),output=path.join(temporary,'site'),base='/the-reference-edit/';
const original=await assets(),files=new Map(),result={checks:[],passed:false};let page,offline=false;
const check=name=>{result.checks.push(name);console.log(name);};
try{
 execFileSync(process.execPath,[path.join(repo,'scripts/prepare-pages.mjs'),output,base,'test'],{stdio:'pipe'});
 async function walk(dir=''){for(const entry of await readdir(path.join(output,dir),{withFileTypes:true})){const relative=path.posix.join(dir,entry.name);if(entry.isDirectory())await walk(relative);else files.set('/'+relative,await readFile(path.join(output,relative)));}}
 await walk();assert.ok(files.has('/.nojekyll'));
 for(const [name,bytes] of await assets())assert.deepEqual(bytes,original.get(name),'Source file changed during Pages preparation');
 for(const [name,bytes] of original)if(!['/index.html','/manifest.webmanifest','/sw.js'].includes(name))assert.deepEqual(files.get(name),bytes);
 const records=html=>html.toString().match(/<article\b[^>]*class="source"[\s\S]*?<\/article>/g);
 assert.equal(records(files.get('/index.html')).length,58);assert.deepEqual(records(files.get('/index.html')),records(original.get('/index.html')));
 check('Pages preparation preserves the source checkout, all 58 records and binary assets');
 page=await browser((req,res)=>{
  if(offline){req.socket.destroy();return;}
  if(!req.url.startsWith(base)){res.writeHead(404);res.end();return;}
  req.url='/'+req.url.slice(base.length);serve(files,req,res);
 });
 files.set('/seed.html',Buffer.from('<!doctype html><title>Cache migration fixture</title>'));
 // Omarchy scans only the first 100 KB of raw HTML; it does not execute scripts.
 const raw=await (await fetch(page.origin+base)).text();
 const discovered=execFileSync('bash',['-c',String.raw`tr '\n' ' ' | grep -oiE "<link[^>]*rel=[\"'][^\"']*apple-touch-icon[^\"']*[\"'][^>]*>" | grep -oiE "href=[\"'][^\"']+" | head -1 | sed -E "s/^href=[\"']//"`],{input:Buffer.from(raw).subarray(0,100000),encoding:'utf8'}).trim();
 assert.ok(discovered,'Omarchy cannot discover a static Apple touch icon in the first 100 KB');
 // Match Omarchy's root-relative URL handling; avoid a false pass from browser URL resolution.
 assert.equal(discovered,base+'icons/reference-edit-apple-touch-180.png');
 const iconResponse=await fetch(page.origin+discovered);
 assert.equal(iconResponse.status,200);assert.match(iconResponse.headers.get('content-type'),/^image\/png/);
 assert.deepEqual(Buffer.from(await iconResponse.arrayBuffer()).subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
 check('Omarchy discovers and downloads the PNG from raw HTML under the Pages project path');
 await page.call('Page.navigate',{url:page.origin+base+'seed.html'});
 await page.until("location.pathname.endsWith('/seed.html')&&document.readyState==='complete'");
 await page.evaluate("Promise.all(['reference-edit-phone-preview-shell-old','unrelated-project-cache'].map(async name=>{const c=await caches.open(name);await c.put('/fixture',new Response('keep'));}))");
 await page.navigate(base);await page.until('!!navigator.serviceWorker.controller');await page.navigate(base,true);
 const cacheNames=await page.evaluate('caches.keys()');assert.ok(!cacheNames.includes('reference-edit-phone-preview-shell-old'));assert.ok(cacheNames.includes('unrelated-project-cache'));
 check('Pages activation replaces the earlier preview cache while preserving unrelated origin caches');
 const manifestResponse=await page.call('Page.getAppManifest');assert.deepEqual(manifestResponse.errors,[]);
 const manifest=JSON.parse(manifestResponse.data);assert.equal(manifest.start_url,base);assert.equal(manifest.scope,base);assert.equal(manifest.id,base);
 const registration=await page.evaluate('navigator.serviceWorker.getRegistration().then(r=>({scope:r.scope,script:r.active.scriptURL}))');
 assert.equal(registration.scope,page.origin+base);assert.equal(registration.script,page.origin+base+'sw.js');
 for(const asset of [...manifest.icons,...manifest.screenshots])assert.equal(await page.evaluate(`fetch(${JSON.stringify(asset.src)}).then(r=>r.status)`),200);
 for(const icon of manifest.icons){
  const dimensions=await page.evaluate(`(async()=>{const i=new Image();i.src=${JSON.stringify(icon.src)};await i.decode();return i.naturalWidth+'x'+i.naturalHeight;})()`);
  assert.equal(dimensions,icon.sizes);
 }
 assert.ok(await page.evaluate("Promise.all([...document.images].map(i=>i.decode())).then(()=>true)"));
 assert.ok(await page.evaluate("document.fonts.size===2&&[...document.fonts].every(f=>f.status==='loaded')"));
 assert.deepEqual((await page.call('Page.getInstallabilityErrors')).installabilityErrors,[]);
 check('Project-path manifest, worker scope, images, fonts and installability work');
 await page.evaluate("document.querySelector('.favorite-source').click();document.querySelector('#personal-add').click();const f=document.querySelector('#personal-form');f.elements.name.value='Pages reference';f.elements.url.value='https://example.com/pages';f.elements.description.value='Project-path persistence';f.requestSubmit();");
 await page.evaluate("document.querySelector('[data-collection-action=note]').click();document.querySelector('#directory-note-input').value='Project-path note';document.querySelector('#directory-note-form').requestSubmit()");
 const saved=await page.evaluate('({...localStorage})');
 await page.evaluate("navigateDirectory(false);document.querySelector('[data-topic=typography]').click()");
 offline=true;await page.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await page.navigate(base,true);
 assert.deepEqual(await page.evaluate('({...localStorage})'),saved);
 assert.equal(await page.evaluate('topic'),'typography');
 assert.equal(await page.evaluate("cards.filter(c=>!c.hidden).length"),4);
 await page.evaluate("document.querySelector('[data-topic=photography]').click()");
 assert.equal(await page.evaluate("cards.filter(c=>!c.hidden).length"),5);
 await page.evaluate("document.querySelector('#reset').click()");
 assert.equal(await page.evaluate("document.querySelectorAll('.personal-source').length"),1);
 assert.equal(await page.evaluate("document.querySelector('.directory-note-text').textContent"),'Project-path note');
 assert.ok(await page.evaluate("Promise.all([...document.images].map(i=>i.decode())).then(()=>true)"));
 assert.ok(await page.evaluate("document.fonts.size===2&&[...document.fonts].every(f=>f.status==='loaded')"));
 await page.evaluate("document.querySelector('#mobile-saved').click()");
 assert.ok(await page.evaluate("!document.querySelector('#my-sources').hidden&&document.querySelectorAll('.collection-source').length===1&&document.querySelectorAll('.personal-source').length===1"));
 await page.navigate(base+'index.html#my-sources');assert.deepEqual(await page.evaluate('({...localStorage})'),saved);
 assert.ok(await page.evaluate("!document.querySelector('#my-sources').hidden&&document.querySelector('#mobile-saved-count').textContent==='2'"));
 await page.evaluate("location.hash='#workflow'");await page.until("document.querySelector('#workflow').open&&!collectionOpen");
 await page.evaluate("location.hash='#source-chooser'");await page.until("document.querySelector('#source-chooser').open");
 await page.evaluate("document.querySelector('[data-chooser-goal=history]').click()");assert.equal(await page.evaluate("document.querySelectorAll('.chooser-card').length"),3);
 assert.deepEqual(page.exceptions,[]);
 check('Published paths preserve favorites and personal records during offline reload and index navigation');
 result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{if(page)await page.close();await rm(temporary,{recursive:true,force:true});await report('pages',result);}
