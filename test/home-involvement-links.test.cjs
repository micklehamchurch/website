const test=require('node:test'),assert=require('assert/strict'),fs=require('fs'),cp=require('child_process');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','1d40b78:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('homepage markup and existing links are unchanged; each involvement card retains exactly one original anchor',()=>{
 const strip=s=>s.replace(/home-critical\.css\?v=[^" ]+/g,'home-critical.css?v=VERSION');assert.equal(strip(read('index.html')),strip(old('index.html')));
 const block=read('index.html').match(/<section class="home-involvement"[\s\S]*?<\/section>/)[0],cards=[...block.matchAll(/<article class="home-involvement-card">([\s\S]*?)<\/article>/g)];assert.equal(cards.length,3);
 assert.deepEqual(cards.map(x=>x[1].match(/href="([^"]+)"/)[1]),['eco-church.html','give.html','https://www.cofeguildford.org.uk/']);for(const c of cards){assert.equal((c[1].match(/<a /g)||[]).length,1);assert(!/<button|tabindex=|onclick=/.test(c[1]));}
 assert(cards[2][1].includes('target="_blank" rel="noopener noreferrer"'));
});
test('all original visual CSS is retained; the extension adds only an invisible hit area and keyboard focus outline',()=>{
 const prior=old('home-bottom.css'),now=read('home-bottom.css');assert(now.startsWith(prior));const added=now.slice(prior.length);assert(added.includes('.home-involvement-card { position: relative; }'));assert(added.includes('a::after'));assert(added.includes('inset: 0'));assert(added.includes(':focus-visible::after'));assert(!/hover|transition|animation|transform|background|box-shadow|padding|margin|font|grid|width:|height:/.test(added));
 for(const f of ['site.js','header-navigation.css','home-content.css','home-hero-carousel.js','home-hero-photos.js','home-next-service.js','home-next-service.css','home-next-service-data.json','home-news.css','home-editorial.css','home-life-events.css','peace.css','footer-standard.css','events.json'])assert.equal(read(f),old(f),f);
});
test('expanded-link CSS stays in the existing deterministic first-paint bundle',()=>{
 const html=read('index.html'),css=read('home-critical.css');require('../build-home-performance').build();assert.equal(read('index.html'),html);assert.equal(read('home-critical.css'),css);assert(require('../home-style-sources.json').sources.includes('home-bottom.css?v=20261104-card-links-1'));
});
