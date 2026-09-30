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
const renderSafeguardingContacts = contacts => `<div class="safeguarding-contact-grid">${contacts.map((contact, index) => `<section class="safeguarding-contact-card" aria-labelledby="safeguarding-contact-${index + 1}">
    <p class="safeguarding-contact-role">${esc(contact.role)}</p>
    <h3 id="safeguarding-contact-${index + 1}">${esc(contact.name)}</h3>
    <p><span aria-hidden="true">✉</span> <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></p>
    <p><span aria-hidden="true">☎</span> <a href="${esc(telHref(contact.phone))}">${esc(contact.phone)}</a></p>
  </section>`).join('')}</div>`;
const renderElectoralDocuments = documents => `<div class="electoral-documents" aria-label="Electoral Roll documents">${documents.map((document, index) => `<article class="electoral-document-card"><span class="electoral-document-icon" aria-hidden="true">${index === 0 ? '▤' : '◈'}</span><div><h3>${esc(document.title)}</h3><p>${esc(document.description)}</p><a class="btn btn-outline-green" href="${esc(document.href)}" target="_blank" rel="noopener">${esc(document.label)} <span aria-hidden="true">↗</span></a></div></article>`).join('')}</div>`;
const renderEcoPhotos = photos => `<div class="eco-photo-gallery">${photos.map(photo => `<figure><img src="${esc(photo.src)}" alt="${esc(photo.alt)}" loading="lazy" decoding="async"><figcaption>${esc(photo.caption)}</figcaption></figure>`).join('')}</div>`;
const renderEcoChurchContent = page => {
  const items = page.initiatives.map((item, index) => `<article class="eco-initiative-card"><span class="eco-card-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></div></article>`).join('');
  const wildlife = page.wildlife.map(item => `<article class="eco-wildlife-card"><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></article>`).join('');
  const trailPhotos = renderEcoPhotos(page.trailPhotos);
  const flowerPhotos = renderEcoPhotos(page.flowers.images);
  const flowers = page.flowers;
  const phone = String(flowers.contact.phone || '').replace(/[^\d+]/g, '');
  return `<div class="eco-content">
    <blockquote class="eco-quote"><p>“${esc(page.quote)}”</p></blockquote>
    <p class="eco-award-context">${esc(page.awardContext)}</p>
    <section class="eco-section" aria-labelledby="eco-journey-heading"><div class="eco-section-heading"><p class="eyebrow">Practical care for creation</p><h2 id="eco-journey-heading">${esc(page.journeyTitle)}</h2><p>${esc(page.journeyIntro)}</p></div><div class="eco-initiative-grid">${items}</div></section>
    <section class="eco-section eco-wildlife-section" aria-labelledby="eco-wildlife-heading"><div class="eco-section-heading"><p class="eyebrow">A living churchyard</p><h2 id="eco-wildlife-heading">${esc(page.wildlifeTitle)}</h2><p>${esc(page.wildlifeIntro)}</p></div><div class="eco-wildlife-grid">${wildlife}</div></section>
    <section class="eco-trail-section" aria-labelledby="eco-trail-heading"><div class="eco-trail-feature"><figure class="eco-map"><img src="${esc(page.trailMap.src)}" alt="${esc(page.trailMap.alt)}" loading="lazy" decoding="async"><figcaption>Churchyard trail route map</figcaption></figure><div class="eco-trail-copy"><p class="eyebrow">Explore the churchyard</p><h2 id="eco-trail-heading">${esc(page.trailTitle)}</h2><p>${esc(page.trailDescription)}</p><a class="btn btn-green" href="${esc(page.trailDocument)}" target="_blank" rel="noopener">View / Download Churchyard Trail (DOCX) <span aria-hidden="true">↓</span></a></div></div>${trailPhotos}</section>
    <section class="eco-flowers-section" aria-labelledby="eco-flowers-heading"><div class="eco-section-heading"><p class="eyebrow">Flowers for worship and special occasions</p><h2 id="eco-flowers-heading">${esc(flowers.title)}</h2><p>${esc(flowers.intro)}</p></div><div class="eco-flowers-grid"><div class="eco-flowers-copy"><ul>${flowers.details.map(detail => `<li>${esc(detail)}</li>`).join('')}</ul><p class="eco-flower-link"><a href="${esc(flowers.website)}" target="_blank" rel="noopener noreferrer">Sustainable Church Flowers <span aria-hidden="true">↗</span></a></p><aside class="eco-contact-card"><h3>Church flowers contact</h3><p>${esc(flowers.contact.name)}</p><p><a href="mailto:${esc(flowers.contact.email)}">${esc(flowers.contact.email)}</a></p><p><a href="tel:${esc(phone)}">${esc(flowers.contact.phone)}</a></p></aside><a class="btn btn-outline-green eco-doc-link" href="${esc(flowers.document)}" target="_blank" rel="noopener">Read our Sustainable Flowers guidance (DOCX) <span aria-hidden="true">↓</span></a></div><div class="eco-flowers-photos">${flowerPhotos}</div></div></section>
    <section class="eco-energy-section" aria-labelledby="eco-energy-heading"><div><p class="eyebrow">Caring for our church buildings</p><h2 id="eco-energy-heading">${esc(page.energyTitle)}</h2></div><p>${esc(page.energyText)}</p></section>
    <section class="eco-involved-section" aria-labelledby="eco-involved-heading"><p class="eyebrow">A shared part of parish life</p><h2 id="eco-involved-heading">${esc(page.involvedTitle)}</h2><p>${esc(page.involvedText)}</p><a class="btn btn-green" href="mailto:${esc(page.involvedEmail)}">Email the churchwardens <span aria-hidden="true">→</span></a></section>
  </div>`;
};

for (const page of pages) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) throw new Error(`Invalid content page slug: ${page.slug}`);
  const outputFile = path.join(root, `${page.slug}.html`);
  if (fs.existsSync(outputFile)) {
    const existing = fs.readFileSync(outputFile, 'utf8');
    const generated = /<meta\s+name=["']generated-topic-page["']\s+content=["']true["']\s*\/?\s*>/i.test(existing) || /<strong>DEMONSTRATION PAGE · SAMPLE COPY AND IMAGE<\/strong>/.test(existing);
    if (!generated) throw new Error(`Refusing to replace a hand-maintained page: ${page.slug}.html`);
  }
  const isPrivacy = page.layout === 'privacy';
  const isSafeguarding = page.layout === 'safeguarding';
  const isElectoralRoll = page.layout === 'electoral-roll';
  const isEcoChurch = page.layout === 'eco-church';
  const backLabel = page.parentLabel || (page.section === 'worship' ? 'Worship' : page.section === 'community' ? 'Our Community' : page.section === 'about' ? 'About our parish' : 'Visit & Learn');
  const breadcrumbLabel = page.parentLabel || (page.section === 'worship' ? 'Worship' : page.section === 'community' ? 'Our Community' : 'Visit & Learn');
  const related = isPrivacy
    ? `<a class="btn btn-outline-green" href="${esc(page.back)}">Back to ${esc(backLabel)}</a>`
    : `${page.href && page.action ? `<a class="btn btn-green" href="${esc(page.href)}">${esc(page.action)} <span aria-hidden="true">→</span></a>` : ''} <a class="btn btn-outline-green" href="${esc(page.back)}">More in ${esc(backLabel)}</a>`;
  const sections = (page.sections || [{ paragraphs: page.paragraphs || [] }]).map(section => {
    const sectionClass = isPrivacy ? `privacy-section${section.variant ? ` privacy-${esc(section.variant)}` : ''}` : isSafeguarding ? `safeguarding-section${section.variant ? ` safeguarding-${esc(section.variant)}` : ''}` : 'topic-content-section';
    const footnoteRef = section.footnoteRef ? `<sup class="privacy-footnote-ref"><a href="#privacy-footnote-${esc(section.footnoteRef)}" aria-label="See footnote ${esc(section.footnoteRef)}">${esc(section.footnoteRef)}</a></sup>` : '';
    const paragraphs = (section.paragraphs || []).map(paragraph => `<p>${esc(paragraph)}</p>`).join('\n          ');
    const items = section.items?.length ? renderItems(section.items) : '';
    const contact = isPrivacy && section.variant === 'contact' ? renderPrivacyContact(page.contactDetails) : '';
    const safeguardingContactCards = isSafeguarding && section.variant === 'contacts' ? renderSafeguardingContacts(page.safeguardingContacts) : '';
    return `<section${section.variant === 'contact' ? ' id="privacy-contact-details"' : ''} class="${sectionClass}">${section.title ? `<h2>${esc(section.title)}${footnoteRef}</h2>` : ''}${paragraphs}${items}${contact}${safeguardingContactCards}</section>`;
  }).join('\n          ');
  const electoralDocuments = isElectoralRoll ? `          <section class="electoral-documents-section" aria-labelledby="electoral-documents-heading"><h2 id="electoral-documents-heading">Application documents</h2><p>These parish documents open as PDFs in your browser. You can save or print them from the PDF viewer.</p>${renderElectoralDocuments(page.documents || [])}</section>\n` : '';
  const documentHeading = isPrivacy ? `          <div class="privacy-document-heading">
            <p class="privacy-form-title">${esc(page.documentHeading.formTitle)}</p>
            <h2>${esc(page.documentHeading.regulationTitle)}</h2>
            <p class="privacy-notice-title">${esc(page.documentHeading.noticeTitle)}</p>
            <p class="privacy-document-entity">${esc(page.documentHeading.controller)}</p>
          </div>\n` : '';
  const footnotes = isPrivacy ? `          ${renderPrivacyFootnotes(page.footnotes)}\n` : '';
  const privacyStylesheet = isPrivacy ? '  <link rel="stylesheet" href="privacy.css">\n' : '';
  const safeguardingStylesheet = isSafeguarding ? '  <link rel="stylesheet" href="safeguarding.css">\n' : '';
  const electoralStylesheet = isElectoralRoll ? '  <link rel="stylesheet" href="electoral-roll.css">\n' : '';
  const ecoStylesheet = isEcoChurch ? '  <link rel="stylesheet" href="eco-church.css">\n' : '';
  const policyEntity = isSafeguarding ? `          <p class="safeguarding-policy-entity">${esc(page.policyEntity)}</p>\n` : '';
  const policyApproval = isSafeguarding ? `          <section class="safeguarding-approval" aria-labelledby="safeguarding-approval-heading"><h2 id="safeguarding-approval-heading">Policy approval and review</h2><p><strong>Signed:</strong> ${esc(page.policyApproval.signed)}</p><p><strong>Name:</strong> ${esc(page.policyApproval.name)}</p><p><strong>Date:</strong> ${esc(page.policyApproval.review)}</p><address>${page.policyApproval.address.map(esc).join('<br>')}</address></section>\n` : '';
  const image = page.image ? `<figure class="topic-image${isEcoChurch ? ' eco-hero-image' : ''}"><img src="${esc(page.image)}" alt="${esc(page.alt || '')}" loading="lazy" decoding="async">${page.imageCaption ? `<figcaption>${esc(page.imageCaption)}</figcaption>` : isEcoChurch ? '' : '<figcaption>Illustrative image, not an approved parish photograph.</figcaption>'}</figure>` : '';
  const pageContent = isEcoChurch ? renderEcoChurchContent(page) : `<div class="topic-body${isPrivacy ? ' privacy-body' : isSafeguarding ? ' safeguarding-body' : ''}">${sections}</div>`;
  const pageStructure = isEcoChurch
    ? `<div class="topic-grid eco-hero-grid">
        <article class="topic-copy eco-hero-copy">
          <p class="eyebrow">${esc(page.category)}</p>
          <h1>${esc(page.title)}</h1>
          <p class="topic-lead">${esc(page.summary)}</p>
        </article>
        ${image}
      </div>
      ${pageContent}
      <div class="topic-actions eco-page-actions">${related}</div>`
    : `<div class="topic-grid${page.image ? '' : ' topic-grid-text-only'}">
        <article class="topic-copy${isPrivacy ? ' privacy-copy' : isSafeguarding ? ' safeguarding-copy' : isElectoralRoll ? ' electoral-roll-copy' : ''}">
          <p class="eyebrow">${esc(page.category)}</p>
          <h1>${esc(page.title)}</h1>
          <p class="topic-lead">${esc(page.summary)}</p>
${policyEntity}${documentHeading}          <div class="topic-body${isPrivacy ? ' privacy-body' : isSafeguarding ? ' safeguarding-body' : ''}">${sections}</div>
${electoralDocuments}${footnotes}${policyApproval}          <div class="topic-actions">${related}</div>
        </article>
        ${image}
      </div>`;
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
${privacyStylesheet}${safeguardingStylesheet}${electoralStylesheet}${ecoStylesheet}  <script src="site.js" defer></script>
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <meta name="apple-mobile-web-app-title" content="St Michael &amp; All Angels">
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header" data-site-header></header>
  <main id="main-content" class="section topic-page${isPrivacy ? ' privacy-page' : isSafeguarding ? ' safeguarding-page' : isElectoralRoll ? ' electoral-roll-page' : isEcoChurch ? ' eco-church-page' : ''}" tabindex="-1">
    <div class="container topic-container${isPrivacy ? ' privacy-container' : isSafeguarding ? ' safeguarding-container' : isElectoralRoll ? ' electoral-roll-container' : ''}">
      <a class="topic-back" href="${esc(page.back)}">← ${esc(breadcrumbLabel)}</a>
      ${pageStructure}
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
