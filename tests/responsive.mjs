import assert from 'node:assert/strict';
import {assets, browser, serve, report} from './browser.mjs';

// These are CSS viewport dimensions, not marketing/device panel resolutions.
const viewports = [
  ...[320, 360, 375, 393, 412, 414, 430, 440].map(width => ({width, height: 900, group: 'mobile'})),
  ...[768, 800, 834, 924, 1024, 1180, 1280, 1366, 1480].map(width => ({width, height: 1080, group: 'tablet'})),
  ...[1470, 1512, 1536, 1710, 1728].map(width => ({width, height: 1080, group: 'laptop'})),
  ...[[1920,1080], [2560,1440], [3440,1440], [3840,2160], [5120,2880], [6016,3384], [7680,4320]]
    .map(([width,height]) => ({width,height,group:'monitor'})),
];
const cases = [...viewports.map(viewport => ({...viewport, text: 100, dpr: 1})),
  ...[639, 640, 767, 1023, 1279, 1535].map(width => ({width,height:1080,group:'breakpoint',text:100,dpr:1})),
  ...[320, 375, 414].flatMap(width => [125, 150, 200].map(text => ({...viewports.find(viewport => viewport.width === width), text, dpr: 1}))),
  ...[360, 834, 1470, 3840].map(width => ({...viewports.find(viewport => viewport.width === width), text: 200, dpr: 1})),
  ...[393, 1512].flatMap(width => [1, 2].map(dpr => ({...viewports.find(viewport => viewport.width === width), text: 100, dpr}))),
];
const files = await assets(), result = {cases: [], checks: [], passed: false};
const page = await browser((req,res) => serve(files,req,res));
const {call, evaluate: ev} = page;
const key = async (key, code = key) => {
  const windowsVirtualKeyCode={Tab:9,Escape:27}[key];
  await call('Input.dispatchKeyEvent', {type:'keyDown', key, code, windowsVirtualKeyCode});
  await call('Input.dispatchKeyEvent', {type:'keyUp', key, code, windowsVirtualKeyCode});
};
const resize = async ({width,height,dpr=1,text=100}) => {
  await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:dpr,mobile:false});
  await ev(`document.documentElement.style.fontSize='${text}%';window.scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
};
// Run in the document: inspect real bounds with the page-level overflow safety
// removed. Legitimate local horizontal scrollers are measured separately below.
const measure = () => {
  const errors = [], rect = element => element.getBoundingClientRect();
  const visible = element => !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
  const label = element => element.id ? '#'+element.id : element.tagName.toLowerCase()+'.'+[...element.classList].slice(0,2).join('.');
  const main = document.querySelector('main'), mainRect = rect(main);
  const outside = (r,b) => r.left < b.left-2 || r.right > b.right+2;
  const overlap = (a,b) => a.left < b.right-2 && a.right > b.left+2 && a.top < b.bottom-2 && a.bottom > b.top+2;
  const localScroller = element => {
    for(let parent=element.parentElement;parent && parent!==document.body;parent=parent.parentElement){
      if(['auto','scroll'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth>parent.clientWidth+2)return parent;
    }
    return null;
  };
  for(const element of document.querySelectorAll('body *')){
    if(!visible(element) || element.closest('svg,script,style') || element.matches('.sr-only'))continue;
    const r=rect(element);if(r.width<=2 || r.height<=2 || localScroller(element))continue;
    if(outside(r,{left:0,right:innerWidth}))errors.push('outside viewport: '+label(element));
  }
  if(document.documentElement.scrollWidth>innerWidth+2)errors.push('document horizontal overflow');
  if(innerWidth>=1920 && (mainRect.width<1440-2 || mainRect.width>1920+2))errors.push('content cap must be 1440–1920 CSS px: '+mainRect.width);
  if(mainRect.width>1920+2)errors.push('content exceeds 1920 CSS px');
  const cards=[...document.querySelectorAll('#directory .source')].filter(visible);
  const firstTop=cards.length ? rect(cards[0]).top : NaN;
  const columns=cards.filter(card=>Math.abs(rect(card).top-firstTop)<2).length;
  // Width, not a device label, chooses layout; large tablets and laptops overlap.
  const expectedColumns=innerWidth<768 ? 1 : innerWidth<1280 ? 2 : 3;
  if(columns!==expectedColumns)errors.push(`directory columns ${columns}; expected ${expectedColumns}`);
  const actionSelector='.cross-nav a,.hero-actions a,[data-text-size-toggle],[data-theme-toggle],#language,#search,#filter-toggle,#mobile-directory,#mobile-saved,.source-actions button,.topic-buttons button,#region,#country-filter,#access-filter';
  for(const element of document.querySelectorAll(actionSelector)){
    if(!visible(element))continue;const r=rect(element);
    if(r.width<47.5 || r.height<47.5)errors.push('target below 48×48 CSS px: '+label(element)+' '+r.width.toFixed(1)+'×'+r.height.toFixed(1));
  }
  for(const element of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,summary,[role=button]')){
    if(element.id==='language' || !visible(element) || element.matches('.skip-link'))continue;
    const r=rect(element);
    if(r.width<43.5 || r.height<43.5)errors.push('interactive target below 44×44 CSS px: '+label(element)+' '+r.width.toFixed(1)+'×'+r.height.toFixed(1));
  }
  const zoomToggle=document.querySelector('[data-text-size-toggle]');
  if(!zoomToggle || !visible(zoomToggle) || outside(rect(zoomToggle),{left:0,right:innerWidth}))errors.push('zoom control unreachable');
  const hero=document.querySelector('.hero'), copy=document.querySelector('.cover-copy'), image=document.querySelector('.cover-image'), heading=document.querySelector('.hero h1');
  const copyBounds=getComputedStyle(copy).display==='contents' ? rect(hero) : rect(copy);
  if(outside(rect(heading),copyBounds))errors.push('hero heading escapes copy column');
  for(const element of copy.querySelectorAll('h1,p,a')){
    if(visible(element) && overlap(rect(element),rect(image)))errors.push('hero copy overlaps portrait: '+label(element));
  }
  for(const [selector,min] of [['.source-purpose',16],['.card-summary .summary-item',13],['.metadata-label',13]]){
    const element=document.querySelector(selector);
    if(element && visible(element) && parseFloat(getComputedStyle(element).fontSize)<min-.1)errors.push('text below '+min+'px: '+selector);
  }
  for(const element of hero.querySelectorAll('h1,p,figcaption,a')){
    if(!visible(element))continue;const bounds=rect(element),walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      if(!walker.currentNode.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(walker.currentNode);
      for(const r of range.getClientRects()){
        if(outside(r,bounds))errors.push('hero text clipped horizontally: '+label(element));
        for(let parent=element;parent && parent!==hero;parent=parent.parentElement){
          const style=getComputedStyle(parent),b=rect(parent);
          if(['hidden','clip'].includes(style.overflowY) && (r.top<b.top-3 || r.bottom>b.bottom+3))errors.push('hero text clipped vertically: '+label(element));
        }
      }
    }
  }
  // The cover deliberately crops its artwork; test its allocated bounds, not
  // native image ratio, so the existing art direction remains permissible.
  const portrait=image.querySelector('img'),p=rect(portrait);
  if(!portrait.complete || !portrait.naturalWidth || p.width<=0 || p.height<=0)errors.push('portrait missing or undecoded');
  const imageShare=rect(image).width/rect(hero).width;
  if(innerWidth>=768 && (imageShare<.2 || imageShare>.55))errors.push('hero portrait proportion: '+imageShare.toFixed(3));
  return {errors:[...new Set(errors)],cssWidth:innerWidth,cssHeight:innerHeight,dpr:devicePixelRatio,mainWidth:mainRect.width,columns,imageShare,headingFont:parseFloat(getComputedStyle(heading).fontSize)};
};
try {
  await resize(cases[0]);await page.navigate('/');
  await ev(`document.fonts.ready;document.querySelectorAll('.source-details').forEach(element=>element.open=true);
    document.querySelector('#filter-panel').open=true;
    const style=document.createElement('style');style.textContent='html,body,main{overflow-x:visible!important}*{scroll-behavior:auto!important;animation:none!important;transition:none!important}';document.head.append(style);`);
  for(const settings of cases){
    await resize(settings);
    const measured=await ev('('+measure.toString()+')()');
    if(measured.cssWidth!==settings.width || measured.cssHeight!==settings.height || measured.dpr!==settings.dpr)measured.errors.push('CSS viewport / DPR mismatch');
    result.cases.push({...settings,...measured});
    console.log(`Responsive ${settings.width}×${settings.height} CSS px / DPR ${settings.dpr} / text ${settings.text}%: ${measured.errors.length ? measured.errors.length+' failures' : 'PASS'}`);
  }
  // Holding CSS width constant while changing DPR must not change layout.
  for(const width of [393,1512]){
    const pair=result.cases.filter(item=>item.width===width && item.text===100).slice(-2);
    assert.equal(pair[0].mainWidth,pair[1].mainWidth,'DPR changed CSS content width');
    assert.equal(pair[0].headingFont,pair[1].headingFont,'DPR changed CSS typography');
    assert.equal(pair[0].columns,pair[1].columns,'DPR changed CSS columns');
  }
  result.checks.push('Paired DPR 1/2 keeps CSS viewport, typography and column count unchanged (not browser zoom)');
  await resize({width:393,height:900});
  assert.equal(await ev("document.querySelector('#sections-menu')"), null, 'Mobile menu dialog must be removed');
  assert.equal(await ev("document.querySelector('#mobile-sections')"), null, 'Mobile sections button must be removed');
  const headerLinks = await ev("[...document.querySelectorAll('.section-navigation .jump a')].map(a => ({href: a.getAttribute('href'), text: a.textContent.trim(), target: !!document.querySelector(a.getAttribute('href'))}))");
  assert.equal(headerLinks.length, 7, 'Sticky header navigation must have 7 links');
  assert.ok(headerLinks.every(link => link.target), 'Every header link must target an existing section');
  const navTargets = await ev("(()=>{const d=document.querySelector('.section-navigation .jump');return [...d.querySelectorAll('a')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));})()");
  assert.ok(navTargets.every(target => target.height >= 43.5), 'Header navigation links below 44px minimum touch target height');
  await ev("document.querySelector('.section-navigation .jump a').focus()");
  const navFocus = [];
  for (let index = 0; index < 7; index++) {
    navFocus.push(await ev("document.activeElement.getAttribute('href')"));
    await key('Tab');
  }
  assert.deepEqual(navFocus, ['#routes', '#directory', '#editorial-gallery', '#editors', '#shortlist', '#asia-browse', '#notes'], 'Tab must traverse header links in logical order');
  result.checks.push('Sticky header navigation links: 7 targets, touch target heights, logical Tab order, no duplicate dialogs');
  await ev("(()=>{document.querySelector('#reset').click();document.querySelector('[data-topic=photography]').click();const region=document.querySelector('#region');region.value='Japan';region.dispatchEvent(new Event('change',{bubbles:true}));const country=document.querySelector('#country-filter');country.value='Japan';country.dispatchEvent(new Event('change',{bubbles:true}));})()");
  assert.ok(await ev("['topic','country','region'].every(key=>document.querySelector('[data-remove-filter='+key+']'))"),'Independent chip fixture missing');
  await ev("document.querySelector('[data-remove-filter=country]').click()");
  assert.ok(await ev("!document.querySelector('[data-remove-filter=country]')&&document.querySelector('[data-remove-filter=region]')&&document.querySelector('[data-remove-filter=topic]')&&document.querySelector('#country-filter').value==='All'&&document.querySelector('#region').value==='Japan'"),'Removing country chip changed another filter');
  const chips=await ev("(()=>{const e=document.querySelector('#filter-chips'),r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:e.clientWidth,scrollWidth:e.scrollWidth,documentWidth:document.documentElement.scrollWidth};})()");
  assert.ok(chips.left>=0 && chips.right<=393 && chips.documentWidth<=395,'Chips must not widen document');
  result.chips=chips;result.checks.push('Country chip removes only country while retaining independent region/topic state; chip container stays inside viewport');
  assert.deepEqual(page.exceptions,[],'Uncaught page exceptions');
  const failing=result.cases.filter(item=>item.errors.length);
  assert.equal(failing.length,0,'Responsive failures: '+JSON.stringify(failing.map(({width,text,dpr,errors})=>({width,text,dpr,errors}))));
  result.passed=true;
} catch(error){result.error=error.stack;process.exitCode=1;console.error(error.message);}
finally{await page.close();await report('responsive',result);}
