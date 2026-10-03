const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createGoogleSyncHandler,PATHS}=require('../src/google-calendar-sync');
const {parseGoogleCalendar}=require('../src/google-calendar-adapter');
const raw=fs.readFileSync(path.join(__dirname,'../../_sync/fixtures/google-stage1.ics'),'utf8');
const baseCalendar=require('../../_sync/fixtures/website-before-stage1.json'),baseRegistry=require('../../_sync/fixtures/registry-before-stage1.json');
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),D='d'.repeat(40);
const principal={auth_typ:'aad',claims:Object.entries({tid:'9188040d-6c67-4c5b-b112-36a304b66dad',oid:'00000000-0000-0000-f978-44e4d44cc925',sub:'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc',iss:'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0'}).map(([typ,val])=>({typ,val}))};
function request(method='GET',body,identity=principal){return{method,query:new URLSearchParams(),headers:new Headers({'content-type':'application/json',...(identity?{'x-ms-client-principal':Buffer.from(JSON.stringify(identity)).toString('base64')}:{})}),body:new Blob([JSON.stringify(body||{})]).stream()};}
const reviewBody=r=>({headSha:r.headSha,calendarSha:r.calendarSha,registrySha:r.registrySha,reviewDigest:r.reviewDigest,confirm:true});
function fixture(options={}){
 const {emptyState}=require('../src/google-sync-store');let runtime=emptyState();
 const store={read:async()=>structuredClone(runtime),locked:async action=>action({state:structuredClone(runtime),guard:async()=>{},save:async value=>{runtime=structuredClone(value);}})};
 const state={head:A,calendar:structuredClone(baseCalendar),registry:structuredClone(baseRegistry)},reads=[],writes=[],permissions=[],blobs=new Map();let blobIndex=0;
 const target={owner:'micklehamchurch',repo:'website'};
 const checked=p=>{assert.equal(p.owner,target.owner);assert.equal(p.repo,target.repo);};
 const client={rest:{repos:{getContent:async p=>{checked(p);assert.equal(p.ref,state.head);reads.push(p);return{data:{type:'file',path:p.path,encoding:'base64',sha:p.path===PATHS.calendar?B:C,content:Buffer.from(JSON.stringify(p.path===PATHS.calendar?state.calendar:state.registry)).toString('base64')}};}},git:{
  getRef:async p=>{checked(p);assert.equal(p.ref,'heads/Dev');return{data:{object:{sha:state.head}}};},
  getCommit:async p=>{checked(p);assert.equal(p.commit_sha,state.head);return{data:{tree:{sha:A}}};},
  createBlob:async p=>{checked(p);const sha=(++blobIndex).toString(16).padStart(40,'0');blobs.set(sha,JSON.parse(Buffer.from(p.content,'base64')));writes.push(p);return{data:{sha}};},
  createTree:async p=>{checked(p);assert(p.tree.every(e=>Object.values(PATHS).includes(e.path)));state.pending=p.tree;return{data:{sha:D}};},
  createCommit:async p=>{checked(p);assert.deepEqual(p.parents,[state.head]);return{data:{sha:D}};},
  updateRef:async p=>{checked(p);assert.equal(p.ref,'heads/Dev');assert.equal(p.force,false);if(options.race)throw Object.assign(Error('private upstream'),{status:422});for(const entry of state.pending)state[entry.path===PATHS.calendar?'calendar':'registry']=blobs.get(entry.sha);state.head=p.sha;}
 }}};
 const handler=createGoogleSyncHandler({store,readConfiguration:()=>({}),createClient:async(c,p)=>{permissions.push(p);return client;},fetchFeed:options.fetchFeed||(async()=>parseGoogleCalendar(raw)),now:()=> '2026-10-03T12:00:00Z'});
 return{handler,state,reads,writes,permissions};
}
test('authenticated dry-run performs no write; explicit apply atomically publishes only two fixed Dev paths; unchanged repeat makes no commit',async()=>{
 const f=fixture(),check=await f.handler(request());assert.equal(check.status,200);assert.equal(f.writes.length,0);assert.deepEqual(f.permissions,['read']);assert.equal(check.jsonBody.report.additions.length,2);
 const apply=await f.handler(request('POST',reviewBody(check.jsonBody)));assert.equal(apply.status,200);assert.equal(f.state.calendar.events.length,22);assert.equal(f.writes.length,2);
 const second=await f.handler(request());assert.equal(second.jsonBody.canApply,false);const again=await f.handler(request('POST',reviewBody(second.jsonBody)));assert.equal(again.jsonBody.unchanged,true);assert.equal(f.writes.length,2);
});
test('missing identity, wrong administrator and browser-supplied identity cannot reach Google or GitHub',async()=>{
 const wrong=structuredClone(principal);wrong.claims.find(e=>e.typ==='sub').val+='x';
 for(const [identity,status] of [[null,401],[{auth_typ:'aad',claims:[]},401],[wrong,403]]){const f=fixture();const r=request('POST',{administrator:true,email:'edward.popov@outlook.com'},identity);r.headers.set('x-admin-authorized','true');assert.equal((await f.handler(r)).status,status);assert.equal(f.reads.length,0);assert.equal(f.permissions.length,0);}
});
test('unreviewed requests, caller URLs, stale SHA, changed Google review and a competing commit fail without publication',async()=>{
 const f=fixture(),check=(await f.handler(request())).jsonBody;
 assert.equal((await f.handler(request('POST',{...reviewBody(check),url:'https://example.org'}))).status,400);
 assert.equal((await f.handler(request('POST',{...reviewBody(check),confirm:false}))).status,400);
 assert.equal((await f.handler(request('POST',{...reviewBody(check),calendarSha:A}))).status,409);
 assert.equal((await f.handler(request('POST',{...reviewBody(check),reviewDigest:'0'.repeat(64)}))).status,409);assert.equal(f.writes.length,0);
 const race=fixture({race:true}),before=(await race.handler(request())).jsonBody;assert.equal((await race.handler(request('POST',reviewBody(before)))).status,409);assert.deepEqual(race.state.calendar,baseCalendar);assert.deepEqual(race.state.registry,baseRegistry);
});
test('unavailable/malformed feed returns only a safe error and makes no write',async()=>{
 const f=fixture({fetchFeed:async()=>{throw Error('private transport detail');}}),r=await f.handler(request());assert.equal(r.status,502);assert.deepEqual(r.jsonBody,{ok:false,error:'google-feed-unavailable'});assert.equal(f.writes.length,0);
});
