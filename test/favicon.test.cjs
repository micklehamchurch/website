const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const fav=require('../build-favicon-references.cjs'),root=path.resolve(__dirname,'..'),start='d95cce9c01965c727cb93568d51afc91c138565c';
const read=f=>fs.readFileSync(path.join(root,f));
test('all public pages have consistent, idempotent local favicon references, including nested pages',()=>{
 for(const f of fav.files(root)){const s=read(f).toString();assert(s.includes(fav.markup),f);assert.equal(fav.apply(s),s,f);const head=s.match(/<head\b[\s\S]*?<\/head>/i)[0];assert.equal((head.match(/rel="(?:icon|apple-touch-icon)"/g)||[]).length,6,f);for(const m of head.matchAll(/href="([^"?]*(?:favicon[^"?]*|apple-touch-icon\.png))\?v=/g)){const base=f.startsWith('_templates/')?'':s.includes('<base href="../"')?'':path.posix.dirname(f)+'/';assert(fs.existsSync(path.join(root,base,m[1])),f+' '+m[1]);}}
});
test('favicon changes preserve every public page body and the illustrated header logo',()=>{
 for(const f of fav.files(root)){const old=cp.execFileSync('git',['show',start+':'+f],{cwd:root,encoding:'utf8'}).replace(/\r/g,''),now=read(f).toString().replace(/\r/g,'');assert.equal(now.replace(/<head\b[\s\S]*?<\/head>/i,''),old.replace(/<head\b[\s\S]*?<\/head>/i,''),f);assert.equal(now,fav.apply(old),f);}
 for(const f of ['assets/images/branding/church-illustration.svg','site.js','public-header.js','header-navigation.css','admin/favicon.ico','admin/apple-touch-icon.png'])assert.equal(read(f).toString().replace(/\r/g,''),cp.execFileSync('git',['show',start+':'+f],{cwd:root}).toString().replace(/\r/g,''),f);
});
test('PNG and legacy ICO assets contain the required exact resolutions',()=>{
 for(const [f,size]of [['favicon-16x16.png',16],['favicon-32x32.png',32],['favicon-48x48.png',48],['apple-touch-icon.png',180]]){const b=read(f);assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 const ico=read('favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);assert.deepEqual(Array.from({length:3},(_,i)=>ico[6+16*i]),[16,32,48]);
});
test('SVG is self-contained and retains green spire, blue clock and original golden cockerel contour',()=>{const s=read('favicon.svg').toString(),original=read('assets/images/branding/church-illustration.svg').toString();assert(s.includes('viewBox="0 0 64 64"'));assert(!/<(?:script|image|text)|(?:href=|https?:)/i.test(s.replace('http://www.w3.org/2000/svg','')));for(const color of ['#004e2f','#b18510','#0068b0'])assert(s.includes(color),color);const paths=[...original.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)];assert(s.includes(paths[4][1]));});

