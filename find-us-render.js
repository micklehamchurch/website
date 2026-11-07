// Find Us composition follows the approved reference. Facts live in content-pages.json.
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  car: '<path d="m5 8 2-5h10l2 5M3 9h18v9H3zM5 18v3m14-3v3M3 13h18"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/>',
  parking: '<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 18V6h4a4 4 0 0 1 0 8H9"/>',
  bus: '<rect x="4" y="2" width="16" height="18" rx="3"/><path d="M4 12h16M8 20v2m8-2v2M8 5h8"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
  access: '<circle cx="10" cy="3" r="1.5"/><path d="m10 6 1 7h7l3 7M11 9h6M7 10a7 7 0 1 0 9 10"/>',
  train: '<rect x="5" y="2" width="14" height="17" rx="4"/><path d="M5 11h14M8 19l-3 3m11-3 3 3M9 5h6"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
  walk: '<circle cx="14" cy="3" r="2"/><path d="m7 9 5-3 4 5 4 1M12 6l-2 8 5 3 1 5M10 14l-4 8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M11 3H3v18h18v-8"/>'
};
const icon = name => `<svg class="find-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
const external = (href, label, style = 'text-link', context = '', leading = '') => `<a class="${style}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${leading}${esc(label)}${style.includes('btn-green') ? '<span aria-hidden="true">→</span>' : icon('external')}<span class="find-sr-only">${context ? ` — ${esc(context)}` : ''} (opens in a new tab)</span></a>`;
const photo = (place) => `<img src="${esc(place.image)}" ${place.srcset ? `srcset="${esc(place.srcset)}" sizes="(max-width: 700px) calc(100vw - 32px), 46vw"` : ''} width="${place.width}" height="${place.height}" alt="${esc(place.alt)}" loading="lazy" decoding="async">`;
module.exports = page => `<div class="find-us">
  <section class="find-hero" aria-labelledby="find-title">
    <img class="find-hero-photo" src="assets/images/visit/st-michaels-1440.webp" srcset="assets/images/visit/st-michaels-960.webp 960w, assets/images/visit/st-michaels-1440.webp 1440w" sizes="100vw" width="1440" height="1080" alt="St Michael and All Angels, with its clock tower and spire above the churchyard." fetchpriority="high">
    <div class="container find-hero-inner"><a class="find-back" href="visit.html">← Visit &amp; Learn</a><p class="eyebrow">Find Us</p><h1 id="find-title">Find Us</h1><p>Two church buildings in a beautiful setting<br class="find-desktop-break"> in the heart of the Surrey Hills.</p></div>
  </section>
  <div class="container find-content">
    ${page.locations.map(place => `<section class="find-location" id="${esc(place.id)}" tabindex="-1" aria-labelledby="${esc(place.id)}-title"><div class="find-location-main"><div class="find-location-copy"><h2 id="${esc(place.id)}-title">${esc(place.title)}</h2><div class="find-address">${icon('pin')}<address>${esc(place.address.slice(0,-1).join(', '))},<br>${esc(place.address.at(-1))}</address></div><p>${esc(place.description)}</p><div class="find-actions">${external(place.directions,'Get directions','btn btn-green',place.title,icon('pin'))}${external(place.map,'View on Google Maps','btn btn-outline-green',place.title)}</div></div><figure>${photo(place)}</figure></div><div class="find-card-grid">${place.cards.map(card=>`<article class="find-card">${icon(card.icon)}<div><h3>${esc(card.title)}</h3><p>${esc(card.text)}</p></div></article>`).join('')}</div></section>`).join('')}
    <div class="find-bottom">
      <section class="find-map-panel" aria-labelledby="map-title"><h2 id="map-title">Map and nearby locations</h2><p>Find the church, chapel and railway station.<br>Load the map to explore the surrounding area.</p><div class="find-map-frame" data-find-map><div class="find-map-choice"><div class="find-map-destinations">${icon('pin')}<span>Mickleham church</span>${icon('pin')}<span>Westhumble Chapel</span>${icon('train')}<span>Box Hill &amp; Westhumble station</span></div><button class="btn btn-green" type="button" data-load-find-map>Load interactive map</button><p>Loading the map connects to OpenStreetMap.</p></div></div><nav class="find-map-links" aria-label="Open local maps">${page.locations.map(place=>external(place.map,place.shortName)).join('')}${external(page.stationMap,'Railway station')}</nav></section>
      <div class="find-side-panels">
        <section class="find-transport-panel" aria-labelledby="transport-title"><h2 id="transport-title">Travelling by public transport</h2><div class="find-transport-item">${icon('train')}<div><p>Box Hill &amp; Westhumble station is on Westhumble Street. Plan your onward journey to the church or chapel.</p>${external(page.railUrl,'National Rail station & journeys')}</div></div><div class="find-transport-item">${icon('bus')}<div><p>The 465 serves Mickleham Church and Westhumble Street, linking Kingston, Surbiton, Leatherhead and Dorking.</p>${external(page.busUrl,'465 route & arrivals — TfL')}</div></div></section>
        <section class="find-help-panel" aria-labelledby="help-title">${icon('help')}<div><h2 id="help-title">Need help finding us?</h2><p>For directions, parking, accessibility or arrival questions, please contact the parish. We’ll be happy to help.</p><a class="btn btn-green" href="contact.html">Contact us <span aria-hidden="true">→</span></a></div></section>
      </div>
    </div>
  </div>
</div>`;
