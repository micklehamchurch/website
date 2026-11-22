const delivery=require('./helpers/home-performance.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),model=require('../build-history-hub');const d=()=>JSON.parse(fs.readFileSync('_content/history.json')),read=f=>fs.readFileSync(f,'utf8');
test('Philippa article is generated from canonical metadata, with sourced sections and accessible primary transcription',()=>{const data=d(),e=data.entries[0],h=read(model.entryURL(e));assert.equal(e.status,'published');assert.equal(e.story.sections.length,6);for(const s of e.story.sections){assert(h.includes('id="'+s.id+'"'));for(const p of s.paragraphs)for(const id of p.sources)assert(h.includes('href="#source-'+id+'"'));}assert(h.includes('<summary>Read the full memorial inscription</summary>'));assert(h.includes('Mrs PHILLIPA WALTON'));assert(h.includes('in the 74th Year of her Age'));assert(!h.includes('aged 74'));assert(!h.includes('wikipedia.org'));assert(h.includes('loading="eager" fetchpriority="high"'));assert.equal((h.match(/<h1 /g)||[]).length,1);});
test('collection is an index, not a duplicate biography; pending Philip target never becomes a broken personal link',()=>{const e=d().entries[0],h=read(model.entryURL(e));for(const f of ['history-people-families.html','history-memorials.html']){assert(read(f).includes('Discover Philippa Walton'));assert(!read(f).includes('Taking charge of the gunpowder mills'));}assert(!h.includes('those-who-have-served.html#philip-walton'));assert(h.includes('An individual archive entry is in preparation.'));assert(h.includes('href="those-who-have-served.html"'));assert(h.includes('href="history-memorials.html"'));});
test('story validation rejects unsupported citations, unsafe source URLs and unsupported pending relationships',()=>{for(const mutate of [d=>d.entries[0].story.sections[0].paragraphs[0].sources=['fake'],d=>d.sources[2].url='javascript:alert(1)',d=>d.entries[0].relatedPeople[0].sourceRefs=['fake']]){const data=d();mutate(data);assert.throws(()=>model.validate(data,process.cwd()));}});
test('story text is escaped and the existing homepage hero remains intact',()=>{const data=d(),e=data.entries[0];e.story.sections[0].paragraphs[0].text='<script>fake()</script>';const r=require('../history-story-render').renderStory(data,e,[],{esc:model.esc,photo:()=>'<img>',entryURL:model.entryURL});assert(r.includes('&lt;script&gt;'));assert(!r.includes('<script>'));for(const f of ['index.html']){const normalize=s=>s.replaceAll('optional-translation-2','optional-translation-1').replace(/src="[^"]*site\.js[^"]*"/g,'src="site.js"').replace(/\r/g,'');const hero=s=>s.match(/<section class="hero home-hero"[\s\S]*?<\/section>/)[0];assert.equal(delivery(hero(normalize(read(f)))),delivery(hero(normalize(cp.execFileSync('git',['show','d6a7cfa:'+f],{encoding:'utf8'})))),f);}});

test('Aarvold’s rugby section has a sourced portrait and one official player profile reference', () => {
  const data = d();
  const entry = data.entries.find(item => item.id === 'carl-aarvold');
  const section = entry.story.sections.find(item => item.id === 'public-life');
  const html = read(model.entryURL(entry));
  const rugby = html.match(/<section id="public-life"[^>]*>[\s\S]*?<\/section>/)[0];

  assert.match(rugby, /width="449" height="658" alt="Young Carl Aarvold[^"]+" loading="lazy"/);
  assert.match(rugby, /<figcaption>.*El Gráfico, no\. 424, 20 August 1927/);
  assert.match(rugby, /Explore his British &amp; Irish Lions career/);
  assert.match(html, /id="source-aarvold-lions-retrospective"/);
  assert.equal(entry.sourceRefs.filter(id => id === 'aarvold-lions').length, 1);
  assert.match(html, /official player profile record 17 March 1991/);
  assert.match(html, /id="memorial-photograph"/);

  section.portrait.small = 'assets/images/history/absent.webp';
  assert.throws(() => model.validate(data, process.cwd()), /Invalid History image/);
  section.portrait.small = section.portrait.src;
  section.readMore[0].source = 'missing';
  assert.throws(() => model.validate(data, process.cwd()), /Story reading link requires/);
});

test('Aarvold’s seated portrait is referenced by a credited link only', () => {
  const html = read('history-entry-carl-aarvold.html');
  const section = html.match(/<section id="public-life"[^>]*>[\s\S]*?<\/section>/)[0];
  assert.match(section, /<h3>Sir Carl Aarvold in 1958<\/h3>/);
  assert.match(section, /Evening Standard \/ Hulton Archive \/ Getty Images/);
  assert.match(section, /<a href="https:\/\/www\.gettyimages\.ie\/detail\/news-photo\/judge-carl-aarvold-february-13th-1958-news-photo\/1835556885\?slot=15">View the 1958 photograph at Getty Images/);
  assert.equal((section.match(/<img\b/g) || []).length, 1);
  assert.doesNotMatch(html, /media\.gettyimages|<iframe[^>]+gettyimages/i);
});
