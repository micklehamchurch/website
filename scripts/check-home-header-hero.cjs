// Homepage header integration checks. HERO_HEADER_BASE_URL enables live verification.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.join(__dirname, '..');
const base = process.env.HERO_HEADER_BASE_URL || 'http://127.0.0.1:4193/';
const server = process.env.HERO_HEADER_BASE_URL ? null : spawn(process.execPath, [path.join(root, 'preview.js')], { env: { ...process.env, MICKLEHAM_PREVIEW_PORT: '4193' }, stdio: ['ignore', 'pipe', 'inherit'] });
const widths = [390, 430, 600, 768, 834, 900, 999, 1000, 1024, 1280, 1440, 1600, 1920];
const output = path.join(root, '../homepage-polish-verification');
async function scroll(page, y) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
}
async function state(page, over) {
  // site.js appends shared header CSS; wait for it before measuring either state.
  await page.waitForFunction(() => document.querySelector('link[href*="header-navigation.css"]')?.sheet);
  await page.waitForFunction(over => document.querySelector('header').classList.contains('is-over-hero') === over, over);
  await page.waitForFunction(over => {
    const background = getComputedStyle(document.querySelector('header')).backgroundColor;
    return over ? background === 'rgba(0, 0, 0, 0)' : background === 'rgba(255, 253, 248, 0.97)';
  }, over);
}
async function geometry(page) {
  return page.evaluate(() => {
    const h = document.querySelector('header'), hero = document.querySelector('.home-hero'), img = hero.querySelector('img'), copy = hero.querySelector('.hero-content');
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return { header: r(h), hero: r(hero), image: r(img), copy: r(copy), fit: getComputedStyle(img).objectFit, position: getComputedStyle(img).objectPosition, filter: getComputedStyle(img).filter, blend: getComputedStyle(img).mixBlendMode, overlay: getComputedStyle(hero.querySelector('.hero-overlay')).display, backdrop: getComputedStyle(h).backdropFilter, copyBackground: getComputedStyle(copy).backgroundColor, menu: getComputedStyle(document.querySelector('.menu-toggle')).display, overflow: document.documentElement.scrollWidth > innerWidth, brand: getComputedStyle(h.querySelector('.brand strong')).color, youtube: getComputedStyle(h.querySelector('.nav-youtube')).color, primary: getComputedStyle(h.querySelector('.nav-primary > a')).color };
  });
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  if (server) await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('Preview exited: ' + code))); });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const mode of ['heritage', 'modern-classic', 'contemporary']) for (const width of widths) {
      const desktop = width >= 1000;
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator(`[data-typography-option="${mode}"]`).click();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.home-hero-photo img').evaluate(img => img.decode());
      await scroll(page, 0); await state(page, desktop);
      const top = await geometry(page);
      assert(!top.overflow); assert.equal(top.overlay, 'none'); assert.equal(top.filter, 'none'); assert.equal(top.blend, 'normal');
      assert.equal(top.youtube, 'rgb(193, 40, 50)');
      assert.equal(top.menu === 'none', desktop);
      assert.equal(await page.locator('.parish-life iframe').count(), 1);
      if (desktop) {
        assert.equal(top.hero.y, 0); assert.equal(top.image.y, 0); assert.equal(top.header.y, 0);
        assert.equal(top.brand, 'rgb(255, 253, 248)'); assert.equal(top.backdrop, 'none');
        assert.equal(top.copyBackground, 'rgba(0, 0, 0, 0)');
      } else {
        assert.equal(top.hero.y, top.header.h); assert.notEqual(top.brand, 'rgb(255, 253, 248)');
      }
      if (width > 600) {
        assert(Math.abs(top.image.h - Math.max(320, width * 2409 / 4786)) < 1);
        assert.equal(top.fit, 'cover'); assert.equal(top.position, '50% 62%');
        assert(top.copy.x >= width * .6);
      } else assert(Math.abs(top.image.w / top.image.h - 8 / 5) < .005);
      // Every transparent-header text item and YouTube must stay unboxed.
      if (desktop) {
        for (const item of await page.locator('.nav-primary > .nav-link, .nav-trigger, .nav-youtube').all()) {
          const before = await item.boundingBox(); await item.hover();
          assert.equal(await item.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
          assert.deepEqual(await item.boundingBox(), before);
          await item.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
          assert.equal(await item.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
          assert(await item.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'));
        }
        // Traverse the complete header in document tab order, including Search.
        const stops = []; for (const item of await page.locator('header a, header button, header input').all()) if (await item.isVisible()) stops.push(item);
        await stops[0].focus();
        for (let i = 0; i < stops.length; i++) {
          if (i) await page.keyboard.press('Tab');
          assert(await stops[i].evaluate(el => el === document.activeElement));
          assert(await stops[i].evaluate(el => getComputedStyle(el).outlineStyle !== 'none' || (el.closest('.header-search') && getComputedStyle(el.closest('.header-search')).outlineStyle !== 'none')));
        }
      }
      // Inspect dropdown keyboard operation in the initial header state.
      if (!desktop) await page.locator('.menu-toggle').click();
      for (const button of await page.locator('.nav-trigger').all()) {
        await button.press('Enter'); assert.equal(await button.getAttribute('aria-expanded'), 'true');
        const menu = page.locator('#' + await button.getAttribute('aria-controls')); assert(await menu.isVisible());
        const bounds = await menu.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        await button.press('Escape'); assert.equal(await button.getAttribute('aria-expanded'), 'false');
        if (!desktop) await page.locator('.menu-toggle').click();
      }
      if (!desktop) await page.locator('.menu-toggle').press('Escape');
      await page.locator('header .brand').focus(); await page.keyboard.press('Tab');
      assert(await page.locator('.nav-youtube').evaluate(el => el === document.activeElement));
      assert(await page.locator('.nav-youtube').evaluate(el => getComputedStyle(el).outlineStyle !== 'none'));
      assert.equal(await page.locator('.nav-youtube').getAttribute('target'), '_blank');
      await scroll(page, 0); await state(page, desktop);
      await page.screenshot({ path: path.join(output, `${process.env.HERO_HEADER_BASE_URL ? 'live' : 'local'}-${mode}-${width}-top.png`) });
      // Editorial media and manual carousel retain the original content and links.
      const life = page.locator('.parish-life'); await life.scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => {
        const life = document.querySelector('.parish-life');
        const frame = life.querySelector('.parish-carousel-images').getBoundingClientRect(), video = life.querySelector('.parish-life-video').getBoundingClientRect();
        const links = [...life.querySelectorAll('.parish-life-column > .text-link')].map(el => el.getBoundingClientRect().bottom);
        return { columns: getComputedStyle(life.querySelector('.parish-life-grid')).gridTemplateColumns.split(' ').length, frame: frame.width / frame.height, video: video.width / video.height, links, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(!layout.overflow); assert.equal(layout.columns, width <= 900 ? 1 : 2);
      assert(await life.locator('h2, h3, h4, .text-link').evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth + 1)));
      assert(Math.abs(layout.frame - 4 / 3) < .02); assert(Math.abs(layout.video - 16 / 9) < .02);
      assert(await life.locator('a[href="sunday-services.html"]').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.parish-life-video-copy').getBoundingClientRect().bottom));
      const carousel = page.locator('[data-parish-carousel]');
      await carousel.locator('[data-next]').click(); assert.match(await carousel.locator('[data-status]').innerText(), /Photograph 2 of 7/);
      await carousel.locator('[data-next]').press('ArrowLeft'); assert.match(await carousel.locator('[data-status]').innerText(), /Photograph 1 of 7/);
      await carousel.locator('.parish-carousel-images').dispatchEvent('pointerdown', { clientX: 240, clientY: 120, pointerType: 'touch', isPrimary: true });
      await carousel.locator('.parish-carousel-images').dispatchEvent('pointerup', { clientX: 100, clientY: 121, pointerType: 'touch', isPrimary: true });
      assert.match(await carousel.locator('[data-status]').innerText(), /Photograph 2 of 7/);
      for (const button of await carousel.locator('button').all()) { const box = await button.boundingBox(); assert(box.width >= 32 && box.height >= 44); }
      await carousel.locator('[data-position]').nth(2).click();
      assert.equal(await carousel.locator('[data-slide]:visible').evaluate(img => getComputedStyle(img).objectFit), 'contain');
      await carousel.locator('[data-position]').first().click();
      assert.equal(await life.locator('a[href="sunday-services.html"]').getAttribute('href'), 'sunday-services.html');
      await life.locator('a[href="sunday-services.html"]').click(); await page.waitForURL('**/sunday-services.html');
      assert.equal((await page.locator('h1').innerText()).trim(), 'Sunday Services');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      const below = top.hero.y + top.hero.h + 100;
      await scroll(page, below); await state(page, false);
      const down = await geometry(page); assert.equal(down.header.h, top.header.h); assert.equal(down.header.w, top.header.w);
      assert.notEqual(down.brand, 'rgb(255, 253, 248)');
      if (desktop) for (const item of await page.locator('.nav-primary > .nav-link, .nav-trigger, .nav-youtube').all()) {
        await item.hover();
        await page.waitForFunction(el => getComputedStyle(el).backgroundColor === 'rgb(247, 243, 233)', await item.elementHandle());
      }
      await page.mouse.move(width - 1, 900);
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => scrollY > 0); await state(page, false);
      assert.equal((await geometry(page)).header.h, top.header.h);
      await scroll(page, 0); await state(page, desktop);
      if (!desktop) await page.locator('.menu-toggle').click();
      await page.locator('#header-search-query').fill('baptism'); await page.locator('#header-search-query').press('Enter');
      await page.waitForURL('**/search.html?q=baptism');
      assert.equal(await page.locator('#site-search').inputValue(), 'baptism'); await state(page, false);
      await page.goBack({ waitUntil: 'domcontentloaded' }); await scroll(page, 0); await state(page, desktop);
      if (!desktop) await page.locator('.menu-toggle').click();
      await page.locator('.nav-calendar').press('Enter'); await page.waitForURL('**/calendar.html'); await state(page, false);
      assert(await page.locator('h1').isVisible());
      await page.goBack({ waitUntil: 'domcontentloaded' }); await scroll(page, below); await state(page, false);
      await page.goto(new URL('worship.html', base).href, { waitUntil: 'domcontentloaded' }); await state(page, false);
      await page.goBack({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => scrollY > 0); await state(page, false);
      await scroll(page, 0); await state(page, desktop);
      console.log(`${mode} ${width}: PASS top/scroll/return, refresh/history, header dimensions, hero crop, all hover/focus states, dropdowns, keyboard, Search/Calendar, carousel/editorial media/Sunday Services`);
    }
    // Resize and reduced-motion checks, including the exact navigation breakpoint.
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(base); await state(page, true);
    await page.setViewportSize({ width: 999, height: 1000 }); await state(page, false);
    await page.setViewportSize({ width: 1000, height: 1000 }); await state(page, true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(await page.locator('header').evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(value => parseFloat(value) <= .00001)));
    await scroll(page, 1000); await state(page, false); await scroll(page, 0); await state(page, true);
    await scroll(page, 1000); await state(page, false);
    await page.goto(new URL('worship.html', base).href); await state(page, false);
    await page.goBack(); await page.waitForFunction(() => scrollY > 0); await state(page, false);
    await page.goForward(); await state(page, false);
    await page.goBack(); await page.waitForFunction(() => scrollY > 0); await state(page, false);
    await scroll(page, 0); await state(page, true);
    assert.deepEqual(errors, []);
    console.log('39 homepage polish scenarios passed; resize, scroll restoration and reduced motion passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server?.kill());
