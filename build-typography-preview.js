// Version shared public scripts and refresh the Home bundle after generation.
const fs = require('node:fs');
const path = require('node:path');
const { versionSiteScript } = require('./public-script-version');
const root = __dirname;
// Central post-build hook covers handwritten and generated pages, including news.
for (const directory of [root, path.join(root, 'news'), path.join(root, 'pews-news')]) {
  if (!fs.existsSync(directory)) continue;
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.html')) continue;
    if (process.argv.length>2&&!process.argv.slice(2).includes(path.relative(root,path.join(directory,name)).replace(/\\/g,'/'))) continue;
    const filename = path.join(directory, name);
    let html = fs.readFileSync(filename, 'utf8');
    if (!html.includes('data-site-footer')) continue;
    // One central, idempotent version hook for every public shared script.
    // Other parameters (including the existing hero version) are preserved.
    const page = path.relative(root, filename).split(path.sep).join('/');
    html = html.replace(/src="([^"]*site\.js(?:\?[^"]*)?)"/g, (_match, url) =>
      `src="${versionSiteScript(url, page)}"`);
    html = html.replace('homepage-verses.js?v=optional-translation-1', 'homepage-verses.js?v=optional-translation-2');
    fs.writeFileSync(filename, html);
  }
}

// Keep Home initial state aligned with the public projections after every normal build.
if ((process.argv.length === 2 || process.argv.slice(2).includes('index.html')) && fs.existsSync(path.join(root, 'home-style-sources.json'))) require('./build-home-performance').build();
