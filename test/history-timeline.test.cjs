const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const read=f=>fs.readFileSync(f,'utf8'),data=JSON.parse(read('_content/history.json'));
test('timeline keeps uncertain dating and delivers distinct editorial details',()=>{
 assert.equal(data.timeline.length,7);assert.equal(data.timeline[2].period,'Late 12th century');
 const saxon=read('history-saxon.html');assert.match(saxon,/probably/);assert.match(saxon,/not a documented foundation/);
 const domesday=read('history-domesday.html');assert.match(domesday,/<blockquote/);assert.match(domesday,/There is a Church and two acres of meadow/);assert.match(domesday,/do not tell us when/);
 const norman=read('history-norman.html');assert.match(norman,/Look for it in the church/);assert.match(norman,/three east lancets are 19th-century/);
 const restoration=read('history-restoration.html');for(const year of ['1823','1842','1872','1891'])assert(restoration.includes('<h3>'+year+'</h3>'));assert.match(restoration,/less clearly established/);
 assert.match(read('history-norbury.html'),/Sources differ/);assert.match(read('history-bells.html'),/https:\/\/www.youtube.com\/watch\?v=9eNFCR04xWE/);assert.doesNotMatch(read('history-bells.html'),/<iframe|autoplay/);
 for(const t of data.timeline){const html=read(t.url);assert.match(html,/class="history-period-content"/);for(const id of t.sourceRefs)assert(data.sources.some(s=>s.id===id));}
});
test('timeline upgrade preserves hero, clergy placement, story cards and unrelated global behaviour',()=>{
 const old=f=>cp.execFileSync('git',['show','7ed4865:'+f],{encoding:'utf8'}).replace(/\r/g,''),current=read('our-history.html');
 for(const re of [/<section class="history-hero">[\s\S]*?<\/section>/,/<aside class="history-feature"[\s\S]*?<\/aside>/,/<section class="history-collections"[\s\S]*?<\/section>/])assert.equal(current.match(re)[0],old('our-history.html').match(re)[0]);
 for(const f of ['site.js','responsive-navigation.js','public-header.js','feedback.js','calendar.html','index.html','war-memorial.html'])assert.equal(read(f).replace(/\r/g,''),old(f),f);
 const css=read('our-history.css');assert(css.replace(/\r/g,'').startsWith(old('our-history.css').trimEnd()));
});
