// TEMPORARY TYPOGRAPHY PREVIEW — public-only head hook; remove after decision.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
// Central post-build hook covers handwritten and generated pages, including news.
for (const directory of [root, path.join(root, 'news')]) {
  if (!fs.existsSync(directory)) continue;
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.html')) continue;
    const filename = path.join(directory, name);
    let html = fs.readFileSync(filename, 'utf8');
    if (!html.includes('data-site-footer') || html.includes('typography-preview.js')) continue;
    const siteScript = html.match(/<script\s+src="([^"]*?)site\.js(?:\?[^"]*)?"/);
    if (!siteScript) throw new Error(`Public footer missing shared script: ${name}`);
    const hook = `\n  <script src="${siteScript[1]}typography-preview.js"></script>`;
    html = html.replace('</title>', '</title>' + hook);
    fs.writeFileSync(filename, html);
  }
}
