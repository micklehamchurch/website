const delivery = require('./helpers/home-performance.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const {render, readService} = require('../home-news-render.cjs');
const feed = require('../news-feed.json');

test('Latest Service links to the cached video with the genuine thumbnail and an accessible label', () => {
  const service = readService();
  assert.ok(service);
  const html = render(feed, service);
  assert.match(html, /Latest Service/);
  assert.ok(html.includes('https://www.youtube.com/watch?v=' + service.video.id));
  assert.ok(html.includes('aria-label="Watch ' + service.video.title + ' on YouTube"'));
  assert.ok(html.includes(service.thumbnail.path));
  assert.ok(fs.existsSync(service.thumbnail.path));
  assert.doesNotMatch(html, /iframe|autoplay|src="https:/);
  assert.ok(!feed.items.some(item => item.kind === 'service'));
});

test('missing thumbnail keeps the link and escapes metadata', () => {
  const service = structuredClone(readService());
  service.thumbnail = null;
  service.video.title = '<script>fake</script>';
  const html = render(feed, service);
  assert.match(html, /home-service-placeholder/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>fake/);
});

test('all homepage content outside From Our Parish remains byte-equivalent to the Dev baseline', () => {
  const strip = text => text.replace(/\r/g, '').replace(/<!-- home-news:start -->[\s\S]*?<!-- home-news:end -->/, 'NEWS');
  const before = cp.execFileSync('git', ['show', '646f2ee:index.html'], {encoding:'utf8'});
  const after = fs.readFileSync('index.html', 'utf8');
  assert.equal(delivery(strip(after)), delivery(strip(before)));
});
