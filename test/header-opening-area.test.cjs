const test=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process'),fixture=require('./fixtures/header-opening-area.json');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','f9bec94:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test("Opening-area hit styles retain their approved declarations", () => {
  assert(read('header-navigation.css').includes(fixture.append.trim())); assert.match(read('index.html'),/data-site-header/);
});
test('Find Us destination and deterministic stylesheet delivery remain correct',()=>{
 assert(read('site.js').includes('class="header-opening" href="finding-us.html"'));assert(fs.existsSync('finding-us.html'));
 const css=read('home-critical.css'),html=read('index.html');require('../build-home-performance').build();assert.equal(read('home-critical.css'),css);assert.equal(read('index.html'),html);
 assert(fs.readFileSync('home-hero-carousel.css','utf8').replace(/\r/g,'').startsWith(require('child_process').execFileSync('git',['show','39deb5f:home-hero-carousel.css'],{encoding:'utf8'}).replace(/\r/g,'').trimEnd()));
});
