/* A derived, reusable web-news projection. Editable sources remain the existing story/publication records. */
(function(root){'use strict';
 const filters=['all','pews-news','parish-story'],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const dateLabel=d=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d));
 const asset=s=>typeof s==='string'&&/^assets\/[a-zA-Z0-9/_-]+\.(webp|jpe?g|png)$/.test(s);
 function project({articles=[],publications=[],editions={},media={},publicationArtwork={}},today=new Date().toISOString().slice(0,10)){
  const items=[];
  for(const a of articles.filter(a=>!a.demo&&(a.status||'published')==='published'&&(!a.expires||a.expires>=today))){
   if(!validDate(a.date)||!/^[-a-z0-9]+$/.test(a.slug)||!a.title||typeof a.excerpt!=='string')throw Error('Invalid published story metadata');
   const cover=media[a.slug]?.cover||(a.image&&a.imageAlt?{src:a.image,alt:a.imageAlt}:null);
   if(cover&&(!asset(cover.src)||!cover.alt||(cover.small&&!asset(cover.small))))throw Error('Invalid news thumbnail');
   items.push({id:'story:'+a.slug,kind:'parish-story',title:a.title,date:a.date,summary:a.excerpt,url:'news/'+a.slug+'.html',image:cover,sourceCategory:a.category||''});
  }
  for(const p of publications.filter(p=>p.published&&p.type==='pews-news'&&Object.hasOwn(editions,p.date))){
   if(!validDate(p.date)||!p.title)throw Error('Invalid published edition metadata');
   items.push({id:'pews-news:'+p.date,kind:'pews-news',title:p.title+' — '+dateLabel(p.date),date:p.date,summary:p.description||editions[p.date].subtitle||'',url:'pews-news/'+p.date+'.html',image:publicationArtwork[p.date]||null});
  }
  return {version:1,items:items.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))};
 }
 const select=(feed,type='all')=>feed.items.filter(i=>type==='all'||i.kind===type);
 const paper=(kind='pews-news')=>`<div class="news-paper" aria-hidden="true"><svg viewBox="0 0 80 64" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="14" y="4" width="54" height="56" rx="2"/><path d="M14 18H6v36a6 6 0 0 0 6 6h50M24 16h34M24 25h34M24 35h13v13H24zM44 35h14M44 42h14M44 49h14"/></svg><span>${kind==='pews-news'?'Pews News':'Parish news'}</span><i></i><small>${kind==='pews-news'?'Weekly news, services and events':'News from our parish'}</small></div>`;
 function card(i,featured){
  if(!/^(?:news\/[-a-z0-9]+|pews-news\/\d{4}-\d{2}-\d{2})\.html$/.test(i.url))throw Error('Invalid feed URL');
  let visual=paper(i.kind);if(i.image&&asset(i.image.src)){const m=i.image;visual=`<img src="${esc(m.src)}"${m.small&&m.width?` srcset="${esc(m.small)} 640w, ${esc(m.src)} ${m.width}w" sizes="(max-width:700px) calc(100vw - 40px), (max-width:1100px) ${featured?'50':'45'}vw, ${featured?'600':'360'}px"`:''} alt="${esc(m.alt)}"${m.width&&m.height?` width="${m.width}" height="${m.height}"`:''} ${featured?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;}
  const action=i.kind==='pews-news'?'Read this edition':'Read the story';
  return `<article class="news-item${featured?' news-feature':''}" data-news-kind="${esc(i.kind)}"><a class="news-item-link" href="${esc(i.url)}"><div class="news-item-media${i.image?'':' news-nonphoto'}">${visual}</div><div class="news-item-copy"><p class="news-item-date"><time datetime="${esc(i.date)}">${esc(dateLabel(i.date))}</time></p><h3>${esc(i.title)}</h3>${featured&&i.summary?`<p class="news-item-summary">${esc(i.summary)}</p>`:''}<span class="news-item-action">${action} <span aria-hidden="true">→</span></span></div></a></article>`;
 }
 function render(feed,type='all'){const items=select(feed,filters.includes(type)?type:'all');return `<section class="news-feature-section" aria-labelledby="latest-news-heading"><div class="news-hub-section-heading"><h2 id="latest-news-heading">Latest news</h2><a href="news.html?type=all#news-feed">View all news <span aria-hidden="true">→</span></a></div>${items.length?card(items[0],true):'<p class="news-empty">No published news in this section yet.</p>'}</section>${items.length>1?`<section class="news-more" aria-labelledby="more-news-heading"><h2 id="more-news-heading">Previous news</h2><div class="news-more-grid">${items.slice(1,4).map(i=>card(i,false)).join('')}</div>${items.length>4?`<details class="news-older" id="news-older"><summary>View older news (${items.length-4})</summary><div class="news-more-grid">${items.slice(4).map(i=>card(i,false)).join('')}</div></details>`:''}</section>`:''}`;}
 const api={project,select,render,filters,dateLabel,esc,placeholder:paper};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.churchNewsFeed=api;
})(globalThis);
