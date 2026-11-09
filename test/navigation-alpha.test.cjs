const test=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/header-information-snapshot.cjs').fs,cp=require('child_process'),vm=require('vm');const src=fs.readFileSync('site.js','utf8'),old=f=>cp.execFileSync('git',['show','0c41b2c:'+f],{encoding:'utf8'}).replaceAll('\r',''),categories=s=>JSON.parse(JSON.stringify(vm.runInNewContext(s.slice(0,s.indexOf('const socialArea'))+'\nnavigationCategories')));
test('only Alpha is added after Pastoral Care, with all category order and other links unchanged',()=>{const a=categories(old('site.js').replace("[['News','news.html']","[['Parish News','news.html']").replace(",['Parish Magazine','news.html#latest-parish-magazine']",'')),b=categories(src);assert.deepEqual(b.map(x=>x.id),a.map(x=>x.id));const community=b.find(x=>x.id==='community');assert.deepEqual(community.links[community.links.findIndex(x=>x[1]==='pastoral-care.html')+1],['Alpha Course','alpha.html']);community.links=community.links.filter(x=>x[1]!=='alpha.html');b.find(x=>x.id==='about').links=b.find(x=>x.id==='about').links.filter(x=>x[1]!=='give.html');assert.deepEqual(b,a);});
test('Alpha existing current destination, Search and contextual discovery are preserved without old-host links',()=>{const h=fs.readFileSync('alpha.html','utf8').replaceAll('\r','');assert(h.includes('Ask about Alpha'));assert(h.includes('href="contact.html"'));assert(h.includes('data-site-header')&&h.includes('data-site-footer'));assert(!/https?:\/\/[^" ]*micklehamchurch\.(?:org|com|co\.uk)/.test(h));assert(require('../search-index.json').some(x=>x.url==='alpha.html'));assert(fs.readFileSync('church-life.html','utf8').includes('href="alpha.html"'));assert(!h.includes('alpha.org'));});
test('Alpha navigation preserves the controller, styles and unrelated public page content',()=>{for(const f of ['public-header.js','responsive-navigation.js','header-navigation.css','styles.css'])assert.equal(fs.readFileSync(f,'utf8').replaceAll('\r',''),old(f),f);const files=cp.execFileSync('git',['ls-files','*.html'],{encoding:'utf8'}).trim().split('\n');for(const f of files){if(f==='alpha.html'||f.startsWith('admin/')||f==='those-who-have-served.html'||f==='safeguarding.html'||f==='policies.html'||f==='pews-news/2026-11-08.html'||f==='news/we-will-remember-them.html')continue; // Existing clergy tests regenerate that fixture; release-wide body audit runs separately.
const body=value=>{
  let markup=require('./helpers/home-performance.cjs')(value.slice(value.indexOf('<body')));
  if(f==='index.html') return markup.replace(/<!-- home-news:start -->[\s\S]*?<!-- home-news:end -->/,'HOME_NEWS');
  if(f==='news.html') return markup.replace(/<div id="news-feed">[\s\S]*?(?=<section class="news-resources")/,'NEWS_FEED')
    .replace(/<script type="application\/json" id="news-feed-data">[\s\S]*?<\/script>/,'NEWS_DATA')
    .replace(/Showing \d+ news items\./,'Showing news items.');
  if(f==='pews-news.html'||f.startsWith('pews-news/')) {
    markup=markup.replace(/<nav class="pews-archive"[\s\S]*?<\/nav>/,'PEWS_ARCHIVE');
    if(f==='pews-news.html') return markup.replace(/<nav class="pews-breadcrumb"[\s\S]*?<\/nav>/,'PEWS_BREADCRUMB')
      .replace(/<article class="pews-edition"[\s\S]*?<\/article>\s*<\/div>\s*<\/main>/,'PEWS_EDITION</div></main>');
  }
  return markup;
};assert.equal(body(fs.readFileSync(f,'utf8').replaceAll('\r','')),body(old(f)),f);}});
