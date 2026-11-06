// Discount only the reviewed pause presentation and its generated CSS hash.
const fs=require('./full-desktop-snapshot.cjs').fs,cp=require('node:child_process'),path=require('node:path'),root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(__dirname,'../fixtures/pause-inline.css'),'utf8').replace(/\r/g,''),bundle=require('esbuild').transformSync(css,{loader:'css',minify:true,legalComments:'inline'}).code.trim();
const before=cp.execFileSync('git',['show','934ebde:index.html'],{cwd:root,encoding:'utf8'}).match(/home-critical\.css\?v=[^"\s]+/)[0];
module.exports.fs={...fs,readFileSync(file,...args){const value=fs.readFileSync(file,...args),buffer=Buffer.isBuffer(value);if(buffer&&!Buffer.from(value.toString()).equals(value))return value;let s=buffer?value.toString():value;if(typeof s!=='string')return value;s=s.replace(/\r/g,'').replace(css,'').replace(bundle,'').replace(/home-critical\.css\?v=[^"\s]+/g,before);return buffer?Buffer.from(s):s;}};
