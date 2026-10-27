// Regenerate only the two architectural/history topic pages for this release.
const fs=require('node:fs'),cp=require('node:child_process');
const selected=new Set(['church-building','churchyard']);
if(process.env.BEFORE_SHA){
 const before=JSON.parse(cp.execFileSync('git',['show',process.env.BEFORE_SHA+':content-pages.json'],{encoding:'utf8'}));
 const after=JSON.parse(fs.readFileSync('content-pages.json','utf8'));
 const unrelated=d=>JSON.stringify({...d,pages:d.pages.filter(p=>!selected.has(p.slug))});
 if(unrelated(before)!==unrelated(after))throw new Error('History-only build refuses unrelated topic changes');
}
for(const [file,args] of [['build-content-pages.js',[...selected]],['build-history-hub.js',[]],['build-search-index.js',[]],['build-typography-preview.js',[]]])cp.execFileSync(process.execPath,[file,...args],{stdio:'inherit'});
