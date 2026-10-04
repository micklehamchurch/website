const fs = require('node:fs');
const path = require('node:path');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function published(articles, today = new Date().toISOString().slice(0, 10)) {
  return articles.filter(a => !a.demo && (a.status || 'published') === 'published' && (!a.expires || a.expires >= today)).slice().sort((a,b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
function validateMedia(media, root) {
  const image = photo => {
    if (!photo || typeof photo.alt !== 'string' || !photo.alt.trim() || !Number.isInteger(photo.width) || photo.width < 1 || !Number.isInteger(photo.height) || photo.height < 1) throw Error('Invalid story photograph');
    for (const asset of [photo.src, photo.small]) if (typeof asset !== 'string' || !/^assets\/images\/[a-z0-9/_-]+\.(webp|jpg|jpeg|png)$/.test(asset) || !fs.existsSync(path.join(root,asset))) throw Error('Invalid story photo asset');
  };
  for (const [slug, entry] of Object.entries(media)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('Invalid media slug');
    image(entry.cover); image(entry.lead);
    if (!Array.isArray(entry.groups)) throw Error('Invalid story groups');
    for (const group of entry.groups) {
      if (!Number.isInteger(group.after) || group.after < 0 || !Array.isArray(group.photos) || !group.photos.length || group.photos.length > 2) throw Error('Invalid story group');
      group.photos.forEach(image);
    }
  }
}
function photo(p, lead = false) {
  return `<img src="${escape(p.src)}" srcset="${escape(p.small)} 640w, ${escape(p.src)} 1280w" sizes="(max-width: 700px) calc(100vw - 40px), 1100px" alt="${escape(p.alt)}" width="${p.width}" height="${p.height}" ${lead ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
function body(article, media) {
  return article.paragraphs.map((p,i) => `<div class="story-prose"><p>${escape(p)}</p></div>` + (media?.groups || []).filter(g => g.after === i).map(g => `<div class="story-photo-group${g.photos.length === 2 ? ' story-photo-pair' : ''}">${g.photos.map(p => `<figure>${photo(p)}</figure>`).join('')}</div>`).join('')).join('\n');
}
function teaser(article, media) {
  const cover = media?.cover;
  return `<article class="story-teaser">${cover ? `<a class="story-cover" href="news/${escape(article.slug)}.html" tabindex="-1" aria-hidden="true">${photo(cover)}</a>` : article.image ? `<img src="${escape(article.image)}" alt="${escape(article.imageAlt || '')}" loading="lazy">` : ''}<div class="story-teaser-copy"><p class="eyebrow">${escape(article.category)} · ${escape(article.dateLabel)}</p><h2><a href="news/${escape(article.slug)}.html">${escape(article.title)}</a></h2><p>${escape(article.excerpt)}</p><a class="text-link" href="news/${escape(article.slug)}.html">Read the story <span aria-hidden="true">→</span></a></div></article>`;
}
function buildJournal(articles, media, root) {
  const live = published(articles);
  const template = fs.readFileSync(path.join(root,'news.html'),'utf8');
  const main = `<main id="main-content" class="story-journal section" tabindex="-1"><div class="container"><p class="eyebrow">Life in our parish</p><h1>News &amp; Stories</h1><p class="story-journal-intro">Services, celebrations and moments of community at St Michael &amp; All Angels.</p><div class="story-journal-list">${live.map(a => teaser(a,media[a.slug])).join('') || '<p>Our parish stories will appear here as they are published.</p>'}</div><p><a class="text-link" href="news.html">Pews News &amp; Parish Magazine →</a></p></div></main>`;
  const html = template.replace(/<main[\s\S]*?<\/main>/,main).replace(/  <script src="(?:publications-model|publications|news)\.js" defer><\/script>\r?\n/g,'').replace('News &amp; Magazine |','News &amp; Stories |').replace('<link rel="stylesheet" href="news-magazine.css">','<link rel="stylesheet" href="news-stories.css">');
  fs.writeFileSync(path.join(root,'news-stories.html'),html);
  const homePath = path.join(root,'index.html');
  const home = fs.readFileSync(homePath,'utf8');
  const latest = `<section class="section latest-story" aria-labelledby="latest-story-heading"><div class="container"><div class="section-heading split"><h2 id="latest-story-heading">Latest from St Michael’s</h2><a class="text-link" href="news-stories.html">More news &amp; stories →</a></div>${live[0] ? teaser(live[0],media[live[0].slug]) : '<p>Parish stories will appear here as they are published.</p>'}</div></section>`;
  fs.writeFileSync(homePath,home.replace(/<!-- latest-story:start -->[\s\S]*?<!-- latest-story:end -->/,`<!-- latest-story:start -->\n${latest}\n    <!-- latest-story:end -->`));
}
module.exports = {published,validateMedia,photo,body,teaser,buildJournal};
