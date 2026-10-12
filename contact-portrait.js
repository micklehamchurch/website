const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
function portrait(record) {
  if (!record.photo) return '';
  if (record.photoFraming) {
    const {zoom,x,y}=record.photoFraming, p=record.photo, legacy=typeof p==='string';
    const sources=legacy ? `src="${esc(p)}"` : `src="${esc(p.variants[0].src)}" srcset="${p.variants.map(v=>esc(v.src)+' '+v.width+'w').join(', ')}" sizes="${88*zoom}px"`;
    return `<span class="directory-portrait-frame"><img ${sources} style="object-fit:${legacy?'contain':'cover'};object-position:${x}% ${y}%;width:${100*zoom}%;height:${100*zoom}%;left:${(1-zoom)*x}%;top:${(1-zoom)*y}%" alt="${esc(record.name)}" width="88" height="132" loading="lazy" decoding="async"></span>`;
  }
  if (typeof record.photo === 'string') return `<img class="directory-portrait" src="${esc(record.photo)}" alt="${esc(record.name)}" width="88" height="132" loading="lazy" decoding="async">`;
  const p=record.photo, v=p.variants[0];
  return `<img class="directory-portrait profile-derivative" src="${esc(v.src)}" srcset="${p.variants.map(v=>esc(v.src)+' '+v.width+'w').join(', ')}" sizes="88px" style="object-position:center ${esc(p.position)}" alt="${esc(record.name)}" width="88" height="132" loading="lazy" decoding="async">`;
}
module.exports = { portrait };
