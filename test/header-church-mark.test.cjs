const test=require('node:test'),assert=require('assert/strict'),fs=require('fs'),cp=require('child_process'),vm=require('vm'),prior=require('./helpers/header-church-mark-snapshot.cjs');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','7c598368:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('church mark is the only shared-header markup and stylesheet change; footer and information links remain intact',()=>{
 assert.equal(prior(read('site.js')),old('site.js'));assert.equal(prior(read('header-navigation.css')),old('header-navigation.css'));
 const nav=vm.runInNewContext(read('site.js').slice(0,read('site.js').indexOf('const socialArea'))+'\nnavigation');assert.equal((nav.match(/class="header-church-mark"/g)||[]).length,1);assert(!nav.includes('class="brand-mark"'));assert(nav.includes('alt="" decoding="async"'));assert(nav.includes('width="80" height="77"'));
 for(const f of ['public-header.js','responsive-navigation.js','header-search.js','footer-standard.css','home-next-service.js','home-hero-photos.js','home-hero-carousel.js'])assert.equal(read(f),old(f),f);
});
test('SVG is transparent, vector-only, bounded, lightweight and has no generated text/background or active content',()=>{
 const f='assets/images/branding/church-illustration.svg',s=read(f);assert.match(s,/<svg[^>]+viewBox="0 0 630 605"/);assert(s.includes('<path'));assert(!/<(?:text|image|script|foreignObject|rect)\b|data:|https?:\/\//.test(s.replace('http://www.w3.org/2000/svg','')));assert(fs.statSync(f).size<65000);assert(!/St Michael|MICKLEHAM|background|onload/.test(s));
});
test('all public HTML content is unchanged except shared script and homepage CSS cache versions',()=>{
 const files=cp.execFileSync('git',['ls-tree','-r','--name-only','7c598368'],{encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.html')&&!f.startsWith('admin/')&&read(f).includes('data-site-header'));
 const strip=s=>s.replace(/header=[^&" ]+/g,'header=VERSION').replace(/home-critical\.css\?v=[^" ]+/g,'home-critical.css?v=VERSION');
 for(const f of files)assert.equal(strip(read(f)),strip(old(f)),f);
});
