import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assets, baseline, browser, gitFile, pause, repo, report, serve} from './browser.mjs';

const files = await assets(), html = files.get('/index.html').toString();
const before = gitFile(baseline, 'dist/index.html').toString();
const records = source => [...source.matchAll(/<article\b[^>]*class="source"[\s\S]*?<\/article>/g)].map(m => m[0]);
// Image URLs are the only permitted source-record change: verify every original byte first.
const originalImages = [...before.matchAll(/data:image\/([^;]+);base64,([A-Za-z0-9+/=]+)/g)];
// The original favicon is intentionally replaced; preserve every cover/source image.
assert.equal(originalImages.length, 60);
assert.equal(originalImages[0][1], "svg+xml");
assert.equal(createHash("sha256").update(Buffer.from(originalImages[0][2], "base64")).digest("hex").slice(0,16), "85cfa79ee7373f6f");
const embedded = originalImages.slice(1);
const extracted = [...html.matchAll(/images\/image-[a-f0-9]{16}\.(?:png|jpg|gif|ico|svg)/g)];
assert.equal(embedded.length, 59); assert.equal(extracted.length, embedded.length);
assert.ok(!html.includes('data:image/'), 'An image remains embedded');
const extensions = {'svg+xml':'svg',jpeg:'jpg',png:'png','x-icon':'ico',gif:'gif'};
let restored = html;
for (let i = 0; i < embedded.length; i++) {
  const original = Buffer.from(embedded[i][2], 'base64'), url = extracted[i][0];
  assert.equal(url, `images/image-${createHash('sha256').update(original).digest('hex').slice(0,16)}.${extensions[embedded[i][1]]}`);
  assert.deepEqual(files.get('/' + url), original, `Image bytes changed: ${url}`);
  restored = restored.replace(url, embedded[i][0]);
}
// assets() walks every dist file, including documentation and folder markers.
const imageAssets = [...files.keys()].filter(key=>key.startsWith('/images/')&&/\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(key));
const editorialPrefix = '/images/references/';
assert.deepEqual(imageAssets.filter(key=>!key.startsWith(editorialPrefix)).sort(),
  [...new Set(extracted.map(m=>'/' + m[0]))].sort(), 'Missing or unreferenced curated image assets');

// Gallery assets are catalogued independently; they are not embedded in the current UI.
const references = JSON.parse(files.get('/data/references.json').toString()).references;
assert.ok(Array.isArray(references), 'Editorial references must be an array');
const referenceIds = references.map(entry=>entry.id);
assert.ok(referenceIds.every(id=>typeof id==='string'&&id.trim()), 'Editorial IDs must be nonempty strings');
assert.equal(new Set(referenceIds).size, referenceIds.length, 'Duplicate editorial reference IDs');
const availableReferences = references.filter(entry=>entry.assetStatus==='available');
for (const entry of references) {
  if(entry.imageType==='ai-generated') {
    assert.equal(entry.source, 'Created with ChatGPT', `Missing AI attribution: ${entry.id}`);
    assert.equal(entry.disclosure, 'AI-generated editorial illustration · Created with ChatGPT · Not documentary photography', `Missing AI disclosure: ${entry.id}`);
  }
}
for (const entry of availableReferences) {
  assert.ok(typeof entry.image==='string'&&entry.image.startsWith(editorialPrefix)&&imageAssets.includes(entry.image), `Missing local editorial image: ${entry.id}`);
  assert.ok(files.get(entry.image).length>0, `Empty editorial image: ${entry.id}`);
  if(/\.jpe?g$/i.test(entry.image))assert.deepEqual(files.get(entry.image).subarray(0,3),Buffer.from([0xff,0xd8,0xff]), `Editorial JPEG has the wrong format: ${entry.id}`);
}
assert.deepEqual(imageAssets.filter(key=>key.startsWith(editorialPrefix)).sort(),
  [...new Set(availableReferences.map(entry=>entry.image))].sort(), 'Uncatalogued editorial image assets');
assert.equal(records(html).length, 58); assert.deepEqual(records(restored), records(before), 'Source records changed beyond image URLs');
const embeddedFonts = [...before.matchAll(/data:font\/ttf;base64,([A-Za-z0-9+/=]+)/g)];
const fontPaths = [...html.matchAll(/fonts\/font-[a-f0-9]{16}\.ttf/g)].map(m=>m[0]);
assert.equal(embeddedFonts.length,2); assert.equal(fontPaths.length,embeddedFonts.length);
assert.ok(!html.includes('data:font/'), 'A font remains embedded');
for(let i=0;i<embeddedFonts.length;i++) {
  const original=Buffer.from(embeddedFonts[i][1],'base64');
  assert.equal(fontPaths[i],`fonts/font-${createHash('sha256').update(original).digest('hex').slice(0,16)}.ttf`);
  assert.deepEqual(files.get('/'+fontPaths[i]),original,'Font bytes changed');
}
let scripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/application\//.test(match[1])) continue;
  new vm.Script(match[2]); scripts++;
}
const result = {sourceRecords: 58, recordsByteIdenticalExceptImageURLs: true, imagesByteIdentical: embedded.length, fontsByteIdentical: embeddedFonts.length, scriptsCompiled: scripts, layouts: [], checks: []};
{
  // The tables live in src/ts/i18n-*.ts, one per locale, as JSON-compatible object literals.
  const tables = {es:'i18nEs','zh-Hans':'i18nZhHans','zh-Hant':'i18nZhHant',ja:'i18nJa',ko:'i18nKo'};
  const literal = (source, declaration) => {
    const found = source.search(declaration);
    assert.ok(found >= 0, `Missing translation table ${declaration}`);
    const open = source.indexOf('{', found);
    let depth = 0, end = open, inString = false, quote = '', escaped = false;
    for (; end < source.length; end++) {
      const character = source[end];
      if (inString) {if (escaped) {escaped = false; continue;} if (character === '\\') {escaped = true; continue;} if (character === quote) inString = false; continue;}
      if (character === '"' || character === "'") {inString = true; quote = character; continue;}
      if (character === '{') depth++; else if (character === '}' && --depth === 0) {end++; break;}
    }
    return {text: source.slice(open, end), start: open, end};
  };
  const translations = {};
  for (const [locale, variable] of Object.entries(tables)) {
    const source = await readFile(path.join(repo, 'src/ts', `i18n-${locale.toLowerCase()}.ts`), 'utf8');
    translations[locale] = JSON.parse(literal(source, new RegExp(`const ${variable}[^{]*\\{`)).text);
  }
  const locales = Object.keys(translations), base = new Set(Object.keys(translations[locales[0]]));
  for (const locale of locales) {
    const keys = Object.keys(translations[locale]);
    assert.deepEqual(keys.filter(key => !base.has(key)), [], `${locale} has extra translation keys`);
    assert.deepEqual([...base].filter(key => !keys.includes(key)), [], `${locale} is missing translation keys`);
  }
  // Strip the tables from the built page, so a key only passes by being used somewhere else.
  let outside = html;
  for (const variable of Object.values(tables)) {
    const found = literal(outside, new RegExp(`const ${variable}\\s*=`));
    outside = outside.slice(0, found.start) + outside.slice(found.end);
  }
  outside += availableReferences.flatMap(entry=>[entry.city,entry.context,entry.caption,entry.disclosure]).join('\n');
  const stale = [...base].filter(key => !outside.includes(key) && !outside.includes(key.replace(/&/g, '&amp;')));
  assert.deepEqual(stale, [], 'Stale translation keys: ' + stale.slice(0, 5).join(' | '));
}
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
  assert.ok(await ev("Promise.all([...document.images].map(i=>i.decode())).then(()=>[...document.images].every(i=>i.naturalWidth>0))"), 'Extracted images did not render');
  check('All 59 cover/source images retain their bytes and all page images decode');
  result.editorialImages=[];
  for(const entry of availableReferences){
    const dimensions=await ev(`(async()=>{const image=new Image();image.src=${JSON.stringify(entry.image)};await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};})()`);
    assert.ok(dimensions.width>0&&dimensions.height>0, `Editorial image did not decode: ${entry.id}`);
    assert.equal(dimensions.width,entry.width, `Incorrect editorial width: ${entry.id}`);
    assert.equal(dimensions.height,entry.height, `Incorrect editorial height: ${entry.id}`);
    result.editorialImages.push({id:entry.id,...dimensions});
  }
  check(`${availableReferences.length} available editorial images have unique catalog IDs, valid local assets and successful browser decoding`);

  assert.ok(await ev("document.fonts.size===2&&[...document.fonts].every(f=>f.status==='loaded')"), 'External fonts failed to load');
  check('Both extracted fonts retain their original bytes and load successfully');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await pause(50);
  result.mobileEntry=await ev("({searchTop:document.querySelector('.search-bar').getBoundingClientRect().top,firstCardTop:document.querySelector('.source').getBoundingClientRect().top,toolsClosed:!document.querySelector('#collection-tools').open,collectionHidden:document.querySelector('#my-sources').hidden})");
  assert.ok(result.mobileEntry.searchTop<1000&&result.mobileEntry.firstCardTop<1550,'Mobile entry became too long: '+JSON.stringify(result.mobileEntry));
  assert.ok(result.mobileEntry.toolsClosed&&result.mobileEntry.collectionHidden);
  await ev("document.querySelector('#collection-tools').open=true");
  assert.ok(await ev("['#export-favorites','#share-view'].every(s=>document.querySelector(s).getClientRects().length>0)"),'Collection tools inaccessible when expanded');
  await ev("document.querySelector('#collection-tools').open=false");
  await ev('storageAvailable=false;refreshFavorites()');
  assert.ok(await ev("document.querySelector('#storage-warning').getClientRects().length>0"),'Storage warning hidden inside collapsed tools');
  await ev('storageAvailable=true;refreshFavorites()');
  check('Compact mobile entry reaches search/cards sooner and keeps collection tools accessible');
  const topicNames=['typography','photography','fashion','architecture','graphic-design'];
  const visibleURLs=()=>ev("cards.filter(c=>!c.hidden).map(c=>c.querySelector('.favorite-source').dataset.url)");
  for(const topicName of topicNames){
    await ev(`document.querySelector('[data-topic="${topicName}"]').click()`);
    const expectedCounts={typography:4,photography:5,fashion:15,architecture:5,'graphic-design':5};
    const examples={typography:'https://www.printedmatter.org/',photography:'https://www.nowness.com/',fashion:'https://www.vogue.com/fashion-shows',architecture:'https://www.apartamentomagazine.com/','graphic-design':'https://magazine-b.com/'};
    const found=await visibleURLs();assert.equal(found.length,expectedCounts[topicName]);assert.ok(found.includes(examples[topicName]));
    assert.ok(!found.includes('https://www.pureref.com/'),'Organizing software leaked into a visual topic');
    assert.equal(await ev("activeFilterCount()"),1);
    assert.equal(await ev("document.querySelectorAll('[data-topic][aria-pressed=true]').length"),1);
    assert.ok(await ev(`location.hash.includes('topic=${topicName}')`));
  }
  await search('behance');assert.equal((await visibleURLs()).length,1);
  await select('#country-filter','Japan');assert.equal((await visibleURLs()).length,0);
  await ev("document.querySelector('#reset').click()");assert.equal((await visibleURLs()).length,58);
  await ev("document.querySelector('[data-topic=photography]').focus()");await key('Enter');
  assert.equal(await ev('topic'),'photography');
  await navigate('',true);assert.equal(await ev('topic'),'photography');
  assert.equal(await ev("document.querySelector('[data-topic=photography]').getAttribute('aria-pressed')"),'true');
  await ev("document.querySelector('[data-remove-filter=topic]').click()");assert.equal((await visibleURLs()).length,58);
  await ev("document.querySelector('[data-topic=architecture]').click();document.querySelector('[data-topic=\"\"]').click()");
  assert.equal(await ev('activeFilterCount()'),0);
  await navigate('/?topic-check=invalid#directory?topic=not-a-topic');assert.equal(await ev('topic'),'');assert.equal((await visibleURLs()).length,58);
  await ev("document.querySelector('[data-topic=typography]').click();document.querySelector('[data-browse-country=Japan]').click()");
  assert.equal(await ev('topic'),'');assert.ok((await visibleURLs()).length>0);
  await ev("document.querySelector('#reset').click()");
  check('Five curated topics combine with search/country, support keyboard activation, URL reload, reset, removal and country navigation');

  assert.equal(await ev("document.querySelectorAll('.research-route').length"),3);
  assert.ok(await ev("[...document.querySelectorAll('#routes details')].every(d=>!d.open)"));
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
      const selectors='.topic-shortcuts p,.topic-buttons button,.research-route summary strong,.research-route .route-body h4,.research-route .route-body p,.guide-record summary,.hero h1,.cover-image figcaption,.hero-actions a,.masthead>span,.masthead button,.language-switch,.controls input,.controls button,.source h3,.source-purpose,.source-actions button,.source-details summary,.filter-field label,.footer-nav a';
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
      for(const selectors of [['.hero h1','.cover-image'],['.theme-toggle','.language-switch'],['.masthead>span','.masthead-actions'],['#search','#filter-toggle']]){
        const [a,b]=selectors.map(s=>document.querySelector(s));if(visible(a)&&visible(b)&&overlap(a.getBoundingClientRect(),b.getBoundingClientRect()))errors.push('overlap: '+selectors.join('/'));
      }
      const bar=document.querySelector('.search-bar');
      if(getComputedStyle(bar).position==='sticky'&&bar.getBoundingClientRect().height>innerHeight*.4)errors.push('sticky search consumes viewport');
      return {errors,lang:document.documentElement.lang,code:document.querySelector('.language-code').dataset.code};
    })()`);
    assert.equal(await ev("document.querySelector('[data-topic=photography]').textContent"),({en:'Photography',es:'Fotografía','zh-Hans':'摄影','zh-Hant':'攝影',ja:'写真',ko:'사진'})[locale]);
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
  await navigate('/?guide-check=1#workflow');
  for(const id of ['workflow','landscape','notes']){
    await ev(`location.hash=${JSON.stringify('#'+id)}`);await pause(100);
    assert.ok(await ev(`document.querySelector('#${id}').open`),'Legacy guide link stayed collapsed: '+id);
  }
  await ev("location.hash='#routes'");await pause(100);
  await ev("document.querySelector('.research-route summary').focus()");await key('Enter');assert.equal(await ev("document.querySelector('.research-route').open"),true);
  await key(' ','Space');assert.equal(await ev("document.querySelector('.research-route').open"),false);
  await ev("history.pushState(null,'','#directory');search.value='Japan';update();history.back()");await pause(100);
  assert.ok(await ev("location.hash==='#routes'&&search.value===''&&!collectionOpen"),'Back navigation lost the guide to stale directory filters');
  check('Three concise guides, legacy fragments, browser Back and native keyboard disclosure controls');
  await ev("document.querySelectorAll('.source-details').forEach(d=>d.open=false);document.querySelector('.source-details summary').focus()");
  await key('Enter'); assert.equal(await ev("document.querySelector('.source-details').open"), true);
  await key(' ' ,'Space'); assert.equal(await ev("document.querySelector('.source-details').open"), false);
  const disclosureStates = await ev("[...document.querySelectorAll('.source-details,.research-route,.guide-record')].map(d=>d.open)");
  await ev("window.dispatchEvent(new Event('beforeprint'))");
  assert.ok(await ev("[...document.querySelectorAll('.source-details,.research-route,.guide-record')].every(d=>d.open)"));
  await call('Emulation.setEmulatedMedia', {media: 'print'});
  assert.equal(await ev("[...document.querySelectorAll('.source-details .source-metadata')].filter(e=>getComputedStyle(e).display!=='none').length"), 58);
  await call('Emulation.setEmulatedMedia', {media: ''}); await ev("window.dispatchEvent(new Event('afterprint'))");
  assert.deepEqual(await ev("[...document.querySelectorAll('.source-details,.research-route,.guide-record')].map(d=>d.open)"), disclosureStates);
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
