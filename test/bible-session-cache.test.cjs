const test = require('node:test');
const assert = require('node:assert/strict');
const create = require('../bible-session-cache');
const chapter = (n=1) => ({data:{content:Array.from({length:n},(_,i)=>`[${i+1}] Synthetic test text.`).join('\n'),copyright:'Synthetic notice'},meta:{fumsToken:'synthetic-token'}});
function cache(){let now=0;const timers=[];return {c:create(()=>now,(fn)=>{timers.push(fn);}),advance:n=>now+=n,timers};}
test('hits, concurrent deduplication, exact translation/chapter keys and immutable response copies',async()=>{
 const {c}=cache();let calls=0;const load=async()=>{calls++;return chapter();};
 const [a,b]=await Promise.all([c.get('niv/chapters/JHN.1',load),c.get('niv/chapters/JHN.1',load)]);
 assert.equal(calls,1);a.data.content='changed';assert.notEqual(b.data.content,'changed');
 assert.notEqual((await c.get('niv/chapters/JHN.1',load)).data.content,'changed');
 await c.get('nirv/chapters/JHN.1',load);await c.get('niv/chapters/JHN.2',load);assert.equal(calls,3);
});
test('five minute absolute expiry does not extend on hits, and scheduled expiry evicts',async()=>{
 const {c,advance,timers}=cache();let calls=0;const load=async()=>{calls++;return chapter();};
 await c.get('niv/chapters/JHN.1',load);advance(299999);await c.get('niv/chapters/JHN.1',load);assert.equal(calls,1);
 advance(1);await c.get('niv/chapters/JHN.1',load);assert.equal(calls,2);
 timers.at(-1)();await c.get('niv/chapters/JHN.1',load);assert.equal(calls,3);
});
test('failure and malformed or incomplete content never poison the cache',async()=>{
 for(const bad of [null,{data:null},{data:{}},{data:[]},{data:{content:'unmarked text',copyright:'x'},meta:{fumsToken:'t'}},{...chapter(),meta:{}},{data:{...chapter().data,copyright:''},meta:{fumsToken:'t'}}]){
 const {c}=cache();let calls=0;await c.get('niv/chapters/JHN.1',async()=>{calls++;return bad;});await c.get('niv/chapters/JHN.1',async()=>{calls++;return chapter();});assert.equal(calls,2);
 }
 const {c}=cache();await assert.rejects(c.get('niv/chapters/JHN.1',async()=>{throw Error('network');}));
 assert.deepEqual(await c.get('niv/chapters/JHN.1',async()=>chapter()),chapter());
});
test('metadata is reused and the four-chapter / fewer-than-500-verse limits evict oldest entries',async()=>{
 const {c}=cache();let calls=0;const metadata=async()=>{calls++;return {data:[{id:'JHN'}]};};
 await c.get('niv/books',metadata);await c.get('niv/books',metadata);assert.equal(calls,1);
 for(let i=1;i<=5;i++)await c.get(`niv/chapters/JHN.${i}`,async()=>chapter());
 let misses=0;await c.get('niv/chapters/JHN.1',async()=>{misses++;return chapter();});assert.equal(misses,1);
 const {c:v}=cache();for(let i=1;i<=3;i++)await v.get(`niv/chapters/JHN.${i}`,async()=>chapter(176));
 await v.get('niv/chapters/JHN.1',async()=>{misses++;return chapter();});assert.equal(misses,2);
});
test('malformed retained entries and oversized bodies are refetched instead of served',async()=>{
 for(const entry of [{until:100,json:'{'},{until:100,json:'{"data":null}'},{until:NaN,json:'{}'}]){
  const entries=new Map([['niv/chapters/JHN.1',entry]]),c=create(()=>0,()=>null,entries);let calls=0;
  assert.deepEqual(await c.get('niv/chapters/JHN.1',async()=>{calls++;return chapter();}),chapter());assert.equal(calls,1);
 }
 const {c}=cache();let calls=0;const load=async()=>{calls++;return {...chapter(),extra:'x'.repeat(600000)};};
 await c.get('niv/chapters/JHN.1',load);await c.get('niv/chapters/JHN.1',load);assert.equal(calls,2);
});
