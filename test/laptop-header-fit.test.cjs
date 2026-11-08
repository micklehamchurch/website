const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { transformSync } = require('esbuild');

const read = file => fs.readFileSync(file, 'utf8').replace(/\r/g, '');

test('Option D coordinates the drawer, policies and search with the measured header mode', () => {
  assert(read('site.js').includes('globalThis.churchHeaderMode = headerMode'));
  for (const file of ['responsive-navigation.js', 'policies-navigation.js', 'public-header.js']) {
    assert(read(file).includes('globalThis.churchHeaderMode'), file);
  }
  assert(read('public-header.js').includes("matchMedia('(min-width:1280px) and (min-width:80em)')"));
  assert(read('header-search.js').includes("header.classList.contains('is-full')&&header.classList.contains('is-condensed')"));
  assert(read('header-navigation.css').includes('@media (width < 1366px)'));
  assert(read('home-performance.css').includes('.has-full-header'));
});

test('the shared delivery cache keys refresh all coupled header assets', () => {
  const version = '20261108-option-d-1';
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
