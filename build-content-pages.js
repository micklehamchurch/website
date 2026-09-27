const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const { pages } = JSON.parse(fs.readFileSync(path.join(root, 'content-pages.json'), 'utf8'));
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

for (const page of pages) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) throw new Error(`Invalid content page slug: ${page.slug}`);
  const outputFile = path.join(root, `${page.slug}.html`);
  if (fs.existsSync(outputFile)) {
    const existing = fs.readFileSync(outputFile, 'utf8');
    const generated = /<meta\s+name=["']generated-topic-page["']\s+content=["']true["']\s*\/?\s*>/i.test(existing) || /<strong>DEMONSTRATION PAGE · SAMPLE COPY AND IMAGE<\/strong>/.test(existing);
    if (!generated) throw new Error(`Refusing to replace a hand-maintained page: ${page.slug}.html`);
  }
  const related = `<a class="btn btn-green" href="${esc(page.href)}">${esc(page.action)} <span aria-hidden="true">→</span></a> <a class="btn btn-outline-green" href="${esc(page.back)}">More in ${esc(page.section === 'worship' ? 'Worship' : page.section === 'community' ? 'Our Community' : 'Visit & Learn')}</a>`;
  const paragraphs = page.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('\n          ');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(page.summary)}">
  <meta name="generated-topic-page" content="true">
  <title>${esc(page.title)} | St Michael &amp; All Angels</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="v1-accessibility.css">
  <script src="site.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header" data-site-header></header>
  <main id="main-content" class="section topic-page" tabindex="-1">
    <div class="container topic-container">
      <a class="topic-back" href="${esc(page.back)}">← ${esc(page.section === 'worship' ? 'Worship' : page.section === 'community' ? 'Our Community' : 'Visit & Learn')}</a>
      <div class="topic-grid">
        <article class="topic-copy">
          <div class="demo-notice topic-demo-notice" role="note"><strong>DEMONSTRATION PAGE · SAMPLE COPY AND IMAGE</strong><p>This is an example for the website design. The image is generated illustration, not a photograph of this parish. Replace the sample copy and image with church-approved material before publication.</p></div>
          <p class="eyebrow">${esc(page.category)}</p>
          <h1>${esc(page.title)}</h1>
          <p class="topic-lead">${esc(page.summary)}</p>
          <div class="topic-body">${paragraphs}</div>
          <div class="topic-actions">${related}</div>
        </article>
        <figure class="topic-image">
          <img src="${esc(page.image)}" alt="${esc(page.alt)}" loading="lazy">
          <figcaption>${esc(page.imageCaption)}</figcaption>
        </figure>
      </div>
    </div>
  </main>
  <footer class="footer" data-site-footer></footer>
</body>
</html>
`;
  fs.writeFileSync(outputFile, html.replace(/^[\t ]+$/gm, ''), 'utf8');
}

const expected = new Set(pages.map(page => `${page.slug}.html`));
for (const name of fs.readdirSync(root)) {
  if (expected.has(name) || !name.endsWith('.html')) continue;
  const file = path.join(root, name);
  const html = fs.readFileSync(file, 'utf8');
  if (/<meta\s+name=["']generated-topic-page["']\s+content=["']true["']\s*\/?\s*>/i.test(html)) fs.unlinkSync(file);
}

console.log(`Built ${pages.length} demonstration topic pages from content-pages.json.`);
