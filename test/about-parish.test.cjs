const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
test('static About source survives the normal content, typography and search builders', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-build-'));
  try {
    for (const file of ['about.html', 'build-content-pages.js', 'build-typography-preview.js', 'build-search-index.js', 'public-script-version.js', 'publications-model.js']) fs.copyFileSync(path.join(root, file), path.join(temp, file));
    fs.writeFileSync(path.join(temp, 'content-pages.json'), '{"pages":[]}');
    const body = html => html.match(/<main[\s\S]*?<\/main>/)[0];
    const before = fs.readFileSync(path.join(temp, 'about.html'), 'utf8');
    for (let i = 0; i < 2; i++) for (const file of ['build-content-pages.js', 'build-typography-preview.js', 'build-search-index.js']) execFileSync(process.execPath, [path.join(temp, file)], { cwd: temp });
    const after = fs.readFileSync(path.join(temp, 'about.html'), 'utf8');
    assert.equal(body(after), body(before));
    assert.equal((body(after).match(/class="parish-about-card"/g) || []).length, 4);
    assert.doesNotMatch(body(after), /assets\/demo|Illustrative|Come and visit|about-explore|about-place/);
    assert.match(after, /<\/main>\s*<footer class="footer" data-site-footer>/);
    assert(JSON.parse(fs.readFileSync(path.join(temp, 'search-index.json'), 'utf8')).some(p => p.url === 'about.html' && p.content.includes('A parish with a place for you')));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
test('About preview tools require explicit opt-in and keep the existing typography workflow', () => {
  const source = fs.readFileSync(path.join(root, 'about-parish.js'), 'utf8');
  for (const [search, expected] of [['', false], ['?design-preview=1', true], ['?design-preview=0', false]]) {
    let actual;
    vm.runInNewContext(source, { URLSearchParams, location: { search }, document: { documentElement: { classList: { toggle(name, enabled) { assert.equal(name, 'about-design-preview'); actual = enabled; } } } } });
    assert.equal(actual, expected);
  }
});
