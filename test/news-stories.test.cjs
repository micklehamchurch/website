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
 const home=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');assert.match(home,/welcome-doors-1280.webp/);
 const article=require('../_content/news.json').articles.find(a=>a.slug==='a-harvest-of-thankfulness');assert.equal(article.paragraphs.length,8);assert(!/<p class="article-excerpt">/.test(html));assert(!html.includes('<p>'+article.excerpt+'</p>'));assert.match(home,/Flowers, worship, food and fellowship/);assert.match(home,/Harvest Family Service · 4 October 2026/);
 const search=require('../search-index.json');assert(search.some(p=>p.url==='news.html'));assert(!search.some(p=>p.url==='news-stories.html'));assert(search.some(p=>p.url==='news/a-harvest-of-thankfulness.html'));
});

test('one public News destination retains stories, publications and old routing',()=>{const page=fs.readFileSync(require('node:path').join(__dirname,'../news.html'),'utf8');assert.match(page,/News from St Michael's/);assert.match(page,/Latest News/);assert.match(page,/latest-pews-news/);assert.match(page,/latest-parish-magazine/);assert.match(page,/publication-archive/);assert.match(page,/a-harvest-of-thankfulness/);const old=fs.readFileSync(require('node:path').join(__dirname,'../news-stories.html'),'utf8');assert.match(old,/url=news.html/);assert.match(old,/search-index.+exclude/);const nav=fs.readFileSync(require('node:path').join(__dirname,'../site.js'),'utf8');assert.match(nav,/<a href="news.html">News<\/a>/);assert(!nav.includes('href="news-stories.html"'));});
