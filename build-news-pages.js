const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const outputDirectory = path.join(root, 'news');
const data = JSON.parse(fs.readFileSync(path.join(root, '_content', 'news.json'), 'utf8'));
if (!Array.isArray(data.articles)) throw new Error('news-data.json must contain an articles array.');
const slugs = new Set();
for (const article of data.articles) {
  if (typeof article.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw new Error(`Invalid article slug: ${article.slug || '(missing)'}`);
  for (const field of ['slug', 'title', 'category', 'dateLabel', 'excerpt']) {
    if (typeof article[field] !== 'string' || !article[field].trim()) throw new Error(`News article is missing required field ${field}: ${article.slug || '(no slug)'}`);
  }
  if (!Array.isArray(article.paragraphs) || !article.paragraphs.length || article.paragraphs.some(paragraph => typeof paragraph !== 'string' || !paragraph.trim())) throw new Error(`News article needs one or more non-empty paragraphs: ${article.slug}`);
  if (!['published', 'draft'].includes(article.status || 'published')) throw new Error(`Invalid news status for ${article.slug}: ${article.status}`);
  if (article.galleryLink) {
    if (typeof article.galleryLink !== 'string' || /^(?:[a-z]+:|\/|\\)|\.\./i.test(article.galleryLink)) throw new Error(`News gallery link must be a safe site-relative path: ${article.slug}`);
    const linkTarget = path.resolve(root, article.galleryLink);
    if (!linkTarget.startsWith(`${root}${path.sep}`) || !fs.existsSync(linkTarget)) throw new Error(`News gallery link target does not exist: ${article.galleryLink}`);
  }
  if (slugs.has(article.slug)) throw new Error(`Duplicate news article slug: ${article.slug}`);
  slugs.add(article.slug);
}
// Fictional development samples remain in the repository for reference, but
// are never written to the public listing, article pages, or search index.
const articles = data.articles.filter(article => (article.status || 'published') === 'published' && article.demo !== true);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

// The browser consumes this published-only projection. Draft text stays in
// _content/news.json, which is not emitted by GitHub Pages' Jekyll build.
fs.writeFileSync(path.join(root, 'news-data.json'), `${JSON.stringify({ articles }, null, 2)}\n`, 'utf8');
const dashboardSamples = data.articles.filter(article => article.demo === true);
fs.writeFileSync(path.join(root, 'admin', 'news-demo-data.json'), `${JSON.stringify({ articles: dashboardSamples }, null, 2)}\n`, 'utf8');

fs.mkdirSync(outputDirectory, { recursive: true });
const expectedFiles = new Set(articles.map(article => `${article.slug}.html`));

for (const article of articles) {
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
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <meta name="apple-mobile-web-app-title" content="St Michael &amp; All Angels">
</head>
<body>
  <a class="skip-link" href="news/${escapeHtml(article.slug)}.html#main-content">Skip to main content</a>
  <header class="site-header" data-site-header></header>
  <main id="main-content" class="section article-page" tabindex="-1">
    <div class="container article-container">
      <a class="article-back" href="news.html">← Back to News &amp; Magazine</a>
      <article class="article-content">
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

console.log(`Built ${articles.length} published news article pages from _content/news.json.`);
