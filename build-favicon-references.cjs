// Static head metadata only; never changes public page bodies or Admin assets.
const fs=require('fs'),path=require('path');
const version='church-tower-20261106';
const markup=[
 `<link rel="icon" href="favicon.ico?v=${version}" sizes="any">`,
 `<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png?v=${version}">`,
 `<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png?v=${version}">`,
 `<link rel="icon" type="image/png" sizes="48x48" href="favicon-48x48.png?v=${version}">`,
 `<link rel="icon" type="image/svg+xml" sizes="any" href="favicon.svg?v=${version}">`,
 `<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png?v=${version}">`
].join('\n  ');
const iconTag=/<link\b(?=[^>]*\brel=["'](?:icon|apple-touch-icon)["'])[^>]*>/gi;
function apply(html){return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi,head=>{const tags=[...head.matchAll(iconTag)];if(!tags.length)return head.replace(/<head\b[^>]*>/i,s=>s+markup);const first=tags[0],last=tags.at(-1),end=last.index+last[0].length,block=head.slice(first.index,end);if(!block.replace(iconTag,'').trim())return head.slice(0,first.index)+markup+head.slice(end);let used=false;return head.replace(iconTag,()=>used?'':(used=true,markup));});}
function files(root=__dirname){const result=fs.readdirSync(root).filter(f=>f.endsWith('.html'));for(const dir of ['news','pews-news','_templates']){const walk=base=>{if(!fs.existsSync(path.join(root,base)))return;for(const e of fs.readdirSync(path.join(root,base),{withFileTypes:true})){const f=base+'/'+e.name;if(e.isDirectory())walk(f);else if(f.endsWith('.html'))result.push(f);}};walk(dir);}return result;}
function build(root=__dirname){let changed=0;for(const file of files(root)){const p=path.join(root,file),before=fs.readFileSync(p,'utf8'),after=apply(before);if(after!==before){fs.writeFileSync(p,after);changed++;}}return changed;}
module.exports={apply,build,files,markup,version};
if(require.main===module)console.log(`Updated favicon metadata in ${build()} public/template pages.`);
