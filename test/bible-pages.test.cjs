const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../bible-pages-model');
const location = { v:1, translation:'niv', book:'JHN', chapter:'JHN.3', reference:'John 3', page:2, offset:70 };
const memory = () => { const data=new Map(); return { getItem:k=>data.get(k)||null, setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k) }; };
test('measured pages cover every unit exactly once, even across paragraphs',()=>{
 const units=Array.from({length:101},(_,i)=>i%12===0?{paragraph:true}:{text:'sample'});
 const pages=M.paginate(units,(a,b)=>b-a<=11);
 assert.equal(pages[0].start,0);assert.equal(pages.at(-1).end,units.length);
 assert(pages.every((p,i)=>p.end>p.start && (!i||p.start===pages[i-1].end)));
 assert(pages.every(p=>p.end-p.start<=11));
});
test('verse markers stay with following text and oversize units remain reachable',()=>{
 const pages=M.paginate([{text:'one'},{verse:true,text:'2'},{text:'two'}],(a,b)=>b-a<=2);
 assert.deepEqual(pages,[{start:0,end:1},{start:1,end:3}]);
 assert.deepEqual(M.paginate([{text:'oversize'}],()=>false),[{start:0,end:1}]);
});
test('reading offset finds the same words after the page size changes',()=>{
 const units=Array.from({length:100},()=>({text:'sample'}));
 const pages=M.paginate(units,(a,b)=>b-a<=13);
 const p=pages[M.pageForOffset(pages,70)];assert(p.start<=70&&p.end>70);
 assert.equal(M.pageForOffset(pages,999),pages.length-1);
});
test('page turns handle facing pages, the final odd page, and both boundaries',()=>{
 assert.equal(M.turn(0,-1,2,7),0);assert.equal(M.turn(0,1,2,7),2);
 assert.equal(M.turn(4,1,2,7),6);assert.equal(M.turn(6,1,2,7),6);
 assert.equal(M.turn(6,-1,2,7),4);assert.equal(M.turn(0,1,1,7),1);
});
test('arrow shortcuts do not take over form controls or modified keys',()=>{
 assert.equal(M.keyDirection({key:'ArrowRight'},false),1);
 assert.equal(M.keyDirection({key:'ArrowLeft'},false),-1);
 assert.equal(M.keyDirection({key:'ArrowLeft'},true),0);
 for(const modifier of ['altKey','ctrlKey','metaKey','shiftKey'])assert.equal(M.keyDirection({key:'ArrowRight',[modifier]:true},false),0);
 assert.equal(M.keyDirection({key:'Home'},false),0);
});
test('explicit bookmark survives a fresh read and remains separate from automatic position',()=>{
 const storage=memory();assert(M.save(storage,'bookmark',location));
 assert(M.save(storage,'last',{...location,page:4,offset:140}));
 assert.deepEqual(M.read(storage,'bookmark'),location);
 assert.equal(M.read(storage,'last').offset,140);
 assert.notEqual(M.keys.bookmark,M.keys.last);
});
test('only position metadata is written, with no Scripture or provider tokens',()=>{
 const storage=memory();M.save(storage,'last',{...location,content:'private text',fumsToken:'token',copyright:'notice'});
 const stored=JSON.parse(storage.getItem(M.keys.last));assert.deepEqual(stored,location);
});
test('corrupt, unknown, mismatched and unbounded saved states are rejected',()=>{
 for(const invalid of [null,[],{}, {...location,v:2},{...location,translation:'other'},{...location,book:'XXX'},{...location,chapter:'GEN.3'},{...location,chapter:['JHN.3']},{...location,chapter:'JHN.intro'},{...location,chapter:'JHN.22'},{...location,chapter:'JHN.999'},{...location,book:'PSA',chapter:'PSA.151'},{...location,page:-1},{...location,offset:-1},{...location,offset:1000001},{...location,page:1.5},{...location,reference:'x'.repeat(81)}])assert.equal(M.valid(invalid),null);
 for(const raw of ['{broken','null','[]','"string"','x'.repeat(3000)])assert.equal(M.read({getItem:()=>raw},'last'),null);
});
test('unavailable, blocked or full storage never prevents reading',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};
 assert.equal(M.read(blocked,'last'),null);assert.equal(M.save(blocked,'last',location),false);
 assert.equal(M.read(null,'bookmark'),null);assert.equal(M.save(null,'bookmark',location),false);
});

test('swipes turn pages without consuming vertical, slow, selected-text or missing gestures',()=>{
 const start={x:200,y:100,at:0};
 assert.equal(M.swipeDirection(start,{x:90,y:110,at:300}),1);
 assert.equal(M.swipeDirection(start,{x:300,y:105,at:300}),-1);
 assert.equal(M.swipeDirection(start,{x:190,y:250,at:300}),0);
 assert.equal(M.swipeDirection(start,{x:90,y:110,at:2000}),0);
 assert.equal(M.swipeDirection(start,{x:90,y:110,at:300},true),0);
 assert.equal(M.swipeDirection(null,{x:90,y:110,at:300}),0);
});

test('long chapters are measured with page-sized probes rather than full-chapter DOM copies',()=>{
 const units=Array.from({length:10000},()=>({text:'sample'}));let maxProbe=0;
 const pages=M.paginate(units,(a,b)=>{maxProbe=Math.max(maxProbe,b-a);return b-a<=18;});
 assert.equal(pages.at(-1).end,units.length);assert(maxProbe<=32);
});

test('bookmark follows its content offset across layouts, only in the matching chapter and translation',()=>{
 const pages=[{start:0,end:50},{start:50,end:100},{start:100,end:150}];
 assert.equal(M.bookmarkPage(location,location,pages),1);
 assert.equal(M.bookmarkPage(location,{...location,translation:'nirv'},pages),-1);
 assert.equal(M.bookmarkPage(location,{...location,chapter:'JHN.1'},pages),-1);
 assert.equal(M.bookmarkPage(null,location,pages),-1);
 const resized=[{start:0,end:80},{start:80,end:150}];assert.equal(M.bookmarkPage(location,location,resized),0);
});
test('removing an explicit bookmark leaves last reading intact, including after reload',()=>{
 const storage=memory();M.save(storage,'last',location);M.save(storage,'bookmark',location);
 assert(M.remove(storage,'bookmark'));assert.equal(M.read(storage,'bookmark'),null);
 assert.deepEqual(M.read(storage,'last'),location);assert.equal(M.remove(null,'bookmark'),false);
});

test('canonical adjacency rejects malformed locations and stops only at absolute or unavailable-book boundaries',()=>{
 assert.equal(M.adjacentChapter('GEN.1',-1),null);assert.equal(M.adjacentChapter('REV.22',1),null);
 assert.equal(M.adjacentChapter('GEN.50',1),'EXO.1');assert.equal(M.adjacentChapter('EXO.1',-1),'GEN.50');
 assert.equal(M.adjacentChapter('JHN.21',1,['JHN']),null);
 for(const id of ['JHN.1.extra','JHN.0','JHN.22','XXX.1'])assert.equal(M.adjacentChapter(id,1),null);
});
