// Keep this document integration independent of unrelated public/Home builds.
const fs=require('fs'),cp=require('child_process');
const selected=['funerals','churchyard','churchyard-regulations'];
if(process.env.BEFORE_SHA){const before=JSON.parse(cp.execFileSync('git',['show',process.env.BEFORE_SHA+':content-pages.json'],{encoding:'utf8'})),after=JSON.parse(fs.readFileSync('content-pages.json','utf8'));const rest=d=>JSON.stringify({...d,pages:d.pages.filter(p=>!selected.includes(p.slug))});if(rest(before)!==rest(after))throw Error('Churchyard build refuses unrelated topic model changes');}
for(const[file,args]of[['build-content-pages.js',selected],['build-typography-preview.js',[]],['build-search-index.js',[]]])cp.execFileSync(process.execPath,[file,...args],{stdio:'inherit'});
