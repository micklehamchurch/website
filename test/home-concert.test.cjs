const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '../home-concert.js'), 'utf8');
const expiry = Date.parse('2026-10-18T00:00:00+01:00');

test('promotion preserves existing homepage and is excluded from static search', () => {
  const { execFileSync } = require('node:child_process');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const baseline = execFileSync('git', ['show', '60258c67d04221e88431c19da367024d00934170:index.html'], { cwd: root, encoding: 'utf8' });
  const clean = value => value.replace(/\r/g, '').trim();
  const stripped = html.replace(/    <!-- home-concert:start -->[\s\S]*?    <!-- home-concert:end -->\r?\n\r?\n/, '')
    .replace(/^  .*home-concert\.(?:css|js).*\r?\n/gm, '');
  assert.equal(clean(stripped), clean(baseline));
  assert(html.indexOf('home-concert:start') < html.indexOf('data-home-verse'), 'concert bridges the hero before Scripture and parish content');
  assert(html.indexOf('home-concert:start') > html.indexOf('hero-actions'));
  assert.match(html, /datetime="2026-10-17T19:00:00\+01:00"/);
  assert.match(html, /Find out more &amp; tickets/);
  assert.match(html, /Organised by Dorking &amp; District Town Twinning Association/);
  execFileSync(process.execPath, ['build-search-index.js'], { cwd: root });
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'search-index.json'), 'utf8'), /Voices Across Borders|Flos Vocalis/);
});

function run(now, promotion = { hidden: true }) {
  const listeners = {};
  let callback, delay;
  const context = {
    Date: { parse: Date.parse, now: () => now },
    document: { querySelector: () => promotion, addEventListener: (name, fn) => { listeners[name] = fn; } },
    window: { addEventListener: (name, fn) => { listeners[name] = fn; } },
    clearTimeout() {}, setTimeout(fn, ms) { callback = fn; delay = ms; },
  };
  vm.runInNewContext(script, context);
  return { promotion, listeners, get delay() { return delay; }, advance(time) { now = time; callback(); } };
}

test('concert remains visible through the UK event day and expires at UK midnight', () => {
  for (const now of [Date.parse('2026-10-14T12:00:00Z'), Date.parse('2026-10-17T19:00:00+01:00'), expiry - 1]) {
    const state = run(now);
    assert.equal(state.promotion.hidden, false);
    assert.equal(state.delay, expiry - now);
    state.advance(expiry);
    assert.equal(state.promotion.hidden, true);
  }
  assert.equal(run(expiry).promotion.hidden, true);
  assert.equal(run(expiry + 86400000).promotion.hidden, true);
});
test('restored and background tabs refresh, long delays are safe, absent card is harmless', () => {
  const state = run(expiry - 3000000000);
  assert.equal(state.delay, 2147483647);
  state.advance(expiry);
  state.listeners.pageshow();
  state.listeners.visibilitychange();
  assert.equal(state.promotion.hidden, true);
  assert.doesNotThrow(() => run(expiry, null));
});
