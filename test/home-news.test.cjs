const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {render, readService} = require('../home-news-render.cjs');
const {archiveContent} = require('../parish-magazine-render.cjs');
const {editions, olderArchive} = require('../_content/parish-magazine.json');
const feed = require('../news-feed.json');

test('From Our Parish shows the approved cards in order using current canonical links', () => {
  const html = render(feed, readService());
  const artwork = 'assets/images/news-artwork/pews-lights-tabletop-2026-11-15-640.webp';
  assert.ok(html.includes('href="pews-news/2026-11-15.html" aria-label="Read the latest Pews News"><img src="' + artwork + '"'));
  assert.ok(fs.existsSync(artwork));
  const visible = [...html.matchAll(/<article class="parish-card"(?:(?! hidden)[^>])*?>[\s\S]*?<h3>[\s\S]*? (Latest Service|Pews News|Parish Magazine|Remembrance Sunday)<\/h3>/g)].map(match => match[1]);
  assert.deepEqual(visible, ['Latest Service', 'Pews News', 'Parish Magazine', 'Remembrance Sunday']);
  assert.match(html, /pews-news\/2026-11-15\.html/);
  assert.doesNotMatch(html, /pews-news\/2026-11-01\.html/);
  assert.match(html, /parish-magazine\.html#previous-editions/);
  assert.match(html, /data-parish-expiry="2026-12-01"/);
  assert.match(html, /data-parish-evergreen hidden/);
});

test('homepage uses the newest canonical Pews News and preserves truthful media fallbacks', () => {
  const newer = {...feed.items[0], id:'pews-news:2026-11-16', date:'2026-11-16', url:'pews-news/2026-11-16.html', image:null};
  const html = render({items:[newer, ...feed.items]});
  assert.match(html, /pews-news\/2026-11-16\.html/);
  assert.match(html, /news-paper/);
  assert.ok(!html.includes('pews-lights-tabletop-2026-11-15'));
  assert.match(html, /sunday-services\.html/);
});

test('homepage delivery equals the canonical renderer', () => {
  assert.ok(fs.readFileSync('index.html', 'utf8').replace(/\r/g, '').includes(render(feed, readService())));
});

test('archive links to all four original PDFs and each reader uses the same page data', () => {
  const html = archiveContent();
  assert.equal((html.match(/class="magazine-edition-card"/g) || []).length, 4);
  assert.ok(html.includes('View older editions (2025 – 2016)'));
  assert.match(html, /Older PDF editions are hosted by Mickleham Parish Council\./);
  const archive = html.split('<div class="magazine-older-grid">')[1].split('</details>')[0];
  assert.deepEqual([...archive.matchAll(/<h3>(\d{4})<\/h3>/g)].map(match => Number(match[1])),
    [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]);
  const external = olderArchive.slice(2).flatMap(group => group.editions);
  assert.equal(new Set(external.map(edition => edition.pdf)).size, 74);
  for (const edition of external) {
    const url = new URL(edition.pdf);
    assert.equal(url.origin + url.pathname, 'https://www.micklehamparishcouncil.gov.uk/shared/attachments.asp');
    assert.ok(archive.includes(edition.pdf.replaceAll('&', '&amp;') + '">' + edition.name + ' (PDF)'));
  }
  assert.match(html, /href="parish-magazine.html" aria-current="page"/);
  for (const edition of editions) {
    assert.ok(html.includes('href="' + edition.pdf + '" download'));
    assert.equal(fs.readFileSync(edition.pdf).subarray(0,5).toString(), '%PDF-');
    assert.equal(edition.wholePages[9], 'Calendar');
    for (let page=1; page<=edition.sheets; page++) {
      assert.ok(fs.existsSync(edition.images + '/sheet-' + String(page).padStart(2,'0') + '.jpg'));
    }
  }
  const embed = text => text.match(/<script type="application\/json" id="magazine-editions-data">([^<]+)/)[1];
  assert.equal(embed(html), embed(render(feed)));
  assert.ok(require('../search-index.json').find(item => item.url === 'parish-magazine.html' && item.content.includes('November 2026')));
});
