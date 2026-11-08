const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { transformSync } = require('esbuild');

const full = '(min-width:1600px) and (min-width:100em)';
const compact = 'not all and ' + full;
const read = file => fs.readFileSync(file, 'utf8').replace(/\r/g, '');

test('header, search, drawer, policies and Home use the same width gate', () => {
  for (const file of ['site.js', 'responsive-navigation.js', 'policies-navigation.js', 'public-header.js']) {
    assert(read(file).includes(`matchMedia('${compact}')`), file);
    assert(!read(file).includes('(max-height:999px)'), file);
  }
  assert(read('header-search.js').includes(`matchMedia('${full}')`));
  for (const file of ['header-navigation.css', 'home-performance.css']) assert(read(file).includes(full), file);
  for (const file of ['header-navigation.css', 'policies-navigation.css']) assert(read(file).includes(compact), file);
  assert(read('header-navigation.css').includes('min-width:max-content; padding-right:20px'));
});

test('the shared delivery cache keys refresh all coupled header assets', () => {
  const version = '20261108-header-fit-1';
  for (const url of ['header-navigation.css?navigation=', 'responsive-navigation.js?v=', 'public-header.js?v=']) {
    assert(read('site.js').includes(url + version), url);
  }
  for (const url of ['header-search.js?v=', 'policies-navigation.css?v=', 'policies-navigation.js?v=']) {
    assert(read('public-header.js').includes(url + version), url);
  }
  assert(read('build-typography-preview.js').includes("header: '" + version + "'"));
});

test('the homepage bundle contains the same shared header rules as public pages', () => {
  const { sources } = require('../home-style-sources.json');
  const css = sources.map(source => read(source.split('?')[0])).join('\n');
  assert.equal(read('home-critical.css'), transformSync(css, { loader: 'css', minify: true, legalComments: 'inline' }).code);
});
