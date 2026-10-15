import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {assets,browser,serve,pause,report} from './browser.mjs';

const files=await assets(),recentKey='reference-edit-recently-viewed-v1',favoriteKey='visual-edit-favorites-v1',personalKey='reference-edit-personal-sources-v1',notesKey='reference-edit-directory-notes-v1';
let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);};
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
const stored=()=>ev(`(()=>{const raw=localStorage.getItem(${JSON.stringify(recentKey)});return raw===null?null:JSON.parse(raw);})()`);
const view=()=>ev(`({hidden:document.querySelector('#recently-viewed').hidden,names:[...document.querySelectorAll('#recently-viewed-list .recent-source h3 a')].map(a=>a.textContent),urls:[...document.querySelectorAll('#recently-viewed-list .recent-source h3 a')].map(a=>a.href),details:[...document.querySelectorAll('#recently-viewed-list [data-recent-action=details]')].map(b=>b.textContent)})`);
const seed=urls=>ev(`localStorage.setItem(${JSON.stringify(recentKey)},JSON.stringify({version:1,items:${JSON.stringify(urls)}}));dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(recentKey)}}))`);
const openLink=index=>ev(`document.querySelectorAll('article.source h3 a')[${index}].click()`);
const collectionVisible=()=>ev("!document.querySelector('#my-sources').hidden&&getComputedStyle(document.querySelector('#directory')).display==='none'");
try{
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await navigate();
 // Keep the real click path the app records, without visiting external providers.
 await ev(`document.addEventListener('click',event=>{const link=event.target instanceof Element&&event.target.closest('article.source h3 a,.chooser-card h3 a,.collection-source h3 a,.recent-source h3 a');if(link)event.preventDefault();},true)`);
 const urls=await ev("cards.map(c=>c.querySelector('.favorite-source').dataset.url)");
 const names=await ev("cards.map(c=>c.querySelector('h3 a').textContent.replace('↗','').trim())");

 assert.equal((await view()).hidden,true);assert.equal(await stored(),null);
 await click('#mobile-saved');assert.equal(await collectionVisible(),true);
 assert.equal((await view()).hidden,true);
 assert.equal(await ev("document.querySelector('#personal-status').textContent"),'Your collection is empty. Save a directory source or add your own.');
 await click('#collection-back');
 for(const index of [0,1,2])await openLink(index);
 assert.deepEqual((await stored()).items,[urls[2],urls[1],urls[0]]);
 await openLink(0);
 assert.deepEqual((await stored()).items,[urls[0],urls[2],urls[1]]);
 await click('#mobile-saved');
 let state=await view();assert.equal(state.hidden,false);assert.deepEqual(state.names,[names[0],names[2],names[1]]);
 assert.equal(await ev("document.querySelectorAll('.source').length"),58);
 assert.deepEqual(await ev(`({favorites:localStorage.getItem(${JSON.stringify(favoriteKey)}),personal:localStorage.getItem(${JSON.stringify(personalKey)}),notes:localStorage.getItem(${JSON.stringify(notesKey)})})`),{favorites:null,personal:null,notes:null});
 check('Opening curated sources records a deduplicated most-recent-first history without touching saved data');

 await click('#collection-back');
 for(const index of [3,4,5,6,7,8,9,10])await openLink(index);
 assert.deepEqual((await stored()).items,urls.slice(3,11).reverse());
 await click('#mobile-saved');state=await view();assert.equal(state.names.length,8);assert.deepEqual(state.names,names.slice(3,11).reverse());
 check('History keeps the eight most recent sources and drops older entries');

 await navigate('',true);
 assert.equal(await collectionVisible(),true);
 assert.deepEqual((await stored()).items,urls.slice(3,11).reverse());
 assert.equal((await view()).names.length,8);
 check('History survives a reload in the same browser');

 await ev("countryFilter.value='Japan';search.value='zzz';update()");
 const beforeDetails=(await stored()).items;
 await click('#recently-viewed-list .recent-source [data-recent-action=details]');
 assert.equal(await collectionVisible(),false);assert.equal(await ev('activeFilterCount()'),0);
 assert.equal(await ev("document.activeElement.closest('.source')!==null"),true);
 assert.deepEqual((await stored()).items,beforeDetails);
 check('View in directory clears filters, focuses the full record and keeps the history');

 await click('#mobile-saved');
 await click('#recently-viewed-clear');
 assert.equal(await stored(),null);assert.equal((await view()).hidden,true);
 assert.equal(await ev('document.activeElement.id'),'personal-title');
 await navigate('',true);assert.equal(await collectionVisible(),true);assert.equal((await view()).hidden,true);
 check('Clear list forgets the history in this browser and returns focus to the heading');

 await ev(`localStorage.setItem(${JSON.stringify(recentKey)},'{broken');dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(recentKey)}}))`);
 assert.equal((await view()).hidden,true);
 assert.equal(await ev(`localStorage.getItem(${JSON.stringify(recentKey)})`),'{broken');
 await click('#collection-back');await openLink(4);
 assert.deepEqual((await stored()).items,[urls[4]]);
 check('Corrupt history hides the section until the next opened source replaces it safely');

 await ev(`window.recentSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===${JSON.stringify(recentKey)})throw new DOMException('Full','QuotaExceededError');return window.recentSet.call(this,key,value);}`);
 await openLink(5);
 assert.deepEqual((await stored()).items,[urls[4]]);
 await click('#mobile-saved');assert.deepEqual((await view()).names,[names[4]]);
 await ev('Storage.prototype.setItem=window.recentSet');
 check('A failed history write leaves the previous list and saved data intact');

 await seed(['https://gone.example/']);
 assert.equal((await view()).hidden,true);
 assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(recentKey)})).items.length`),1);
 await ev(`localStorage.setItem(${JSON.stringify(personalKey)},JSON.stringify({version:1,sources:[{id:'personal-1',name:'Personal One',url:'https://personal.example/',description:'Independent photography research',category:'Photography',country:'France',tags:'analog',image:'',favorite:false}]}));localStorage.setItem(${JSON.stringify(favoriteKey)},JSON.stringify([${JSON.stringify(urls[6])}]));dispatchEvent(new StorageEvent('storage',{key:null}))`);
 await ev("document.querySelector('.personal-source h3 a').click()");
 assert.deepEqual((await stored()).items,['https://gone.example/']);
 await ev("document.querySelector('.collection-source h3 a').click()");
 assert.deepEqual((await stored()).items,[urls[6]]);
 check('Only curated sources are recorded; saved directory cards refresh history while personal sources stay out');

 await click('#collection-back');
 await ev("document.querySelector('#source-chooser').open=true");
 await click('[data-chooser-goal="editorial"]');
 const suggestion=await ev("document.querySelector('.chooser-card h3 a').href");
 await ev("document.querySelector('.chooser-card h3 a').click()");
 assert.equal((await stored()).items[0],suggestion);
 check('Chooser suggestions join the same history as directory cards');

 const translated={en:['Recently viewed','Sources you opened, kept in this browser.','Clear list','View in directory'],es:['Vistas recientemente','Fuentes que abriste, guardadas en este navegador.','Borrar lista','Ver en el directorio'],'zh-Hans':['最近查看','你打开过的来源，保存在此浏览器中。','清除列表','在目录中查看'],'zh-Hant':['最近檢視','你開啟過的來源，儲存在此瀏覽器中。','清除清單','在目錄中檢視'],ja:['最近閲覧した情報源','開いた情報源を、このブラウザに保存します。','リストを消去','ディレクトリで見る'],ko:['최근 본 소스','연 소스를 이 브라우저에 보관합니다.','목록 지우기','디렉터리에서 보기']};
 await click('#mobile-saved');
 for(const [locale,words] of Object.entries(translated)){
  await ev(`document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  assert.deepEqual(await ev("[document.querySelector('#recently-viewed-title').textContent,document.querySelector('#recently-viewed [data-personal-label=recentHint]').textContent,document.querySelector('#recently-viewed-clear').textContent,document.querySelector('#recently-viewed-list [data-recent-action=details]').textContent]"),words,locale);
 }
 check('Recently viewed title, hint, clear action and record action are translated in all six languages');

 await ev("document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 await seed(urls.slice(0,8));
 await mkdir('/tmp/reference-recent-results',{recursive:true});
 const titles={en:'Recently viewed',es:'Vistas recientemente','zh-Hans':'最近查看','zh-Hant':'最近檢視',ja:'最近閲覧した情報源',ko:'최근 본 소스'};
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of Object.keys(titles)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  const layout=await ev(`(()=>{
   const errors=[];if(document.documentElement.scrollWidth>innerWidth+1)errors.push('page overflow');
   for(const e of document.querySelectorAll('#recently-viewed button,#recently-viewed h3,#recently-viewed h3 a,#recently-viewed p')){
    if(!e.getClientRects().length)continue;const r=e.getBoundingClientRect();
    if(r.left<-1||r.right>innerWidth+1||e.scrollWidth>e.clientWidth+2)errors.push('overflow: '+e.textContent);
    if(e.matches('button')){const range=document.createRange();range.selectNodeContents(e);if([...range.getClientRects()].some(t=>t.left<r.left-2||t.right>r.right+2))errors.push('text outside button: '+e.textContent);}
   }
   return {errors,title:document.querySelector('#recently-viewed-title').textContent,items:document.querySelectorAll('#recently-viewed-list .recent-source').length,details:[...document.querySelectorAll('#recently-viewed-list [data-recent-action=details]')].map(b=>b.textContent)};
  })()`);
  assert.deepEqual(layout.errors,[],JSON.stringify({width,size,theme,locale,...layout}));
  assert.equal(layout.title,titles[locale]);assert.equal(layout.items,8);assert.equal(layout.details.length,8);
  result.layouts.push({width,size,theme,locale});
 }
 check('96 recently-viewed viewport/text-size/theme/language cases with translated labels and readable actions');

 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'));document.querySelector('#recently-viewed').scrollIntoView({block:'start',behavior:'instant'})");
 await pause(50);const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-recent-results/mobile.png',Buffer.from(screenshot.data,'base64'));

 await until('!!navigator.serviceWorker.controller');connected=false;
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('',true);
 assert.equal(await collectionVisible(),true);assert.equal((await view()).names.length,8);
 await click('#recently-viewed-clear');assert.equal((await view()).hidden,true);
 await click('#collection-back');await openLink(0);
 assert.deepEqual((await stored()).items,[urls[0]]);
 await click('#mobile-saved');assert.deepEqual((await view()).urls,[urls[0]]);
 await click('#recently-viewed-list [data-recent-action=details]');
 assert.equal(await collectionVisible(),false);assert.equal(await ev("document.activeElement.closest('.source')!==null"),true);
 assert.deepEqual(page.exceptions,[]);
 check('Offline reload keeps the history; clearing, recording and full-record navigation work without a network');
 result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await report('recently-viewed',result);}
