const test=require('node:test'),assert=require('node:assert/strict'),M=require('../bible-pages-model');
const store=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const place=(n=0,translation='niv')=>({v:1,translation,book:'JHN',chapter:'JHN.3',reference:`John 3:${n+1}`,offset:n*30,page:n,createdAt:n+1});
test('Saved Places persist multiple semantic positions with no page identity or Scripture content',()=>{
 const s=store();assert.deepEqual(M.readPlaces(s),[]);assert(M.writePlaces(s,[place(0),place(1)]));const list=M.readPlaces(s);
 assert.equal(list.length,2);assert.equal(list[0].offset,30);assert(!('page' in list[0]));assert(!('content' in list[0]));assert.equal(M.readPlaces(s)[0].id,list[0].id);
});
test('migration writes before removing legacy, is idempotent, and keeps Continue Reading byte-identical',()=>{
 const s=store();M.save(s,'bookmark',place(2));M.save(s,'last',place(4));const last=s.getItem(M.keys.last);
 const a=M.readPlaces(s);assert.equal(a.length,1);assert.equal(a[0].offset,60);assert.equal(s.getItem(M.keys.bookmark),null);assert.deepEqual(M.readPlaces(s),a);assert.equal(s.getItem(M.keys.last),last);
 M.writePlaces(s,[]);assert.deepEqual(M.readPlaces(s),[],'deleted migrated item never reappears');
});
test('failed migration preserves legacy and unavailable storage never crashes reading',()=>{
 const s=store();M.save(s,'bookmark',place());s.setItem=()=>{throw Error('quota')};assert.equal(M.readPlaces(s).length,1);assert(s.getItem(M.keys.bookmark));assert.equal(M.writePlaces(s,[]),false);assert.deepEqual(M.readPlaces(null),[]);
});
test('corrupted collections recover valid records and discard unsafe schema metadata',()=>{
 const s=store();for(const raw of ['{','null','{}','"obsolete"']){s.setItem(M.keys.places,raw);assert.deepEqual(M.readPlaces(s),[]);}
 s.setItem(M.keys.places,JSON.stringify({v:2,items:[place(0),null,{...place(2),translation:'bad'},place(1),{...place(),offset:-1}]}));assert.equal(M.readPlaces(s).length,2);
});
test('stable translation/chapter/offset identity deduplicates independently of visual pages',()=>{
 const s=store();M.writePlaces(s,[place(),{...place(),page:50},place(0,'nirv')]);assert.equal(M.readPlaces(s).length,2);assert.equal(M.placeId(place()),M.placeId({...place(),page:50}));
});
test('rename and delete affect only one entry and never Continue Reading; blank names trim to reference-only',()=>{
 const s=store();M.save(s,'last',place(8));const last=s.getItem(M.keys.last);M.writePlaces(s,[place(0),place(1)]);let list=M.readPlaces(s),id=list[0].id;
 M.writePlaces(s,list.map(p=>p.id===id?{...p,name:'  Comfort  '}:p));list=M.readPlaces(s);assert.equal(list[0].name,'Comfort');assert.equal(list[1].name,'');
 M.writePlaces(s,list.map(p=>p.id===id?{...p,name:'   '}:p));assert.equal(M.readPlaces(s)[0].name,'');
 M.writePlaces(s,M.readPlaces(s).filter(p=>p.id!==id));assert.equal(M.readPlaces(s).length,1);assert.equal(s.getItem(M.keys.last),last);
});
test('custom names remain literal plain metadata, bounded and trimmed; no supplied extra fields persist',()=>{
 const s=store(),name='<img src=x onerror=alert(1)>';M.writePlaces(s,[{...place(),name,content:'must not persist',html:'must not persist'}]);const p=M.readPlaces(s)[0];assert.equal(p.name,name);assert(!JSON.stringify(p).includes('must not persist'));
 M.writePlaces(s,[{...place(),name:' x'.repeat(100)}]);assert(M.readPlaces(s)[0].name.length<=80);
 assert.doesNotMatch(require('node:fs').readFileSync('bible-pages.js','utf8'),/innerHTML|insertAdjacentHTML/);
});
test('100 places fit; overflowing writes fail without silently deleting existing entries',()=>{
 const s=store(),list=Array.from({length:100},(_,i)=>place(i));assert(M.writePlaces(s,list));const original=s.getItem(M.keys.places);assert.equal(M.writePlaces(s,[...list,place(100)]),false);assert.equal(s.getItem(M.keys.places),original);
});
test('rename/open ordering stays saved-time order and ribbon identity survives responsive repagination',()=>{
 const s=store();M.writePlaces(s,[place(0),place(1),place(2)]);const list=M.readPlaces(s);M.writePlaces(s,list.map(p=>({...p,name:'Same'})));assert.deepEqual(M.readPlaces(s).map(p=>p.id),list.map(p=>p.id));
 for(const width of [15,45,120]){const pages=M.paginate(Array.from({length:200},()=>({})),(a,b)=>b-a<=width);for(const p of list){const n=M.bookmarkPage(p,{translation:'niv',chapter:'JHN.3'},pages);assert(pages[n].start<=p.offset&&pages[n].end>p.offset);}}
});
