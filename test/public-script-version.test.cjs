const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { versionPublicScript } = require('../public-script-version');
const versions = { typography: '20261007-v1', header: '20261009-v2', gallery: '20261009-v1' };
test('public script versions replace old and duplicate gallery values, preserving hero', () => {
  const input = 'site.js?hero=20261005-v4&gallery=old&header=old&gallery=20261009-v1';
  const output = versionPublicScript(input, versions);
  const query = new URL(output, 'https://example.org').searchParams;
  assert.deepEqual(query.getAll('gallery'), ['20261009-v1']);
  assert.equal(query.get('hero'), '20261005-v4');
  assert.equal(query.get('header'), versions.header);
  assert.equal(versionPublicScript(output, versions), output);
});
test('versioning handles bare, nested and HTML-escaped URLs without appending duplicates', () => {
  for (const url of ['site.js', '../site.js?gallery=old&amp;gallery=older#anchor', 'site.js?gallery=old&other=value']) {
    const output = versionPublicScript(url, versions);
    assert.equal(versionPublicScript(output, versions), output);
    assert.deepEqual(new URL(output, 'https://example.org').searchParams.getAll('gallery'), [versions.gallery]);
    if (url.includes('#anchor')) assert(output.endsWith('#anchor'));
  }
});
test('every generated public shared script has exactly one current gallery version', () => {
  const root = path.join(__dirname, '..');
  for (const dir of [root, path.join(root, 'news')]) for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, file), 'utf8');
    if (!html.includes('data-site-footer')) continue;
    for (const match of html.matchAll(/src="([^"]*site\.js(?:\?[^"]*)?)"/g)) {
      assert.deepEqual(new URL(match[1].replace(/&amp;/g, '&'), 'https://example.org').searchParams.getAll('gallery'), [versions.gallery], file);
    }
  }
});
