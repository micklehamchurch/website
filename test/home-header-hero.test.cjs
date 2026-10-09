const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'home-header-hero.js'), 'utf8');
function setup({ homepage = true, desktop = true, bottom = 500, height = 79, observer = true } = {}) {
  const state = { bottom, height, top: 0, over: false }, windowEvents = {}, documentEvents = {};
  const media = { matches: desktop, addEventListener: (_, cb) => { windowEvents.media = cb; } };
  const header = { getBoundingClientRect: () => ({ height: state.height }), classList: { toggle: (_, value) => { state.over = value; } } };
  const hero = { getBoundingClientRect: () => ({ bottom: state.bottom, top: state.top }) };
  const document = { body: { classList: { contains: () => homepage } }, querySelector: selector => selector === '.home-hero' ? hero : header, addEventListener: (name, cb) => { documentEvents[name] = cb; } };
  const window = { matchMedia: () => media, addEventListener: (name, cb) => { windowEvents[name] = cb; } };
  class IntersectionObserver { constructor(cb, options) { state.intersection = cb; state.margin = options.rootMargin; } observe() {} disconnect() {} }
  class ResizeObserver { constructor(cb) { state.resize = cb; } observe() {} }
  if (observer) window.IntersectionObserver = IntersectionObserver;
  window.ResizeObserver = ResizeObserver;
  vm.runInNewContext(source, { document, window, IntersectionObserver, ResizeObserver, requestAnimationFrame: cb => { cb(); return 1; }, cancelAnimationFrame() {} });
  return { state, media, windowEvents, documentEvents };
}
test('only the desktop homepage activates the transparent state', () => {
  assert.equal(setup().state.over, true);
  assert.equal(setup({ desktop: false }).state.over, false);
  const interior = setup({ homepage: false });
  assert.equal(interior.state.over, false);
  assert.deepEqual(interior.windowEvents, {});
});
test('state follows the measured hero edge and returns when scrolling upward', () => {
  const out = setup({ height: 92 });
  assert.equal(out.state.margin, '-92px 0px 0px 0px');
  out.state.bottom = 92; out.state.intersection(); assert.equal(out.state.over, false);
  out.state.bottom = 93; out.windowEvents.scroll(); assert.equal(out.state.over, true);
  out.state.height = 94; out.state.resize(); assert.equal(out.state.over, false);
});
test('restored scroll, history, resize and keyboard focus refresh state', () => {
  const out = setup();
  for (const name of ['pageshow', 'popstate', 'load', 'resize']) {
    out.state.bottom = 0; out.windowEvents[name](); assert.equal(out.state.over, false);
    out.state.bottom = 500; out.windowEvents[name](); assert.equal(out.state.over, true);
  }
  out.state.bottom = 0; out.documentEvents.focusin(); assert.equal(out.state.over, false);
  out.media.matches = false; out.windowEvents.media(); assert.equal(out.state.over, false);
  out.state.bottom = 500; out.media.matches = true; out.windowEvents.media(); assert.equal(out.state.over, true);
});
test('passive scroll fallback works without IntersectionObserver', () => {
  const out = setup({ observer: false, bottom: 0 });
  assert.equal(out.state.over, false);
  out.state.bottom = 500; out.windowEvents.scroll(); assert.equal(out.state.over, true);
});
test('only the homepage loads the enhancement; no photo effects or hero edits', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(home, /<body class="home-header-hero">/);
  assert.match(home, /home-header-hero\.js\?v=20261009-v1/);
  const css = fs.readFileSync(path.join(root, 'home-header-hero.css'), 'utf8');
  assert.match(css, /@media \(min-width: 1000px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  for (const effect of css.matchAll(/(?:backdrop-)?filter\s*:\s*([^;]+)/g)) assert.equal(effect[1].trim(), 'none');
  assert.doesNotMatch(css, /gradient|blend-mode|\.home-hero|\.hero-content|object-fit|object-position/);
  for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html') && file !== 'index.html')) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /home-header-hero\.(?:js|css)/, file);
  }
});
