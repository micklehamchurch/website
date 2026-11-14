'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const packager = path.join(__dirname, 'package-public-site.cjs');
const origin = 'https://rehearsal.invalid';

function fixture(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'church-public-artifact-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const write = (file, value) => {
    const target = path.join(repo, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value);
  };
  write('scripts/package-public-site.cjs', fs.readFileSync(packager));
  write('scripts/public-site-files.txt', '404.html\nindex.html\nstyles.css\n');
  write('scripts/public-site-404.html.txt', '<h1>Page not found</h1><a href="index.html">Home</a>');
  write('index.html', '<link rel="stylesheet" href="styles.css"><h1>Parish</h1>');
  write('styles.css', 'body { color: #000; }');
  write('_content/fixture.json', '{"privateNotes":"fixture-only restricted note"}');
  const run = (mode = 'build', base = '/website/') => spawnSync(process.execPath,
    [path.join(repo, 'scripts/package-public-site.cjs'), mode, path.join(repo, 'out'), origin, base],
    { encoding: 'utf8' });
  return { repo, write, run };
}

test('builds only listed files and verifies both base paths', t => {
  for (const base of ['/website/', '/']) {
    const { repo, write, run } = fixture(t);
    write('azure-function/host.json', '{}');
    const result = run('build', base);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).files.map(f => f.path), ['404.html', 'index.html', 'styles.css']);
    assert.ok(fs.readFileSync(path.join(repo, 'out/404.html'), 'utf8').includes('href="' + base + '"'));
    assert.equal(run('verify', base).status, 0);
  }
});

test('rejects unexpected and altered output', t => {
  const { repo, write, run } = fixture(t);
  assert.equal(run().status, 0);
  write('out/package.json', '{}');
  assert.match(run('verify').stderr, /Unexpected artifact path/);
  fs.unlinkSync(path.join(repo, 'out/package.json'));
  write('out/styles.css', 'body { color: red; }');
  assert.match(run('verify').stderr, /Artifact digest mismatch/);
});

test('rejects missing source files, dependencies and unsafe allowlist paths', t => {
  const { repo, write, run } = fixture(t);
  fs.unlinkSync(path.join(repo, 'styles.css'));
  assert.match(run().stderr, /Missing file/);
  write('styles.css', 'body{}');
  write('index.html', '<base href="../"><link rel="stylesheet" href="styles.css">');
  assert.match(run().stderr, /HTML base escapes/);
  write('index.html', '<link rel="stylesheet" href="not-listed.css">');
  assert.match(run().stderr, /Missing allowed dependency/);
  write('index.html', '<h1>Parish</h1>');
  write('scripts/public-site-files.txt', '404.html\nindex.html\nazure-function/host.json\n');
  assert.match(run().stderr, /Forbidden allowlist path/);
});

test('rejects restricted text and unpublished JSON without logging values', t => {
  const { write, run } = fixture(t);
  write('index.html', '<p>fixture-only restricted note</p>');
  const restricted = run();
  assert.match(restricted.stderr, /Restricted text detected/);
  assert.doesNotMatch(restricted.stderr, /fixture-only restricted note/);
  write('index.html', '<h1>Parish</h1>');
  write('scripts/public-site-files.txt', '404.html\nindex.html\nstyles.css\nnews.json\n');
  write('news.json', '{"status":"draft","title":"fixture only"}');
  assert.match(run().stderr, /Restricted data in JSON/);
  write('news.json', '{"status":"published","image":"assets/unlisted.webp"}');
  assert.match(run().stderr, /Missing allowed dependency/);
});

test('projects only public route slugs from the managed page source', t => {
  const { repo, write, run } = fixture(t);
  write('scripts/public-site-files.txt', '404.html\ncontent-pages.json\nindex.html\nstyles.css\n');
  write('content-pages.json', '{"pages":[{"slug":"index","privateNotes":"fixture-only restricted note"}]}');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(repo, 'out/content-pages.json'))), {
    pages: [{ slug: 'index' }]
  });
});

test('allows newly published album derivatives and excludes draft-only metadata and images', t => {
  const { repo, write, run } = fixture(t);
  const published = 'assets/images/albums/sample/photo-12345678-1234-1234-1234-123456789012-480.webp';
  const draft = published.replace('sample/', 'draft/');
  write('scripts/public-site-files.txt', `404.html\nindex.html\nstyles.css\nparish-albums.json\n${draft}\n`);
  write(published, 'public fixture');
  write(draft, 'draft fixture');
  const album = (status, src) => ({ status, photos: [{ variants: [{ src }] }] });
  write('parish-albums.json', JSON.stringify({ albums: [album('published', published), album('draft', draft)] }));
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(repo, 'out', published)));
  assert.ok(!fs.existsSync(path.join(repo, 'out', draft)));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(repo, 'out/parish-albums.json'), 'utf8')).albums,
    [album('published', published)]);
});

test('publishes only approved managed stories, PDFs and profile derivatives, including newly saved paths', t => {
  const { repo, write, run } = fixture(t);
  const added = 'assets/images/news/new-story.jpg';
  const draft = 'assets/images/news/draft-story.jpg';
  const pdf = 'assets/documents/news/pews-news/pews-news-2026-11-08.pdf';
  const old = 'assets/documents/news/pews-news/pews-news-2026-11-01.pdf';
  const photo = 'assets/images/clergy/uploads/12345678-1234-4234-8234-123456789012-360.jpg';
  const orphan = photo.replace('-360.jpg', '-1600.jpg');
  const profile = 'assets/images/contacts/profiles/photo-12345678-1234-4234-8234-123456789012-400.webp';
  const article = { slug: 'new-story', status: 'published', image: added };
  const edition = { type: 'pews-news', date: '2026-11-08', published: true, pdf };
  write('scripts/public-site-files.txt', [
    '404.html', 'index.html', 'styles.css', 'news-data.json', 'admin/publications-data.json', 'clergy-data.json',
    'admin/contacts-data.json', 'news/removed-story.html', 'news/draft-story.html', draft, old, orphan
  ].join('\n'));
  write('_content/news.json', JSON.stringify({ articles: [article, { slug: 'draft-story', status: 'draft', image: draft }] }));
  write('news-data.json', JSON.stringify({ articles: [article] }));
  write('_content/publications.json', JSON.stringify({ publications: [edition] }));
  write('admin/publications-data.json', JSON.stringify({ publications: [edition, { published: false, pdf: old }] }));
  write('_content/pews-news/2026-11-08.json', '{}');
  write('_content/clergy.json', JSON.stringify({ records: [{ published: true, primaryImage: { src: photo }, archiveImages: [] }] }));
  write('_content/contacts.json', JSON.stringify({ contacts: [{ status: 'published', photo: { variants: [{ src: profile }] } }], pccMembers: [] }));
  write('clergy-data.json', '[]');
  write('admin/contacts-data.json', '{}');
  for (const file of [added, draft, pdf, old, photo, orphan, profile, 'news/new-story.html', 'news/removed-story.html', 'news/draft-story.html', 'pews-news/2026-11-08.html']) {
    write(file, 'fixture');
  }
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  for (const file of [added, pdf, photo, profile, 'news/new-story.html', 'pews-news/2026-11-08.html']) {
    assert.ok(fs.existsSync(path.join(repo, 'out', file)), file);
  }
  for (const file of [draft, old, orphan, 'news/removed-story.html', 'news/draft-story.html']) {
    assert.ok(!fs.existsSync(path.join(repo, 'out', file)), file);
  }
  write('news-data.json', JSON.stringify({ articles: [{ ...article, slug: 'draft-story', image: draft }] }));
  assert.match(run('verify').stderr, /News projection does not match publication approval/);
});

test('preserves only the explicitly approved legacy spaced Magazine download path', t => {
  const { write, run } = fixture(t);
  const pdf = 'assets/documents/news/parish-magazine/MPM Nov 2026 online.pdf';
  const editions = 'assets/documents/news/parish-magazine/';
  const baseList = '404.html\nindex.html\nstyles.css\nparish-magazine.html\npublications-data.json\n';
  write('scripts/public-site-files.txt', baseList);
  write('_content/publications.json', '{"publications":[]}');
  write('publications-data.json', '{"publications":[]}');
  write('_content/parish-magazine.json', JSON.stringify({ editions: [{ pdf }] }));
  write('parish-magazine.html', '<a href="' + pdf.replaceAll(' ', '%20') + '">Download</a>');
  write(pdf, 'test magazine PDF');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).files.some(file => file.path === pdf));

  write('_content/parish-magazine.json', JSON.stringify({ editions: [{ pdf: editions + 'Other file.pdf' }] }));
  assert.match(run('verify').stderr, /Invalid public Magazine PDF path/);
});
