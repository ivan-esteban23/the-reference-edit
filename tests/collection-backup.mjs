import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {assets,browser,serve,pause,report} from './browser.mjs';

const temporary=await mkdtemp(path.join(tmpdir(),'reference-complete-backup-'));
const files=await assets(),personalKey='reference-edit-personal-sources-v1',favoriteKey='visual-edit-favorites-v1';let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
const check=name=>{result.checks.push(name);console.log(name);};
const source=(id,extra={})=>({id,name:'Source '+id,url:`https://${id}.example/`,description:'References '+id,category:'Photography',country:'Japan',tags:'film, portraits',image:'',favorite:false,...extra});
const backup=(directoryFavorites,sources)=>({format:'the-reference-edit-collection',version:1,exportedAt:new Date().toISOString(),directoryFavorites,sources});
const stored=()=>ev(`({favorites:localStorage.getItem(${JSON.stringify(favoriteKey)}),personal:localStorage.getItem(${JSON.stringify(personalKey)})})`);
async function seed(favorites,sources){await ev(`localStorage.setItem(${JSON.stringify(favoriteKey)},${JSON.stringify(JSON.stringify(favorites))});localStorage.setItem(${JSON.stringify(personalKey)},${JSON.stringify(JSON.stringify({version:1,sources}))});dispatchEvent(new StorageEvent('storage',{key:null}))`);}
async function choose(data){
 const file=path.join(temporary,'incoming.json');await writeFile(file,JSON.stringify(data));
 const {root}=await call('DOM.getDocument'),{nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'#personal-import-file'});
 await call('DOM.setFileInputFiles',{nodeId,files:[file]});
 await until("!document.querySelector('#personal-import-confirm').disabled||!!document.querySelector('#personal-import-error').textContent",'No import preview');
}
async function download(name){
 const directory=path.join(temporary,name);await mkdir(directory);await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:directory});
 await click('#personal-export');let file;
 for(let n=0;n<100;n++){file=(await readdir(directory)).find(f=>f.endsWith('.json'));if(file)break;await pause(50);}
 assert.ok(file,'Download missing');return JSON.parse(await readFile(path.join(directory,file),'utf8'));
}
try{
 await navigate();await click('#mobile-saved');await ev("document.querySelector('#personal-backup').open=true");
 const urls=await ev("cards.slice(0,4).map(c=>c.querySelector('.favorite-source').dataset.url)");
 const records=[source('one',{favorite:true}),source('two',{name:'第二の資料',description:'保留原文'})];
 await seed(urls.slice(0,2),records);
 await ev("document.querySelector('[data-collection-kind=personal]').click();document.querySelector('#personal-search').value='nothing';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");
 const exported=await download('complete');
 assert.equal(exported.format,'the-reference-edit-collection');assert.equal(exported.version,2);assert.ok(!Number.isNaN(Date.parse(exported.exportedAt)));
 assert.deepEqual(exported.directoryFavorites,urls.slice(0,2));assert.deepEqual(exported.sources,records);
 await seed(urls.slice(0,1),[]);assert.equal(await ev("document.querySelector('#personal-export').disabled"),false);
 const directoryOnly=await download('directory-only');assert.deepEqual(directoryOnly.directoryFavorites,urls.slice(0,1));assert.deepEqual(directoryOnly.sources,[]);
 check('Real complete and directory-only downloads include all favorites and personal metadata despite view filters');

 await seed([],[]);const empty=await stored();await click('#personal-import-open');await choose(exported);
 assert.deepEqual(await stored(),empty);await click('#personal-import-cancel');assert.deepEqual(await stored(),empty);
 await click('#personal-import-open');await choose(exported);await click('#personal-import-confirm');
 const restored=await stored();assert.deepEqual(JSON.parse(restored.favorites),exported.directoryFavorites);
 const restoredSources=JSON.parse(restored.personal).sources;
 for(let i=0;i<records.length;i++){assert.notEqual(restoredSources[i].id,records[i].id);assert.deepEqual({...restoredSources[i],id:records[i].id},records[i]);}
 await navigate('',true);assert.equal(await ev("document.querySelector('#mobile-saved-count').textContent"),'4');
 check('Fresh-device restore previews without writes, supports cancel and restores both kinds with favorite states');

 const old=JSON.parse((await stored()).personal).sources;
 const incoming=backup([urls[0],urls[2],urls[2],'https://retired-directory.example/'],[source(old[0].id,{url:old[0].url,name:'Do not replace',favorite:false}),source(old[0].id,{url:'https://fresh.example/',favorite:true}),source('repeat',{url:'https://fresh.example/'})]);
 await click('#personal-import-open');await choose(incoming);
 assert.equal(await ev("document.querySelector('#personal-import-preview').textContent"),'1 directory favorites and 1 added sources to add; 4 duplicates skipped; 1 directory URLs unavailable.');
 await click('#personal-import-confirm');const merged=await stored();
 assert.deepEqual(JSON.parse(merged.personal).sources.slice(0,2),old);assert.equal(JSON.parse(merged.personal).sources.length,3);
 assert.deepEqual(JSON.parse(merged.favorites),urls.slice(0,3));
 check('Merge preserves existing records, skips duplicate URLs, remaps IDs and reports unavailable directory entries');

 for(const invalid of [backup(['javascript:alert(1)'],[source('safe')]),backup('not-an-array',[]),{...backup([],[]),version:3},backup([urls[3]],[source('unsafe',{url:'data:text/html,x'})])]){
  const before=await stored();await click('#personal-import-open');await choose(invalid);
  assert.equal(await ev("document.querySelector('#personal-import-confirm').disabled"),true);assert.deepEqual(await stored(),before);await click('#personal-import-cancel');
 }
 await click('#personal-import-open');await choose(backup([urls[3]],[source('race')]));
 await seed(urls,[...JSON.parse(merged.personal).sources,source('other-tab',{url:'https://race.example/',name:'Saved by another tab'})]);
 await click('#personal-import-confirm');assert.equal(JSON.parse((await stored()).personal).sources.at(-1).name,'Saved by another tab');
 for(const key of [favoriteKey,personalKey]){
  await seed(urls.slice(0,1),[source('preserved')]);await click('#personal-import-open');await choose(backup([urls[1]],[source('new')]));
  await ev(`localStorage.setItem(${JSON.stringify(key)},'{broken')`);const before=await stored();
  await click('#personal-import-confirm');assert.deepEqual(await stored(),before);assert.equal(await ev("document.querySelector('#personal-import-dialog').open"),true);await click('#personal-import-cancel');
 }
 check('Whole-file validation rejects unsafe data; confirmation rechecks current records and preserves corrupt stores');

 const baselineFavorites=[urls[0]],baselineSources=[source('existing')],next=backup([urls[1]],[source('new')]);
 for(const failingKey of [favoriteKey,personalKey]){
  await seed(baselineFavorites,baselineSources);const before=await stored();await click('#personal-import-open');await choose(next);
  await ev(`window.backupSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(failingKey)})throw new DOMException('Full','QuotaExceededError');return window.backupSet.call(this,k,v);}`);
  await click('#personal-import-confirm');assert.deepEqual(await stored(),before);
  assert.equal(await ev("document.querySelector('#personal-import-dialog').open"),true);
  await ev('Storage.prototype.setItem=window.backupSet');await click('#personal-import-confirm');
  assert.equal(JSON.parse((await stored()).personal).sources.length,2);
 }
 await seed(baselineFavorites,baselineSources);await click('#personal-import-open');await choose(next);
 await ev(`window.backupSet=Storage.prototype.setItem;window.favoriteWrites=0;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(personalKey)}||(k===${JSON.stringify(favoriteKey)}&&++window.favoriteWrites>1))throw new DOMException('Blocked','QuotaExceededError');return window.backupSet.call(this,k,v);}`);
 await click('#personal-import-confirm');assert.equal(await ev("document.querySelector('#personal-import-error').textContent"),'Import is incomplete. Your existing records are safe. Check browser storage and retry to finish.');
 assert.deepEqual(JSON.parse((await stored()).personal).sources,baselineSources);
 await ev('Storage.prototype.setItem=window.backupSet');await click('#personal-import-confirm');
 assert.deepEqual(JSON.parse((await stored()).favorites),[urls[0],urls[1]]);assert.equal(JSON.parse((await stored()).personal).sources.length,2);
 check('Failures in either store roll back completed writes; failed rollback reports incomplete import and retries safely');

 await click('#personal-import-open');await choose(backup([urls[2]],[source('layout')]));
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of ['en','es','zh-Hans','zh-Hant','ja','ko']){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  const layout=await ev("(()=>{const d=document.querySelector('#personal-import-dialog'),r=d.getBoundingClientRect();return {overflow:d.scrollWidth>d.clientWidth+1,outside:r.left<0||r.right>innerWidth+1,preview:!!document.querySelector('#personal-import-preview').textContent}})()");
  assert.deepEqual(layout,{overflow:false,outside:false,preview:true});result.layouts.push({width,size,theme,locale});
 }
 check('96 populated-preview viewport/text-size/theme/language cases preserve readable counts and controls');
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await mkdir('/tmp/reference-complete-backup-results',{recursive:true});await pause(200);const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-complete-backup-results/mobile-import.png',Buffer.from(screenshot.data,'base64'));await click('#personal-import-cancel');
 await until('!!navigator.serviceWorker.controller');connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await navigate('',true);
 const offline=await download('offline');await seed([],[]);await click('#personal-import-open');await choose(offline);await click('#personal-import-confirm');
 await navigate('',true);assert.deepEqual(JSON.parse((await stored()).favorites),offline.directoryFavorites);assert.equal(JSON.parse((await stored()).personal).sources.length,offline.sources.length);
 assert.deepEqual(page.exceptions,[]);check('Complete export, fresh restore and persistence work offline');result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await rm(temporary,{recursive:true,force:true});await report('collection-backup',result);}
