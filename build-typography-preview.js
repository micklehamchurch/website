// TEMPORARY TYPOGRAPHY PREVIEW — public-only head hook; remove after decision.
const fs = require('node:fs');
const path = require('node:path');
const { versionPublicScript } = require('./public-script-version');
const root = __dirname;
// Central post-build hook covers handwritten and generated pages, including news.
for (const directory of [root, path.join(root, 'news'), path.join(root, 'pews-news')]) {
  if (!fs.existsSync(directory)) continue;
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.html')) continue;
    const filename = path.join(directory, name);
    let html = fs.readFileSync(filename, 'utf8');
    if (!html.includes('data-site-footer')) continue;
    // One central, idempotent version hook for every public shared script.
    // Other parameters (including the existing hero version) are preserved.
    html = html.replace(/src="([^"]*site\.js(?:\?[^"]*)?)"/g, (match, url) =>
      `src="${versionPublicScript(url, { typography: '20261007-v1', header: '20261027-photos-1', gallery: '20261009-v1', footer: '20261027-layout-1', feedback: '20261019-public-wording-1', ...(directory===root&&name==='index.html'?{}:{ headerPhoto: (directory===path.join(root,'pews-news')||name==='pews-news.html')?'20261024-pews-1':name==='news.html'?'20261024-newshub-1':'20261024-4' }) })}"`);
    html = html.replace('homepage-verses.js?v=optional-translation-1', 'homepage-verses.js?v=optional-translation-2');
    if (html.includes('typography-preview.js')) {
      fs.writeFileSync(filename, html);
      continue;
    }
    const siteScript = html.match(/<script\s+src="([^"]*?)site\.js(?:\?[^"]*)?"/);
    if (!siteScript) throw new Error(`Public footer missing shared script: ${name}`);
    const hook = `\n  <script src="${siteScript[1]}typography-preview.js"></script>`;
    html = html.replace('</title>', '</title>' + hook);
    fs.writeFileSync(filename, html);
  }
}
