const test=require('node:test'),assert=require('assert/strict'),fs=require('fs'),cp=require('child_process'),fixture=require('./fixtures/header-opening-area.json');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','f9bec94:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('hit-area correction leaves existing visual rules, header markup, menu and all homepage behaviour untouched',()=>{
 assert.equal(read('header-navigation.css'),old('header-navigation.css')+fixture.append);
 for(const f of ['site.js','public-header.js','responsive-navigation.js','policies-navigation.js','policies-navigation.css','home-bottom.css','home-content.css','home-next-service.js','home-hero-carousel.js','home-hero-photos.js'])assert.equal(read(f),old(f),f);
 const strip=s=>s.replace(/home-critical\.css\?v=[a-f0-9]+/g,'home-critical.css?v=HASH');assert.equal(strip(read('index.html')),strip(old('index.html')));
});
test('Find Us destination and deterministic stylesheet delivery remain correct',()=>{
 assert(read('site.js').includes('class="header-opening" href="finding-us.html"'));assert(fs.existsSync('finding-us.html'));
 const css=read('home-critical.css'),html=read('index.html');require('../build-home-performance').build();assert.equal(read('home-critical.css'),css);assert.equal(read('index.html'),html);
 assert.equal(require('./helpers/header-opening-area-snapshot.cjs')(css),old('home-critical.css'));
});
