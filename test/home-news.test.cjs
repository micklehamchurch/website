const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {render, readService} = require('../home-news-render.cjs');
const {archiveContent} = require('../parish-magazine-render.cjs');
const {editions} = require('../_content/parish-magazine.json');
const feed = require('../news-feed.json');

test('From Our Parish shows the approved cards in order using current canonical links', () => {
  const html = render(feed, readService());
  const visible = [...html.matchAll(/<article class="parish-card"(?:(?! hidden)[^>])*?>[\s\S]*?<h3>[\s\S]*? (Latest Service|Pews News|Parish Magazine|Remembrance Sunday)<\/h3>/g)].map(match => match[1]);
  assert.deepEqual(visible, ['Latest Service', 'Pews News', 'Parish Magazine', 'Remembrance Sunday']);
  assert.match(html, /pews-news\/2026-11-08\.html/);
  assert.doesNotMatch(html, /pews-news\/2026-11-01\.html/);
  assert.match(html, /parish-magazine\.html#previous-editions/);
  assert.match(html, /data-parish-expiry="2026-12-01"/);
  assert.match(html, /data-parish-evergreen hidden/);
});

test('homepage uses the newest canonical Pews News and preserves truthful media fallbacks', () => {
  const newer = {...feed.items[0], id:'pews-news:2026-11-15', url:'pews-news/2026-11-15.html', image:null};
  const html = render({items:[newer, ...feed.items]});
  assert.match(html, /pews-news\/2026-11-15\.html/);
  assert.match(html, /news-paper/);
  assert.match(html, /sunday-services\.html/);
});

test('homepage delivery equals the canonical renderer', () => {
  assert.ok(fs.readFileSync('index.html', 'utf8').replace(/\r/g, '').includes(render(feed, readService())));
});

test('archive links to all three original PDFs and each reader uses the same page data', () => {
  const html = archiveContent();
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
