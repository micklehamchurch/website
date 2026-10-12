const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const page = require('../content-pages.json').pages.find(p => p.slug === 'finding-us');
const html = fs.readFileSync(path.join(root, 'finding-us.html'), 'utf8');
test('Find Us build uses the dedicated layout and self-contained factual content', () => {
  assert(html.includes(require('../find-us-render')(page)));
  assert.doesNotMatch(html, /old parish|previous parish|earlier website|assets\/demo|Illustrative|\b425\b|30 minutes|bike rack/i);
  assert.equal((html.match(/<h1\b/g)||[]).length, 1);
  assert.match(html, /typography-preview.js/);
  for (const token of ['data-site-header','data-site-footer','contact.html','RH5 6DU','RH5 6BG']) assert(html.includes(token));
});
test('Each location has a distinct address, real image and destination-specific directions', () => {
  assert.equal(page.locations.length, 2);
  for (const p of page.locations) {
    assert(fs.existsSync(path.join(root, p.image)));
    assert(p.alt.length > 20);
    assert(html.includes(`id="${p.id}"`));
    const url = new URL(p.directions);
    assert.equal(url.searchParams.get('api'), '1');
    assert(url.searchParams.get('destination').includes(p.address[2].replace('Surrey ','')));
  }
});
test('External links identify new tabs and verified transport providers; local links resolve', () => {
  for (const match of html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    assert.match(match[0], /rel="noopener noreferrer"/);
    assert.match(match[0], /opens in a new tab/);
  }
  for (const match of html.matchAll(/href="([^"#]+\.html)"/g)) assert(fs.existsSync(path.join(root,match[1])));
  assert.match(html, /tfl.gov.uk\/bus\/route\/465\//);
  assert.match(html, /nationalrail.co.uk\/stations\/box-hill-westhumble\//);
  assert.doesNotMatch(html, /<iframe|api_key|maps.googleapis/i);
});
test('Parking and access copy asks for confirmation without promising facilities', () => {
  for (const title of ['Parking','Accessibility']) assert.match(page.travel.find(c=>c.title===title).text, /contact the parish to confirm/i);
  const css = fs.readFileSync(path.join(root,'find-us.css'),'utf8');
  assert.doesNotMatch(css, /filter\s*:|gradient\(|blend-mode/);
  assert.match(css, /:focus-visible/);
});
