const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createGoogleSyncService,PATHS}=require('../src/google-sync-service');
const {parseGoogleCalendar}=require('../src/google-calendar-adapter');
const {emptyState}=require('../src/google-sync-store');
const raw=fs.readFileSync(path.join(__dirname,'../../_sync/fixtures/google-stage1.ics'),'utf8');
const calendar=require('../../_content/calendar.json'),registry=require('../../_sync/google-calendar.json');
const principal={auth_typ:'aad',claims:Object.entries({tid:'9188040d-6c67-4c5b-b112-36a304b66dad',oid:'00000000-0000-0000-f978-44e4d44cc925',sub:'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc',iss:'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0'}).map(([typ,val])=>({typ,val}))};
function request(method='GET',body,identity=principal){return{method,query:new URLSearchParams(),headers:new Headers({'content-type':'application/json',...(identity?{'x-ms-client-principal':Buffer.from(JSON.stringify(identity)).toString('base64')}:{})}),body:new Blob([JSON.stringify(body||{})]).stream()};}
function fixture(options={}) {
  const state={calendar:structuredClone(calendar),registry:structuredClone(registry),head:'a'.repeat(40),runtime:emptyState(),feed:parseGoogleCalendar(raw),at:'2026-10-03T08:00:00Z',writes:[],saved:0};
  const blobs=new Map();let index=0;
  const target=p=>{assert.equal(p.owner,'micklehamchurch');assert.equal(p.repo,'website');};
  const client={rest:{repos:{getContent:async p=>{target(p);assert.equal(p.ref,state.head);assert(Object.values(PATHS).includes(p.path));return{data:{type:'file',path:p.path,encoding:'base64',sha:(p.path===PATHS.calendar?'b':'c').repeat(40),content:Buffer.from(JSON.stringify(p.path===PATHS.calendar?state.calendar:state.registry)).toString('base64')}};}},git:{
    getRef:async p=>{target(p);assert.equal(p.ref,'heads/Dev');return{data:{object:{sha:state.head}}};},
    getCommit:async p=>{target(p);assert.equal(p.commit_sha,state.head);return{data:{tree:{sha:'d'.repeat(40)}}};},
    createBlob:async p=>{target(p);const sha=(++index).toString(16).padStart(40,'0');blobs.set(sha,JSON.parse(Buffer.from(p.content,'base64')));return{data:{sha}};},
    createTree:async p=>{target(p);assert(p.tree.every(e=>Object.values(PATHS).includes(e.path)));state.pending=p.tree;return{data:{sha:'e'.repeat(40)}};},
    createCommit:async p=>{target(p);assert.deepEqual(p.parents,[state.head]);return{data:{sha:(++index).toString(16).padStart(40,'0')}};},
    updateRef:async p=>{target(p);assert.equal(p.ref,'heads/Dev');assert.equal(p.force,false);if(options.race)throw Object.assign(Error('fixture'),{status:422});for(const e of state.pending)state[e.path===PATHS.calendar?'calendar':'registry']=blobs.get(e.sha);state.head=p.sha;state.writes.push(p);}
  }}};
  const store={read:async()=>structuredClone(state.runtime),locked:async action=>{if(options.busy)return{busy:true};return action({state:structuredClone(state.runtime),guard:async()=>{if(options.lostLease)throw Error('fixture lock lost');},save:async value=>{state.runtime=structuredClone(value);state.saved++;}});}};
  const dependencies={store,readConfiguration:()=>({}),createClient:async(c,p)=>{if(options.earlyRace&&p==='write')state.head='f'.repeat(40);return client;},fetchFeed:async()=>{if(state.failure)throw state.failure;return structuredClone(state.feed);},now:()=>state.at};
  return {state,dependencies,service:createGoogleSyncService(dependencies)};
}
function add(state,{uid='new-meeting@google.com',title='Parish meeting',start='2026-12-02T10:00',end='2026-12-02T11:00',recurrenceId=''}={}) {
  const {fingerprint}=require('../src/google-calendar-adapter');
  const value={title,start,end,allDay:false,location:'',description:''};
  state.feed.rows.push({uid,recurrenceId,key:JSON.stringify([uid,recurrenceId]),state:value,fingerprint:fingerprint(value)});
  state.feed.fingerprint=fingerprint(state.feed.rows.map(r=>[r.key,r.state]));
}
module.exports={fixture,request,principal,add,raw};
