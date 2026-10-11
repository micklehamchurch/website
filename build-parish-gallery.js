// Gallery-only generation: the approved homepage is maintained independently.
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('parish-albums.json', 'utf8'));
const albums = data.albums.filter(album => (album.status || 'published') === 'published' && album.photos.length);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const gridSizes = '(max-width: 430px) calc(100vw - 40px), (max-width: 700px) calc((100vw - 54px) / 2), (max-width: 1200px) calc((100vw - 80px) / 3), 360px';
const coverSizes = '(max-width: 600px) calc(100vw - 40px), (max-width: 900px) calc((100vw - 60px) / 2), (max-width: 1200px) calc((100vw - 96px) / 3), 360px';
function image(photo, cover = false) {
 const variants = photo.variants.slice(0, 2);
 const small = variants[0];
 return `<img src="${small.src}" srcset="${variants.map(v => `${v.src} ${v.width}w`).join(', ')}" sizes="${cover ? coverSizes : gridSizes}" width="${small.width}" height="${small.height}" alt="${escape(photo.alt)}" decoding="async" loading="lazy">`;
}
const cards = albums.map(album => {
 const cover = album.photos.find(photo => photo.id === album.cover) || album.photos[0];
 return `<a class="parish-album-card" href="#${album.id}" data-album-card="${album.id}">${image(cover, true)}<div class="parish-album-card-copy"><h2>${escape(album.title)}</h2><p>${escape(album.context)}</p><span class="parish-album-count">${album.photos.length} photographs <span aria-hidden="true">→</span></span></div></a>`;
}).join('\n');
// Inert templates prevent unopened albums from requesting any grid images.
const templates = albums.map(album => `<template data-album-template="${album.id}"><section class="parish-album" id="${album.id}" aria-labelledby="${album.id}-heading"><a class="text-link parish-albums-back" href="#albums">← Back to albums</a><h2 id="${album.id}-heading" tabindex="-1">${escape(album.title)}</h2><p>${escape(album.context)} <span class="parish-album-count">${album.photos.length} photographs</span></p><div class="parish-album-grid">${album.photos.map(photo => `<figure><a data-gallery-photo href="${photo.variants.at(-1).src}" aria-haspopup="dialog">${image(photo)}<span class="parish-sr-only">Open photograph</span></a><figcaption>${escape(photo.caption === undefined ? photo.alt : photo.caption)}</figcaption></figure>`).join('')}</div><a class="text-link parish-albums-back" href="#albums">← Back to albums</a></section></template>`).join('\n');
const markup = `<!-- parish-albums:start -->
<div id="albums" data-album-landing><div class="parish-album-cards">${cards}</div></div>
<div data-album-view hidden></div>
${templates}
<noscript><p>Enable JavaScript to browse the albums and open the photograph viewer.</p></noscript>
<dialog class="parish-lightbox" id="parish-gallery-dialog" aria-labelledby="parish-gallery-dialog-heading"><h2 id="parish-gallery-dialog-heading">Parish photographs</h2><img alt=""><p data-gallery-status aria-live="polite" aria-atomic="true"></p><div class="parish-lightbox-controls"><button type="button" data-previous aria-label="Previous photograph">←</button><button type="button" data-close autofocus>Close</button><button type="button" data-next aria-label="Next photograph">→</button></div></dialog><!-- parish-albums:end -->`;
let gallery = fs.readFileSync('gallery.html', 'utf8');
gallery = gallery.replace(/<!-- parish-albums:start -->[\s\S]*?<!-- parish-albums:end -->/, markup);
gallery = gallery.replace(/\s*<figure class="gallery-single">[\s\S]*?<\/figure>/, '');
gallery = gallery.replace('Explore more about our churches and their history. The separate image above is illustrative.', 'Explore more about our churches and their history.');
gallery = gallery.replace(/href="parish-gallery\.css(?:\?[^"]*)?"/, 'href="parish-gallery.css?v=20261011-albums"').replace(/src="parish-gallery\.js(?:\?[^"]*)?"/, 'src="parish-gallery.js?v=20261011-albums"');
fs.writeFileSync('gallery.html', gallery);
console.log(`Built parish gallery: ${albums.length} albums, ${albums.reduce((n, album) => n + album.photos.length, 0)} photographs.`);
