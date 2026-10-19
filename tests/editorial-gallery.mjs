import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {assets,browser,serve,pause,report} from './browser.mjs';

const files=await assets(),catalog=JSON.parse(files.get('/data/references.json'));
let connected=true;
const page=await browser((req,res)=>{if(!connected){req.socket.destroy();return;}serve(files,req,res);});
const {evaluate:ev,call,navigate,until}=page,result={checks:[],layouts:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);};
let pageClosed=false;
const ready=()=>until("document.querySelectorAll('.editorial-card img').length===3&&document.querySelector('#editorial-status').hidden");
const decode=()=>ev("Promise.all([...document.querySelectorAll('.editorial-card img')].map(image=>image.decode())).then(()=>true)");
function contrast(fg,bg){
 const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
try{
 await navigate();await ready();assert.ok(await decode());
 const cards=await ev("[...document.querySelectorAll('.editorial-card')].map(card=>({id:card.dataset.referenceId,city:card.querySelector('h3').textContent,context:card.querySelector('.editorial-context').textContent,caption:card.querySelector('.editorial-caption').textContent,disclosure:card.querySelector('.editorial-disclosure').textContent,alt:card.querySelector('img').alt,width:Number(card.querySelector('img').getAttribute('width')),height:Number(card.querySelector('img').getAttribute('height')),path:new URL(card.querySelector('img').src).pathname,links:card.querySelectorAll('a').length}))");
 assert.equal(cards.length,3);
 for(const entry of catalog.references.filter(entry=>entry.assetStatus==='available')){
  const card=cards.find(card=>card.id===entry.id);assert.ok(card);
  for(const field of ['city','context','caption','disclosure'])assert.equal(card[field],entry[field]);
  assert.equal(card.path,entry.image);assert.equal(card.width,entry.width);assert.equal(card.height,entry.height);assert.equal(card.links,0);
  assert.ok(card.alt.includes(entry.city)&&card.alt.includes(entry.caption));
 }
 assert.equal(await ev("document.querySelectorAll('#editorial-gallery h2').length"),1);
 assert.equal(await ev("document.querySelectorAll('#editorial-gallery h3').length"),3);
 check('Catalog-driven cards preserve city, context, caption, disclosure, full-resolution geometry and descriptive alt text; empty source URLs create no links');

 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await ev("document.querySelector('.hero-actions a[href=\"#editorial-gallery\"]').focus()");
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await until("location.hash==='#editorial-gallery'");
 await ev("navigateDirectory(true);document.querySelector('#mobile-sections').click();document.querySelector('#sections-menu a[href=\"#editorial-gallery\"]').click()");
 assert.equal(await ev("!collectionOpen&&!document.querySelector('#sections-menu').open&&document.activeElement.id==='editorial-gallery'"),true);
 const locales={en:'Tokyo',es:'Tokio','zh-Hans':'东京','zh-Hant':'東京',ja:'東京',ko:'도쿄'};
 for(const width of [320,390,768,1440])for(const size of [100,200])for(const theme of ['light','dark'])for(const locale of Object.keys(locales)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await ev(`document.documentElement.style.fontSize='${size}%';document.documentElement.dataset.theme='${theme}';document.querySelector('#language').value='${locale}';document.querySelector('#language').dispatchEvent(new Event('change'));`);
  const layout=await ev(`(()=>{
   const errors=[],grid=document.querySelector('#editorial-grid'),images=[...grid.querySelectorAll('img')];
   if(document.documentElement.scrollWidth>innerWidth+1)errors.push('page overflow');
   for(const e of document.querySelectorAll('#editorial-gallery h2,#editorial-gallery h3,#editorial-gallery p,#editorial-gallery a')){const r=e.getBoundingClientRect();if(r.left<-1||r.right>innerWidth+1||e.scrollWidth>e.clientWidth+2)errors.push('overflow: '+e.textContent);}
   for(const image of images){const r=image.getBoundingClientRect();if(Math.abs(r.height-r.width*image.naturalHeight/image.naturalWidth)>2)errors.push('cropped or distorted image');}
   const disclosure=grid.querySelector('.editorial-disclosure');
   return {errors,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,city:grid.querySelector('h3').textContent,fg:getComputedStyle(disclosure).color,bg:getComputedStyle(document.body).backgroundColor,disclosures:[...grid.querySelectorAll('.editorial-disclosure')].every(e=>e.getClientRects().length&&e.textContent.trim())};
  })()`);
  assert.deepEqual(layout.errors,[],JSON.stringify({width,size,theme,locale,...layout}));assert.equal(layout.columns,width>=960?3:1);assert.equal(layout.city,locales[locale]);assert.ok(layout.disclosures);assert.ok(contrast(layout.fg,layout.bg)>=4.5);
  if(locale!=='en')assert.ok(await ev("!document.querySelector('.editorial-caption').textContent.startsWith('Charcoal coat')"));
  result.layouts.push({width,size,theme,locale});
 }
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await ev("getComputedStyle(document.documentElement).scrollBehavior"),'auto');
 await call('Emulation.setEmulatedMedia',{features:[]});
 check('Keyboard navigation from cover and collection, heading hierarchy, disclosure contrast, reduced motion and 96 responsive/translated layouts pass');

 await ev("document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='light';document.querySelector('#language').value='en';document.querySelector('#language').dispatchEvent(new Event('change'))");
 // Check real CSS safe-area values, including the existing static navigation fallback
 // at narrow widths/enlarged text. Every caption must be fully readable on scroll.
 result.mobileClearance=[];
 for(const width of [320,390])for(const size of [100,200])for(const bottomInset of [0,34]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  await call('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:bottomInset}});
  await ev(`document.documentElement.style.fontSize='${size}%';document.activeElement.blur()`);
  assert.ok(await ev(`(()=>{const nav=document.querySelector('.mobile-nav'),style=getComputedStyle(nav);return style.position!=='fixed'||parseFloat(style.paddingBottom)>=${bottomInset};})()`));
  for(let index=0;index<3;index++)for(const selector of ['.editorial-caption','.editorial-disclosure']){
   const bounds=await ev(`(()=>{const element=document.querySelectorAll('.editorial-card')[${index}].querySelector('${selector}');element.scrollIntoView({block:'end',behavior:'instant'});const r=element.getBoundingClientRect(),nav=document.querySelector('.mobile-nav'),fixed=getComputedStyle(nav).position==='fixed';return {top:r.top,bottom:r.bottom,limit:fixed?nav.getBoundingClientRect().top:innerHeight};})()`);
   assert.ok(bounds.top>=0&&bounds.bottom<=bounds.limit-8,JSON.stringify({width,size,bottomInset,index,selector,...bounds}));
  }
  await ev("(()=>{const link=document.querySelector('.editorial-heading>a');link.scrollIntoView({block:'end',behavior:'instant'});link.focus()})()");await pause(50);
  // Leave the gallery and return using native keyboard navigation, after
  // the directory's sticky search bar has scrolled out of its container.
  for(const modifiers of [0,8]){
   await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers});
   await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers});
   await pause(250);
  }
  const focus=await ev("(()=>{const link=document.activeElement,r=link.getBoundingClientRect(),nav=document.querySelector('.mobile-nav');return {correct:link.matches('.editorial-heading>a'),top:r.top,bottom:r.bottom,limit:getComputedStyle(nav).position==='fixed'?nav.getBoundingClientRect().top:innerHeight};})()");
  assert.ok(focus.correct&&focus.top>=0&&focus.bottom<=focus.limit-8,JSON.stringify({width,size,bottomInset,focus}));
  result.mobileClearance.push({width,size,bottomInset});
 }
 await call('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:0}});
 await ev("document.documentElement.style.fontSize='100%'");
 check('All three captions and final disclosures scroll fully clear of navigation at 320/390 px, 100/200% text and 0/34 px safe areas; focused directory link stays visible');
 await mkdir('/tmp/editorial-gallery-review',{recursive:true});
 for(const [name,width] of [['desktop',1440],['mobile',390]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:name==='desktop'?1400:1000,deviceScaleFactor:1,mobile:false});
  await ev("document.activeElement.blur();window.scrollTo({top:document.querySelector('#editorial-gallery').getBoundingClientRect().top+scrollY,behavior:'instant'})");await pause(250);
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile('/tmp/editorial-gallery-review/'+name+'.png',Buffer.from(shot.data,'base64'));
 }
 await until('!!navigator.serviceWorker.controller');await navigate('',true);await ready();
 connected=false;await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('',true);await ready();assert.ok(await decode());
 assert.ok(await ev("fetch('/data/references.json').then(r=>r.ok)"));
 assert.deepEqual(page.exceptions,[]);check('Catalog and all three full-frame illustrations render on a real worker-controlled offline reload');
 await page.close();pageClosed=true;

 // Fresh profiles with failed worker installation exercise real network failures without bypass/unregister calls.
 let mode='catalog-error';
 const failureFiles=new Map(files);
 const failure=await browser((req,res,later)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/sw.js'){res.writeHead(503);res.end();return;}
  if(pathname==='/data/references.json'){
   if(mode==='catalog-error'){res.writeHead(503);res.end();return;}
   if(mode==='invalid-json'){res.end('{broken');return;}
   if(mode==='slow-catalog'){later(()=>{if(!res.destroyed)res.end(JSON.stringify(catalog));},7000);return;}
   const fixture=structuredClone(catalog);
   if(mode==='pending'){fixture.references.push({id:'pending-test',assetStatus:'pending-upload'});}
   if(mode==='empty'){fixture.references.forEach(entry=>entry.assetStatus='pending-upload');}
   if(mode==='unsafe-text'){fixture.references[0].caption='<img src=x onerror="window.galleryInjected=true">';}
   if(mode==='unsafe-path'){fixture.references[0].image='https://example.com/tracker.jpg';}
   if(mode==='missing-disclosure'){fixture.references[0].disclosure='';}
   if(mode==='duplicate-id'){fixture.references[1].id=fixture.references[0].id;}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture));return;
  }
  if(mode==='missing-image'&&pathname===catalog.references[0].image){res.writeHead(404);res.end();return;}
  serve(failureFiles,req,res);
 });
 try{
  await failure.navigate();await failure.until("!document.querySelector('#editorial-retry').hidden");
  assert.equal(await failure.evaluate("document.querySelectorAll('.editorial-card').length"),0);
  await failure.evaluate("document.querySelector('#editorial-retry').focus();document.querySelector('#editorial-retry').click()");
  await failure.until("!document.querySelector('#editorial-retry').hidden");
  assert.equal(await failure.evaluate("document.activeElement.id==='editorial-retry'&&document.querySelector('#editorial-retry').tabIndex===0"),true);
  mode='normal';await failure.evaluate("document.querySelector('#editorial-retry').focus();document.querySelector('#editorial-retry').click()");await failure.until("document.querySelectorAll('.editorial-card').length===3");
  for(const scenario of ['invalid-json','slow-catalog','unsafe-path','missing-disclosure','duplicate-id']){
   mode=scenario;await failure.navigate('/?scenario='+scenario);await failure.until("!document.querySelector('#editorial-retry').hidden");
   assert.equal(await failure.evaluate("document.querySelectorAll('.editorial-card').length"),0);
  }
  mode='empty';await failure.navigate('/?scenario=empty');await failure.until("document.querySelector('#editorial-status').textContent==='No editorial studies are available yet.'");assert.equal(await failure.evaluate("document.querySelectorAll('.editorial-card').length"),0);
  mode='pending';await failure.navigate('/?scenario=pending');await failure.until("document.querySelectorAll('.editorial-card').length===3");
  mode='unsafe-text';await failure.navigate('/?scenario=unsafe-text');await failure.until("document.querySelectorAll('.editorial-card').length===3");
  assert.equal(await failure.evaluate("document.querySelector('.editorial-caption').textContent"),'<img src=x onerror="window.galleryInjected=true">');
  assert.equal(await failure.evaluate("!!window.galleryInjected||!!document.querySelector('.editorial-caption img')"),false);
  mode='missing-image';await failure.navigate('/?scenario=missing-image');await failure.until("document.querySelector('.editorial-image-error')&&!document.querySelector('.editorial-image-error').hidden");
  assert.ok(await failure.evaluate("document.querySelector('.editorial-card img').hidden&&!!document.querySelector('.editorial-card .editorial-caption').textContent&&!!document.querySelector('.editorial-card .editorial-disclosure').textContent"));
  assert.deepEqual(failure.exceptions,[]);
  check('Catalog failures/timeouts, invalid paths/disclosures/IDs, retry, empty/pending entries, inert metadata and image-404 placeholders are handled without page exceptions');
 }finally{await failure.close();}
 result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{if(!pageClosed)await page.close();await report('editorial-gallery',result);}
