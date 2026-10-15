import assert from 'node:assert/strict';
import {assets,browser,serve,pause,report} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

const files=await assets(),key='reference-edit-personal-sources-v1';
let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page;
const result={checks:[],layouts:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);};
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
const values=async data=>ev(`(()=>{const f=document.querySelector('#personal-form');for(const [k,v] of Object.entries(${JSON.stringify(data)})){const e=f.elements.namedItem(k);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
const submit=()=>ev("document.querySelector('#personal-form').requestSubmit()");
const stored=()=>ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const count=()=>ev("document.querySelectorAll('.personal-source').length");
try{
 await navigate();
 await click('.favorite-source');
 const curated=await ev("[...document.querySelectorAll('.source')].map(s=>s.outerHTML)");
 const originalFavorites=await ev("localStorage.getItem('visual-edit-favorites-v1')");
 await click('#personal-add');
 assert.equal(await ev('document.activeElement.id'),'personal-name');
 await submit();assert.equal(await count(),0);
 await values({name:'Unsafe',url:'javascript:alert(1)',description:'Must reject'});await submit();
 assert.equal(await ev("document.querySelector('#personal-url').validity.customError"),true);assert.equal(await count(),0);
 await values({name:'<img src=x onerror=alert(1)> Studio',url:'https://studio.example/research',description:'Personal portrait references <script>window.personalInjected=true</script>',category:'Photography',country:'Japan',tags:'portrait, film',image:page.origin+'/icons/icon-192.png'});
 await submit();assert.equal(await count(),1);
 assert.equal((await stored()).sources[0].name,'<img src=x onerror=alert(1)> Studio');
 assert.equal(await ev('window.personalInjected===undefined'),true);
 assert.equal(await ev("document.querySelector('.personal-source h3 img')===null"),true);
 assert.equal(await ev("document.querySelector('.personal-source a').rel"),'noopener noreferrer');
 check('Required fields and safe URL validation; full source creation; user text stays inert');

 const id=(await stored()).sources[0].id;
 await click('[data-personal-action="favorite"]');assert.equal((await stored()).sources[0].favorite,true);
 assert.equal(await ev("localStorage.getItem('visual-edit-favorites-v1')"),originalFavorites);
 await navigate('',true);assert.equal(await count(),1);assert.equal((await stored()).sources[0].favorite,true);
 assert.equal(await ev("document.querySelector('[data-personal-action=favorite]').getAttribute('aria-pressed')"),'true');
 check('Personal collection and favorites persist on reload without changing curated favorites');

 await click('[data-personal-action="edit"]');
 await values({name:'Studio revised',url:'https://studio.example/new',description:'New description',tags:'lighting, analog'});await submit();
 assert.equal((await stored()).sources[0].id,id);assert.equal((await stored()).sources[0].favorite,true);
 assert.equal(await ev("document.querySelector('.personal-source a').href"),'https://studio.example/new');
 check('Editing preserves identity and favorite state while updating links and metadata');

 await click('#personal-add');await values({name:'Duplicate',url:'https://studio.example/new',description:'Duplicate'});await submit();assert.equal(await count(),1);
 assert.ok(await ev("document.querySelector('#personal-error').textContent.length>0"));await click('#personal-cancel');
 await click('#personal-add');await values({name:'Second studio',url:'https://second.example/',description:'Textiles and fabrics',country:'France'});await submit();assert.equal(await count(),2);
 await ev("document.querySelector('#personal-search').value='analog';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");assert.equal(await count(),1);
 await ev("document.querySelector('#personal-search').value='no-match';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");assert.equal(await count(),0);
 await ev("document.querySelector('#personal-search').value='';document.querySelector('#personal-search').dispatchEvent(new Event('input'))");
 await click('#personal-only');assert.equal(await count(),1);
 await click('[data-personal-action="favorite"]');assert.equal(await count(),0);
 await click('#personal-only');assert.equal(await count(),2);
 check('Duplicate prevention, metadata search, empty state and personal favorites filter');

 await click('[data-personal-action="delete"]');assert.equal(await ev('document.activeElement.id'),'personal-delete-cancel');
 await click('#personal-delete-cancel');assert.equal((await stored()).sources.length,2);
 await click('[data-personal-action="delete"]');await click('#personal-delete-confirm');assert.equal((await stored()).sources.length,1);
 assert.equal(await ev('document.activeElement.id'),'personal-add');
 check('Deletion requires confirmation, supports cancel and restores keyboard focus');

 const beforeFailure=await stored();
 await ev(`window.personalOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(key)})throw new DOMException('Full','QuotaExceededError');return window.personalOriginalSet.call(this,k,v);}`);
 await click('#personal-add');await values({name:'Cannot save',url:'https://quota.example/',description:'Preserve the form'});await submit();
 assert.equal(await ev("document.querySelector('#personal-dialog').open"),true);
 assert.equal(await ev("document.querySelector('#personal-name').value"),'Cannot save');
 assert.deepEqual(await stored(),beforeFailure);await click('#personal-cancel');
 await ev('Storage.prototype.setItem=window.personalOriginalSet');
 check('Quota failure preserves stored collection and unsaved form contents');

 const beforeCorrupt=await stored();
 await ev(`localStorage.setItem(${JSON.stringify(key)},'{broken');dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(key)}}))`);
 assert.equal(await ev("document.querySelector('#personal-warning').hidden"),false);
 await click('#personal-add');await values({name:'Cannot overwrite',url:'https://safe.example/',description:'Keep corrupt data for recovery'});await submit();
 assert.equal(await ev(`localStorage.getItem(${JSON.stringify(key)})`),'{broken');await click('#personal-cancel');
 await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(beforeCorrupt))});dispatchEvent(new StorageEvent('storage',{key:${JSON.stringify(key)}}))`);
 check('Unreadable stored data is reported and cannot be silently overwritten');

 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark']) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  for(const locale of ['en','es','zh-Hans','zh-Hant','ja','ko']){
   await ev(`(()=>{const e=document.querySelector('#language');e.value=${JSON.stringify(locale)};e.dispatchEvent(new Event('change'));})()`);
   await click('#personal-add');await ev("document.querySelector('#personal-form details').open=true");await pause(20);
   const layout=await ev(`(()=>{const d=document.querySelector('#personal-dialog'),r=d.getBoundingClientRect();return {lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth+1||d.scrollWidth>d.clientWidth+1,outside:r.left<0||r.right>innerWidth+1,unlabeled:[...d.querySelectorAll('input,textarea')].some(e=>!e.labels.length)}})()`);
   assert.equal(layout.lang,locale);assert.equal(layout.overflow,false);assert.equal(layout.outside,false);assert.equal(layout.unlabeled,false);
   result.layouts.push({width,size,theme,locale});await click('#personal-cancel');
  }
 }
 check('96 personal-form layout/language/theme/text-size cases and labeled controls');
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await click('#personal-add');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(100);
 assert.equal(await ev("document.querySelector('#personal-dialog').open"),false);assert.equal(await ev('document.activeElement.id'),'personal-add');
 await until('!!navigator.serviceWorker.controller');
 connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('',true);assert.equal(await count(),1);
 await click('#personal-add');await values({name:'Offline reference',url:'https://offline.example/',description:'Saved while offline'});await submit();assert.equal((await stored()).sources.length,2);
 check('Real Escape closes the form; personal sources can be read and added offline');
 assert.deepEqual(await ev("[...document.querySelectorAll('.source')].map(s=>s.outerHTML)"),curated);
 check('All 58 curated records and their controls remain unchanged after personal-source operations');
 await ev("document.querySelector('#my-sources').scrollIntoView({behavior:'instant',block:'start'})");await pause(100);
 await mkdir('/tmp/reference-personal-results',{recursive:true});
 const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-personal-results/mobile.png',Buffer.from(screenshot.data,'base64'));
 assert.deepEqual(page.exceptions,[]);result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await report('personal-sources',result);}
