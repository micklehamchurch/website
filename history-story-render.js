'use strict';
// Shared long-form History presentation. Content stays in _content/history.json.
function validateStory(e, sources) {
  if (!e.story || e.status === 'draft') return;
  if (e.status !== 'published' || !e.image || !e.story.sections?.length || !e.transcription) throw Error('Incomplete published History story');
  const known = new Set(sources.map(s => s.id)), ids = new Set();
  for (const s of sources) if (s.url && !/^https:\/\/[^\s<>"']+$/.test(s.url)) throw Error('Unsafe source URL');
  for (const section of e.story.sections) {
    if (!/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id) || !section.title || !section.paragraphs?.length) throw Error('Invalid story section');
    ids.add(section.id);
    for (const p of section.paragraphs) if (!p.text || !p.sources?.length || !p.sources.every(id => known.has(id) && e.sourceRefs.includes(id))) throw Error('Story paragraph requires known evidence');
  }
  for (const r of e.relatedPeople || []) if (r.evidenceVerified && (!r.label || !r.relationship || !r.sourceRefs?.length || !r.sourceRefs.every(id => known.has(id) && e.sourceRefs.includes(id)))) throw Error('Related person requires evidence');
  for (const t of e.story.timeline || []) if (!known.has(t[2]) || !e.sourceRefs.includes(t[2])) throw Error('Timeline requires evidence');
}
function renderStory(data, e, clergy, {esc, photo, entryURL}) {
  const s=e.story, refs=e.sourceRefs.map(id=>data.sources.find(r=>r.id===id));
  const cite=ids=>` <span class="history-citations">${ids.map(id=>{const n=e.sourceRefs.indexOf(id)+1;return `<a href="#source-${esc(id)}" aria-label="Source ${n}: ${esc(refs[n-1].title)}">[${n}]</a>`;}).join(' ')}</span>`;
  const photograph=(hero=false)=>{const markup=photo(e.image,true).replace('loading="lazy"',hero?'loading="eager" fetchpriority="high"':'loading="lazy"');return hero?markup.replace(/ sizes="[^"]*"/,' sizes="(max-width:760px) calc(100vw - 94px), (max-width:1000px) 36vw, 430px"'):markup;};
  const collection=data.collections.find(c=>c.id===e.primaryCollection);
  const relatedPeople=(e.relatedPeople||[]).filter(r=>r.evidenceVerified||r.verified).map(r=>{const target=clergy.find(c=>c.id===r.id&&c.published);return `<section><h3>${esc(r.label)}</h3><p>${esc(r.relationship)}</p>${r.verified&&target?`<a href="those-who-have-served.html#${esc(target.id)}">Meet ${esc(r.label)} →</a>`:'<p class="history-story-pending">An individual archive entry is in preparation.</p><a href="those-who-have-served.html">Meet those who have served →</a>'}</section>`;}).join('');
  const relatedCollections=(s.relatedCollections||[]).map(r=>{const c=data.collections.find(c=>c.id===r.id&&c.status==='active');return c?`<section><h3>${esc(c.title)}</h3><p>${esc(r.description)}</p><a href="${esc(c.route)}">${esc(r.action)} →</a></section>`:'';}).join('');
  return `<article class="history-story" aria-labelledby="history-story-heading">
    <nav class="history-story-back" aria-label="History breadcrumbs"><a href="${esc(collection.route)}">← ${esc(collection.title)}</a><a href="our-history.html">Our History</a></nav>
    <header class="history-story-hero"><div><p class="eyebrow">${esc(e.period)}</p><h1 id="history-story-heading">${esc(e.title)}</h1><p class="history-story-lifespan">${esc(e.lifespan)}</p><p class="history-story-standfirst">${esc(s.standfirst)}</p><p class="history-story-photo-note">A life remembered inside St Michael &amp; All Angels.</p></div><figure>${photograph(true)}<figcaption>${esc(s.caption)}</figcaption></figure></header>
    <div class="history-story-layout"><div class="history-story-narrative">${s.sections.map(section=>`<section id="${esc(section.id)}" class="history-story-section${section.emphasis?' history-story-emphasis':''}"><h2>${esc(section.title)}</h2>${section.paragraphs.map(p=>`<p>${esc(p.text)}${cite(p.sources)}</p>`).join('')}${section.memorial?`<figure class="history-story-memorial" id="memorial-photograph"><a href="${esc(e.image.src)}" aria-label="View the detailed memorial photograph">${photograph()}</a><figcaption>${esc(s.caption)} <a href="${esc(e.image.src)}">View the detailed photograph</a></figcaption></figure><details class="history-story-transcription"><summary>Read the full memorial inscription</summary><p>${esc(s.transcriptionNote)}</p><div class="history-transcription">${esc(e.transcription)}</div></details>`:''}</section>`).join('')}</div>
    <aside class="history-story-glance" aria-labelledby="history-glance-title"><h2 id="history-glance-title">At a glance</h2><dl>${s.facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><h2>A life in context</h2><ol class="history-story-timeline">${s.timeline.map(([date,text,source])=>`<li><strong>${esc(date)}</strong><p>${esc(text)}${cite([source])}</p></li>`).join('')}</ol></aside></div>
    <section class="history-story-sources" aria-labelledby="history-sources-heading"><h2 id="history-sources-heading">Sources &amp; further reading</h2><ol>${refs.map(r=>`<li id="source-${esc(r.id)}">${r.url?`<a href="${esc(r.url)}">${esc(r.title)}</a>`:`<a href="#memorial-photograph">${esc(r.title)}</a>`}<p>${esc(r.notes)}</p></li>`).join('')}</ol></section>
    <nav class="history-story-related" aria-labelledby="history-related-heading"><h2 id="history-related-heading">Explore related history</h2><div>${relatedPeople}${relatedCollections}</div></nav>
    <p class="history-story-back"><a href="${esc(collection.route)}">← ${esc(collection.title)}</a></p>
  </article>`;
}
module.exports={validateStory,renderStory};
