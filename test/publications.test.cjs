const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const model = require('../publications-model.js');
const root = path.resolve(__dirname, '..');
const edition = (date, type = 'pews-news', published = true) => ({ id: `${type}-${date}`, type, title: model.label(type), date, description: 'Test fixture only', pdf: `assets/documents/news/${type}/${type}-${date}.pdf`, published });
test('publication parsing accepts typed permanent records and strips unsupported fields', () => {
  const records = model.parse({ publications: [{ ...edition('2026-09-27'), extra: 'excluded' }] });
  assert.equal(records.length, 1); assert.equal(records[0].extra, undefined);
});
test('latest edition uses dates, independent of source order; archive preserves every older published edition', () => {
  const records = model.parse({ publications: [edition('2025-10-01'), edition('2026-09-27'), edition('2026-08-01', 'parish-magazine'), edition('2026-10-01', 'pews-news', false), edition('2026-09-20')] });
  const original = JSON.stringify(records);
  assert.equal(model.latest(records, 'pews-news').date, '2026-09-27');
  assert.equal(model.archive(records).length, 2);
  assert.deepEqual(model.archive(records, 'pews-news').map(item => item.date), ['2026-09-20', '2025-10-01']);
  assert.equal(JSON.stringify(records), original);
  assert.equal(model.latest(records, 'parish-magazine').date, '2026-08-01');
});
test('empty magazine and empty archive are safe', () => {
  assert.equal(model.latest([], 'parish-magazine'), null); assert.deepEqual(model.archive([]), []);
  assert.equal(model.dateLabel(edition('2026-09-27')), 'Sunday, 27 September 2026');
});
test('invalid dates, status, type, duplicate paths/IDs and unsafe PDF references are rejected', () => {
  for (const mutation of [{ id: undefined }, { date: '2026-02-30' }, { date: '2026-09-27extra' }, { published: 'true' }, { type: 'other' }, { title: '' }, { pdf: 'https://example.org/test.pdf' }, { pdf: 'assets/documents/news/pews-news/../test.pdf' }, { pdf: 'assets/documents/news/pews-news/test.html' }]) assert.throws(() => model.parse({ publications: [{ ...edition('2026-09-27'), ...mutation }] }));
  assert.throws(() => model.parse({ publications: [edition('2026-09-27'), edition('2026-09-27')] }));
  assert.throws(() => model.parse({ publications: [edition('2026-09-27'), { ...edition('2026-09-20'), pdf: edition('2026-09-27').pdf }] }));
});
test('build projects published records, validates actual PDF and never deletes historical files', () => {
  const source = fs.readFileSync(path.join(root, 'build-publications.js'), 'utf8');
  let result;
  const fakeFs = { readFileSync: target => target.endsWith('.json') ? JSON.stringify({ publications: [edition('2026-09-27'), edition('2026-09-20', 'pews-news', false)] }) : Buffer.from('%PDF-1.7'), existsSync: () => true, writeFileSync: (target, contents) => { if (!target.includes('admin')) result = JSON.parse(contents); } };
  vm.runInNewContext(source, { __dirname: root, require: name => name === 'node:fs' ? fakeFs : name === './publications-model.js' ? model : require(name), console: { log() {} } });
  assert.equal(result.publications.length, 1);
  fakeFs.existsSync = () => false;
  assert.throws(() => vm.runInNewContext(source, { __dirname: root, require: name => name === 'node:fs' ? fakeFs : name === './publications-model.js' ? model : require(name), console }), /real PDF/);
});
test('search adds publication metadata without indexing PDF contents', () => {
  const source = fs.readFileSync(path.join(root, 'build-search-index.js'), 'utf8'); let result;
  const fixtures = { 'events.json': '{}', 'news-data.json': '{"articles":[]}', 'publications-data.json': JSON.stringify({ publications: [edition('2026-09-27')] }), 'news.html': '<html><title>News &amp; Magazine</title><main><h1>News &amp; Magazine</h1></main></html>' };
  const fakeFs = { existsSync: target => path.basename(target) in fixtures, readFileSync: target => fixtures[path.basename(target)], readdirSync: () => [{ name: 'news.html', isDirectory: () => false, isFile: () => true }], writeFileSync: (target, contents) => { result = JSON.parse(contents); } };
  vm.runInNewContext(source, { __dirname: root, require: name => name === 'node:fs' ? fakeFs : name === './publications-model.js' ? model : require(name), console: { log() {} } });
  assert.match(result[0].content, /Pews News.*2026-09-27.*27 September 2026/);
});
test('real website stories generate readable escaped articles; expired articles retain their pages and drafts never emit', () => {
  const source = fs.readFileSync(path.join(root, 'build-news-pages.js'), 'utf8');
  const story = { slug: 'test-story', title: 'Fixture <title>', date: '2026-09-27', dateLabel: '27 September 2026', category: 'News', excerpt: 'Test summary', paragraphs: ['Full body <script>'], status: 'published', expires: '2026-09-28' };
  const outputs = new Map();
  const fakeFs = { readFileSync: () => JSON.stringify({ articles: [story, { ...story, slug: 'draft-fixture', status: 'draft' }] }), writeFileSync: (file, text) => outputs.set(path.basename(file), text), mkdirSync() {}, readdirSync: () => [], existsSync: () => true };
  const run = () => vm.runInNewContext(source, { __dirname: root, require: name => name === 'node:fs' ? fakeFs : name === './publications-model.js' ? model : require(name), console: { log() {} } });
  run(); assert.match(outputs.get('test-story.html'), /Full body &lt;script&gt;/);
  assert.equal(outputs.has('draft-fixture.html'), false);
  assert.equal(JSON.parse(outputs.get('news-data.json')).articles[0].expires, '2026-09-28');
  story.date = 'not-a-date'; assert.throws(run, /ISO publication date/);
});
