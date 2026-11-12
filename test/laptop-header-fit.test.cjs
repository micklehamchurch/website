const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { transformSync } = require('esbuild');
const { runInNewContext } = require('node:vm');

const read = file => fs.readFileSync(file, 'utf8').replace(/\r/g, '');

test('Option D coordinates the drawer, policies and search with the measured header mode', () => {
  assert(read('site.js').includes('globalThis.churchHeaderMode = headerMode'));
  for (const file of ['responsive-navigation.js', 'policies-navigation.js', 'public-header.js']) {
    assert(read(file).includes('globalThis.churchHeaderMode'), file);
  }
  assert.match(read('public-header.js'), /min-width:820px.*any-hover:hover.*any-pointer:fine/);
  assert.match(read('header-navigation.css'), /\.header-inline-search \{ position:absolute; inset:calc\(100% \+ 8px\) 0 auto;/);
  assert.match(read('public-header.js'), /setRows\(full\);/);
  assert.doesNotMatch(read('public-header.js'), /scrollY|is-condensed/);
  assert.doesNotMatch(read('header-navigation.css'), /is-condensed/);
  assert.match(read('public-header.js'), /occupiedWidth>=20&&fits()/);
  assert.match(read('header-navigation.css'), /position:sticky; top:0;/);
  assert(read('header-navigation.css').includes('@media (width < 1366px)'));
  assert(read('home-performance.css').includes('.has-full-header'));
});

test('the steady desktop header release refreshes changed header asset cache keys', () => {
  const styleVersion = '20261112-slim-header-1';
  assert(read('site.js').includes('header-navigation.css?navigation=' + styleVersion));
  assert(read('build-typography-preview.js').includes("header: '" + styleVersion + "'"));
  const version = '20261108-header-social-1';
  assert(read('site.js').includes('responsive-navigation.js?v=' + version));
  assert(read('site.js').includes('public-header.js?v=' + styleVersion));
  assert(read('public-header.js').includes('header-search.js?v=20261110-header-scroll-1'));
  assert(read('public-header.js').includes('policies-navigation.css?v=' + version));
  assert(read('public-header.js').includes('policies-navigation.js?v=' + styleVersion));
});

test('header social links use the official destinations and accessible names in order', () => {
  const source = read('site.js').split('// Audited destinations')[0];
  const markup = runInNewContext(source + '\nheaderSocials;');
  const links = [...markup.matchAll(/href="([^"]+)" target="_blank" rel="noopener noreferrer" aria-label="([^"]+)"/g)];
  assert.deepEqual(links.map(link => link[1]), [
    'https://www.instagram.com/micklehamchurch/',
    'https://www.youtube.com/@stmichaelandallangelschurc3012',
  ]);
  assert.match(links[0][2], /Instagram/);
  assert.match(links[1][2], /YouTube/);
});

test('the homepage bundle contains the same shared header rules as public pages', () => {
  const { sources } = require('../home-style-sources.json');
  const css = sources.map(source => read(source.split('?')[0])).join('\n');
  assert.equal(read('home-critical.css'), transformSync(css, { loader: 'css', minify: true, legalComments: 'inline' }).code);
});
