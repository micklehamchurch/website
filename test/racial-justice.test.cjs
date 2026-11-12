const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','560869b:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('approved covenant section is the sole policies content addition, with original anchors and documents intact',()=>{const s=read('policies.html'),addition=read('test/fixtures/racial-justice-section.txt');assert(s.includes(addition));assert(s.indexOf('policies-0')<s.indexOf('id="policies-racial-justice"'));assert(s.indexOf('id="policies-racial-justice"')<s.indexOf('aria-labelledby="policies-1"'));assert.equal(require('./helpers/racial-justice-snapshot.cjs').prior(s),old('policies.html'));assert(!/PCC has adopted|We.ve signed|adopted on/.test(addition));});
test('menu keeps four original columns and all handlers, adding only a covenant link within Other policies',()=>{const s=read('policies-navigation.js');assert(s.includes(read('test/fixtures/racial-justice-menu.txt')));assert.equal(require('./helpers/racial-justice-snapshot.cjs').prior(s),old('policies-navigation.js'));});
test('search generation indexes the covenant while every unrelated entry remains unchanged',()=>{const model=require('../search-model.js');const data=JSON.parse(read('search-index.json')),before=JSON.parse(old('search-index.json'));const editionPages=new Set(['index.html','news.html','pews-news.html','pews-news/2026-10-18.html','pews-news/2026-10-25.html','pews-news/2026-11-01.html','pews-news/2026-11-08.html','news/we-will-remember-them.html']);const unrelated=e=>e.url!=='policies.html'&&!editionPages.has(e.url);assert.deepEqual(data.filter(unrelated),before.filter(unrelated));for(const q of ['Racial Justice','Racial Justice Covenant','Covenant','Racism','Diocese of Guildford'])assert(model.findMatches(data,q).some(e=>e.page.url==='policies.html'),q);});
test('unrelated public content is unchanged apart from the scoped Home News styling',()=>{
 for(const file of ['header-navigation.css','policies-navigation.css','responsive-navigation.js','favicon.svg','assets/images/branding/church-illustration.svg'])assert.equal(read(file),old(file),file);
 const marker='/* Editorial lead with a stacked rail for the featured parish story. */';
 const news=read('home-news.css');
 assert(news.includes(marker));
 const manifest=require('../home-style-sources.json');
 const sources=manifest.sources.map(source=>source.split('?')[0]).map(file=>file==='home-news.css'?news.split(marker)[0].trimEnd():read(file));
 const bundle=require('esbuild').transformSync(sources.join('\n'),{loader:'css',minify:true,legalComments:'inline'}).code;
 assert.equal(bundle,old('home-critical.css'));
});

