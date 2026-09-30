const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const { pages } = JSON.parse(fs.readFileSync(path.join(root, 'content-pages.json'), 'utf8'));
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const renderItems = items => `<ul>${items.map(item => {
  if (typeof item === 'string') return `<li>${esc(item)}</li>`;
  return `<li>${esc(item.text)}${item.children?.length ? renderItems(item.children) : ''}</li>`;
}).join('')}</ul>`;
const telHref = value => `tel:${String(value || '').replace(/[^\d+]/g, '').replace(/^0/, '+44')}`;
const renderPrivacyContact = details => `<div class="privacy-contact-grid">
  <section class="privacy-contact-card privacy-controller-card" aria-labelledby="privacy-controller-heading">
    <h3 id="privacy-controller-heading">The data controller</h3>
    <p class="privacy-contact-name">${esc(details.controllerName)}</p>
    <p><span>Email</span> <a href="mailto:${esc(details.email)}">${esc(details.email)}</a></p>
    <p><span>Telephone</span> <a href="${esc(telHref(details.phone))}">${esc(details.phone)}</a></p>
    <address>${details.address.map(esc).join('<br>')}</address>
  </section>
  <section class="privacy-contact-card" aria-labelledby="privacy-ico-heading">
    <h3 id="privacy-ico-heading">${esc(details.icoName)}</h3>
    <p>${esc(details.icoSentenceBeforePhone)} <a href="${esc(telHref(details.icoPhone))}">${esc(details.icoPhone)}</a> ${esc(details.icoSentenceBeforeEmail)} <a href="${esc(details.icoEmailUrl)}">${esc(details.icoEmailUrl)}</a> ${esc(details.icoSentenceBeforeAddress)} ${esc(details.icoAddress)}</p>
  </section>
</div>`;
const renderPrivacyFootnotes = footnotes => footnotes?.length ? `<ol class="privacy-footnotes">${footnotes.map(note => `<li id="${esc(note.id)}"><span>${esc(note.text)}</span> <a href="${esc(note.href)}">${esc(note.linkLabel)}</a></li>`).join('')}</ol>` : '';

for (const page of pages) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) throw new Error(`Invalid content page slug: ${page.slug}`);
  const outputFile = path.join(root, `${page.slug}.html`);
  if (fs.existsSync(outputFile)) {
    const existing = fs.readFileSync(outputFile, 'utf8');
    const generated = /<meta\s+name=["']generated-topic-page["']\s+content=["']true["']\s*\/?\s*>/i.test(existing) || /<strong>DEMONSTRATION PAGE · SAMPLE COPY AND IMAGE<\/strong>/.test(existing);
    if (!generated) throw new Error(`Refusing to replace a hand-maintained page: ${page.slug}.html`);
  }
  const isPrivacy = page.layout === 'privacy';
  const backLabel = page.parentLabel || (page.section === 'worship' ? 'Worship' : page.section === 'community' ? 'Our Community' : page.section === 'about' ? 'About our parish' : 'Visit & Learn');
  const breadcrumbLabel = page.parentLabel || (page.section === 'worship' ? 'Worship' : page.section === 'community' ? 'Our Community' : 'Visit & Learn');
  const related = isPrivacy
    ? `<a class="btn btn-outline-green" href="${esc(page.back)}">Back to ${esc(backLabel)}</a>`
    : `${page.href && page.action ? `<a class="btn btn-green" href="${esc(page.href)}">${esc(page.action)} <span aria-hidden="true">→</span></a>` : ''} <a class="btn btn-outline-green" href="${esc(page.back)}">More in ${esc(backLabel)}</a>`;
  const sections = (page.sections || [{ paragraphs: page.paragraphs || [] }]).map(section => {
    const sectionClass = isPrivacy ? `privacy-section${section.variant ? ` privacy-${esc(section.variant)}` : ''}` : 'topic-content-section';
    const footnoteRef = section.footnoteRef ? `<sup class="privacy-footnote-ref"><a href="#privacy-footnote-${esc(section.footnoteRef)}" aria-label="See footnote ${esc(section.footnoteRef)}">${esc(section.footnoteRef)}</a></sup>` : '';
    const paragraphs = (section.paragraphs || []).map(paragraph => `<p>${esc(paragraph)}</p>`).join('\n          ');
    const items = section.items?.length ? renderItems(section.items) : '';
    const contact = isPrivacy && section.variant === 'contact' ? renderPrivacyContact(page.contactDetails) : '';
    return `<section${section.variant === 'contact' ? ' id="privacy-contact-details"' : ''} class="${sectionClass}">${section.title ? `<h2>${esc(section.title)}${footnoteRef}</h2>` : ''}${paragraphs}${items}${contact}</section>`;
  }).join('\n          ');
  const documentHeading = isPrivacy ? `          <div class="privacy-document-heading">
            <p class="privacy-form-title">${esc(page.documentHeading.formTitle)}</p>
            <h2>${esc(page.documentHeading.regulationTitle)}</h2>
            <p class="privacy-notice-title">${esc(page.documentHeading.noticeTitle)}</p>
            <p class="privacy-document-entity">${esc(page.documentHeading.controller)}</p>
          </div>\n` : '';
  const footnotes = isPrivacy ? `          ${renderPrivacyFootnotes(page.footnotes)}\n` : '';
  const privacyStylesheet = isPrivacy ? '  <link rel="stylesheet" href="privacy.css">\n' : '';
  const image = page.image ? `<figure class="topic-image"><img src="${esc(page.image)}" alt="${esc(page.alt || '')}" loading="lazy" decoding="async"><figcaption>${esc(page.imageCaption || 'Illustrative image, not an approved parish photograph.')}</figcaption></figure>` : '';
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
${privacyStylesheet}  <script src="site.js" defer></script>
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <meta name="apple-mobile-web-app-title" content="St Michael &amp; All Angels">
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header" data-site-header></header>
  <main id="main-content" class="section topic-page${isPrivacy ? ' privacy-page' : ''}" tabindex="-1">
    <div class="container topic-container${isPrivacy ? ' privacy-container' : ''}">
      <a class="topic-back" href="${esc(page.back)}">← ${esc(breadcrumbLabel)}</a>
      <div class="topic-grid${page.image ? '' : ' topic-grid-text-only'}">
        <article class="topic-copy${isPrivacy ? ' privacy-copy' : ''}">
          <p class="eyebrow">${esc(page.category)}</p>
          <h1>${esc(page.title)}</h1>
          <p class="topic-lead">${esc(page.summary)}</p>
${documentHeading}          <div class="topic-body${isPrivacy ? ' privacy-body' : ''}">${sections}</div>
${footnotes}          <div class="topic-actions">${related}</div>
        </article>
        ${image}
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

console.log(`Built ${pages.length} topic pages from content-pages.json.`);
