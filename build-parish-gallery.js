const fs = require('node:fs');
const { albums } = JSON.parse(fs.readFileSync('parish-albums.json', 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function image(photo, extra = '') {
  const medium = photo.variants[1];
  return `<img src="${medium.src}" srcset="${photo.variants.map(v => `${v.src} ${v.width}w`).join(', ')}" sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1200px) 45vw, 560px" width="${medium.width}" height="${medium.height}" alt="${escape(photo.alt)}" decoding="async" ${extra}>`;
}
const album = albums[0];
const featured = album.photos.filter(photo => photo.featured);
const carousel = `<div data-parish-carousel role="region" aria-roledescription="carousel" aria-label="${escape(album.title)} photographs"><div class="parish-carousel-stage"><div class="parish-carousel-images">${featured.map((photo, i) => image(photo, `data-slide loading="${i ? 'lazy' : 'eager'}"${i ? ' hidden' : ''}`)).join('')}</div><button type="button" data-previous aria-label="Previous photograph">←</button><button type="button" data-next aria-label="Next photograph">→</button><div class="parish-carousel-controls"><div class="parish-carousel-dots">${featured.map((photo, i) => `<button type="button" data-position aria-label="Show photograph ${i + 1}: ${escape(photo.alt)}" aria-pressed="${!i}"></button>`).join('')}</div></div></div><p class="parish-sr-only" data-status aria-live="polite" aria-atomic="true">Photograph 1 of ${featured.length}</p></div>`;
const section = `<!-- parish-life:start -->
<section class="section parish-life" aria-labelledby="parish-life-heading"><div class="container"><div class="parish-life-heading"><h2 id="parish-life-heading">Life at St Michael’s</h2><p>Faith, friendship and community throughout the year</p></div><div class="parish-life-grid"><div class="parish-life-column"><h3>From our parish</h3><div class="parish-life-context"><h4>${escape(album.title)}</h4><p>${escape(album.context)}</p></div>${carousel}<a class="text-link" href="gallery.html#${album.id}">View all photos <span aria-hidden="true">→</span></a></div><div class="parish-life-column"><h3>Watch &amp; listen</h3><div class="parish-life-context"><h4>Sunday Services</h4><p>From our church’s existing YouTube playlist</p></div><div class="parish-life-video"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=PLB3x60CMpqckqRCWtb5t-0MWZMImPM_Wb&amp;index=0" title="St Michael and All Angels Sunday Services playlist" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="parish-life-video-copy">Services, reflections and moments from parish life.</p><a class="text-link" href="sunday-services.html">Visit the Sunday Services page <span aria-hidden="true">→</span></a></div></div></div></section>
<!-- parish-life:end -->`;
let home = fs.readFileSync('index.html', 'utf8');
if (home.includes('<!-- parish-life:start -->')) home = home.replace(/<!-- parish-life:start -->[\s\S]*?<!-- parish-life:end -->/, section);
else home = home.replace('    <section class="section media-feature"', `${section}\n\n    <section class="section media-feature"`);
function assets(html, version = '20261009-refinement') {
  if (!/href="parish-gallery\.css(?:\?[^"]*)?"/.test(html)) html = html.replace('</head>', '  <link rel="stylesheet" href="parish-gallery.css">\n  <script src="parish-gallery.js" defer></script>\n</head>');
  html = html.replace(/href="parish-gallery\.css(?:\?[^"]*)?"/, `href="parish-gallery.css?v=${version}"`);
  return html;
}
fs.writeFileSync('index.html', assets(home, '20261009-bottom-controls-v1'));
let gallery = fs.readFileSync('gallery.html', 'utf8');
const markup = `<!-- parish-albums:start -->${albums.map(album => `<section class="parish-album" id="${album.id}" aria-labelledby="${album.id}-heading"><h2 id="${album.id}-heading">${escape(album.title)}</h2><p>${escape(album.context)}</p><div class="parish-album-grid">${album.photos.map(photo => `<figure><a data-gallery-photo href="${photo.variants[2].src}" aria-haspopup="dialog">${image(photo, 'loading="lazy"')}<span class="parish-sr-only">Open photograph</span></a><figcaption>${escape(photo.alt)}</figcaption></figure>`).join('')}</div></section>`).join('')}
<dialog class="parish-lightbox" id="parish-gallery-dialog" aria-labelledby="parish-gallery-dialog-heading"><h2 id="parish-gallery-dialog-heading">Parish photographs</h2><img alt=""><p data-gallery-status aria-live="polite" aria-atomic="true"></p><div class="parish-lightbox-controls"><button type="button" data-previous aria-label="Previous photograph">←</button><button type="button" data-close autofocus>Close</button><button type="button" data-next aria-label="Next photograph">→</button></div></dialog><!-- parish-albums:end -->`;
if (gallery.includes('<!-- parish-albums:start -->')) gallery = gallery.replace(/<!-- parish-albums:start -->[\s\S]*?<!-- parish-albums:end -->/, markup);
else gallery = gallery.replace('      <figure class="gallery-single">', `${markup}\n      <figure class="gallery-single">`);
// Retain the existing church links and illustrative image while making the introduction accurate.
gallery = gallery.replace('Photographs from St Michael and All Angels and Westhumble Chapel will be shared here.', 'Worship, friendship and community in photographs from our parish.').replace('Photographs approved by the parish will appear here. The image above is illustrative; in the meantime, read about our churches and their history.', 'Explore more about our churches and their history. The separate image above is illustrative.');
fs.writeFileSync('gallery.html', assets(gallery));
console.log(`Built parish gallery: ${albums.length} album, ${album.photos.length} photographs, ${featured.length} featured.`);
