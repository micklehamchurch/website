const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=require('../content-pages.json').pages.find(p=>p.slug==='funerals'),html=require('../funerals-render')(page),plain=html.replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replaceAll('&#39;',"'");
test('Funerals preserves every original paragraph, qualification and destination',()=>{
 for(const section of page.sections)for(const p of section.paragraphs)assert(plain.includes(p),section.title);
 assert(plain.includes(page.summary));
 const life=page.lifeEvent;
 for(const href of[page.back,page.href,life.primary.href,life.secondary.href,life.flowerDocument,life.guidance.href,...life.related.map(r=>r.href)])assert(html.includes(`href="${href}"`),href);
 assert.equal((html.match(/<h1 /g)||[]).length,1);
 assert.equal((html.match(/id="sustainable-flowers"/g)||[]).length,1);
 assert(plain.includes('no particular service or arrangement is assumed here.'));
 assert(!/fees|three stages|four stages|Meet and talk|The day itself/.test(plain));
 assert(html.includes('Candle and flower imagery on this Dev page is illustrative.'));
});
test('Funerals imagery is responsive, dimensioned and lightweight',()=>{
 assert.equal((html.match(/fetchpriority="high"/g)||[]).length,1);
 assert.equal((html.match(/loading="eager"/g)||[]).length,1);
 assert.equal((html.match(/loading="lazy"/g)||[]).length,3);
 for(const img of html.matchAll(/<img[^>]*>/g))assert(/width="\d+" height="\d+"/.test(img[0]));
 for(const n of['candles','flowers'])for(const w of[640,1536])assert(fs.statSync(`assets/images/funerals/${n}-${w}.webp`).size<200000);
 assert(!html.includes('<script'));
});
