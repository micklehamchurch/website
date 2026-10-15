const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const page = JSON.parse(fs.readFileSync(path.join(root, 'content-pages.json'), 'utf8')).pages.find(p => p.slug === 'war-memorial');

test('memorial survives an isolated clean rebuild and escapes content', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'memorial-build-'));
  try {
    for (const name of ['build-content-pages.js', 'war-memorial-render.js']) fs.copyFileSync(path.join(root, name), path.join(temp, name));
    fs.writeFileSync(path.join(temp, 'content-pages.json'), JSON.stringify({ pages: [page] }));
    fs.writeFileSync(path.join(temp, 'unrelated.html'), '<p>Preserved page</p>');
    const build = () => execFileSync(process.execPath, [path.join(temp, 'build-content-pages.js')], { cwd: temp });
    build();
    const first = fs.readFileSync(path.join(temp, 'war-memorial.html'), 'utf8');
    build();
    assert.equal(fs.readFileSync(path.join(temp, 'war-memorial.html'), 'utf8'), first);
    assert.equal(fs.readFileSync(path.join(temp, 'unrelated.html'), 'utf8'), '<p>Preserved page</p>');
    assert.match(first, /war-memorial.css/);
    assert.match(first, /A lasting tribute/);
    assert.match(first, /First World War/);
    assert.match(first, /Second World War/);
    assert.match(page.gallery[2].caption, /1915–1965/);
    assert.doesNotMatch(page.gallery[2].caption, /Second World War|1939/);
    assert.doesNotMatch(first, /old parish website|earlier parish website|illustrative/i);
    assert.equal((first.match(/loading="lazy"/g) || []).length, 3);
    assert.match(first, /href="our-history.html"/);
    assert.match(first, /href="churchyard.html"/);
    const malicious = structuredClone(page);
    malicious.sections[0].paragraphs = ['<script>alert("unsafe")</script>'];
    const rendered = require('../war-memorial-render')(malicious);
    assert.doesNotMatch(rendered, /<script>/);
    assert.match(rendered, /&lt;script&gt;/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
