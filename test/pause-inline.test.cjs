const test=require('node:test'),assert=require('node:assert/strict'),fs=require('./helpers/full-desktop-snapshot.cjs').fs,cp=require('node:child_process');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','934ebde:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test("Phone pause control keeps the approved compact rules and shared carousel", () => {
  assert(read('home-hero-carousel.css').includes(read('test/fixtures/pause-inline.css').trim())); assert.match(read('index.html'),/home-hero-carousel\.js/);
});
test('current Home bundle delivers the actual styles without changing timing or motion preferences',()=>{const m=require('../home-style-sources.json');assert.equal(read('home-critical.css'),require('esbuild').transformSync(m.sources.map(f=>read(f.split('?')[0])).join('\n'),{loader:'css',minify:true,legalComments:'inline'}).code);const model=require('../home-hero-photos');assert.equal(model.interval,8000);assert.equal(model.fade,1400);assert(read('home-hero-carousel.js').includes('pause.hidden=motion.matches'));});
