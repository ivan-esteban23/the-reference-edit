import assert from 'node:assert/strict';
import axe from 'axe-core';
import {assets, browser, pause, report, serve} from './browser.mjs';

const files = await assets();
const result = {
  checks: [],
  axeScans: [],
  violations: [],
  passed: false,
};
const check = name => {
  result.checks.push(name);
  console.log(name);
};

const page = await browser((req, res) => serve(files, req, res));
const {evaluate: ev, call, navigate} = page;

const selectLocale = async locale => {
  await ev(`(()=>{
    const sel = document.querySelector('#language');
    sel.value = ${JSON.stringify(locale)};
    sel.dispatchEvent(new Event('change'));
  })()`);
};

const setTheme = async theme => {
  await ev(`(()=>{
    if (document.documentElement.dataset.theme !== ${JSON.stringify(theme)}) {
      const toggle = document.querySelector('[data-theme-toggle]');
      if (toggle) toggle.click();
      else document.documentElement.dataset.theme = ${JSON.stringify(theme)};
    }
  })()`);
};

try {
  await navigate();
  await ev(axe.source);

  // 1. Verify skip link is first focusable element and aria-current / aria-expanded sync
  const navSync = await ev(`(()=>{
    const skipLink = document.querySelector('.skip-link');
    const firstFocusable = document.querySelector('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const skipFirst = firstFocusable === skipLink && skipLink?.getAttribute('href') === '#directory';

    const filterToggle = document.querySelector('#toggle-filters');
    const filterPanel = document.querySelector('#advanced-filters');
    const initialExpanded = filterToggle?.getAttribute('aria-expanded');
    filterToggle?.click();
    const afterClickExpanded = filterToggle?.getAttribute('aria-expanded');
    const panelVisible = filterPanel && !filterPanel.hidden;
    filterToggle?.click();
    const restoredExpanded = filterToggle?.getAttribute('aria-expanded');

    const activeNavLinks = [...document.querySelectorAll('.site-header .jump a[aria-current="true"]')];
    return {
      skipFirst,
      initialExpanded,
      afterClickExpanded,
      panelVisible,
      restoredExpanded,
      activeNavCount: activeNavLinks.length
    };
  })()`);
  assert.ok(navSync.skipFirst, 'Skip link must be the first focusable element');
  if (navSync.initialExpanded !== null && navSync.initialExpanded !== undefined) {
    assert.notEqual(navSync.initialExpanded, navSync.afterClickExpanded, 'aria-expanded must toggle on filter button');
    assert.equal(navSync.initialExpanded, navSync.restoredExpanded, 'aria-expanded must restore on second click');
  }
  assert.ok(navSync.activeNavCount >= 1, 'At least one primary nav link should have aria-current="true"');
  check('Skip link is first focusable element and aria-current/aria-expanded stay in sync');

  // 2. Scan across all 6 languages, light & dark themes, 375px & 1440px, with card details expanded
  const locales = ['en', 'es', 'ja', 'ko', 'zh-Hans', 'zh-Hant'];
  const themes = ['light', 'dark'];
  const widths = [375, 1440];

  for (const width of widths) {
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const theme of themes) {
      await setTheme(theme);
      await pause(250);
      for (const locale of locales) {
        await selectLocale(locale);
        // Expand first 3 card details to test expanded disclosure state without overwhelming DOM
        await ev(`(()=>{
          document.querySelectorAll('.source-details').forEach((d, idx) => { d.open = idx < 3; });
        })()`);
        const scan = await ev(`axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
        })`);
        if (scan.violations.length > 0) {
          for (const v of scan.violations) {
            result.violations.push({
              width,
              theme,
              locale,
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.slice(0, 3).map(n => n.html),
            });
          }
        }
        result.axeScans.push({width, theme, locale, violations: scan.violations.length});
      }
    }
  }

  // Also test open dialogs at 375px and 1440px
  for (const width of widths) {
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const theme of themes) {
      await setTheme(theme);
      await selectLocale('en');
      // Open personal source dialog
      await ev(`(()=>{
        const btn = document.querySelector('#personal-add');
        if (btn) btn.click();
      })()`);
      const dialogScan = await ev(`axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })`);
      if (dialogScan.violations.length > 0) {
        for (const v of dialogScan.violations) {
          result.violations.push({
            context: 'personal-dialog',
            width,
            theme,
            id: v.id,
            nodes: v.nodes.slice(0, 3).map(n => n.html),
          });
        }
      }
      await ev(`(()=>{
        const d = document.querySelector('#personal-dialog');
        if (d && d.open) d.close();
      })()`);
    }
  }

  assert.deepEqual(result.violations, [], `Found axe violations: ${JSON.stringify(result.violations, null, 2)}`);
  check(`Zero axe-core WCAG A/AA violations across ${result.axeScans.length} language/theme/viewport combinations and expanded dialogs`);

  // 3. Check 44px minimum touch targets at 375px
  await call('Emulation.setDeviceMetricsOverride', {width: 375, height: 900, deviceScaleFactor: 1, mobile: true});
  await selectLocale('en');
  await setTheme('light');
  const touchCheck = await ev(`(()=>{
    const selectors = [
      '[data-theme-toggle]',
      '[data-text-size-toggle]',
      '#language',
      '#search',
      '#reset',
      '.mobile-nav button',
      '.source-actions button',
      '.source-details summary'
    ];
    const undersized = [];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.hidden || el.closest('[hidden]')) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.height < 43.5 || rect.width < 43.5) {
          undersized.push({selector: sel, text: el.textContent.trim().slice(0, 30), width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10});
        }
      }
    }
    return undersized;
  })()`);
  assert.deepEqual(touchCheck, [], `Undersized touch targets at 375px: ${JSON.stringify(touchCheck)}`);
  check('All primary interactive controls meet 44px minimum touch target size at 375px');

  // 4. Visible focus indicators check via real Tab traversal
  await ev("document.body.focus()");
  const focusResults = [];
  for (let i = 0; i < 6; i++) {
    await call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
    await call('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
    await pause(30);
    focusResults.push(await ev(`(()=>{
      const el = document.activeElement;
      const target = el?.id === 'language' ? document.querySelector('.language-switch') : el;
      const cs = getComputedStyle(target);
      return {
        tag: el?.tagName,
        id: el?.id || el?.className,
        focusVisible: el?.matches(':focus-visible'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth)
      };
    })()`));
  }
  assert.ok(focusResults.every(r => r.focusVisible && r.outlineStyle !== 'none' && r.outlineWidth >= 2), `Focus indicator missing: ${JSON.stringify(focusResults)}`);
  check('Visible focus indicators verified on interactive elements');

  // 5. prefers-reduced-motion support
  await call('Emulation.setEmulatedMedia', {
    features: [{name: 'prefers-reduced-motion', value: 'reduce'}],
  });
  const reducedMotion = await ev(`(()=>{
    const htmlStyle = getComputedStyle(document.documentElement);
    const card = document.querySelector('.source');
    const cardStyle = card ? getComputedStyle(card) : null;
    return {
      scrollBehavior: htmlStyle.scrollBehavior,
      cardTransitionDuration: cardStyle ? cardStyle.transitionDuration : '0s'
    };
  })()`);
  assert.equal(reducedMotion.scrollBehavior, 'auto', 'html scroll-behavior must be auto under prefers-reduced-motion: reduce');
  assert.ok(['0s', '0ms'].includes(reducedMotion.cardTransitionDuration), `Expected 0s transition under reduced motion, got ${reducedMotion.cardTransitionDuration}`);
  await call('Emulation.setEmulatedMedia', {features: []});
  check('prefers-reduced-motion: reduce disables smooth scrolling and non-essential transitions');

  assert.deepEqual(page.exceptions, []);
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.error = error.stack;
  process.exitCode = 1;
} finally {
  await page.close();
  await report('a11y', result);
}
