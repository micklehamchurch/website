const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=require('../content-pages.json').pages.find(p=>p.slug==='baptisms'),html=require('../baptisms-render')(page),plain=html.replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replaceAll('&#39;',"'");
test('Baptisms preserves every canonical policy paragraph and destination',()=>{
 for(const s of page.sections)for(const p of s.paragraphs)assert(plain.includes(p),s.title);
 const life=page.lifeEvent;
 for(const href of[page.back,life.primary.href,life.secondary.href,...life.documents.map(d=>d.href),...life.related.map(r=>r.href)])assert(html.includes(`href="${href}"`),href);
 assert.equal((html.match(/<h1 /g)||[]).length,1);
 assert.equal((html.match(/id="baptism-journey"/g)||[]).length,1);
 assert(html.includes('Font and water imagery on this Dev page is illustrative.'));
});
test('Baptisms images reserve dimensions and prioritize only the hero',()=>{
 assert.equal((html.match(/fetchpriority="high"/g)||[]).length,1);
 assert.equal((html.match(/loading="eager"/g)||[]).length,1);
 assert.equal((html.match(/loading="lazy"/g)||[]).length,2);
 for(const img of html.matchAll(/<img[^>]*>/g))assert(/width="\d+" height="\d+"/.test(img[0]));
 for(const n of['font','water'])for(const w of[640,1536])assert(fs.statSync(`assets/images/baptisms/${n}-${w}.webp`).size<150000);
 assert(!html.includes('<script'));
});
