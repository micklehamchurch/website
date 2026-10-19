const test=require('node:test'),assert=require('node:assert/strict'),M=require('../bible-pages-model');
const bounds={left:0,right:390,width:390,top:0,bottom:600},start={x:5,y:200,at:0};
test('tap zones are narrow edges; selection, long press, drag and interactive targets take precedence',()=>{
 assert.equal(M.tapDirection(start,{...start,at:100},bounds),-1);
 assert.equal(M.tapDirection({x:385,y:200,at:0},{x:385,y:200,at:100},bounds),1);
 for(const [a,b,blocked] of [[{x:150,y:200,at:0},{x:150,y:200,at:100},false],[start,{...start,at:500},false],[start,{x:100,y:200,at:100},false],[start,{...start,at:100},true],[start,{x:-1,y:200,at:100},false]])assert.equal(M.tapDirection(a,b,bounds,blocked),0);
});
test('readable facing pages switch to single pages for narrow, short and enlarged-text layouts',()=>{
 for(const width of [320,375,390,430,768,844])assert.equal(M.layoutColumns(width,844,20),1);
 for(const width of [960,1024,1360,1440,1920])assert.equal(M.layoutColumns(width,800,20),2);
 assert.equal(M.layoutColumns(1200,390,20),1);assert.equal(M.layoutColumns(1024,800,38),1);
});
test('semantic bookmark and progress offsets survive repeated pagination widths instead of relying on page numbers',()=>{
 const units=Array.from({length:1000},()=>({text:'synthetic '}));const offset=537;
 for(const size of [130,34,55,160,24,130]){const pages=M.paginate(units,(s,e)=>e-s<=size),index=M.pageForOffset(pages,offset);assert(pages[index].start<=offset&&pages[index].end>offset);assert.equal(M.bookmarkPage({translation:'niv',chapter:'GEN.1',offset},{translation:'niv',chapter:'GEN.1'},pages),index)}
});
