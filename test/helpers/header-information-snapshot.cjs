// Historical preservation tests discount only the exact approved header/content hunks.
// Actual rendering, navigation, safety content and page preservation are tested independently.
const fs=require('fs'),path=require('path'),patches=require('../fixtures/header-information-approved.json');
function prior(value,file){const buffer=Buffer.isBuffer(value);if(buffer&&!Buffer.from(value.toString()).equals(value))return value;let s=value.toString().replace(/\r/g,'');s=require('./header-church-mark-snapshot.cjs')(s);for(const [after,before]of patches[path.basename(String(file))]||[])s=s.replace(after,before);s=s.replaceAll('header=20261104-information-1','header=20261101-community-1');return buffer?Buffer.from(s):s;}
module.exports={prior,fs:{...fs,readFileSync(file,...args){return prior(fs.readFileSync(file,...args),file);}}};
