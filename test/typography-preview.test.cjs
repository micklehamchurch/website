const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Modern Classic uses the approved stacks for headings, body and controls', () => {
  const css = read('styles.css');
  assert.match(css, /--serif: 'Lora', Georgia, serif/);
  assert.match(css, /--sans: 'Inter', Arial, sans-serif/);
  assert.match(css, /html:root :is\(h1, h2, h3\) \{ font-family: var\(--serif\)/);
  assert.match(css, /html:root :is\(button, input, select, textarea\) \{ font-family: var\(--sans\)/);
  assert.match(read('bible-physical.css'), /\.bible-page-text,\.bible-page-measure\{font-family:var\(--serif\)/);
});

test('Every styled site page and template loads the approved font weights without the preview script', () => {
  for (const dir of ['.', 'news', 'pews-news', 'admin', '_templates']) {
    for (const name of fs.readdirSync(path.join(root, dir)).filter(file => file.endsWith('.html'))) {
      const file = path.join(dir, name);
      const html = read(file);
      assert.doesNotMatch(html, /typography-preview\.js|data-typography-option|family=Manrope/, file);
      if (!/href="(?:\.\.\/)?(?:styles|home-critical)\.css/.test(html)) continue;
      assert.match(html, /family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap/, file);
    }
  }
});

test('Shared footer has no preview controls or preference handler', () => {
  assert.doesNotMatch(read('site.js'), /typography-preview|data-typography-option|Preview typography|Temporary design preview/);
  assert.doesNotMatch(read('build-typography-preview.js'), /typography-preview\.js|data-typography/);
  assert.equal(fs.existsSync(path.join(root, 'typography-preview.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'typography-preview.css')), false);
});
