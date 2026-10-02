// Isolated browser fixtures only: no login, upload, API writes or church content edits.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  const filename = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!filename.startsWith(root + path.sep)) return response.writeHead(403).end();
  fs.readFile(filename, (error, data) => { response.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' }); response.end(error ? 'Not found' : data); });
});
const edition = (date, type = 'pews-news') => ({ id: `${type}-${date}`, type, title: type === 'pews-news' ? 'Pews News test fixture' : 'Magazine test fixture', date, description: 'Browser fixture only', pdf: `assets/documents/news/${type}/${type}-${date}.pdf`, published: true });
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.argv.includes('--deployed') ? 'https://micklehamchurch.github.io/website' : `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: process.env.CALENDAR_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage(), errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method()); });
    await page.goto(base + '/news.html');
    await page.waitForFunction(() => document.querySelector('#latest-parish-magazine').textContent.includes('supplies an edition'));
    assert.match(await page.locator('#news-articles').innerText(), /parish shares a story/);
    const records = [edition('2025-09-01'), edition('2026-09-20'), edition('2026-09-27'), edition('2026-08-01', 'parish-magazine'), edition('2025-12-01', 'parish-magazine')];
    await page.route('**/publications-data.json', route => route.fulfill({ json: { publications: records } }));
    await page.route('**/news-data.json', route => route.fulfill({ json: { articles: [{ slug: 'browser-fixture', title: 'Browser fixture story', date: '2026-09-27', dateLabel: '27 September 2026', category: 'Parish news', excerpt: 'Isolated fixture summary', paragraphs: ['Fixture body'], status: 'published' }, { slug: 'expired', title: 'Expired fixture', date: '2025-01-01', expires: '2025-01-02', status: 'published' }] } }));
    await page.reload(); await page.waitForFunction(() => document.querySelector('#latest-pews-news time'));
    assert.match(await page.locator('#latest-pews-news').innerText(), /27 September 2026/);
    assert.match(await page.locator('#latest-parish-magazine').innerText(), /August 2026/);
    assert.equal(await page.locator('.publication-year').count(), 2);
    assert.equal(await page.locator('.publication-row').count(), 3);
    assert.equal(await page.locator('#news-articles article').count(), 1);
    assert.equal(await page.locator('#news-articles h3 a').getAttribute('href'), 'news/browser-fixture.html');
    await page.locator('#publication-type').selectOption('parish-magazine'); assert.equal(await page.locator('.publication-row').count(), 1);
    await page.locator('.publication-year summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.publication-year').getAttribute('open'), '');
    await page.locator('#publication-type').selectOption('all');
    for (const width of [390, 768, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Public overflow at ${width}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (process.env.NEWS_SCREENSHOT_DIRECTORY) await page.screenshot({ path: path.join(process.env.NEWS_SCREENSHOT_DIRECTORY, 'news-magazine-desktop.png'), fullPage: true });
    // Suppress the authentication bundle only in this test page. Production auth is untouched.
    await page.route('**/msal-auth.bundle.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await page.goto(base + '/admin/index.html#news');
    await page.evaluate(() => { document.querySelector('#admin-login').hidden = true; document.querySelector('#admin-app').hidden = false; });
    await page.waitForSelector('[data-publication-action="upload"]');
    await page.evaluate(() => {
      const sha = 'a'.repeat(40), headSha = 'b'.repeat(40), articles = [], publications = [];
      window.simulatedNewsWrites = [];
      window.churchNewsApi = {
        loadNews: async () => ({ ok: true, sha, headSha, articles }), loadPublications: async () => ({ ok: true, sha, headSha, publications }), message: category => category,
        publishPublication: async payload => { window.simulatedNewsWrites.push({ kind: 'pdf', type: payload.type }); const stamp = payload.type === 'parish-magazine' ? payload.date.slice(0,7) : payload.date; publications.push({ id: payload.type + '-' + stamp, type: payload.type, date: payload.date, title: payload.title, description: payload.description, published: true, pdf: 'assets/documents/news/' + payload.type + '/' + payload.type + '-' + stamp + '.pdf' }); return { ok: true, sha, headSha, commitSha: headSha }; },
        publishNews: async payload => { window.simulatedNewsWrites.push({ kind: 'news', status: payload.article.status }); const index = articles.findIndex(item => item.slug === payload.article.slug); const record = { ...payload.article, dateLabel: payload.article.date }; if (index < 0) articles.push(record); else articles[index] = record; return { ok: true, sha, headSha, commitSha: headSha }; }
      };
      window.dispatchEvent(new Event('admin-news-ready'));
    });
    page.on('dialog', dialog => dialog.accept());
    await page.waitForFunction(() => document.querySelector('#news-publishing-unavailable').textContent.includes('loaded from Dev'));
    for (const width of [390, 768, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Admin overflow at ${width}`);
    }
    await page.locator('[data-publication-type="pews-news"]').click();
    assert.equal(await page.locator('#publication-publish').isDisabled(), false);
    for (const width of [390, 768, 1366, 1440, 1920]) { await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Dialog overflow at ${width}`); }
    await page.locator('#publication-date').fill('2026-09-27');
    await page.locator('#publication-file').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nBrowser test only') });
    await page.getByRole('button', { name: 'Preview PDF', exact: true }).click(); await page.waitForSelector('#publication-local-preview a');
    assert.match(await page.locator('#publication-local-preview').innerText(), /NOT PUBLISHED/);
    assert.match(await page.locator('#publication-local-preview a').getAttribute('href'), /^blob:/);
    await page.locator('#publication-publish').click();
    await page.waitForFunction(() => !document.querySelector('#admin-dialog').open);
    assert.equal(await page.evaluate(() => window.simulatedNewsWrites.length), 1);
    await page.locator('[data-publication-type="parish-magazine"]').click(); assert.equal(await page.locator('#publication-date').getAttribute('type'), 'month'); await page.locator('#publication-date').fill('2026-10'); await page.locator('#publication-file').setInputFiles({ name: 'magazine.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nBrowser test only') }); await page.locator('#publication-publish').click(); await page.waitForFunction(() => !document.querySelector('#admin-dialog').open);
    await page.getByRole('button', { name: '＋ Add news story' }).click();
    assert.equal(await page.locator('[data-action="publish-news"]').isDisabled(), false);
    await page.locator('[name="title"]').fill('Local story fixture'); await page.locator('[name="summary"]').fill('Local summary'); await page.locator('[name="content"]').fill('Local body');
    await page.locator('#admin-dialog').getByRole('button', { name: 'Preview', exact: true }).click();
    assert.match(await page.locator('#admin-dialog').innerText(), /Local body/);
    await page.locator('[data-action="back-to-editor"]').click();
    await page.locator('[name="status"]').selectOption('published');
    await page.locator('[data-action="publish-news"]').click();
    await page.waitForFunction(() => !document.querySelector('#admin-dialog').open);
    assert.equal(await page.evaluate(() => window.simulatedNewsWrites.length), 3);
    await page.locator('[data-kind="news"][data-action="edit"]').first().click(); await page.locator('[name="status"]').selectOption('draft'); await page.locator('[data-action="publish-news"]').click(); await page.waitForFunction(() => !document.querySelector('#admin-dialog').open); assert.equal(await page.evaluate(() => window.simulatedNewsWrites.length), 4);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    console.log(JSON.stringify({ emptyStates: true, latestByDate: true, archiveRetained: true, filtersAndKeyboard: true, websiteNews: true, pdfPreview: true, storyPreview: true, scopedPublishingSimulation: true, storyEditAndDraft: true, noWrites: true, widths: [390,768,1366,1440,1920], browserErrors: 0 }));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error.message); server.close(); process.exitCode = 1; });
