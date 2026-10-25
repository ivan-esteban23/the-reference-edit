import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {assets,browser,serve,pause,report} from './browser.mjs';

const files=await assets(),personalKey='reference-edit-personal-sources-v1',favoriteKey='visual-edit-favorites-v1';
let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);};
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
const query=async value=>ev(`document.querySelector('#personal-search').value=${JSON.stringify(value)};document.querySelector('#personal-search').dispatchEvent(new Event('input'))`);
const kind=value=>click(`[data-collection-kind="${value}"]`);
const counts=()=>ev("({directory:document.querySelectorAll('.collection-source').length,personal:document.querySelectorAll('.personal-source').length,total:Number(document.querySelector('#mobile-saved-count').textContent)})");
const collectionVisible=()=>ev("!document.querySelector('#my-sources').hidden&&getComputedStyle(document.querySelector('#directory')).display==='none'");
async function seed(favorites,sources){
 await ev(`localStorage.setItem(${JSON.stringify(favoriteKey)},${JSON.stringify(JSON.stringify(favorites))});localStorage.setItem(${JSON.stringify(personalKey)},${JSON.stringify(JSON.stringify({version:1,sources}))});dispatchEvent(new StorageEvent('storage',{key:null}))`);
}
const source=(id,extra={})=>({id,name:'Personal '+id,url:`https://${id}.example/`,description:'Independent photography research',category:'Photography',country:'France',tags:'analog, portraits',image:'',favorite:false,...extra});
try{
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await navigate();await click('#mobile-saved');
 assert.equal(await collectionVisible(),true);assert.equal(await ev('document.activeElement.id'),'personal-title');
 assert.equal(await ev("document.querySelector('#personal-status').textContent"),'Your collection is empty. Save a directory source or add your own.');
 assert.equal(await ev("document.querySelector('#personal-status').getBoundingClientRect().height>0"),true);
 assert.equal(await ev("document.querySelector('#mobile-saved').getAttribute('aria-pressed')"),'true');
 await click('#collection-back');assert.equal(await collectionVisible(),false);
 const assertNavigation=async open=>{
  assert.equal(await collectionVisible(),open);
  assert.deepEqual(await ev("['mobile-saved','mobile-directory','open-collection'].map(id=>document.getElementById(id).getAttribute('aria-pressed'))"),[String(open),String(!open),String(open)]);
 };
 // pushState does not fire hashchange: every view switch must sync selection itself.
 const sections=await ev("[...document.querySelectorAll('.section-navigation .jump a')].map(a=>a.getAttribute('href'))");
 for(const href of sections){
  await click('#mobile-saved');await assertNavigation(true);
  await click(`.section-navigation .jump a[href="${href}"]`);
  await assertNavigation(false);
  assert.equal(await ev('location.hash'),href);
  assert.equal(await ev('document.activeElement.id'),href.slice(1));
 }
 await click('#mobile-saved');await click('.section-navigation a[href="#routes"]');
 await ev('history.back()');await until("location.hash==='#my-sources'");await assertNavigation(true);
 await ev('history.forward()');await until("location.hash==='#routes'");await assertNavigation(false);
 for(const hash of ['#my-sources','#routes','#workflow','#landscape','#notes','#directory']){
  await navigate('/?navigation-test='+hash.slice(1)+hash);await assertNavigation(hash==='#my-sources');
 }
 await ev("countryFilter.value='Japan';search.value='fashion';update()");
 await click('#mobile-saved');await click('.section-navigation a[href="#routes"]');
 await assertNavigation(false);assert.equal(await ev('location.hash'),'#routes');
 assert.equal(await ev("countryFilter.value==='Japan'&&search.value==='fashion'"),true);
 await click('#mobile-saved');await click('#mobile-directory');await assertNavigation(false);
 await click('#open-collection');await assertNavigation(true);
 await click('#collection-back');await assertNavigation(false);
 check('Phone navigation selection follows every Sections destination, history, deep links and view entry/return; filtered guide links keep their target');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await click('#open-collection');assert.equal(await collectionVisible(),true);
 check('Mobile and desktop entry, empty-state guidance, return navigation and heading focus');

 const favorites=await ev("cards.slice(0,2).map(c=>c.querySelector('.favorite-source').dataset.url)");
 const sources=[source('alpha',{name:'<img src=x onerror=alert(1)> Alpha Studio'}),source('beta',{name:'Beta Archive',favorite:true,country:'Japan',tags:'textiles, fabrics'})];
 await seed(favorites,sources);
 const original=await ev(`({favorites:localStorage.getItem(${JSON.stringify(favoriteKey)}),personal:localStorage.getItem(${JSON.stringify(personalKey)})})`);
 await navigate('',true);
 assert.equal(await collectionVisible(),true);assert.deepEqual(await counts(),{directory:2,personal:2,total:4});
 assert.deepEqual(await ev(`({favorites:localStorage.getItem(${JSON.stringify(favoriteKey)}),personal:localStorage.getItem(${JSON.stringify(personalKey)})})`),original);
 assert.equal(await ev("document.querySelectorAll('.source').length"),58);
 assert.equal(await ev("document.querySelector('.personal-source h3 img')===null"),true);
 assert.equal(await ev("[...document.querySelectorAll('#personal-list article')].every(c=>c.querySelector('.collection-origin'))"),true);
 check('Prior-format favorites and personal records appear together without migration, duplication or unsafe HTML');

 await kind('directory');assert.deepEqual(await counts(),{directory:2,personal:0,total:4});
 await kind('personal');assert.deepEqual(await counts(),{directory:0,personal:2,total:4});
 await kind('all');await query('France');assert.deepEqual(await counts(),{directory:0,personal:1,total:4});
 await query('Beta Archive');assert.deepEqual(await counts(),{directory:0,personal:1,total:4});
 const directoryName=await ev("cards[0].querySelector('h3 a').textContent.replace('↗','').trim()");
 await query(directoryName);assert.equal((await counts()).directory,1);assert.equal((await counts()).personal,0);
 await query('no-collection-match');assert.equal(await ev("document.querySelector('#personal-list').textContent"),'No sources match this collection view.');
 await query('');await click('#personal-only');assert.deepEqual(await counts(),{directory:2,personal:1,total:4});
 await click('#personal-only');
 await click('#collection-back');
 await ev("countryFilter.value='Japan';search.value='no-directory-match';update()");
 await click('#open-collection');assert.deepEqual(await counts(),{directory:2,personal:2,total:4});
 assert.equal(await ev('location.hash'),'#my-sources');
 await click('#collection-back');assert.equal(await ev("countryFilter.value==='Japan'&&search.value==='no-directory-match'"),true);
 await ev('history.back()');await until("!document.querySelector('#my-sources').hidden");
 check('Origin filters, shared metadata search, favorites filter and browser history; directory filters stay independent');

 await ev(`document.querySelector('.collection-source [data-collection-action=remove]').click()`);
 assert.deepEqual(await counts(),{directory:1,personal:2,total:3});
 assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(favoriteKey)})).length`),1);
 assert.equal(await ev(`localStorage.getItem(${JSON.stringify(personalKey)})`),original.personal);
 assert.equal(await ev("document.activeElement.matches('#personal-list button')"),true);
 await seed(favorites,sources);
 await ev(`window.collectionSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(favoriteKey)})throw new DOMException('Full','QuotaExceededError');return window.collectionSet.call(this,k,v);}`);
 await click('.collection-source [data-collection-action=remove]');
 assert.deepEqual(await counts(),{directory:2,personal:2,total:4});
 assert.equal(await ev(`localStorage.getItem(${JSON.stringify(favoriteKey)})`),original.favorites);
 assert.equal(await ev("document.querySelector('#collection-storage-warning').hidden"),false);
 await ev('Storage.prototype.setItem=window.collectionSet');
 await seed(favorites,sources);
 await ev(`localStorage.setItem(${JSON.stringify(favoriteKey)},'{broken');dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(favoriteKey)}}))`);
 await click('.collection-source [data-collection-action=remove]');
 assert.equal(await ev(`localStorage.getItem(${JSON.stringify(favoriteKey)})`),'{broken');
 assert.deepEqual(await counts(),{directory:2,personal:2,total:4});
 await seed(favorites,sources);
 check('Directory removal persists with keyboard focus; quota failures and corrupt data preserve stored selections');

 await kind('personal');await click('[data-personal-action="edit"]');
 await ev("document.querySelector('#personal-form').elements.description.value='Updated from the combined collection';document.querySelector('#personal-form').requestSubmit()");
 assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(personalKey)})).sources[0].description`),'Updated from the combined collection');
 await click('[data-personal-action="delete"]');await click('#personal-delete-cancel');assert.equal((await counts()).personal,2);
 await click('[data-personal-action="delete"]');await click('#personal-delete-confirm');assert.equal((await counts()).personal,1);
 await seed([favorites[1]],[sources[1]]);assert.deepEqual(await counts(),{directory:0,personal:1,total:2});
 await kind('all');assert.deepEqual(await counts(),{directory:1,personal:1,total:2});
 await click('.collection-source [data-collection-action=details]');assert.equal(await collectionVisible(),false);
 assert.equal(await ev('activeFilterCount()'),0);assert.equal(await ev("document.activeElement.closest('.source')!==null"),true);
 await click('#open-collection');assert.deepEqual(await counts(),{directory:1,personal:1,total:2});
 check('Personal edit/delete, directory details and storage-change refresh work within the same collection');

 await seed(favorites,sources);await mkdir('/tmp/reference-collection-results',{recursive:true});
 const expectedTitles={en:'My collection',es:'Mi colección','zh-Hans':'我的收藏集','zh-Hant':'我的收藏集',ja:'マイコレクション',ko:'내 컬렉션'};
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of Object.keys(expectedTitles)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'));document.querySelector('#personal-backup').open=true`);
  const layout=await ev(`(()=>{
   const errors=[];if(document.documentElement.scrollWidth>innerWidth+1)errors.push('page overflow');
   for(const e of document.querySelectorAll('#my-sources button,#my-sources input,#my-sources h2,#personal-list h3 a')){
    if(!e.getClientRects().length)continue;const r=e.getBoundingClientRect();
    if(r.left<-1||r.right>innerWidth+1||e.scrollWidth>e.clientWidth+2)errors.push('overflow: '+e.textContent);
    if(e.matches('button')){const range=document.createRange();range.selectNodeContents(e);if([...range.getClientRects()].some(t=>t.left<r.left-2||t.right>r.right+2))errors.push('text outside button: '+e.textContent);}
   }
   return {errors,title:document.querySelector('#personal-title').textContent,selected:document.querySelectorAll('[data-collection-kind][aria-pressed=true]').length};
  })()`);
  assert.deepEqual(layout.errors,[],JSON.stringify({width,size,theme,locale,...layout}));assert.equal(layout.title,expectedTitles[locale]);assert.equal(layout.selected,1);
  result.layouts.push({width,size,theme,locale});
 }
 check('96 combined-collection viewport/text-size/theme/language cases, translated labels and readable action text');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'));document.querySelector('#personal-backup').open=false;document.querySelector('#my-sources').scrollIntoView({block:'start',behavior:'instant'})");
 await pause(50);const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-collection-results/mobile.png',Buffer.from(screenshot.data,'base64'));
 await until('!!navigator.serviceWorker.controller');connected=false;
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('',true);assert.equal(await collectionVisible(),true);assert.deepEqual(await counts(),{directory:2,personal:2,total:4});
 await kind('directory');await click('.collection-source [data-collection-action=remove]');assert.deepEqual(await counts(),{directory:1,personal:0,total:3});
 await kind('personal');await click('[data-personal-action="favorite"]');assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(personalKey)})).sources[0].favorite`),true);
 await navigate('',true);assert.deepEqual(await counts(),{directory:1,personal:2,total:3});
 assert.deepEqual(page.exceptions,[]);
 check('Offline reload retains the combined collection; directory removal and personal changes persist offline');
 result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await report('collection',result);}
