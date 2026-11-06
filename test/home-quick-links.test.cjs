const test=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process'),normalise=require('./helpers/approved-quick-links.cjs');
const read=f=>require('./helpers/header-opening-area-snapshot.cjs')(fs.readFileSync(f,'utf8')),old=f=>cp.execFileSync('git',['show','0d17872:'+f],{encoding:'utf8'}).replace(/\r/g,''),block=s=>s.match(/<div class="home-quick-links">[\s\S]*?<\/div><\/div>/)[0];
test('four semantic whole-card links retain their order, titles, destinations and original gold line icons',()=>{
 const h=block(read('index.html')),prior=block(old('index.html'));assert.deepEqual([...h.matchAll(/<h2>(.*?)<\/h2>/g)].map(x=>x[1]),['Join us for a service','Explore and learn','Our community','What’s on']);
 assert.deepEqual([...h.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),['worship.html','visit.html','church-life.html','calendar.html']);assert.equal((h.match(/<a /g)||[]).length,4);assert.equal((h.match(/home-quick-icon-box/g)||[]).length,4);
 const icons=s=>[...s.matchAll(/<svg class="home-quick-icon"[\s\S]*?<\/svg>/g)].map(x=>x[0].replace(' focusable="false"',''));assert.deepEqual(icons(h),icons(prior));assert(!/home-quick-arrow|home-quick-art|→|<button|<p\b/.test(h));
});
test('only the quick-card block and its CSS delivery hash change in the homepage; all other systems are untouched',()=>{
 assert.equal(normalise(read('index.html')),normalise(old('index.html')));
 const strip=s=>s.replace(/\/\* (?:Whole-link cards|Compact whole-link cards)[\s\S]*?(?=\.home-content \.text-link)/,'APPROVED_QUICK_CSS\n');assert.equal(strip(read('home-content.css')),strip(old('home-content.css')));
 for(const f of ['site.js','header-navigation.css','assets/images/branding/church-illustration.svg','home-hero-carousel.js','home-hero-photos.js','home-next-service.js','home-next-service.css','home-next-service-config.json','home-next-service-data.json','home-news.js','home-news.css','peace.css','home-life-events.css','home-editorial.css','footer-standard.css','events.json'])assert.equal(read(f),old(f),f);
});
test('responsive presentation stays in the existing deterministic first-paint bundle without new JavaScript',()=>{
 const html=read('index.html'),css=read('home-critical.css');require('../build-home-performance').build();assert.equal(read('index.html'),html);assert.equal(read('home-critical.css'),css);
 assert(require('../home-style-sources.json').sources.includes('home-content.css?v=20261104-compact-quick-1'));assert(read('home-content.css').includes('prefers-reduced-motion:reduce'));assert(read('home-content.css').includes(':focus-visible'));
});
