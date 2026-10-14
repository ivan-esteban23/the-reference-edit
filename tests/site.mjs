import assert from 'node:assert/strict';
import vm from 'node:vm';
import {assets, baseline, browser, gitFile, pause, report, serve} from './browser.mjs';

const files = await assets(), html = files.get('/index.html').toString();
const before = gitFile(baseline, 'dist/index.html').toString();
const records = source => [...source.matchAll(/<article\b[^>]*class="source"[\s\S]*?<\/article>/g)].map(m => m[0]);
assert.equal(records(html).length, 58); assert.deepEqual(records(html), records(before), 'Source records changed');
let scripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/application\//.test(match[1])) continue;
  new vm.Script(match[2]); scripts++;
}
const result = {sourceRecords: 58, recordsByteIdentical: true, scriptsCompiled: scripts, layouts: [], checks: []};
const page = await browser((req, res) => serve(files, req, res));
const {evaluate: ev, call, navigate} = page;
const check = name => {result.checks.push(name); console.log(name);};
const select = (id, value) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change'));})()`);
const search = value => ev(`(()=>{const e=document.querySelector('#search');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input'));})()`);
const key = async (key, code = key) => {
  const windowsVirtualKeyCode={Enter:13,Tab:9,' ':32}[key];
  const text=key==='Enter'?'\r':key===' '?' ':undefined;
  await call('Input.dispatchKeyEvent', {type: 'keyDown', key, code, windowsVirtualKeyCode, text});
  await call('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode});
  await pause(50);
};
try {
  await navigate();
  // Exercise disclosures while measuring; a collapsed page can hide overflow bugs.
  await ev("document.querySelectorAll('details').forEach(d=>d.open=true)");
  const widths=process.argv.includes('--interactions-only')?[]:[320,390,768,1440];
  for (const width of widths) for (const size of [100, 200]) for (const theme of ['light', 'dark']) for (const locale of ['en', 'es', 'zh-Hans', 'zh-Hant', 'ja', 'ko']) {
    await call('Emulation.setDeviceMetricsOverride', {width, height: 844, deviceScaleFactor: 1, mobile: false});
    await ev(`(()=>{document.documentElement.style.fontSize='${size}%';const l=document.querySelector('#language');l.value=${JSON.stringify(locale)};l.dispatchEvent(new Event('change'));if(document.documentElement.dataset.theme!==${JSON.stringify(theme)})document.querySelector('[data-theme-toggle]').click();})()`);
    await pause(25);
    const layout = await ev(`(()=>{
      const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
      const errors=[],describe=e=>e.id||e.className||e.tagName;
      const overlap=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
      if(document.documentElement.scrollWidth>innerWidth+1)errors.push('document overflow');
      const selectors='.masthead>span,.masthead button,.language-switch,.controls input,.controls button,.source h3,.source-purpose,.source-actions button,.source-details summary,.filter-field label,.footer-nav a';
      for(const e of document.querySelectorAll(selectors)){
        if(!visible(e))continue;const r=e.getBoundingClientRect();
        if(r.left < -1 || r.right>innerWidth+1)errors.push('outside viewport: '+describe(e));
        if(e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='hidden')errors.push('clipped: '+describe(e));
        const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){
          const node=walker.currentNode;if(!node.textContent.trim()||node.parentElement.closest('select,.sr-only,[aria-hidden=true]'))continue;
          const range=document.createRange();range.selectNodeContents(node);
          if([...range.getClientRects()].some(t=>t.left<r.left-2||t.right>r.right+2))errors.push('text outside control: '+describe(e));
        }
      }
      for(const selectors of [['.theme-toggle','.language-switch'],['.masthead>span','.masthead-actions'],['#search','#filter-toggle']]){
        const [a,b]=selectors.map(s=>document.querySelector(s));if(visible(a)&&visible(b)&&overlap(a.getBoundingClientRect(),b.getBoundingClientRect()))errors.push('overlap: '+selectors.join('/'));
      }
      const bar=document.querySelector('.search-bar');
      if(getComputedStyle(bar).position==='sticky'&&bar.getBoundingClientRect().height>innerHeight*.4)errors.push('sticky search consumes viewport');
      return {errors,lang:document.documentElement.lang,code:document.querySelector('.language-code').dataset.code};
    })()`);
    result.layouts.push({width, size, theme, locale, ...layout});
    if(locale==='ko')console.log(`Layout ${width}px / ${size}% / ${theme}`);
  }
  const codes={en:'EN',es:'ES','zh-Hans':'简体','zh-Hant':'繁體',ja:'日本語',ko:'한국어'};
  assert.ok(result.layouts.every(x => x.errors.length === 0 && x.lang === x.locale && x.code === codes[x.locale]), 'Responsive regression: ' + JSON.stringify(result.layouts.filter(x => x.errors.length)));
  if(result.layouts.length)check(`${result.layouts.length} expanded-disclosure layout cases: widths × text sizes × themes × six languages`);
  await call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: false});
  await ev("document.documentElement.style.fontSize='100%';document.querySelector('#reset').click()");
  for (const locale of ['en', 'es', 'zh-Hans', 'zh-Hant', 'ja', 'ko']) {
    await select('#language', 'en'); await search('Free'); await select('#language', locale);
    assert.ok(await ev("[...document.querySelectorAll('.source')].every(c=>c.hidden===!c.textContent.toLocaleLowerCase().includes('free'))"), 'Stale search after language switch: ' + locale);
  }
  check('Search recomputes against translated text in all six languages');
  await select('#language', 'en'); await ev("document.querySelector('#reset').click()");
  const target = await ev(`(()=>{const c=[...document.querySelectorAll('.source')].find(c=>c.querySelector('h3').textContent.includes('FASHIONSNAP'));c.querySelector('.favorite-source').click();return {category:c.dataset.category,country:c.dataset.country,region:c.dataset.region,access:c.querySelector('.comparison div:last-child dd').textContent.trim()};})()`);
  await search('fashionsnap'); await select('#category-filter', target.category); await select('#country-filter', target.country); await select('#region', target.region); await select('#access-filter', target.access);
  await ev("document.querySelector('#favorites-view').click()");
  assert.deepEqual(await ev(`({visible:[...document.querySelectorAll('.source')].filter(c=>!c.hidden).length,active:activeFilterCount(),badge:Number(document.querySelector('.filter-toggle-count').dataset.count),chips:document.querySelector('#filter-chips').children.length})`), {visible: 1, active: 6, badge: 4, chips: 6});
  await ev("document.querySelector('[data-remove-filter=category]').click()"); assert.equal(await ev('activeFilterCount()'), 5);
  await ev("document.querySelector('#reset').click()");
  assert.ok(await ev("activeFilterCount()===0&&document.querySelector('#reset').disabled&&document.querySelector('.filter-toggle-count').hidden&&cards.every(c=>!c.hidden)&&favoriteKeys.size===1"));
  check('Search + four combined filters + favorites, counts/chips, chip removal and Reset');
  await select('#language', 'es');
  await ev("if(document.documentElement.dataset.theme==='dark')document.querySelector('[data-theme-toggle]').click();document.querySelector('[data-theme-toggle]').click()");
  await select('#country-filter', 'Japan');
  const stored = await ev('({...localStorage})');
  await navigate('', true);
  assert.deepEqual(await ev('({...localStorage})'), stored);
  assert.ok(await ev("document.documentElement.lang==='es'&&document.documentElement.dataset.theme==='dark'&&favoriteKeys.size===1&&document.querySelector('#country-filter').value==='Japan'"));
  await navigate('/');
  assert.ok(await ev("document.documentElement.lang==='es'&&document.documentElement.dataset.theme==='dark'&&favoriteKeys.size===1"));
  check('Favorites/theme/language persistence on reload and reopen; shared filter restoration');
  await select('#language', 'en');
  await ev("document.querySelectorAll('.source-details').forEach(d=>d.open=false);document.querySelector('.source-details summary').focus()");
  await key('Enter'); assert.equal(await ev("document.querySelector('.source-details').open"), true);
  await key(' ' ,'Space'); assert.equal(await ev("document.querySelector('.source-details').open"), false);
  const disclosureStates = await ev("[...document.querySelectorAll('.source-details,.research-route')].map(d=>d.open)");
  await ev("window.dispatchEvent(new Event('beforeprint'))");
  assert.ok(await ev("[...document.querySelectorAll('.source-details,.research-route')].every(d=>d.open)"));
  await call('Emulation.setEmulatedMedia', {media: 'print'});
  assert.equal(await ev("[...document.querySelectorAll('.source-details .source-metadata')].filter(e=>getComputedStyle(e).display!=='none').length"), 58);
  await call('Emulation.setEmulatedMedia', {media: ''}); await ev("window.dispatchEvent(new Event('afterprint'))");
  assert.deepEqual(await ev("[...document.querySelectorAll('.source-details,.research-route')].map(d=>d.open)"), disclosureStates);
  check('Real Enter/Space disclosure control; print expands every record and restores disclosure states');
  await ev("document.querySelector('[data-theme-toggle]').focus()"); await key('Tab');
  assert.ok(await ev("document.activeElement.id==='language'&&document.activeElement.matches(':focus-visible')&&getComputedStyle(document.querySelector('.language-switch')).outlineStyle!=='none'"));
  check('Compact language selector has a visible keyboard focus indicator');
  await ev("document.querySelector('#search').focus()"); await key('Tab');
  assert.ok(await ev("document.activeElement.id==='filter-toggle'&&document.activeElement.matches(':focus-visible')&&getComputedStyle(document.activeElement).outlineStyle!=='none'"));
  await key('Enter'); await pause(100);
  assert.ok(await ev("document.querySelector('#filter-panel').open&&document.querySelector('#filter-toggle').getAttribute('aria-expanded')==='true'&&document.activeElement.id==='category-filter'"));
  const focusStates = [];
  for (let i = 0; i < 20; i++) {
    await key('Tab');
    focusStates.push(await ev(`(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),bar=document.querySelector('.search-bar'),b=bar.getBoundingClientRect(),nav=document.querySelector('.mobile-nav'),n=nav.getBoundingClientRect(),sticky=getComputedStyle(bar).position==='sticky'&&b.top<=1;return {name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,70),visible:e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none',top:r.top,bottom:r.bottom,min:sticky?b.bottom:0,max:getComputedStyle(nav).position==='fixed'?n.top:innerHeight};})()`));
  }
  assert.ok(focusStates.every(x=>x.visible&&x.top>=x.min-1&&x.bottom<=x.max+1), 'Keyboard focus obscured: '+JSON.stringify(focusStates.filter(x=>!x.visible||x.top<x.min-1||x.bottom>x.max+1)));
  result.keyboard = focusStates; check('Real Tab traversal, visible focus, filter disclosure state and sticky-search clearance');
  const ax = await call('Accessibility.getFullAXTree');
  const controls = ax.nodes.filter(n=>!n.ignored&&['button','combobox','searchbox','DisclosureTriangle'].includes(n.role?.value));
  assert.ok(controls.length>58); assert.ok(controls.every(n=>n.name?.value?.trim()), 'Unnamed accessible control');
  result.accessibleControls = controls.length;
  assert.ok(await ev("[...document.querySelectorAll('.source h3 a')].every(a=>/^https?:$/.test(new URL(a.href).protocol))&&[...document.querySelectorAll('a[href^=\"#\"]')].every(a=>{const h=a.getAttribute('href').split('?')[0];return h==='#'||!!document.querySelector(h)})"));
  check('Accessible control names and all local link targets/source-link URL schemes');
  assert.deepEqual(page.exceptions, []); result.passed = true;
} catch (error) {result.passed = false; result.error = error.stack; process.exitCode = 1;}
finally {await page.close(); await report('site', result);}
