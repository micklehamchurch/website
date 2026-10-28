const test=require('node:test'),assert=require('node:assert/strict');
const queue=require('../admin/photo-upload-queue');
const id=i=>'upload:12345678-1234-1234-1234-'+String(i).padStart(12,'0');
const items=n=>Array.from({length:n},(_,i)=>({id:id(i),file:{name:`photo-${i}.jpg`,type:'image/jpeg',size:3000000},state:'waiting'}));
test('selection limits accept 1, 4, 10, 20, exactly 200 MB; reject 21 and above 200 MB',()=>{
 for(const n of [1,4,10,20])assert.equal(queue.validateSelection(items(n).map(p=>p.file)),'');
 assert.equal(queue.validateSelection(Array.from({length:20},()=>({size:10000000}))), '');
 assert.match(queue.validateSelection(items(21).map(p=>p.file)),/21 photographs/);
 assert.match(queue.validateSelection([{size:200000001}]),/200 MB/);
 assert.match(queue.validateSelection(items(1).map(p=>p.file),items(20).map(p=>p.file)),/21/);
 for(const [name,type]of [['camera.heic','image/heic'],['script.svg','image/svg+xml'],['camera.jpg','text/html']])assert(!queue.supported({name,type}));
});
test('1, 4, 10, 20 photographs are processed serially with useful status and no re-upload of completed items',async()=>{
 for(const n of [1,4,10,20]){const list=items(n),states=[],calls=[];let active=0,max=0;
 const handlers={prepare:async f=>{max=Math.max(max,++active);await new Promise(r=>setTimeout(r,2));return f;},upload:async(p)=>{calls.push(p.id);active--;},onChange:p=>states.push(p.state)};
 assert.deepEqual(await queue.run(list,handlers),{complete:n,failed:0,remaining:0});assert.equal(max,1);assert.equal(calls.length,n);assert(states.includes('optimising')&&states.includes('uploading')&&states.includes('complete'));
 await queue.run(list,handlers);assert.equal(calls.length,n);
 }
});
test('one invalid item preserves earlier successes, continues safe items and retries only the failed photo',async()=>{
 const list=items(20),calls=[];let fail=true;
 const handlers={prepare:async f=>f,upload:async p=>{calls.push(p.id);if(p.id===id(16)&&fail)throw queue.error('album-invalid-image');}};
 assert.deepEqual(await queue.run(list,handlers),{complete:19,failed:1,remaining:0});assert.equal(list[15].state,'complete');assert.equal(list[16].state,'failed');assert.equal(list[19].state,'complete');
 fail=false;await queue.run(list,handlers);assert.equal(calls.length,21);assert.equal(calls.at(-1),id(16));
});
test('an uncertain commit pauses later work instead of risking duplicate albums',async()=>{
 const list=items(4);await queue.run(list,{prepare:async f=>f,upload:async p=>{if(p.id===id(1))throw queue.error('network-failure');}});
 assert.deepEqual(list.map(p=>p.state),['complete','failed','waiting','waiting']);
});
function fixture(){const photo={id:'old',alt:'Old',caption:''},album={id:'album',title:'Title',context:'',status:'draft',cover:'old',photos:[photo]};let snapshot={ok:true,sha:'a'.repeat(40),headSha:'b'.repeat(40),albums:[album]};return {getSnapshot:()=>snapshot,setSnapshot:s=>snapshot=s,item:{id:id(1)},payload:{id:'album',album:{title:album.title,context:album.context,status:album.status,cover:album.cover,photos:[photo,{id:id(1),alt:'New',caption:''}]},uploads:[{}]}};}
test('lost success response is reconciled by stable receipt without duplicate submission',async()=>{
 const f=fixture();let calls=0;const album={...structuredClone(f.payload.album),id:'album'};album.photos[1].id=queue.receipt(id(1));
 const result=await queue.saveSafely({...f,api:{save:async()=>{calls++;return {ok:false,category:'network-failure'};},load:async()=>({...f.getSnapshot(),albums:[album]})},wait:async()=>{}});
 assert.equal(result.albumId,'album');assert.equal(calls,1);
});
test('transient failure retries only after checking current data; unrelated album changes are preserved',async()=>{
 const f=fixture();let calls=0;const latest={...f.getSnapshot(),sha:'c'.repeat(40),headSha:'d'.repeat(40),albums:[...f.getSnapshot().albums,{id:'other',photos:[]}]};
 const result=await queue.saveSafely({...f,api:{save:async p=>{calls++;if(calls===1)return {ok:false,category:'album-save-unavailable'};assert.equal(p.sha,latest.sha);return {...latest,ok:true,albumId:'album'};},load:async()=>latest},wait:async()=>{}});
 assert.equal(calls,2);assert.equal(result.albums.length,2);
});
test('concurrent edit to the same album is never overwritten; repeated transient failures are bounded',async()=>{
 const f=fixture();let calls=0;
 await assert.rejects(queue.saveSafely({...f,api:{save:async()=>{calls++;return {ok:false,category:'album-version-conflict'};},load:async()=>({...f.getSnapshot(),albums:[{...f.getSnapshot().albums[0],title:'Another editor'}]})},wait:async()=>{}}),/album-version-conflict/);assert.equal(calls,1);
 const g=fixture();calls=0;await assert.rejects(queue.saveSafely({...g,api:{save:async()=>{calls++;return {ok:false,category:'network-failure'};},load:async()=>g.getSnapshot()},wait:async()=>{}}),/network-failure/);assert.equal(calls,3);
});
