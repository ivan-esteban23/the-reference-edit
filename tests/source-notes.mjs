import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {assets,browser,serve,pause,report} from './browser.mjs';

const temporary=await mkdtemp(path.join(tmpdir(),'reference-notes-'));
const files=await assets(),notesKey='reference-edit-directory-notes-v1',favoriteKey='visual-edit-favorites-v1',personalKey='reference-edit-personal-sources-v1';let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);},click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
const notes=()=>ev(`JSON.parse(localStorage.getItem(${JSON.stringify(notesKey)}))?.notes||[]`);
const snapshot=()=>ev(`Object.fromEntries([${JSON.stringify(favoriteKey)},${JSON.stringify(personalKey)},${JSON.stringify(notesKey)}].map(k=>[k,localStorage.getItem(k)]))`);
const draft=text=>ev(`document.querySelector('#directory-note-input').value=${JSON.stringify(text)};document.querySelector('#directory-note-input').dispatchEvent(new Event('input'))`);
const save=()=>ev("document.querySelector('#directory-note-form').requestSubmit()");
async function seedNotes(records){await ev(`localStorage.setItem(${JSON.stringify(notesKey)},${JSON.stringify(JSON.stringify({version:1,notes:records}))});dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(notesKey)}}))`);}
async function choose(data){
 const file=path.join(temporary,'restore.json');await writeFile(file,JSON.stringify(data));const {root}=await call('DOM.getDocument');
 const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'#personal-import-file'});await call('DOM.setFileInputFiles',{nodeId,files:[file]});
 await until("!document.querySelector('#personal-import-confirm').disabled||!!document.querySelector('#personal-import-error').textContent");
}
async function download(name){
 const directory=path.join(temporary,name);await mkdir(directory);await ev("document.querySelector('#personal-backup').open=true");
 await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:directory});await click('#personal-export');let file;
 for(let n=0;n<100;n++){file=(await readdir(directory)).find(f=>f.endsWith('.json'));if(file)break;await pause(50);}
 assert.ok(file,'No backup download');return JSON.parse(await readFile(path.join(directory,file),'utf8'));
}
try{
 await navigate();const urls=await ev("cards.slice(0,3).map(c=>c.querySelector('.favorite-source').dataset.url)");
 await ev("cards[0].querySelector('.favorite-source').click();cards[1].querySelector('.favorite-source').click();document.querySelector('#mobile-saved').click()");
 const favoritesBefore=await ev(`localStorage.getItem(${JSON.stringify(favoriteKey)})`);
 await click('[data-collection-action=note]');assert.equal(await ev('document.activeElement.id'),'directory-note-input');
 const text='Portrait lighting — café\n<img src=x onerror=alert(1)> <script>window.notesInjected=true</script>';
 await draft(text);await save();await pause(50);
 assert.equal((await notes())[0].text,text);assert.equal(await ev("document.querySelector('.directory-note-text').textContent"),text);
 assert.equal(await ev("document.querySelector('.directory-note-text img')===null&&window.notesInjected===undefined"),true);
 assert.equal(await ev("document.activeElement.dataset.collectionAction"),'note');
 await ev("document.querySelector('#personal-search').value='café';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");
 assert.equal(await ev("document.querySelectorAll('.collection-source').length"),1);
 await click('[data-collection-action=note]');await draft('Cancelled edit');await click('#directory-note-cancel');assert.equal((await notes())[0].text,text);
 await click('[data-collection-action=note]');await draft('');await save();assert.deepEqual(await notes(),[]);
 assert.equal(await ev(`localStorage.getItem(${JSON.stringify(favoriteKey)})`),favoritesBefore);
 await ev("document.querySelector('#personal-search').value='';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");
 await click('[data-collection-action=note]');await draft(text);await save();
 check('Create/edit/cancel/clear notes with inert Unicode text, note-aware search, unchanged favorites and restored focus');

 await click('[data-collection-action=remove]');assert.equal((await notes())[0].text,text);
 await ev("cards[0].querySelector('.favorite-source').click()");assert.equal(await ev("document.querySelector('.directory-note-text').textContent"),text);
 await navigate('',true);assert.equal(await ev("document.querySelector('.directory-note-text').textContent"),text);
 check('Notes persist across reload and remain available when a removed directory source is saved again');

 await click('[data-collection-action=note]');await draft('Preserved draft');const before=await snapshot();
 await ev(`window.noteSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(notesKey)})throw new DOMException('Full','QuotaExceededError');return window.noteSet.call(this,k,v);}`);
 await save();assert.deepEqual(await snapshot(),before);assert.equal(await ev("document.querySelector('#directory-note-dialog').open&&document.querySelector('#directory-note-input').value==='Preserved draft'"),true);
 await ev('Storage.prototype.setItem=window.noteSet');await save();assert.equal((await notes())[0].text,'Preserved draft');
 await click('[data-collection-action=note]');await draft('My draft');await seedNotes([{url:urls[0],text:'Changed in another tab'}]);
 await save();assert.equal((await notes())[0].text,'Changed in another tab');assert.equal(await ev("document.querySelector('#directory-note-input').value"),'My draft');assert.ok(await ev("document.querySelector('#directory-note-error').textContent.includes('another tab')"));
 await click('#directory-note-cancel');await click('[data-collection-action=note]');await draft('Latest note');
 await seedNotes([{url:urls[0],text:'Changed in another tab'},{url:urls[1],text:'Other source'}]);await save();assert.equal((await notes())[1].text,'Other source');
 const good=await notes();await ev(`localStorage.setItem(${JSON.stringify(notesKey)},'{broken');dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(notesKey)}}))`);
 await click('[data-collection-action=note]');await draft('Cannot overwrite');await save();assert.equal(await ev(`localStorage.getItem(${JSON.stringify(notesKey)})`),'{broken');await click('#directory-note-cancel');await seedNotes(good);
 check('Quota/corrupt storage preserves drafts and data; same-note conflicts are reported while unrelated edits are kept');

 const exported=await download('notes');assert.equal(exported.version,2);assert.equal(exported.format,'the-reference-edit-collection');assert.deepEqual(exported.directoryNotes,good);
 await ev(`localStorage.removeItem(${JSON.stringify(notesKey)});localStorage.setItem(${JSON.stringify(favoriteKey)},'[]');dispatchEvent(new StorageEvent('storage',{key:null}))`);
 await click('#personal-import-open');await choose(exported);assert.ok(await ev("document.querySelector('#personal-import-preview').textContent.includes('Notes to add: 2')"));assert.deepEqual(await notes(),[]);
 await click('#personal-import-confirm');assert.deepEqual(await notes(),good);
 await ev(`localStorage.setItem(${JSON.stringify(favoriteKey)},'[]');dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(favoriteKey)}}))`);
 assert.equal(await ev("document.querySelector('#personal-export').disabled||document.querySelector('#directory-notes-retained').hidden"),false);
 const notesOnly=await download('notes-only');assert.deepEqual(notesOnly.directoryFavorites,[]);assert.deepEqual(notesOnly.directoryNotes,good);
 for(const format of ['the-reference-edit-collection','the-reference-edit-personal-sources']){
  const before=await notes();await click('#personal-import-open');await choose({format,version:1,directoryFavorites:[],sources:[]});await click('#personal-import-confirm');assert.deepEqual(await notes(),before);
 }
 const extra={...exported,directoryFavorites:[],sources:[],directoryNotes:[{url:urls[0],text:'Do not replace'},{url:urls[2],text:'Retained without a favorite'}]};
 await click('#personal-import-open');await choose(extra);await click('#personal-import-confirm');assert.equal((await notes())[0].text,good[0].text);assert.equal((await notes()).length,3);
 check('Version 2 backups restore notes; both version 1 formats preserve notes; merge keeps existing text and unsaved-source notes');

 for(const invalid of [{url:'javascript:alert(1)',text:'unsafe'},{url:urls[0],text:'x'.repeat(2001)}]){
  const before=await snapshot();await click('#personal-import-open');await choose({...exported,directoryNotes:[invalid]});assert.equal(await ev("document.querySelector('#personal-import-confirm').disabled"),true);assert.deepEqual(await snapshot(),before);await click('#personal-import-cancel');
 }
 await seedNotes([{url:urls[0],text:'Original'}]);await ev(`localStorage.setItem(${JSON.stringify(favoriteKey)},${JSON.stringify(JSON.stringify([urls[0]]))});localStorage.removeItem(${JSON.stringify(personalKey)});dispatchEvent(new StorageEvent('storage',{key:null}))`);
 const incoming={...exported,directoryFavorites:[urls[1]],sources:[{id:'new-source',name:'New',url:'https://new.example/',description:'New source',category:'',country:'',tags:'',image:'',favorite:false}],directoryNotes:[{url:urls[1],text:'Imported note'}]};
 await click('#personal-import-open');await choose(incoming);const beforeWrite=await snapshot();
 await ev(`window.noteSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(notesKey)})throw new DOMException('Full','QuotaExceededError');return window.noteSet.call(this,k,v);}`);
 await click('#personal-import-confirm');assert.deepEqual(await snapshot(),beforeWrite);
 await ev('Storage.prototype.setItem=window.noteSet');await click('#personal-import-confirm');assert.equal((await notes()).length,2);
 check('Unsafe/oversized notes are rejected before writes; a failed note import rolls back favorite and personal changes for retry');

 const titles={en:'Edit note',es:'Editar nota','zh-Hans':'编辑笔记','zh-Hant':'編輯筆記',ja:'メモを編集',ko:'메모 편집'};
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of Object.keys(titles)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  await click('[data-collection-action=note]');const layout=await ev("(()=>{const d=document.querySelector('#directory-note-dialog'),r=d.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1||d.scrollWidth>d.clientWidth+1,outside:r.left<0||r.right>innerWidth+1,title:document.querySelector('#directory-note-title').textContent,labeled:!!document.querySelector('#directory-note-input').labels.length}})()");
  assert.equal(layout.overflow,false,JSON.stringify({width,size,theme,locale,...layout}));assert.equal(layout.outside,false);assert.equal(layout.title,titles[locale]);assert.equal(layout.labeled,true);result.layouts.push({width,size,theme,locale});await click('#directory-note-cancel');
 }
 check('96 note-editor viewport/text-size/theme/language cases and labeled native dialog controls');
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await click('[data-collection-action=note]');await draft('Use this for portrait lighting.\nCompare the opening spreads.');await pause(200);
 await mkdir('/tmp/reference-notes-results',{recursive:true});const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('/tmp/reference-notes-results/mobile.png',Buffer.from(screenshot.data,'base64'));await save();
 await until('!!navigator.serviceWorker.controller');connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await navigate('',true);
 await click('[data-collection-action=note]');await draft('Offline note');await save();const offline=await download('offline');assert.equal(offline.directoryNotes[0].text,'Offline note');
 await ev(`localStorage.removeItem(${JSON.stringify(notesKey)});dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(notesKey)}}))`);
 await click('#personal-import-open');await choose(offline);await click('#personal-import-confirm');assert.deepEqual(await notes(),offline.directoryNotes);
 await click('[data-collection-action=note]');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(100);
 assert.equal(await ev("document.querySelector('#directory-note-dialog').open"),false);assert.equal(await ev('document.activeElement.dataset.collectionAction'),'note');
 assert.deepEqual(page.exceptions,[]);check('Offline note editing, complete backup/restore and Escape focus restoration work');result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await rm(temporary,{recursive:true,force:true});await report('source-notes',result);}
