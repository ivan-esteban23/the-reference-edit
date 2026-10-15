import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {assets,browser,serve,pause,report} from './browser.mjs';

const files=await assets();let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
const choose=goal=>click(`[data-chooser-goal="${goal}"]`);
const check=name=>{result.checks.push(name);console.log(name);};
const favoriteKey='visual-edit-favorites-v1';
try{
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await navigate();assert.equal(await ev("document.querySelector('#source-chooser').open"),false);
 assert.equal(await ev("document.querySelectorAll('.chooser-card').length"),0);
 const originals=await ev("cards.map(c=>c.outerHTML)");
 await ev("location.hash='#source-chooser'");await until("document.querySelector('#source-chooser').open");
 const selections={};
 for(const goal of ['editorial','history','street','organize']){
  await choose(goal);
  selections[goal]=await ev("[...document.querySelectorAll('.chooser-card')].map(c=>c.dataset.chooserUrl)");
  assert.equal(selections[goal].length,3);assert.equal(new Set(selections[goal]).size,3);
  assert.ok(await ev("[...document.querySelectorAll('.chooser-card')].every(c=>cards.some(original=>original.querySelector('.favorite-source').dataset.url===c.dataset.chooserUrl)&&c.querySelector('p').textContent.length>20&&c.querySelector('.chooser-access').textContent.length>7)"));
  assert.equal(await ev("document.querySelectorAll('[data-chooser-goal][aria-pressed=true]').length"),1);
 }
 assert.deepEqual(await ev('cards.map(c=>c.outerHTML)'),originals);
 check('Four goals offer three catalog-backed sources with reasons/access notes, without changing the curated records');

 await choose('history');const url=selections.history[0];await click('[data-chooser-save]');
 assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(favoriteKey)})).includes(${JSON.stringify(url)})`),true);
 assert.equal(await ev("document.activeElement.matches('[data-chooser-save]')"),true);
 await click('#mobile-saved');assert.equal(await ev("document.querySelectorAll('.collection-source').length"),1);
 await click('#collection-back');await click('[data-chooser-save]');
 assert.equal(await ev("document.querySelector('#mobile-saved-count').textContent"),'0');
 await ev(`window.chooserSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(favoriteKey)})throw new DOMException('Full','QuotaExceededError');return window.chooserSet.call(this,k,v);}`);
 await click('[data-chooser-save]');assert.equal(await ev("document.querySelector('[data-chooser-save]').getAttribute('aria-pressed')"),'false');
 assert.equal(await ev("document.querySelector('#chooser-warning').hidden"),false);
 await ev('Storage.prototype.setItem=window.chooserSet');await click('[data-chooser-save]');
 assert.equal(await ev("document.querySelector('#chooser-warning').hidden"),true);
 await navigate('',true);await ev("document.querySelector('#source-chooser').open=true");await choose('history');
 assert.equal(await ev("document.querySelector('[data-chooser-save]').getAttribute('aria-pressed')"),'true');
 check('Save/remove synchronizes collection counts, retains keyboard focus, handles storage failures and persists after reload');

 await ev("document.querySelector('[data-topic=architecture]').click();search.value='no-such-source';countryFilter.value='France';update()");await choose('street');
 assert.equal(await ev("search.value==='no-such-source'&&countryFilter.value==='France'"),true);
 await click('[data-chooser-view]');
 assert.equal(await ev('activeFilterCount()'),0);assert.equal(await ev('topic'),'');
 assert.ok(await ev(`document.activeElement.closest('.source').querySelector('.favorite-source').dataset.url===${JSON.stringify(selections.street[0])}&&document.activeElement.closest('.source').querySelector('.source-details').open`));
 check('Choosing a goal leaves directory filters intact; View reveals the selected full record and focuses its link');

 await ev("document.querySelector('#inspiration').open=true;document.querySelector('#inspiration a[href=\"#source-chooser\"]').click()");
 await until("document.querySelector('#source-chooser').open&&document.activeElement.matches('#source-chooser>summary')");
 await choose('organize');
 const expected={en:'Help me choose',es:'Ayúdame a elegir','zh-Hans':'帮我选择','zh-Hant':'幫我選擇',ja:'情報源選びを手伝う',ko:'소스 선택 도우미'};
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of Object.keys(expected)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('#language').value=${JSON.stringify(locale)};document.querySelector('#language').dispatchEvent(new Event('change'))`);
  const layout=await ev(`(()=>{
   const errors=[];
   if(document.documentElement.scrollWidth>innerWidth+1)errors.push('page overflow');
   for(const e of document.querySelectorAll('#source-chooser button,.chooser-card h3,.chooser-card p')){
    const r=e.getBoundingClientRect();if(r.left<-1||r.right>innerWidth+1||e.scrollWidth>e.clientWidth+2)errors.push('overflow: '+e.textContent);
   }
   return {errors,title:document.querySelector('#source-chooser>summary').textContent,pressed:document.querySelector('[data-chooser-goal=organize]').getAttribute('aria-pressed'),reason:document.querySelectorAll('.chooser-card p')[2]?.textContent};
  })()`);
  assert.deepEqual(layout.errors,[],JSON.stringify({width,size,theme,locale,...layout}));assert.equal(layout.title,expected[locale]);assert.equal(layout.pressed,'true');
  if(locale!=='en')assert.ok(await ev("!document.querySelectorAll('.chooser-card')[1].querySelector('p').textContent.startsWith('Arrange your selected')"),'Untranslated PureRef recommendation');
  result.layouts.push({width,size,theme,locale});
 }
 check('Guide shortcut opens the chooser; 96 expanded layouts preserve the selected goal and translated suggestions');
 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await choose('editorial');
 await ev("document.querySelector('#source-chooser').scrollIntoView({block:'start',behavior:'instant'})");await pause(200);
 await mkdir('/tmp/reference-chooser-results',{recursive:true});const capture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('/tmp/reference-chooser-results/mobile.png',Buffer.from(capture.data,'base64'));
 await until('!!navigator.serviceWorker.controller');connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('',true);await ev("location.hash='#source-chooser'");await choose('editorial');await click('[data-chooser-save]');
 assert.equal(await ev(`JSON.parse(localStorage.getItem(${JSON.stringify(favoriteKey)})).length`),2);
 await click('[data-chooser-view]');assert.equal(await ev('document.activeElement.closest(".source")!==null'),true);
 assert.deepEqual(page.exceptions,[]);check('Recommendations, saving and full-record navigation work offline');result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await page.close();await report('chooser',result);}
