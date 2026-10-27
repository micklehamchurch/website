const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const read=f=>fs.readFileSync(f,'utf8'),old=f=>cp.execFileSync('git',['show','4765e3c:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('public History has no retiring-host URL, preserving independent sources and narrative',()=>{
 const files=['our-history.html','church-building.html','churchyard.html','war-memorial.html','history-entry-philippa-walton.html',...fs.readdirSync('.').filter(f=>/^history-.*\.html$/.test(f))];
 for(const f of files)assert.doesNotMatch(read(f),/https?:\/\/(?:www\.)?micklehamchurch\.org\.uk/i,f);
 for(const f of ['saxon','domesday','norbury','restoration','bells']){const h=read('history-'+f+'.html');assert(h.includes('Sources &amp; further reading'));}
 assert.match(read('history-domesday.html'),/micklehamwesthumblehistory\.co\.uk/);
 assert.match(read('history-bells.html'),/youtube\.com\/watch\?v=9eNFCR04xWE/);
 for(const f of ['saxon','domesday','norman','norbury','restoration','bells','today']){
  const re=/<div class="history-period-content">([\s\S]*?)<\/div><nav/;
  const prose=s=>s.match(re)[1].replace(/<details[\s\S]*?<\/details>/g,'');
  assert.equal(prose(read('history-'+f+'.html')),prose(old('history-'+f+'.html')),'Timeline narrative '+f);
 }
});
test('source archive is complete, excluded from Pages, and not linked by visitor pages',()=>{
 const base='_archive-sources/history/';assert(fs.statSync(base+'former-parish-history.pdf').size>1000);
 const source=read(base+'former-parish-history.txt').replace(/\s+/g,' ');for(const s of ['Turner','950','Stydolf','Bohemia','1938','Brough Fuller','Mark Day','John Wynn','Martin Cox'])assert(source.includes(s));
 assert.match(read('_config.yml'),/^  - _archive-sources$/m);
 assert(read(base+'README.md').includes('Knowledge inventory'));
 for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.html')))assert.doesNotMatch(read(f),/href="[^\"]*_archive-sources/);
 assert(!read('search-index.json').includes('former-parish-history'));
});
test('architectural history is qualified and uses genuine photography; scoped rebuild leaves other pages alone',()=>{
 const d=JSON.parse(read('content-pages.json')),b=d.pages.find(p=>p.slug==='church-building');assert.equal(b.image,'assets/images/about/church-hero.webp');assert(fs.existsSync(b.image));
 const h=read('church-building.html');for(const s of ['Weeping Chancel','symbolic','Belgium','Bohemia','1938','Sources &amp; further reading'])assert(h.includes(s));assert(!h.includes('Great Fire'));assert(!h.includes('leper'));
 assert.match(read('churchyard.html'),/Carole Brough Fuller/);assert.match(read('churchyard.html'),/current availability has not been confirmed/);
 const files=['index.html','war-memorial.html','history-entry-philippa-walton.html','site.js','feedback.js'];
 const before=files.map(f=>read(f));cp.execFileSync(process.execPath,['build-content-pages.js','church-building','churchyard']);files.forEach((f,i)=>assert.equal(read(f),before[i],f));
 assert.throws(()=>cp.execFileSync(process.execPath,['build-content-pages.js','unknown-history-page'],{stdio:'pipe'}));
});
