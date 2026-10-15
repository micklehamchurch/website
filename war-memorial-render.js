const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
module.exports = page => `<div class="memorial">
  <section class="memorial-hero" aria-labelledby="memorial-title">
    <a class="memorial-photo" href="${esc(page.heroImage.src)}" aria-label="View the full photograph of Mickleham War Memorial"><img src="${esc(page.heroImage.src)}" width="${page.heroImage.width}" height="${page.heroImage.height}" alt="${esc(page.heroImage.alt)}" fetchpriority="high" decoding="async"></a>
    <div class="memorial-copy">
      <a class="topic-back" href="${esc(page.back)}">← Visit &amp; Learn</a>
      <p class="eyebrow">${esc(page.category)}</p>
      <h1 id="memorial-title">${esc(page.title)}</h1>
      <p class="memorial-lead">${esc(page.summary)}</p>
      <section class="memorial-story" aria-labelledby="memorial-story-heading"><h2 id="memorial-story-heading">${esc(page.sections[0].title)}</h2>${page.sections[0].paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</section>
      <div class="memorial-actions"><a class="btn btn-green" href="${esc(page.href)}">${esc(page.action)} <span aria-hidden="true">→</span></a><a class="btn btn-outline-green" href="${esc(page.secondary.href)}">${esc(page.secondary.label)}</a></div>
    </div>
  </section>
  <section class="memorial-gallery" aria-label="Details of the war memorial">${page.gallery.map(photo => `<figure><a href="${esc(photo.src)}" aria-label="View full photograph: ${esc(photo.alt)}"><img src="${esc(photo.src)}" width="${photo.width}" height="${photo.height}" alt="${esc(photo.alt)}" style="object-position:${esc(photo.position)}" loading="lazy" decoding="async"></a><figcaption>${esc(photo.caption)}</figcaption></figure>`).join('')}</section>
</div>`;
