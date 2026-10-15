import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {assets,browser,serve,pause,report} from './browser.mjs';

const directory=await mkdtemp(path.join(tmpdir(),'reference-backup-'));
const files=await assets(),key='reference-edit-personal-sources-v1';let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
const stored=()=>ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const check=name=>{result.checks.push(name);console.log(name);};
function source(id,url,extra={}){return {id,name:'Reference '+id,url,description:'Description '+id,category:'Photography',country:'Japan',tags:'film, portraits',image:'',favorite:false,...extra};}
async function seed(sources){await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify({version:1,sources}))});dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(key)}}))`);}
async function choose(content,name='import.json'){
 const file=path.join(directory,name);await writeFile(file,typeof content==='string'?content:JSON.stringify(content));
 const {root}=await call('DOM.getDocument');const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'#personal-import-file'});
 await call('DOM.setFileInputFiles',{nodeId,files:[file]});
 await until("!document.querySelector('#personal-import-confirm').disabled||document.querySelector('#personal-import-error').textContent.length>0",'Import validation did not finish');
}
const backup=sources=>({format:'the-reference-edit-personal-sources',version:1,exportedAt:new Date().toISOString(),sources});
try{
 await navigate();await ev("document.querySelector('#personal-backup').open=true");
 assert.equal(await ev("document.querySelector('#personal-export').disabled"),true);
 const records=[source('original','https://one.example/',{favorite:true}),source('second','https://two.example/',{name:'第二の資料',description:'保留原文',image:'https://images.example/photo.png'})];
 await seed(records);await ev("document.querySelector('#personal-search').value='original';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");
 await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:directory});await click('#personal-export');
 let downloaded;
 for(let n=0;n<100;n++){downloaded=(await readdir(directory)).find(f=>f.endsWith('.json'));if(downloaded)break;await pause(50);}
 assert.ok(downloaded,'Backup download missing');const exported=JSON.parse(await readFile(path.join(directory,downloaded),'utf8'));
 assert.equal(exported.format,'the-reference-edit-personal-sources');assert.equal(exported.version,1);assert.ok(!Number.isNaN(Date.parse(exported.exportedAt)));
 assert.deepEqual(exported.sources,records);
 check('Real JSON download includes every source, metadata, image URL, Unicode and favorites despite filters');
 await ev(`localStorage.removeItem(${JSON.stringify(key)});dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(key)}}))`);
 await click('#personal-import-open');await choose(exported);assert.equal((await stored()),null);
 assert.equal(await ev("document.querySelector('#personal-import-preview').textContent"),'2 new sources; 0 duplicate URLs will be skipped.');
 await click('#personal-import-cancel');assert.equal(await stored(),null);
 await click('#personal-import-open');await choose(exported);await click('#personal-import-confirm');
 const restored=(await stored()).sources;assert.equal(restored.length,2);
 for(let i=0;i<2;i++){assert.notEqual(restored[i].id,records[i].id);const {id,...actual}=restored[i],{id:oldId,...expected}=records[i];assert.deepEqual(actual,expected);}
 await navigate('',true);assert.equal((await stored()).sources.length,2);
 check('Import previews without writes, supports cancel, restores a fresh browser and persists with new local IDs');

 const existing=(await stored()).sources;
 const incoming=[source(existing[0].id,'https://ONE.example',{name:'Do not overwrite',favorite:false}),source(existing[0].id,'https://three.example/',{name:'<img src=x onerror=alert(1)>',description:'<script>window.backupInjected=true</script>',favorite:true}),source('again','https://three.example/',{name:'Duplicate in file'})];
 await click('#personal-import-open');await choose(backup(incoming));
 assert.equal(await ev("document.querySelector('#personal-import-preview').textContent"),'1 new sources; 2 duplicate URLs will be skipped.');
 await click('#personal-import-confirm');const merged=(await stored()).sources;
 assert.deepEqual(merged.slice(0,2),existing);assert.equal(merged.length,3);assert.equal(new Set(merged.map(s=>s.id)).size,3);
 assert.equal(merged[2].favorite,true);assert.equal(await ev('window.backupInjected===undefined'),true);
 assert.equal(await ev("[...document.querySelectorAll('.personal-source h3 img')].length"),0);
 check('Merge preserves existing records, canonicalizes URLs, skips duplicates and safely remaps colliding IDs');

 for(const invalid of ['{broken',backup([source('valid','https://valid.example/'),source('unsafe','javascript:alert(1)')]),{...backup([]),version:2},backup([source('unsafe-image','https://valid.example/',{image:'data:image/png;base64,AAAA'})]),{version:1,sources:[]}]){
  const before=await stored();await click('#personal-import-open');await choose(invalid);
  assert.equal(await ev("document.querySelector('#personal-import-confirm').disabled"),true);assert.deepEqual(await stored(),before);await click('#personal-import-cancel');
 }
 await click('#personal-import-open');await choose(' '.repeat(5*1024*1024+1),'too-large.json');
 assert.equal(await ev("document.querySelector('#personal-import-confirm').disabled"),true);await click('#personal-import-cancel');
 check('Malformed, unsupported, oversized and unsafe backups are rejected atomically');

 await click('#personal-import-open');await choose(backup([source('quota','https://quota.example/')]));const beforeQuota=await stored();
 await ev(`window.backupOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(key)})throw new DOMException('Full','QuotaExceededError');return window.backupOriginalSet.call(this,k,v);}`);
 await click('#personal-import-confirm');assert.deepEqual(await stored(),beforeQuota);assert.equal(await ev("document.querySelector('#personal-import-dialog').open"),true);
 await ev('Storage.prototype.setItem=window.backupOriginalSet');await click('#personal-import-confirm');assert.equal((await stored()).sources.length,4);
 check('Quota failure leaves the collection and selected backup intact for a successful retry');

 await click('#personal-import-open');await choose(backup([source('fresh','https://fresh.example/')]));
 await ev(`const s=JSON.parse(localStorage.getItem(${JSON.stringify(key)}));s.sources.push(${JSON.stringify(source('other-tab','https://fresh.example/',{name:'Saved in another tab'}))});localStorage.setItem(${JSON.stringify(key)},JSON.stringify(s));`);
 await click('#personal-import-confirm');assert.equal((await stored()).sources.filter(s=>s.url==='https://fresh.example/').length,1);
 assert.equal((await stored()).sources.find(s=>s.url==='https://fresh.example/').name,'Saved in another tab');
 check('Import rechecks the latest collection at confirmation to preserve other-tab changes');

 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of ['en','es','zh-Hans','zh-Hant','ja','ko']){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  await click('#personal-import-open');
  const layout=await ev("(()=>{const d=document.querySelector('#personal-import-dialog'),r=d.getBoundingClientRect();return {overflow:d.scrollWidth>d.clientWidth+1,outside:r.left<0||r.right>innerWidth+1,labeled:!!document.querySelector('#personal-import-file').labels.length}})()");
  assert.deepEqual(layout,{overflow:false,outside:false,labeled:true});result.layouts.push({width,size,theme,locale});await click('#personal-import-cancel');
 }
 check('96 backup-dialog language/theme/text-size/viewport cases and labeled file controls');
 await ev("document.documentElement.style.fontSize='100%';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 await until('!!navigator.serviceWorker.controller');connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await navigate('',true);
 await ev("document.querySelector('#personal-backup').open=true");await click('#personal-import-open');await choose(backup([source('offline','https://offline-import.example/')]));await click('#personal-import-confirm');
 assert.ok((await stored()).sources.some(s=>s.url==='https://offline-import.example/'));
 await until("document.activeElement.id==='personal-import-open'",'Import close did not restore focus');
 const offlineDirectory=path.join(directory,'offline-download');await mkdir(offlineDirectory);
 await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:offlineDirectory});await click('#personal-export');let offlineFile;
 for(let n=0;n<100;n++){offlineFile=(await readdir(offlineDirectory)).find(f=>f.endsWith('.json'));if(offlineFile)break;await pause(50);}
 assert.ok(offlineFile,'Offline backup download missing');
 assert.deepEqual(JSON.parse(await readFile(path.join(offlineDirectory,offlineFile),'utf8')).sources,(await stored()).sources);
 check('JSON import and export work offline, and closing import restores focus');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await ev("document.documentElement.dataset.theme='light'");await click('#personal-import-open');await choose(backup([source('preview','https://preview.example/')]));
 await mkdir('/tmp/reference-backup-results',{recursive:true});
 const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-backup-results/mobile-import.png',Buffer.from(screenshot.data,'base64'));
 assert.deepEqual(page.exceptions,[]);result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await rm(directory,{recursive:true,force:true});await report('personal-backup',result);}
