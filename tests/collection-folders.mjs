import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {assets,browser,serve,pause,report} from './browser.mjs';

const temporary=await mkdtemp(path.join(tmpdir(),'reference-folders-')),files=await assets();
const foldersKey='reference-edit-collection-folders-v1',favoriteKey='visual-edit-favorites-v1',personalKey='reference-edit-personal-sources-v1';
let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);};
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
const source=(id,extra={})=>({id,name:'Source '+id,url:`https://${id}.example/`,description:'References '+id,category:'Photography',country:'Japan',tags:'film, portraits',image:'',favorite:false,...extra});
const backup=(directoryFavorites,sources,folders=[])=>({format:'the-reference-edit-collection',version:3,exportedAt:new Date().toISOString(),directoryFavorites,sources,directoryNotes:[],folders});
const folders=()=>ev(`(()=>{const raw=localStorage.getItem(${JSON.stringify(foldersKey)});return raw===null?null:JSON.parse(raw);})()`);
const stored=()=>ev(`({favorites:localStorage.getItem(${JSON.stringify(favoriteKey)}),personal:localStorage.getItem(${JSON.stringify(personalKey)}),folders:localStorage.getItem(${JSON.stringify(foldersKey)})})`);
async function seed({favorites=[],sources=[],folders:list=null}){
 await ev(`localStorage.setItem(${JSON.stringify(favoriteKey)},${JSON.stringify(JSON.stringify(favorites))});localStorage.setItem(${JSON.stringify(personalKey)},${JSON.stringify(JSON.stringify({version:1,sources}))});${list===null?`localStorage.removeItem(${JSON.stringify(foldersKey)})`:`localStorage.setItem(${JSON.stringify(foldersKey)},${JSON.stringify(JSON.stringify({version:1,folders:list}))})`};dispatchEvent(new StorageEvent('storage',{key:null}))`);
}
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
const folderView=()=>ev(`({warning:document.querySelector('#folder-warning').hidden?null:document.querySelector('#folder-warning').textContent,error:document.querySelector('#folder-error').textContent,filterHidden:document.querySelector('#collection-folder-filter').hidden,filterValue:document.querySelector('#folder-filter').value,filterOptions:[...document.querySelectorAll('#folder-filter option')].map(o=>o.textContent),rows:[...document.querySelectorAll('#folder-list .folder-row')].map(row=>({id:row.dataset.folderId,name:row.querySelector('.folder-name').textContent,count:row.querySelector('.personal-meta').textContent})),empty:document.querySelector('#folder-list .personal-note')?document.querySelector('#folder-list .personal-note').textContent:null,dialogOpen:document.querySelector('#folder-dialog').open,deleteOpen:document.querySelector('#folder-delete-dialog').open,deleteName:document.querySelector('#folder-delete-name').textContent,title:document.querySelector('#folder-dialog-title').textContent,selects:document.querySelectorAll('.folder-select').length})`);
const listView=()=>ev(`({directory:[...document.querySelectorAll('#personal-list .collection-source')].map(c=>c.dataset.directoryUrl),personal:[...document.querySelectorAll('#personal-list .personal-source')].map(c=>c.dataset.personalId),emptyText:document.querySelector('#personal-list>p')?document.querySelector('#personal-list>p').textContent:null})`);
const openDetails=()=>ev("document.querySelector('#collection-folders').open=true");
const openDialog=async()=>{await click('#folder-add');assert.equal(await ev("document.querySelector('#folder-dialog').open"),true);};
const submitFolder=async name=>{await ev(`(()=>{const input=document.querySelector('#folder-name');input.value=${JSON.stringify(name)};input.dispatchEvent(new Event('input'));document.querySelector('#folder-save').click();})()`);await pause(100);};
const assign=async(selector,index,id)=>ev(`(()=>{const select=[...document.querySelectorAll(${JSON.stringify(selector)}+' .folder-select')][${index}];select.value=${JSON.stringify(id)};select.dispatchEvent(new Event('change'));})()`);
const failureText='Could not save folder changes. Your collection has not changed. Check browser storage and retry.';
try{
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await navigate();
 const urls=await ev("cards.slice(0,7).map(c=>c.querySelector('.favorite-source').dataset.url)");

 await click('#mobile-saved');await openDetails();
 await seed({favorites:urls.slice(0,3),sources:[source('p-one'),source('p-two')]});
 await click('#mobile-saved');await openDetails();
 let view=await folderView();
 assert.equal(view.filterHidden,true);assert.deepEqual(view.rows,[]);assert.equal(view.empty,'No folders yet. Create one to group saved sources.');assert.deepEqual(view.filterOptions,[]);
 await openDialog();
 assert.equal(await ev("document.querySelector('#folder-dialog-title').textContent"),'New folder');assert.equal(await ev('document.activeElement.id'),'folder-name');
 await submitFolder('Editorial');
 let data=await folders();
 assert.equal(data.version,1);assert.equal(data.folders.length,1);assert.match(data.folders[0].id,/^[-a-zA-Z0-9]{1,80}$/);assert.deepEqual({...data.folders[0],id:null},{id:null,name:'Editorial',directory:[],personal:[]});
 assert.equal(await ev("document.querySelector('#folder-dialog').open"),false);await pause(50);assert.equal(await ev('document.activeElement.id'),'folder-add');
 view=await folderView();
 assert.equal(view.filterHidden,false);assert.deepEqual(view.filterOptions,['All folders','Unfiled','Editorial (0)']);
 assert.deepEqual(view.rows.map(r=>[r.name,r.count]),[['Editorial','0 saved sources']]);
 await openDialog();await submitFolder('Archive');
 assert.equal((await folders()).folders.length,2);
 check('Creating folders via the dialog persists trimmed names, returns focus to the New folder action and reveals the filter');

 await openDialog();await submitFolder('editorial');
 view=await folderView();assert.equal(view.error,'A folder with this name already exists.');assert.equal(view.dialogOpen,true);
 await submitFolder('   ');assert.equal((await folders()).folders.length,2);
 await click('#folder-cancel');await pause(100);assert.equal((await folders()).folders.length,2);
 check('Duplicate names are rejected case-insensitively, whitespace-only names are refused and the stored list stays intact');

 const editorialId=(await folders()).folders[0].id;
 await click('.folder-row [data-folder-action=rename]');await pause(50);
 assert.equal(await ev("document.querySelector('#folder-dialog-title').textContent"),'Rename folder');
 assert.equal(await ev("document.querySelector('#folder-name').value"),'Editorial');
 await submitFolder('Editorial picks');
 assert.equal((await folders()).folders[0].name,'Editorial picks');
 assert.deepEqual((await folderView()).rows.map(r=>r.name),['Editorial picks','Archive']);
 await click('.folder-row [data-folder-action=rename]');await submitFolder('archive');
 assert.equal((await folderView()).error,'A folder with this name already exists.');
 await submitFolder('Editorial picks');assert.equal((await folderView()).dialogOpen,false);
 check('Renaming updates the stored folder while case-insensitive duplicates are rejected');

 await assign('.collection-source',0,editorialId);
 data=await folders();assert.deepEqual(data.folders[0].directory,[urls[0]]);assert.equal(await ev('document.activeElement.classList.contains("folder-select")'),true);
 assert.equal((await folderView()).rows[0].count,'1 saved sources');
 await assign('.personal-source',0,editorialId);
 assert.deepEqual((await folders()).folders[0].personal,['p-one']);
 await assign('.collection-source',1,editorialId);
 assert.deepEqual((await folders()).folders[0].directory,[urls[0],urls[1]]);
 await assign('.collection-source',1,'');
 assert.deepEqual((await folders()).folders[0].directory,[urls[0]]);
 assert.deepEqual(await ev("[...document.querySelectorAll('.folder-select')].map(s=>s.value)"),[editorialId,'','',editorialId,'']);
 check('Card selects file and unfile directory favorites and personal sources with live counts and focus');

 await ev(`document.querySelector('#folder-filter').value=${JSON.stringify(editorialId)};document.querySelector('#folder-filter').dispatchEvent(new Event('change'))`);
 let listing=await listView();assert.deepEqual(listing.directory,[urls[0]]);assert.deepEqual(listing.personal,['p-one']);
 await ev("document.querySelector('#folder-filter').value='none';document.querySelector('#folder-filter').dispatchEvent(new Event('change'))");
 listing=await listView();assert.deepEqual(listing.directory,[urls[1],urls[2]]);assert.deepEqual(listing.personal,['p-two']);
 await ev(`document.querySelector('#folder-filter').value=${JSON.stringify(editorialId)};document.querySelector('#folder-filter').dispatchEvent(new Event('change'));document.querySelector('#personal-search').value='nothing';document.querySelector('#personal-search').dispatchEvent(new Event('input'))`);
 assert.equal((await listView()).emptyText,'No sources match this collection view.');
 await ev("document.querySelector('#personal-search').value='';document.querySelector('#personal-search').dispatchEvent(new Event('input'));document.querySelector('[data-collection-kind=personal]').click()");
 listing=await listView();assert.deepEqual(listing.directory,[]);assert.deepEqual(listing.personal,['p-one']);
 await ev("document.querySelector('[data-collection-kind=all]').click();document.querySelector('#folder-filter').value='all';document.querySelector('#folder-filter').dispatchEvent(new Event('change'))");
 listing=await listView();assert.equal(listing.directory.length,3);assert.equal(listing.personal.length,2);
 check('The folder filter narrows both kinds, combines with search and kinds, and empty results explain themselves');

 await ev(`document.querySelector('#folder-filter').value=${JSON.stringify((await folders()).folders[1].id)};document.querySelector('#folder-filter').dispatchEvent(new Event('change'))`);
 await click('.folder-row:nth-child(2) [data-folder-action=delete]');
 view=await folderView();assert.equal(view.deleteOpen,true);assert.equal(view.deleteName,'Archive');
 await click('#folder-delete-cancel');await pause(50);assert.equal((await folders()).folders.length,2);
 await click('.folder-row:nth-child(2) [data-folder-action=delete]');await click('#folder-delete-confirm');
 data=await folders();assert.equal(data.folders.length,1);assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(personalKey)})).sources.length`),2);
 assert.deepEqual(JSON.parse(await ev(`localStorage.getItem(${JSON.stringify(favoriteKey)})`)),urls.slice(0,3));
 assert.equal(await ev("document.querySelector('#folder-filter').value"),'all');
 listing=await listView();assert.equal(listing.personal.length,2);
 await click('.folder-row [data-folder-action=delete]');await click('#folder-delete-confirm');
 view=await folderView();assert.equal(view.filterHidden,true);assert.equal(view.selects,0);assert.equal(view.empty,'No folders yet. Create one to group saved sources.');
 check('Deleting a folder unfiles its sources without touching favorites or personal records and never deletes sources');

 await openDialog();await submitFolder('<img src=x onerror=window.folderInjected=true>');
 assert.equal(await ev('window.folderInjected===undefined'),true);
 assert.equal(await ev("document.querySelectorAll('.folder-name img').length"),0);
 assert.equal((await folderView()).rows[0].name,'<img src=x onerror=window.folderInjected=true>');
 await click('.folder-row [data-folder-action=delete]');await click('#folder-delete-confirm');
 check('Folder names render as text; injected markup never executes or creates elements');

 await ev(`localStorage.setItem(${JSON.stringify(foldersKey)},'{broken');dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(foldersKey)}}))`);
 view=await folderView();assert.equal(view.warning,'Saved folders could not be read. Existing browser data has not been changed.');assert.equal(view.filterHidden,true);
 await openDialog();await submitFolder('Cannot save');
 view=await folderView();assert.equal(view.error,failureText);assert.equal(view.dialogOpen,true);assert.equal(await ev(`localStorage.getItem(${JSON.stringify(foldersKey)})`),'{broken');
 await click('#folder-cancel');await pause(50);
 check('Corrupt folder storage hides folders with a warning and blocks writes until repaired');

 await seed({favorites:urls.slice(0,2),sources:[source('p-one')],folders:[{id:'folder-a',name:'Editorial',directory:[],personal:[]}]});
 await openDetails();
 await ev(`window.folderSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(foldersKey)})throw new DOMException('Full','QuotaExceededError');return window.folderSet.call(this,k,v);}`);
 await assign('.collection-source',0,'folder-a');
 assert.deepEqual((await folders()).folders[0].directory,[]);
 assert.equal(await ev("[...document.querySelectorAll('.collection-source .folder-select')][0].value"),'');
 assert.equal((await folderView()).warning,failureText);
 await ev('Storage.prototype.setItem=window.folderSet');
 await assign('.collection-source',0,'folder-a');
 assert.deepEqual((await folders()).folders[0].directory,[urls[0]]);
 assert.equal((await folderView()).warning,null);
 check('Quota failures revert the card select, keep stored folders and surface the failure message');

 await ev(`localStorage.setItem(${JSON.stringify(foldersKey)},JSON.stringify({version:1,folders:[{id:'tab-folder',name:'From another tab',directory:[],personal:[]}]}));dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(foldersKey)}}))`);
 assert.deepEqual((await folderView()).rows.map(r=>r.name),['From another tab']);
 assert.deepEqual((await folderView()).filterOptions,['All folders','Unfiled','From another tab (0)']);
 check('Cross-tab folder changes refresh the list and filter without a reload');

 await seed({favorites:urls.slice(0,2),sources:[source('p-one')],folders:[{id:'folder-a',name:'Editorial',directory:[urls[0]],personal:['p-one']},{id:'folder-b',name:'Archive',directory:[],personal:[]}]});
 const translated={en:{summary:'Folders',add:'New folder',filter:'Filter by folder',all:'All folders',noFolder:'No folder',field:'Folder',rename:'Rename',remove:'Delete folder'},es:{summary:'Carpetas',add:'Nueva carpeta',filter:'Filtrar por carpeta',all:'Todas las carpetas',noFolder:'Sin carpeta',field:'Carpeta',rename:'Renombrar',remove:'Eliminar carpeta'},'zh-Hans':{summary:'文件夹',add:'新建文件夹',filter:'按文件夹筛选',all:'所有文件夹',noFolder:'不放入文件夹',field:'文件夹',rename:'重命名',remove:'删除文件夹'},'zh-Hant':{summary:'資料夾',add:'新增資料夾',filter:'依資料夾篩選',all:'所有資料夾',noFolder:'不放入資料夾',field:'資料夾',rename:'重新命名',remove:'刪除資料夾'},ja:{summary:'フォルダ',add:'新しいフォルダ',filter:'フォルダで絞り込む',all:'すべてのフォルダ',noFolder:'フォルダなし',field:'フォルダ',rename:'名前を変更',remove:'フォルダを削除'},ko:{summary:'폴더',add:'새 폴더',filter:'폴더로 필터',all:'모든 폴더',noFolder:'폴더 없음',field:'폴더',rename:'이름 바꾸기',remove:'폴더 삭제'}};
 for(const [locale,words] of Object.entries(translated)){
  await ev(`document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  const labels=await ev(`[document.querySelector('#collection-folders>summary').textContent,document.querySelector('#folder-add').textContent,document.querySelector('#collection-folder-filter label').textContent,document.querySelector('#folder-filter option').textContent,document.querySelector('.folder-select option').textContent,document.querySelector('.folder-field').childNodes[0].nodeValue,document.querySelector('.folder-row [data-folder-action=rename]').textContent,document.querySelector('.folder-row [data-folder-action=delete]').textContent]`);
  assert.deepEqual(labels,[words.summary,words.add,words.filter,words.all,words.noFolder,words.field,words.rename,words.remove],locale);
 }
 await ev("document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 assert.deepEqual((await folderView()).rows.map(r=>r.name),['Editorial','Archive']);
 check('Folder headings, dialogs, filter and row actions are translated in all six languages');

 const titles={en:'Folders',es:'Carpetas','zh-Hans':'文件夹','zh-Hant':'資料夾',ja:'フォルダ',ko:'폴더'},filters={en:'All folders',es:'Todas las carpetas','zh-Hans':'所有文件夹','zh-Hant':'所有資料夾',ja:'すべてのフォルダ',ko:'모든 폴더'},fields={en:'Folder',es:'Carpeta','zh-Hans':'文件夹','zh-Hant':'資料夾',ja:'フォルダ',ko:'폴더'},noFolders={en:'No folder',es:'Sin carpeta','zh-Hans':'不放入文件夹','zh-Hant':'不放入資料夾',ja:'フォルダなし',ko:'폴더 없음'};
 await mkdir('/tmp/reference-folders-results',{recursive:true});
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of Object.keys(titles)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  const layout=await ev(`(()=>{
   const errors=[];if(document.documentElement.scrollWidth>innerWidth+1)errors.push('page overflow');
   for(const e of document.querySelectorAll('#collection-folders button,#collection-folders>summary,#folder-list p,#collection-folder-filter label,#folder-filter,#personal-list .folder-field')){
    if(!e.getClientRects().length)continue;const r=e.getBoundingClientRect();
    if(r.left<-1||r.right>innerWidth+1)errors.push('overflow: '+e.textContent);
    if(e.scrollWidth>e.clientWidth+2)errors.push('content overflow: '+e.textContent);
    if(e.matches('button')){const range=document.createRange();range.selectNodeContents(e);if([...range.getClientRects()].some(t=>t.left<r.left-2||t.right>r.right+2))errors.push('text outside button: '+e.textContent);}
   }
   return {errors,summary:document.querySelector('#collection-folders>summary').textContent,rows:document.querySelectorAll('#folder-list .folder-row').length,filter:document.querySelector('#folder-filter').options[0].textContent,field:document.querySelector('.folder-field').childNodes[0].nodeValue,noFolder:document.querySelector('.folder-select').options[0].textContent,names:[...document.querySelectorAll('.folder-name')].map(n=>n.textContent)};
  })()`);
  assert.deepEqual(layout.errors,[],JSON.stringify({width,size,theme,locale,...layout}));
  assert.equal(layout.summary,titles[locale]);assert.equal(layout.rows,2);assert.equal(layout.filter,filters[locale]);assert.equal(layout.field,fields[locale]);assert.equal(layout.noFolder,noFolders[locale]);assert.deepEqual(layout.names,['Editorial','Archive']);
  result.layouts.push({width,size,theme,locale});
 }
 check('96 folder viewport/text-size/theme/language cases stay readable without overflow');

 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'));document.querySelector('#collection-folders').scrollIntoView({block:'start',behavior:'instant'})");
 await pause(50);const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-folders-results/mobile.png',Buffer.from(screenshot.data,'base64'));

 await seed({favorites:[urls[0],urls[1]],sources:[source('p-one')],folders:[{id:'folder-a',name:'Editorial',directory:[urls[0]],personal:['p-one']}]});
 await ev("document.querySelector('#personal-backup').open=true");
 const exported=await download('complete');
 assert.equal(exported.format,'the-reference-edit-collection');assert.equal(exported.version,3);
 assert.deepEqual(Object.keys(exported.folders[0]),['name','directory','personal']);
 assert.deepEqual(exported.folders,[{name:'Editorial',directory:[urls[0]],personal:['p-one']}]);
 assert.deepEqual(exported.directoryFavorites,[urls[0],urls[1]]);
 check('Version 3 exports include folder names and memberships without local ids');

 await seed({favorites:[],sources:[],folders:null});
 await click('#personal-import-open');await choose(exported);
 assert.equal(await ev("document.querySelector('#personal-import-preview').textContent"),'2 directory favorites and 1 added sources to add; 0 duplicates skipped; 0 directory URLs unavailable. Folders to add: 1; sources to place in folders: 2.');
 await click('#personal-import-confirm');
 assert.equal(await ev("document.querySelector('#personal-transfer-status').textContent"),'Imported 2 directory favorites and 1 added sources; skipped 0 duplicates and 0 unavailable directory URLs. Folders added: 1; sources placed in folders: 2.');
 data=await folders();const restoredPersonalId=JSON.parse((await stored()).personal).sources[0].id;
 assert.equal(data.folders.length,1);assert.notEqual(data.folders[0].id,'folder-a');assert.notEqual(restoredPersonalId,'p-one');
 assert.deepEqual({...data.folders[0],id:null},{id:null,name:'Editorial',directory:[urls[0]],personal:[restoredPersonalId]});
 assert.deepEqual((await folderView()).filterOptions,['All folders','Unfiled','Editorial (2)']);
 check('Fresh imports recreate folders with new ids, remap personal members and report folder counts');

 await seed({favorites:[urls[4]],sources:[source('keep-id',{url:'https://keep.example/'})],folders:[{id:'folder-a',name:'Editorial',directory:[urls[0]],personal:['keep-id']}]});
 await click('#personal-import-open');await choose(backup([urls[0],urls[1],urls[2]],[source('keep-id',{url:'https://keep.example/'}),source('new-one',{url:'https://new.example/'})],[{name:'editorial',directory:[urls[0],urls[1]],personal:['keep-id','new-one']}]));
 assert.equal(await ev("document.querySelector('#personal-import-preview').textContent"),'3 directory favorites and 1 added sources to add; 1 duplicates skipped; 0 directory URLs unavailable. Folders to add: 0; sources to place in folders: 2.');
 await click('#personal-import-confirm');
 data=await folders();const mergedPersonal=JSON.parse((await stored()).personal).sources.map(s=>s.id);
 assert.equal(data.folders.length,1);assert.equal(data.folders[0].name,'Editorial');
 assert.deepEqual(data.folders[0].directory,[urls[0],urls[1]]);
 assert.deepEqual(data.folders[0].personal,[mergedPersonal[0],mergedPersonal[1]]);assert.ok(mergedPersonal.includes('keep-id'));
 check('Merges reuse same-name folders, keep existing placements and file only new members');

 await seed({favorites:[urls[5]],sources:[],folders:[{id:'folder-z',name:'Existing',directory:[],personal:[]}]});
 await click('#personal-import-open');await choose(backup([urls[6]],[source('extra')],[{name:'Fresh folder',directory:[urls[6]],personal:[]}]));
 const beforeQuota=await stored();
 await ev(`window.folderSet2=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(foldersKey)})throw new DOMException('Full','QuotaExceededError');return window.folderSet2.call(this,k,v);}`);
 await click('#personal-import-confirm');assert.deepEqual(await stored(),beforeQuota);
 assert.equal(await ev("document.querySelector('#personal-import-dialog').open"),true);
 assert.equal(await ev("document.querySelector('#personal-import-error').textContent"),'Could not save. Your collection has not changed. Check browser storage and retry.');
 await ev('Storage.prototype.setItem=window.folderSet2');await click('#personal-import-confirm');
 assert.equal(await ev("document.querySelector('#personal-transfer-status').textContent"),'Imported 1 directory favorites and 1 added sources; skipped 0 duplicates and 0 unavailable directory URLs. Folders added: 1; sources placed in folders: 1.');
 assert.deepEqual((await folders()).folders.map(f=>f.name),['Existing','Fresh folder']);
 check('Folder write failures roll back the whole import and retry safely');

 for(const version of [1,2]){
  await click('#personal-import-open');await choose({format:'the-reference-edit-collection',version,exportedAt:new Date().toISOString(),directoryFavorites:[],sources:[],...(version===2?{directoryNotes:[]}:{})});
  const before=await folders();await click('#personal-import-confirm');assert.deepEqual(await folders(),before);
 }
 check('Version 1 and 2 collection backups still import without folder changes');

 await until('!!navigator.serviceWorker.controller');
 connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('',true);
 await openDetails();
 assert.deepEqual((await folderView()).rows.map(r=>r.name),['Existing','Fresh folder']);
 await openDialog();await submitFolder('Offline');
 assert.equal((await folders()).folders.length,3);
 const offlineId=(await folders()).folders[2].id;
 await assign('.collection-source',0,offlineId);
 assert.deepEqual((await folders()).folders[2].directory,[urls[5]]);
 await ev(`document.querySelector('#folder-filter').value=${JSON.stringify(offlineId)};document.querySelector('#folder-filter').dispatchEvent(new Event('change'))`);
 assert.deepEqual((await listView()).directory,[urls[5]]);
 await click('.folder-row:nth-child(3) [data-folder-action=delete]');await click('#folder-delete-confirm');
 assert.equal((await folders()).folders.length,2);
 assert.deepEqual(page.exceptions,[]);
 check('Offline reload keeps folders; create, file, filter and delete work without a network');
 result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await rm(temporary,{recursive:true,force:true});await report('collection-folders',result);}
