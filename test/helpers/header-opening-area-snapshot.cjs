// Permit only the reviewed hit-area correction in historical visual/source freezes.
const {append,minified}=require('../fixtures/header-opening-area.json');
module.exports=value=>{const text=value.replace(/\r/g,'');return text.endsWith(append)?text.slice(0,-append.length):text.replace(minified,'');};
