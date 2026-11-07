// Run with Playwright available through NODE_PATH. Only read responses in this
// isolated browser are intercepted; no church content or repository is written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const base = 'https://micklehamchurch.github.io/website/';
const version = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.CALENDAR_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/calendar-version|events.json/.test(request.url())) requests.push({ url: request.url(), headers: request.headers() });
    });
    if (!process.argv.includes('--deployed')) {
      for (const file of ['events.js', 'calendar-updates.mjs']) {
        await page.route(base + file + '*', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, file), 'utf8') }));
      }
    }
    const a = JSON.parse(fs.readFileSync(path.join(root, 'events.json'), 'utf8'));
    const b = structuredClone(a);
    b.items.push({ id: 'isolated-browser-regression', title: 'Browser-only refresh regression', start: '2026-11-15T10:00', end: '2026-11-15T11:00', timeZone: 'Europe/London', location: 'Simulation only', description: 'Never published' });
    let changed = false;
    await page.route('**/calendar-version.json?*', route => {
      // Model a shared cache which ignores query changes until revalidation is
      // explicitly requested. The previous implementation stalls in version A.
      const revalidate = /no-cache/.test(route.request().headers()['cache-control'] || '');
      const current = changed && revalidate ? b : a;
      return route.fulfill({ json: { version: version(current), editorialSha: (current === b ? 'b' : 'a').repeat(40) } });
    });
    await page.route('**/events.json?*', route => route.fulfill({ json: changed ? b : a }));
    await page.goto(base + 'calendar.html');
    await page.waitForFunction(() => document.querySelector('#calendar-grid').dataset.calendarRefresh === 'unchanged');
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    const month = await page.locator('#calendar-month-label').textContent();
    assert.equal(month, 'November 2026');
    await page.evaluate(() => {
      window.calendarRebuildCount = 0;
      new MutationObserver(records => { window.calendarRebuildCount += records.filter(record => record.type === 'childList').length; }).observe(document.querySelector('#calendar-grid'), { childList: true });
    });
    changed = true;
    console.log('Real browser: version A rendered; waiting for the actual 20-second check.');
    await page.locator('#calendar-grid button').filter({ hasText: 'Browser-only refresh regression' }).waitFor({ timeout: 35000 });
    assert.equal(await page.locator('#calendar-month-label').textContent(), month);
    assert.equal(await page.locator('#calendar-grid button').filter({ hasText: 'Browser-only refresh regression' }).count(), 1);
    assert.equal(await page.locator('#calendar-agenda button').filter({ hasText: 'Browser-only refresh regression' }).count(), 1);
    const rebuilds = await page.evaluate(() => window.calendarRebuildCount);
    assert.ok(rebuilds > 0);
    console.log('Real browser: version B rendered without reload; month retained and event unique.');
    await page.waitForTimeout(22000);
    assert.equal(await page.evaluate(() => window.calendarRebuildCount), rebuilds);
    assert.equal(errors.length, 0);
    assert.ok(requests.filter(request => request.url.includes('calendar-version')).length >= 3);
    assert.ok(requests.every(request => new URL(request.url).searchParams.has('check')));
    assert.ok(requests.every(request => /no-cache/.test(request.headers['cache-control'] || '')));
    console.log(JSON.stringify({ mode: process.argv.includes('--deployed') ? 'deployed-scripts' : 'local-scripts-on-deployed-page', versionAtoB: true, selectedMonthPreserved: true, duplicates: false, unchangedRerenders: 0, browserErrors: 0, pollingRequests: requests.length, explicitRevalidation: true, sharedContentChanged: false }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
