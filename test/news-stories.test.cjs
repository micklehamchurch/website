const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {published,teaser,body,validateMedia}=require('../stories-render');
test('journal and homepage select newest published real story and exclude drafts, demos and expired stories',()=>{
 const a={slug:'old',date:'2026-01-01',status:'published'};
 const input=[a,{...a,slug:'new',date:'2026-10-04'},{...a,slug:'draft',status:'draft'},{...a,slug:'demo',demo:true},{...a,slug:'expired',expires:'2026-02-01'}];
 assert.deepEqual(published(input,'2026-10-04').map(a=>a.slug),['new','old']);assert.equal(input.length,5);
});
test('editorial photos use responsive sources, meaningful alt and escaped article text',()=>{
 const media=require('../_content/news-media.json')['a-harvest-of-thankfulness'];validateMedia({'a-harvest-of-thankfulness':media},require('node:path').resolve(__dirname,'..'));
 const article={slug:'fixture',title:'<title>',category:'Church',dateLabel:'Today',excerpt:'<excerpt>',paragraphs:['<script>']};
 assert.match(teaser(article,media),/&lt;title&gt;/);assert.match(body(article,media),/&lt;script&gt;/);assert.match(teaser(article,media),/srcset=/);assert.match(teaser(article,media),/width="1280"/);
 assert.throws(()=>validateMedia({fixture:{...media,cover:{...media.cover,src:'../secret'}}},__dirname));
});
test('published journal, Harvest article, latest teaser and search are generated from shared News content',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../news/a-harvest-of-thankfulness.html'),'utf8');assert.equal((html.match(/<img /g)||[]).length,8);assert.match(html,/congregation-1280.webp/);assert.match(html,/family-crafts-1280.webp/);
 const home=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');assert.match(fs.readFileSync('news.html','utf8'),/welcome-doors-1280.webp/);
 const article=require('../_content/news.json').articles.find(a=>a.slug==='a-harvest-of-thankfulness');assert.equal(article.paragraphs.length,8);assert(!/<p class="article-excerpt">/.test(html));assert(!html.includes('<p>'+article.excerpt+'</p>'));assert.match(fs.readFileSync('news.html','utf8'),/a-harvest-of-thankfulness/);
 const search=require('../search-index.json');assert(search.some(p=>p.url==='news.html'));assert(!search.some(p=>p.url==='news-stories.html'));assert(search.some(p=>p.url==='news/a-harvest-of-thankfulness.html'));
});

test('one public News destination retains stories, publications and old routing',()=>{const page=fs.readFileSync(require('node:path').join(__dirname,'../news.html'),'utf8');assert.match(page,/<h1 id="news-title">News<\/h1>/);assert.match(page,/Latest news/);assert.match(page,/latest-pews-news/);assert.match(page,/latest-parish-magazine/);assert.match(page,/publication-archive/);assert.match(page,/a-harvest-of-thankfulness/);const old=fs.readFileSync(require('node:path').join(__dirname,'../news-stories.html'),'utf8');assert.match(old,/url=news.html/);assert.match(old,/search-index.+exclude/);const nav=fs.readFileSync(require('node:path').join(__dirname,'../site.js'),'utf8');assert.match(nav,/<a href="news.html">News<\/a>/);assert(!nav.includes('href="news-stories.html"'));});

test('Remembrance story preserves the approved section order, real photos and featured Home card', () => {
  const route = 'news/we-will-remember-them.html';
  const html = fs.readFileSync(route,'utf8');
  const sections = ['remembrance-hero','remembrance-heading','remembrance-intro','remembrance-morning','remembrance-act',
    'remembrance-context','remembrance-gallery','remembrance-thanks','remembrance-links'];
  let offset = -1;
  for (const section of sections) {
    const next = html.indexOf(section,offset+1);
    assert(next > offset,section);
    offset = next;
  }
  assert.equal((html.match(/data-remembrance-photo/g)||[]).length,4);
  assert.match(html,/href="pews-news\/2026-11-08\.html"/);
  assert.match(html,/href="war-memorial\.html"/);
  assert.match(html,/href="https:\/\/www\.britishlegion\.org\.uk\/"/);
  const feed = require('../news-feed.json');
  const story = feed.items.find(item=>item.url===route);
  assert.equal(story.showOnHome,false);
  assert(require('../news-feed-model').render(feed,'parish-story').includes(route));
  const home=require('../home-news-render.cjs');
  const rendered=home.render(feed,home.readService());
  assert.match(rendered,/<article class="home-news-item home-news-latest"><a class="home-news-link" href="news\/we-will-remember-them\.html">/);
  assert.equal(rendered.split('href="'+route+'"').length,2);
  assert.match(rendered,/Our church and village community gathered for Remembrance Sunday, honouring those who gave their lives and praying for peace\./);
  assert.match(rendered,/wreaths-card-1280\.webp/);
  for(const other of ['pews-news/2026-11-08.html','pews-news/2026-11-01.html']) assert.equal(rendered.split('href="'+other+'"').length,2);
  assert(rendered.includes('home-service-latest'));
  const newer={...feed.items[0],id:'newer-edition',date:'2026-11-15',url:'pews-news/2026-11-15.html'};
  assert(!home.render({items:[newer,...feed.items]}).includes(route));
  assert(require('../search-index.json').some(entry=>entry.url===route));
});
