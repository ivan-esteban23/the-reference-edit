import assert from 'node:assert/strict';
import {assets, browser, pause, report, serve} from './browser.mjs';

const files = await assets();
const result = {checks: [], passed: false};
const check = name => {
  result.checks.push(name);
  console.log(name);
};

const page = await browser((req, res) => serve(files, req, res));
const {evaluate: ev, navigate} = page;

try {
  // 1. URL query-string (?q=...&country=...) and hash (#directory?...) round-trip + history.back()
  await navigate("/?q=street&country=Japan");
  await pause(150);
  const initial = await ev(`(() => {
    const visible = [...document.querySelectorAll('.source')].filter(c => !c.hidden);
    return {
      q: document.querySelector('#search').value,
      country: document.querySelector('#country-filter').value,
      hash: location.hash,
      search: location.search,
      count: visible.length,
      marks: document.querySelectorAll('.source:not([hidden]) .source-purpose mark.search-highlight').length
    };
  })()`);
  assert.equal(initial.q, 'street', 'Query param q should populate #search');
  assert.equal(initial.country, 'Japan', 'Query param country should populate #country-filter');
  assert.ok(initial.hash.includes('q=street') && initial.hash.includes('country=Japan'), `Hash should sync canonical filter params: ${initial.hash}`);
  assert.equal(initial.search, '', 'Filter query params should be cleaned from location.search after canonical hash sync');
  assert.ok(initial.count >= 2 && initial.count < 58, `Filtered count should be narrowed: ${initial.count}`);
  assert.ok(initial.marks >= 1, 'Visible cards with matching purpose text should render <mark class="search-highlight">');
  check('search-discovery:url-query-and-hash-sync');

  // Push a second state and verify popstate restores previous filter state
  await ev(`(() => {
    history.pushState(null, '', '/#directory?q=bauhaus');
    window.dispatchEvent(new PopStateEvent('popstate'));
  })()`);
  const second = await ev(`document.querySelector('#search').value`);
  assert.equal(second, 'bauhaus');

  await ev(`new Promise(resolve => {
    window.addEventListener('popstate', () => setTimeout(resolve, 50), { once: true });
    history.back();
  })`);
  const restored = await ev(`({
    q: document.querySelector('#search').value,
    country: document.querySelector('#country-filter').value
  })`);
  assert.equal(restored.q, 'street');
  assert.equal(restored.country, 'Japan');
  check('search-discovery:history-popstate-roundtrip');

  // 2. Multi-term search, accent-insensitive matching, highlight cleanup, command palette, and copy-source status across 6 locales
  await navigate("/");
  await pause(150);

  const multi = await ev(`(() => {
    const s = document.querySelector('#search');
    s.value = 'japan street';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    const visible = [...document.querySelectorAll('.source')].filter(c => !c.hidden);
    const marks = [...document.querySelectorAll('.source:not([hidden]) .source-purpose mark.search-highlight')].map(m => m.textContent.toLowerCase());
    return {
      count: visible.length,
      allMatch: visible.every(c => {
        const t = c.textContent.toLowerCase();
        return t.includes('japan') && t.includes('street');
      }),
      marks
    };
  })()`);
  assert.ok(multi.count >= 2, `Expected >= 2 matches for 'japan street', got ${multi.count}`);
  assert.ok(multi.allMatch, 'Every visible card must match all search terms');
  assert.ok(multi.marks.includes('street'), 'Matched term in .source-purpose should be wrapped in <mark class="search-highlight">');
  check('search-discovery:multi-term-and-highlight');

  const accentedQuery = await ev(`(() => {
    const s = document.querySelector('#search');
    s.value = 'tōkyō fashion';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    return [...document.querySelectorAll('.source')].filter(c => !c.hidden).length;
  })()`);
  assert.ok(accentedQuery >= 1, 'Accented search query should match unaccented card text');

  const afterReset = await ev(`(() => {
    document.querySelector('#reset').click();
    return {
      visible: [...document.querySelectorAll('.source')].filter(c => !c.hidden).length,
      marks: document.querySelectorAll('mark.search-highlight').length
    };
  })()`);
  assert.equal(afterReset.visible, 58);
  assert.equal(afterReset.marks, 0, 'Resetting search must remove all <mark class="search-highlight"> elements');
  check('search-discovery:highlight-cleanup-on-reset');

  const esAccent = await ev(`(() => {
    const lang = document.querySelector('#language');
    lang.value = 'es';
    lang.dispatchEvent(new Event('change', { bubbles: true }));
    const s = document.querySelector('#search');
    s.value = 'japon';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    const visibleJapon = [...document.querySelectorAll('.source')].filter(c => !c.hidden).length;

    s.value = 'diseno';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    const visibleDiseno = [...document.querySelectorAll('.source')].filter(c => !c.hidden).length;
    const markTexts = [...document.querySelectorAll('.source:not([hidden]) .source-purpose mark.search-highlight')].map(m => m.textContent);

    document.querySelector('#palette-open').click();
    const pi = document.querySelector('#palette-input');
    pi.value = 'japon calle';
    pi.dispatchEvent(new Event('input', { bubbles: true }));
    const paletteCount = document.querySelectorAll('#palette-results .palette-option').length;
    document.querySelector('#command-palette').close();

    document.querySelector('#reset').click();
    return { visibleJapon, visibleDiseno, markTexts, paletteCount };
  })()`);
  assert.ok(esAccent.visibleJapon >= 4, `Unaccented 'japon' in es locale should match Japón sources, got ${esAccent.visibleJapon}`);
  assert.ok(esAccent.visibleDiseno >= 5, `Unaccented 'diseno' in es locale should match diseño sources, got ${esAccent.visibleDiseno}`);
  assert.ok(esAccent.markTexts.some(t => t.toLowerCase() === 'diseño'), `Highlighted mark should preserve original accented text 'diseño', got ${JSON.stringify(esAccent.markTexts)}`);
  assert.ok(esAccent.paletteCount >= 1, 'Command palette should support accent-insensitive multi-term search');
  check('search-discovery:accent-insensitive-and-palette');

  const locales = ['en', 'es', 'ja', 'ko', 'zh-Hans', 'zh-Hant'];
  for (const locale of locales) {
    const copyResult = await ev(`new Promise(async resolve => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => {} }
      });
      const lang = document.querySelector('#language');
      lang.value = ${JSON.stringify(locale)};
      lang.dispatchEvent(new Event('change', { bubbles: true }));
      const status = document.querySelector('#copy-status');
      status.textContent = '';
      document.querySelector('.copy-source').click();
      await new Promise(r => setTimeout(r, 80));
      resolve({
        ariaLive: status.getAttribute('aria-live'),
        text: status.textContent.trim()
      });
    })`);
    assert.equal(copyResult.ariaLive, 'polite');
    assert.ok(copyResult.text.length > 0, `Copy status should announce localized confirmation for ${locale}`);
  }
  check('search-discovery:copy-source-status-all-locales');

  result.passed = true;
} finally {
  await report('search-discovery', result);
  await page.close();
}
