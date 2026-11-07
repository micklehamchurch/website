const test=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process'),restore=require('./helpers/approved-involvement-links.cjs');
const read=f=>require('./helpers/header-opening-area-snapshot.cjs')(fs.readFileSync(f,'utf8')),old=f=>cp.execFileSync('git',['show','1d40b78:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('each complete card is one native anchor with original contents, destination and external behaviour',()=>{

 const block=read('index.html').match(/<section class="home-involvement"[\s\S]*?<\/section>/)[0],cards=[...block.matchAll(/<a class="home-involvement-card" ([^>]+)>([\s\S]*?)<\/a>/g)];assert.equal(cards.length,3);assert.equal((block.match(/<a /g)||[]).length,3);
 assert.deepEqual(cards.map(x=>x[1].match(/href="([^"]+)"/)[1]),['eco-church.html','give.html','https://www.cofeguildford.org.uk/']);for(const c of cards){assert(!/<a |<button|tabindex=|onclick=/.test(c[2]));assert(c[2].includes('class="home-involvement-cta"'));assert.match(c[2],/<h3\b[^>]*>[^<]+<\/h3>/); const label=c[1].match(/aria-labelledby="([^"]+)"/); assert(label); assert(c[2].includes('id="'+label[1]+'"'));}
 assert(cards[2][1].includes('target="_blank" rel="noopener noreferrer"'));
});
test('every visual declaration is unchanged; only the CTA selectors move from anchor to identical-looking span',()=>{
 assert.equal(read('home-bottom.css').replaceAll('.home-involvement-card span:where(.home-involvement-cta)','.home-involvement-card a'),old('home-bottom.css'));
});
test('expanded-link CSS stays in the existing deterministic first-paint bundle',()=>{
 const html=read('index.html'),css=read('home-critical.css');require('../build-home-performance').build();assert.equal(read('index.html'),html);assert.equal(read('home-critical.css'),css);assert(require('../home-style-sources.json').sources.includes('home-bottom.css?v=20261104-card-links-2'));
});
