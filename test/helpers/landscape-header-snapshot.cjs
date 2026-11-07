// Older preservation tests discount only the independently tested landscape CSS
// addition and its delivery keys. No page-body or navigation-content changes.
const fs=require('./pause-inline-snapshot.cjs').fs,path=require('node:path'),cp=require('node:child_process');
const css=fs.readFileSync(path.join(__dirname,'../fixtures/landscape-header.css'),'utf8').replace(/\r/g,''),root=path.resolve(__dirname,'../..');
const before=cp.execFileSync('git',['show','39deb5f:index.html'],{cwd:root,encoding:'utf8'}).match(/home-critical\.css\?v=[^"\s]+/)[0];
const bundle=require('esbuild').transformSync(css,{loader:'css',minify:true,legalComments:'inline'}).code.trim();
module.exports.fs={...fs,readFileSync(file,...args){const value=fs.readFileSync(file,...args),buffer=Buffer.isBuffer(value);if(buffer&&!Buffer.from(value.toString()).equals(value))return value;let s=buffer?value.toString():value;if(typeof s!=='string')return value;s=s.replace(/\r/g,'').replace(css,'').replace(bundle,'').replaceAll('navigation=20261106-landscape-1','navigation=20261104-church-mark-1').replace(/home-critical\.css\?v=[^"\s]+/g,before);return buffer?Buffer.from(s):s;}};
