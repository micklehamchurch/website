const { esc } = require('./news-feed-model');

const icons = {
  flower: '<path d="M12 8C9 2 4 4 5 9c-6 2-3 7 2 7-1 6 5 7 7 2 5 4 9-1 5-5 4-4 0-9-5-5Z"/><circle cx="12" cy="13" r="2.5"/>',
  memorial: '<path d="M3 22h18M5 22l2-5h10l2 5M9 17l1-10h4l1 10M12 2v5M10 4h4"/>',
  paper: '<path d="M5 2h10l4 4v16H5zM15 2v5h4M8 12h8m-8 4h8"/>',
  external: '<path d="M13 4h7v7m0-7-9 9M17 13v7H4V7h7"/>'
};
const icon = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const image = (photo, sizes, hero = false) => `<img src="${esc(photo.src)}" srcset="${esc(photo.small)} 640w, ${esc(photo.src)} ${photo.width}w" sizes="${sizes}" alt="${esc(photo.alt)}" width="${photo.width}" height="${photo.height}" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

function render(article, media) {
  const gallery = media?.groups.flatMap(group => group.photos);
  if (!media?.morning || !media.gathering || !media.poppies || gallery.length !== 4 || article.paragraphs.length !== 7) {
    throw Error('Remembrance article needs its seven paragraphs and approved photo placements');
  }
  const [intro, morning, memorial, tribute, context, village, thanks] = article.paragraphs.map(esc);
  const rowSizes = '(max-width: 740px) 92vw, (max-width: 1600px) 56vw, 900px';
  return `<article class="remembrance">
  <div class="remembrance-hero">${image(media.lead, '(max-width: 1600px) 100vw, 1600px', true)}</div>
  <div class="remembrance-inner">
    <header class="remembrance-heading">
      <p class="remembrance-kicker">Parish News · <time datetime="${esc(article.date)}">8 November 2026</time></p>
      <h1>${esc(article.title)}</h1>
      <p class="remembrance-subtitle">Remembrance Sunday at St Michael &amp; All Angels, Mickleham</p>
    </header>
    <p class="remembrance-intro">${intro}</p>
    <section class="remembrance-row remembrance-morning" aria-labelledby="remembrance-morning">
      <div><h2 id="remembrance-morning">The morning service</h2><p>${morning}</p></div>
      ${image(media.morning, rowSizes)}
    </section>
    <section class="remembrance-row remembrance-act" aria-labelledby="remembrance-act">
      <div><h2 id="remembrance-act">At the war memorial</h2><p>${memorial}</p><p>${tribute}</p></div>
      ${image(media.gathering, rowSizes)}
    </section>
    <div class="remembrance-context">
      <section aria-labelledby="remembrance-why">${icon('flower')}<div><h2 id="remembrance-why">Why We Remember</h2><p>${context}</p></div></section>
      <section aria-labelledby="remembrance-village">${icon('memorial')}<div><h2 id="remembrance-village">Remembering in Mickleham</h2><p>${village}</p></div></section>
      ${image(media.poppies, '(max-width: 550px) 92vw, (max-width: 850px) 50vw, 26vw')}
    </div>
    <section class="remembrance-gallery" aria-labelledby="remembrance-gallery">
      <h2 id="remembrance-gallery">A Moment from the Day</h2>
      <ul>${gallery.map((photo, i) => `<li><a href="${esc(photo.src)}" data-remembrance-photo aria-label="Enlarge photograph: ${esc(photo.alt)}" class="remembrance-gallery-${i + 1}">${image(photo, '(max-width: 760px) 45vw, (max-width: 1600px) 24vw, 380px')}</a></li>`).join('')}</ul>
    </section>
    <section class="remembrance-thanks" aria-labelledby="remembrance-thanks">
      <div class="remembrance-closing">
        <div><h2 id="remembrance-thanks">With Thanks</h2><p>${thanks}</p></div>
        <blockquote>“We will remember them.”</blockquote>
      </div>
      <nav class="remembrance-links" aria-label="Related Remembrance links">
        <a href="pews-news/2026-11-08.html">${icon('paper')} Read Pews News — 8 November 2026</a>
        <a href="war-memorial.html">${icon('memorial')} Our War Memorial</a>
        <a href="https://www.britishlegion.org.uk/">${icon('external')} Royal British Legion</a>
      </nav>
    </section>
  </div>
  <dialog class="remembrance-viewer" aria-labelledby="remembrance-viewer-heading">
    <h2 id="remembrance-viewer-heading" hidden>Enlarged photograph</h2>
    <form method="dialog"><button autofocus type="submit">Close photograph</button></form>
    <div class="remembrance-viewer-image"></div>
  </dialog>
</article>`;
}

module.exports = { render };
