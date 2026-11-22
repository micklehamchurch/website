const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','560869b:'+f],{encoding:'utf8'}).replace(/\r/g,'');
const approved=f=>cp.execFileSync('git',['show','cd1d25c832a32ad61869a7418eae71626559a558:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('approved covenant section is the sole policies content addition, with original anchors and documents intact',()=>{const s=read('policies.html'),addition=read('test/fixtures/racial-justice-section.txt');assert(s.includes(addition));assert(s.indexOf('policies-0')<s.indexOf('id="policies-racial-justice"'));assert(s.indexOf('id="policies-racial-justice"')<s.indexOf('aria-labelledby="policies-1"'));assert.equal(require('./helpers/racial-justice-snapshot.cjs').prior(s),old('policies.html'));assert(!/PCC has adopted|We.ve signed|adopted on/.test(addition));});
test('menu keeps four original columns and all handlers, adding only a covenant link within Other policies',()=>{const s=read('policies-navigation.js');assert(s.includes(read('test/fixtures/racial-justice-menu.txt')));assert.equal(require('./helpers/racial-justice-snapshot.cjs').prior(s),old('policies-navigation.js'));});
test('search generation indexes the covenant while every unrelated entry remains unchanged',()=>{
 const model=require('../search-model.js');
 const data=JSON.parse(read('search-index.json')),before=JSON.parse(approved('search-index.json'));
 const changed=new Set(['policies.html','our-history.html','history-entry-carl-aarvold.html','history-people-families.html','history-memorials.html']);
 assert.deepEqual(data.filter(e=>!changed.has(e.url)),before.filter(e=>!changed.has(e.url)));
 for(const q of ['Racial Justice','Racial Justice Covenant','Covenant','Racism','Diocese of Guildford'])assert(model.findMatches(data,q).some(e=>e.page.url==='policies.html'),q);
 const aarvold=model.findMatches(data,'Carl Aarvold').find(e=>e.page.url==='history-entry-carl-aarvold.html');
 assert(aarvold,'Search returns the dedicated biography');
});
test('unrelated public content is unchanged apart from shared cache invalidation',()=>{for(const f of ['header-navigation.css','policies-navigation.css','responsive-navigation.js','favicon.svg','assets/images/branding/church-illustration.svg'])assert.equal(read(f),approved(f),f);});

