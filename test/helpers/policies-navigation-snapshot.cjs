// Historical freezes discount only the exact reviewed enhancement loader suffix.
// The current menu has independent source-preservation and rendered interaction tests.
const {append}=require('../fixtures/policies-navigation-loader.json');
module.exports=value=>{const buffer=Buffer.isBuffer(value);if(buffer&&!Buffer.from(value.toString()).equals(value))return value;const text=require('./header-opening-area-snapshot.cjs')(value.toString());const result=text.endsWith(append)?text.slice(0,-append.length):text;return buffer?Buffer.from(result):result;};
