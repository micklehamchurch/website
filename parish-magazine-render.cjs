const {esc} = require('./news-feed-model');
const {editions} = require('./_content/parish-magazine.json');

const archive = 'parish-magazine.html';
const latest = editions[0];
const cover = edition => edition.images + '/cover.jpg';
const archiveLink = edition => archive + '#edition-' + edition.id;
const trigger = (edition, label, className) =>
  `<a class="${className}" href="${archiveLink(edition)}" data-magazine-edition="${edition.id}" aria-label="${esc(label + ' · ' + edition.name)}">${esc(label)} <span aria-hidden="true">›</span></a>`;
const download = edition =>
  `<a class="magazine-text-link" href="${esc(edition.pdf)}" download aria-label="Download original PDF · ${esc(edition.name)}">Download original PDF</a>`;
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
<script src="parish-magazine.js?v=1" defer></script>`;
}

function archiveContent() {
  return `<a class="magazine-text-link magazine-back" href="index.html#home-news-heading">← Home</a>
  <h1>Parish Magazine</h1>
  <p class="magazine-intro">Village stories, notices and community news from Mickleham and Westhumble.</p>
  <article class="magazine-feature" id="edition-${latest.id}">
    ${coverLink(latest, 'magazine-feature-cover')}
    <div class="magazine-feature-copy">
      <h2>${esc(latest.name)}</h2><p>Latest edition</p>
      <div class="magazine-actions">${trigger(latest, 'Read Magazine', 'magazine-button')} ${download(latest)}</div>
    </div>
  </article>
  <section id="previous-editions" aria-labelledby="previous-magazines-title">
    <h2 id="previous-magazines-title">Previous editions</h2>
    <div class="magazine-archive-grid">
    ${editions.slice(1).map(edition => `<article class="magazine-archive-card" id="edition-${edition.id}">
      ${coverLink(edition, 'magazine-archive-cover')}
      <div><h3>${esc(edition.name)}</h3><div class="magazine-actions">${trigger(edition, 'Read Magazine', 'magazine-button')} ${download(edition)}</div></div>
    </article>`).join('\n    ')}
    </div>
  </section>
  ${reader()}`;
}

module.exports = {archive, latest, cover, trigger, coverLink, reader, archiveContent};
