const heroDelivery=s=>s.replace(/home-critical\.css\?v=[a-f0-9]+/g,'home-critical.css?v=HASH');
const test=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process');
const normal=s=>require('./helpers/header-opening-area-snapshot.cjs')(s).replace(/home-critical\.css\?v=[a-f0-9]+/g,'home-critical.css?v=HASH'); const read=f=>normal(fs.readFileSync(f,'utf8')),old=f=>normal(cp.execFileSync('git',['show','c91f794:'+f],{encoding:'utf8'}));
test("Policies enhancement retains the shared header and public guidance", () => {
  assert.match(read('public-header.js'),/policies-navigation\.js/); for(const f of ['index.html','policies.html','safeguarding.html']) assert.match(read(f),/data-site-header/);
});
test('all five menu destinations resolve to existing approved public guidance',()=>{
 const source=read('policies-navigation.js');for(const f of ['safeguarding.html','baptisms.html','churchyard-regulations.html','policies.html']){assert(source.includes(f));assert(fs.existsSync(f));}
 assert(source.includes('policies.html#policies-3'));assert(read('policies.html').includes('id="policies-3"'));assert(read('policies.html').includes('Privacy and other documents'));
 assert(!source.includes('Baptism policy'));assert(source.includes("new URL(file,base).href"));assert(source.includes('assets/images/about/church-card.webp'));
 assert.deepEqual(fs.readFileSync('assets/images/about/church-card.webp'),cp.execFileSync('git',['show','c91f794:assets/images/about/church-card.webp']));
});
test('disclosure remains a lightweight progressive enhancement using the actual drawer breakpoint',()=>{
 const js=read('policies-navigation.js'),css=read('policies-navigation.css');assert(js.includes("createElement('button')"));assert(js.includes("aria-expanded"));assert(js.includes("aria-controls"));assert(!/role=["']menu/.test(js));assert(js.includes('max-width:1535px'));assert(css.includes('max-width:1535px'));assert(js.includes('duration:220'));assert(js.includes('prefers-reduced-motion:reduce'));assert(js.includes("event.key==='Escape'"));assert(js.includes("pagehide"));assert(js.includes('ResizeObserver'));assert(js.includes('panel.inert=true'));assert(js.includes("original.replaceWith(trigger)"));
 assert(read('public-header.js').includes("css.addEventListener('load'"));assert(read('site.js').includes('href="policies.html"'));
});
