const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { once } = require('node:events');
const { chromium, expect } = require('playwright/test');

const root = path.resolve(process.argv[2]);
const screenshots = process.argv[3];
const footerLinks = ['contact.html', 'our-team.html', 'safeguarding.html', 'electoral-roll.html', 'privacy.html', 'bible-translation.html'];
const categories = {
  services: ['worship.html', 'weekly-worship.html', 'prayer.html'],
  'life-events': ['baptisms.html', 'weddings.html', 'funerals.html'],
  visit: ['finding-us.html', 'church-building.html', 'our-history.html', 'churchyard.html', 'westhumble-chapel.html', 'gallery.html'],
  community: ['news.html', 'church-life.html', 'children-families.html', 'bible-study-fellowship.html', 'pastoral-care.html', 'alpha.html', 'eco-church.html'],
  about: ['our-team.html', 'about.html', 'give.html', 'our-vision.html', 'our-churches.html', 'safeguarding.html', 'contact.html'],
};
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf',
};
const mount = '/website/';
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(mount));
    const relative = pathname.slice(mount.length);
    const file = path.resolve(root, pathname.endsWith('/') ? relative + 'index.html' : relative);
    assert.ok(file.startsWith(root + path.sep));
    const content = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(content);
  } catch {
    response.writeHead(404).end();
  }
});

const hrefs = links => links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));

async function checkHome(page, width) {
  await expect(page).toHaveTitle('St Michael & All Angels | Mickleham & Westhumble');
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', 'A warm welcome to St Michael & All Angels, Mickleham, and Westhumble Chapel.');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(/Mickleham &\s*Westhumble/);
  await expect(main.locator('.hero-copy')).toContainText('To know Jesus and make him known.');
  await expect(main.locator('.hero a[data-home-next-service]')).toHaveAccessibleName(/Next Sunday service/);
  await expect(main.locator('.home-verse')).toBeVisible();
  await expect(main.locator('.home-verse cite')).toHaveText(/\d+:\d+/);
  const sections = ['.hero', '.home-verse', '.home-quick-links', '.home-peace-entry', '.from-our-parish',
    '.home-life-events', '.home-gallery-feature', '.home-involvement'];
  const position = await main.evaluate((element, selectors) => selectors.map(selector =>
    [...element.querySelectorAll('*')].indexOf(element.querySelector(selector))
  ), sections);
  assert.ok(position.every((value, index) => value >= 0 && (!index || value > position[index - 1])), 'Homepage section order');
  assert.deepEqual(await hrefs(main.locator('.home-quick-item')), ['worship.html', 'visit.html', 'church-life.html', 'calendar.html']);
  const hero = main.locator('.home-hero-photo.is-current img');
  await expect(hero).toHaveAttribute('alt', '');
  await expect(hero).toHaveAttribute('width', '1672');
  await expect(hero).toHaveAttribute('height', '941');
  const collage = main.locator('.home-gallery-collage img');
  assert.deepEqual(await collage.evaluateAll(images => images.map(image =>
    [image.getAttribute('alt'), image.getAttribute('width'), image.getAttribute('height')]
  )), [
    ['Pumpkins and gourds in sunlight on a stone windowsill', '480', '360'],
    ['The congregation gathering in the church decorated for Harvest', '480', '360'],
    ['Headstones and trees in the churchyard', '480', '360'],
  ]);
  const parish = main.locator('.from-our-parish');
  const cards = parish.locator('.parish-card:not([hidden])');
  assert.deepEqual((await cards.locator('h3').allTextContents()).map(text => text.replace('▶', '').trim()),
    ['Latest Service', 'Pews News', 'Parish Magazine', 'Remembrance Sunday']);
  assert.deepEqual(await hrefs(cards.locator('.parish-card-media')), [
    'https://www.youtube.com/watch?v=bRESCDlUiy0', 'pews-news/2026-11-15.html',
    'parish-magazine.html#edition-2026-11', 'news/we-will-remember-them.html',
  ]);
  await expect(cards.nth(1).locator('img')).toHaveAttribute('src', /pews-lights-tabletop-2026-11-15-640\.webp$/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'Homepage horizontal overflow');
  const headingFits = await cards.last().locator('h3').evaluate(heading =>
    heading.getBoundingClientRect().right <= heading.parentElement.getBoundingClientRect().right
  );
  assert.ok(headingFits, 'Remembrance title stays inside its card');
}

async function checkFooter(page, width) {
  const footer = page.locator('[data-site-footer]');
  const information = footer.getByRole('heading', { name: 'Parish information' }).locator('..');
  assert.deepEqual(await hrefs(information.getByRole('link')), footerLinks);
  const all = await hrefs(footer.getByRole('link'));
  assert.equal(new Set(all).size, all.length, 'Footer has no duplicate destinations');
  assert.deepEqual(await hrefs(footer.locator('.footer-explore-links a')), [
    'worship.html', 'calendar.html', 'bible.html', 'church-life.html', 'news.html', 'visit.html', 'gallery.html',
  ]);
  await expect(footer.getByRole('link', { name: /on YouTube/ })).toBeVisible();
  await expect(footer.locator('.footer-credit')).toHaveText('Website by Ed Popov');
  const columns = await footer.locator('.footer-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  assert.equal(columns, width <= 700 ? 1 : width <= 999 ? 2 : 3);
  await footer.locator('.footer-explore-links a').last().focus();
  for (const link of await information.getByRole('link').all()) {
    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
  }
  await page.keyboard.press('Shift+Tab');
  await expect(information.getByRole('link').nth(4)).toBeFocused();
}

async function checkHeader(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const header = page.locator('[data-site-header]');
  const brand = header.getByRole('link', { name: 'St Michael & All Angels MICKLEHAM & WESTHUMBLE', exact: true });
  const mark = brand.locator('img.header-church-mark');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute('alt', '');
  await expect(mark).toHaveAttribute('width', '80');
  await expect(mark).toHaveAttribute('height', '77');
  await expect(brand).toHaveAttribute('href', /index\.html(?:\?|$)/);
  const drawer = page.locator('#responsive-navigation');
  const menu = header.locator('.menu-toggle');
  const compact = await menu.isVisible();
  if (compact) {
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(drawer.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  }
  const nav = page.locator('#mainNav');
  await expect(page.locator('.header-information > a[href$="safeguarding.html"]:visible')).toHaveAttribute('href', /safeguarding\.html$/);
  await expect(nav.locator('a[href$="electoral-roll.html"], a[href$="privacy.html"]')).toHaveCount(0);
  for (const [category, destinations] of Object.entries(categories)) {
    const column = nav.locator(`#menu-${category}`);
    assert.deepEqual((await hrefs(column.locator('a'))).map(link => link.split('/').at(-1)), destinations);
    await expect(column.locator('img')).toHaveAttribute('data-src', `assets/images/navigation/${category}-480.webp`);
  }
  const services = nav.locator('#trigger-services');
  const firstService = nav.locator('#menu-services a').first();
  await services.focus();
  await page.keyboard.press('ArrowDown');
  await expect(firstService).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(services).toBeFocused();
  await expect(services).toHaveAttribute('aria-expanded', 'false');

  const policies = page.locator('#policies-trigger');
  const policiesPanel = page.locator('#policies-navigation');
  await policies.focus();
  await page.keyboard.press('Enter');
  await expect(policiesPanel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(policiesPanel.getByRole('link').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(policiesPanel).toBeHidden();
  await expect(policies).toBeFocused();

  const search = nav.locator('.compact-search');
  await search.focus();
  await page.keyboard.press('Enter');
  const query = page.locator('#header-inline-query');
  await expect(query).toBeFocused();
  await query.fill('safeguarding');
  const results = page.locator('.header-search-matches a');
  await expect(results.first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(results.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(query).toBeHidden();
  await expect(search).toBeFocused();

  await nav.locator('#header-bible-open').focus();
  await page.keyboard.press('Enter');
  const bible = page.locator('dialog[open]').filter({ has: page.locator('iframe[src*="bible.html"]') });
  await expect(bible).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bible).toBeHidden();
  await expect(nav.locator('#header-bible-open')).toBeFocused();
  if (compact) {
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
  }
}

async function checkDesktopTransitions(page) {
  const header = page.locator('[data-site-header]');
  const menu = header.locator('.menu-toggle');
  const trigger = page.locator('#trigger-services');
  const hub = page.locator('.navigation-hub');
  const drawer = page.locator('#responsive-navigation');
  const brand = header.locator('.header-branding .brand');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const height of [1024, 720]) {
    await page.setViewportSize({ width: 1600, height });
    await expect(menu).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(hub).toHaveAttribute('data-hub-motion', 'open');
    assert.ok(await hub.evaluate(panel => !panel.getAnimations().some(animation => animation.playState === 'running')),
      'Reduced motion opens the hub without an active animation');
    for (const category of Object.keys(categories)) {
      const photo = hub.locator(`#menu-${category} img`);
      const crop = await photo.evaluate(async image => {
        await image.decode();
        const style = getComputedStyle(image);
        return [image.naturalWidth, style.objectFit, Math.round(image.getBoundingClientRect().height)];
      });
      assert.deepEqual(crop, [480, 'cover', height > 740 ? 128 : 104], category);
    }
    await page.keyboard.press('Escape');
    await expect(hub).toBeHidden();
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(hub.locator('#menu-services a').first()).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(menu).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(drawer).toBeVisible();
  await page.setViewportSize({ width: 1600, height: 1024 });
  await expect(drawer.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(brand).toBeFocused();

  await page.locator('#mainNav .compact-search').focus();
  await page.keyboard.press('Enter');
  const query = page.locator('#header-inline-query');
  await expect(query).toBeFocused();
  await query.fill('safeguarding');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/search\.html\?q=safeguarding$/);
  await expect(page.locator('#site-search')).toHaveValue('safeguarding');
  await expect(page.locator('#search-results a').first()).toBeVisible();
}

async function run() {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}${mount}`;
  const channel = process.env.PUBLIC_BROWSER_CHANNEL;
  const browser = await chromium.launch(channel ? { channel } : {});
  try {
    const page = await browser.newPage();
    await page.clock.setFixedTime(new Date('2026-11-15T09:30:00Z'));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      // Keep CI offline. Local approval screenshots may load the site's published font styles.
      const screenshotFont = screenshots && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
      return url.href.startsWith(base) || screenshotFont ? route.continue() : route.abort();
    });
    for (const width of [1600, 1366, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1024 });
      assert.equal((await page.goto(base)).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      await checkHome(page, width);
      if (screenshots && [1600, 390].includes(width)) {
        const fonts = await page.evaluate(() => [...new Set([...document.fonts]
          .filter(font => font.status === 'loaded').map(font => font.family))]);
        console.log(`Screenshot ${width}px loaded fonts: ${fonts.join(', ') || 'system fallbacks'}`);
        await fs.mkdir(screenshots, { recursive: true });
        await page.screenshot({ path: path.join(screenshots, `pr12-home-${width}.png`), fullPage: true });
      }
      await checkFooter(page, width);
      await checkHeader(page);
      console.log(`PASS ${width}px homepage, footer, navigation, Search and Bible`);
    }
    await checkDesktopTransitions(page);
    for (const link of new Set([...Object.values(categories).flat(), ...footerLinks,
      'index.html', 'policies.html', 'calendar.html', 'bible.html', 'visit.html', 'search.html?q=safeguarding',
      'pews-news/2026-11-15.html', 'news/we-will-remember-them.html'])) {
      const response = await page.request.get(base + link);
      assert.equal(response.status(), 200, link);
      await response.dispose();
    }
    console.log('PASS responsive mode and focus recovery, reduced motion, crops and local destinations');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
}).finally(() => server.close());
