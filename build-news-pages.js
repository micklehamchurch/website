const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const outputDirectory = path.join(root, 'news');
const data = JSON.parse(fs.readFileSync(path.join(root, 'news-data.json'), 'utf8'));
const articles = data.articles || [];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

fs.mkdirSync(outputDirectory, { recursive: true });
const expectedFiles = new Set(articles.map(article => `${article.slug}.html`));

for (const article of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw new Error(`Invalid article slug: ${article.slug}`);
  const paragraphs = (article.paragraphs || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n          ');
  const galleryLink = article.galleryLink
    ? `<p class="article-gallery-link"><a class="btn btn-outline-green" href="${escapeHtml(article.galleryLink)}">Explore the photo gallery <span aria-hidden="true">→</span></a></p>`
    : '';
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="../">
  <meta name="generated-news-article" content="true">
  <meta name="description" content="${escapeHtml(article.excerpt)}">
  <title>${escapeHtml(article.title)} | News &amp; Magazine | St Michael &amp; All Angels</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="v1-accessibility.css">
  <script src="site.js" defer></script>
</head>
<body>
  <a class="skip-link" href="news/${escapeHtml(article.slug)}.html#main-content">Skip to main content</a>
  <header class="site-header" data-site-header></header>
  <main id="main-content" class="section article-page" tabindex="-1">
    <div class="container article-container">
      <a class="article-back" href="news.html">← Back to News &amp; Magazine</a>
      <article class="article-content">
        <div class="demo-notice article-demo-notice" role="note"><strong>SAMPLE / DEMO CONTENT — FICTIONAL</strong><p>This article and its date are fictional demonstration content. It is not a real church announcement, event or reflection.</p></div>
        <p class="eyebrow">${escapeHtml(article.category)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="sample-date">${escapeHtml(article.dateLabel)}</p>
        <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="article-copy">${paragraphs}</div>
        ${galleryLink}
        <div class="article-bottom-nav"><a class="btn btn-green" href="news.html">Back to News &amp; Magazine</a></div>
      </article>
    </div>
  </main>
  <footer class="footer" data-site-footer></footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(outputDirectory, `${article.slug}.html`), html.replace(/^[\t ]+$/gm, ''), 'utf8');
}

for (const entry of fs.readdirSync(outputDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html') || expectedFiles.has(entry.name)) continue;
  const filepath = path.join(outputDirectory, entry.name);
  const existing = fs.readFileSync(filepath, 'utf8');
  if (/<meta\s+name=["']generated-news-article["']\s+content=["']true["']\s*\/?\s*>/i.test(existing)) fs.unlinkSync(filepath);
}

console.log(`Built ${articles.length} sample news article pages from news-data.json.`);
