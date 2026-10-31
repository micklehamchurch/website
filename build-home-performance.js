// Initial public state, not a second source of truth: normal browser fetches still refresh it.
const fs = require('node:fs');
function build(root = __dirname) {
  const path = require('node:path');
  const { transformSync } = require('esbuild');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'home-style-sources.json'), 'utf8'));
  // Same root directory and exact cascade order: no URL rebasing or CSS redesign.
  const css = manifest.sources.map(source => fs.readFileSync(path.join(root, source.split('?')[0]), 'utf8')).join('\n');
  const bundle = transformSync(css, { loader:'css', minify:true, legalComments:'inline' }).code;
  fs.writeFileSync(path.join(root, 'home-critical.css'), bundle);
  const file = path.join(root, 'index.html');
  const seeds = [['home-verses-initial', 'homepage-verses.json'], ['home-service-initial', 'home-next-service-data.json']];
  const scripts = seeds.map(([id, source]) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, source), 'utf8'));
    // Escape HTML parser delimiters; only the already-public projections are included.
    return `<script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  }).join('\n');
  let html = fs.readFileSync(file, 'utf8');
  const version = require('node:crypto').createHash('sha256').update(bundle).digest('hex').slice(0, 12);
  html = html.replace(/home-critical\.css\?v=[^"\s]+/g, `home-critical.css?v=${version}`);
  const block = `<!-- home-initial-state:start -->\n${scripts}\n<!-- home-initial-state:end -->`;
  html = html.includes('<!-- home-initial-state:start -->')
    ? html.replace(/<!-- home-initial-state:start -->[\s\S]*?<!-- home-initial-state:end -->/, () => block)
    : html.replace('</head>', `${block}\n</head>`);
  fs.writeFileSync(file, html);
}
module.exports = { build };
if (require.main === module) build();
