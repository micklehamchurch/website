const {test}=require('node:test'),assert=require('assert/strict'),fs=require('fs'),cp=require('child_process');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','4eee984:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('Church open daily changes only its destination to the existing Find Us page',()=>{
 assert(fs.existsSync('finding-us.html'));assert.match(read('finding-us.html'),/<h1[^>]*>Find Us<\/h1>/);
 assert.equal(read('site.js').replace('class="header-opening" href="finding-us.html"','class="header-opening" href="visit.html"'),old('site.js'));
 for(const f of ['header-navigation.css','public-header.js','responsive-navigation.js','header-search.js'])assert.equal(read(f),old(f),f);
});
test('public page bodies remain unchanged while the shared script version refreshes',()=>{
 const files=cp.execFileSync('git',['ls-tree','-r','--name-only','4eee984'],{encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.html')&&read(f).includes('data-site-header'));
 const strip=s=>require('./helpers/approved-quick-links.cjs')(s).replace(/header=[^&" ]+/g,'header=VERSION');for(const f of files)assert.equal(strip(read(f)),strip(old(f)),f);
});
