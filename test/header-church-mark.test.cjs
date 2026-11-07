const test=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process'),vm=require('vm'),prior=require('./helpers/header-church-mark-snapshot.cjs');
const read=f=>require('./helpers/policies-navigation-snapshot.cjs')(fs.readFileSync(f,'utf8')).replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','7c598368:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('church mark is the only shared-header markup and stylesheet change; footer and information links remain intact',()=>{
 assert.equal(prior(read('site.js')),old('site.js'));assert.equal(prior(read('header-navigation.css')),old('header-navigation.css'));
 const nav=vm.runInNewContext(read('site.js').slice(0,read('site.js').indexOf('const socialArea'))+'\nnavigation');assert.equal((nav.match(/class="header-church-mark"/g)||[]).length,1);assert(!nav.includes('class="brand-mark"'));assert(nav.includes('alt="" decoding="async"'));assert(nav.includes('width="80" height="77"'));
 for(const f of ['public-header.js','responsive-navigation.js','header-search.js','footer-standard.css','home-hero-photos.js','home-hero-carousel.js'])assert.equal(read(f),old(f),f);
});
test('SVG is transparent, vector-only, bounded, lightweight and has no generated text/background or active content',()=>{
 const f='assets/images/branding/church-illustration.svg',s=read(f);assert.match(s,/<svg[^>]+viewBox="0 0 630 605"/);assert(s.includes('<path'));assert(!/<(?:text|image|script|foreignObject|rect)\b|data:|https?:\/\//.test(s.replace('http://www.w3.org/2000/svg','')));assert(fs.statSync(f).size<65000);assert(!/St Michael|MICKLEHAM|background|onload/.test(s));
});
test("Key public pages load the shared header and footer", () => {
  for(const f of ['index.html','calendar.html','give.html','worship.html']){const page=read(f); assert.match(page,/data-site-header/); assert.match(page,/data-site-footer/); assert.match(page,/src="site\.js\?/); }
});
