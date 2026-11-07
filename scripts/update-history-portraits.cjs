// Render only the approved feature; never regenerate unrelated history pages.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),{validate,hub}=require('../build-history-hub');
const data=validate(JSON.parse(fs.readFileSync(path.join(root,'_content/history.json'))),root,JSON.parse(fs.readFileSync(path.join(root,'_content/clergy.json'))).records),file=path.join(root,'our-history.html'),before=fs.readFileSync(file,'utf8'),pattern=/<!-- clergy-history:start -->[\s\S]*?<!-- clergy-history:end -->/,feature=hub(data).match(pattern)?.[0];
if(!feature||!pattern.test(before))throw Error('History portrait feature missing');fs.writeFileSync(file,before.replace(pattern,()=>feature));
