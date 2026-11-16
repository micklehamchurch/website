const {esc} = require('./news-feed-model');
const {editions, olderArchive = []} = require('./_content/parish-magazine.json');
const {icon, newsNavigation} = require('./news-navigation.cjs');

const archive = 'parish-magazine.html';
const latest = editions[0];
const cover = edition => edition.images + '/cover.jpg';
const archiveLink = edition => archive + '#edition-' + edition.id;
const trigger = (edition, label, className) =>
  `<a class="${className}" href="${archiveLink(edition)}" data-magazine-edition="${edition.id}" aria-label="${esc(label + ' · ' + edition.name)}">${esc(label)} <span aria-hidden="true">›</span></a>`;
const coverLink = (edition, className) =>
  `<a class="${className}" href="${archiveLink(edition)}" data-magazine-edition="${edition.id}" aria-label="Read ${esc(edition.name)}"><img src="${cover(edition)}" width="382" height="540" loading="lazy" decoding="async" alt=""></a>`;

function reader() {
  const data = JSON.stringify(editions).replace(/</g, '\\u003c');
  return `<dialog id="magazine-reader" aria-labelledby="magazine-reader-title">
  <div class="magazine-viewer">
    <div class="magazine-reader-bar">
      <h2 id="magazine-reader-title">Parish Magazine</h2>
      <label class="magazine-sr-only" for="magazine-edition">Edition</label><select id="magazine-edition"></select>
      <button type="button" id="magazine-close" aria-label="Close magazine reader">Close ×</button>
    </div>
    <div class="magazine-toolbar">
      <div class="magazine-controls">
        <label class="magazine-sr-only" for="magazine-fit">Page fit</label>
        <select id="magazine-fit"><option value="height">Fit to Height</option><option value="width">Fit to Width</option></select>
        <button type="button" id="magazine-minus" aria-label="Zoom out">−</button>
        <button type="button" id="magazine-reset" aria-label="100% zoom · Reset zoom">100%</button>
        <button type="button" id="magazine-plus" aria-label="Zoom in">+</button>
      </div>
      <div class="magazine-controls">
        <button type="button" id="magazine-full" aria-label="Fullscreen" aria-pressed="false">⛶ <span>Fullscreen</span></button>
        <a id="magazine-download" aria-label="Download original PDF" download>↓ <span>PDF</span></a>
      </div>
    </div>
    <div id="magazine-stage" class="magazine-stage" tabindex="0" role="region" aria-label="Magazine page. Use left and right arrows to turn pages.">
      <div class="magazine-page" id="magazine-reader-page" hidden><img id="magazine-sheet" draggable="false" alt=""></div>
      <p id="magazine-image-error" hidden>This page could not load. You can still download the original PDF.</p>
    </div>
    <div class="magazine-paging">
      <button type="button" id="magazine-prev" aria-label="Previous page">← <span>Previous</span></button>
      <div class="magazine-jump"><label class="magazine-sr-only" for="magazine-page">Reader page</label><select id="magazine-page"></select><span id="magazine-total"></span><span id="magazine-announce" class="magazine-sr-only" aria-live="polite"></span></div>
      <button type="button" id="magazine-next" aria-label="Next page"><span>Next</span> →</button>
    </div>
  </div>
  <script type="application/json" id="magazine-editions-data">${data}</script>
</dialog>
<script src="parish-magazine.js?v=2" defer></script>`;
}

function archiveContent() {
  const currentYear = Number(latest.id.slice(0, 4));
  const recent = editions.slice(0, 4);
  const older = editions.slice(4).filter(edition => Number(edition.id.slice(0, 4)) >= currentYear - 2);
  const archived = olderArchive.filter(group => group.year >= currentYear - 2 && group.year < currentYear);
  const years = archived.map(group => group.year);
  const yearLabel = years.length > 1 ? `${Math.max(...years)} – ${Math.min(...years)}` : String(years[0] || '');
  const card = edition => `<article class="magazine-edition-card" id="edition-${edition.id}">
      ${coverLink(edition, 'magazine-edition-cover')}
      <h3>${esc(edition.name)}</h3>
      <a class="magazine-button" href="${archiveLink(edition)}" data-magazine-edition="${edition.id}" aria-label="Read Online · ${esc(edition.name)}">${icon('book')} Read Online</a>
      <a class="magazine-button magazine-edition-download" href="${esc(edition.pdf)}" download aria-label="Download PDF · ${esc(edition.name)}">${icon('download')} Download PDF</a>
    </article>`;
  return `<section class="magazine-archive-hero" aria-labelledby="magazine-title">
    <div class="magazine-hero-art" aria-hidden="true">
      <div class="magazine-hero-book"><img class="magazine-hero-cover" src="assets/images/parish-magazine/2026-11/cover.jpg" width="382" height="540" alt="" fetchpriority="high"></div>
    </div>
    <div class="magazine-hero-copy"><p class="eyebrow">Parish Magazine</p>
      <h1 id="magazine-title">Parish Magazine</h1>
      <p>Our monthly parish magazine with news, reflections, photographs and stories from church and community life.</p>
    </div>
  </section>
  <div class="magazine-browse-layout">
    ${newsNavigation('parish-magazine')}
    <div class="magazine-browse-content">
      <section id="previous-editions" aria-labelledby="magazine-browse-title">
        <div class="magazine-browse-heading">
          <h2 id="magazine-browse-title">Browse the Parish Magazine</h2>
          <a href="#about-the-magazine">${icon('info')} About the Magazine</a>
        </div>
        <div class="magazine-edition-grid">${recent.map(card).join('\n')}</div>
      </section>
      ${older.length || archived.length ? `<details class="magazine-older">
        <summary>View older editions${yearLabel ? ' (' + yearLabel + ')' : ''}</summary>
${older.length ? `<div class="magazine-edition-grid">${older.map(card).join('\n')}</div>` : ''}
        <div class="magazine-older-grid">${archived.map(group => `<section><h3>${group.year}</h3><ul>${group.editions.map(edition =>
          `<li><a href="${esc(edition.pdf)}">${esc(edition.name)} (PDF)</a></li>`).join('')}</ul></section>`).join('')}</div>
      </details>` : ''}
      <section class="magazine-about" id="about-the-magazine" aria-labelledby="magazine-about-title">
        <h2 id="magazine-about-title">About the Magazine</h2>
        <p>Mickleham Parish Magazine is the community magazine for Mickleham and Westhumble. It brings together parish news, village notices, reflections and stories. To contribute, contact the editor at <a href="mailto:editor@micklehammag.co.uk">editor@micklehammag.co.uk</a>.</p>
      </section>
    </div>
  </div>
  ${reader()}`;
}

module.exports = {archive, latest, cover, trigger, coverLink, reader, archiveContent};
