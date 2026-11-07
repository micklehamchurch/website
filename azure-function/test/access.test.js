const test=require('node:test');
const assert=require('node:assert/strict');
const model=require('../src/access-model');
const {createAccessPolicy}=require('../src/access-policy');
const {createAccessHandlers}=require('../src/access-management');
const {createAccessStore}=require('../src/access-store');
const owner={provider:'aad',tenantId:'11111111-1111-1111-1111-111111111111',objectId:'22222222-2222-2222-2222-222222222222',issuer:'https://login.microsoftonline.com/test/v2.0',subject:'owner'};
const editor={...owner,objectId:'33333333-3333-3333-3333-333333333333',subject:'editor'};
const other={...owner,objectId:'44444444-4444-4444-4444-444444444444',subject:'other'};
function request(identity=owner,{method='GET',body,etag}={}){
  const claims=Object.entries({tid:identity?.tenantId,oid:identity?.objectId,iss:identity?.issuer,sub:identity?.subject}).filter(([,val])=>val).map(([typ,val])=>({typ,val}));
  return new Request('https://example.test/api/access/users',{method,headers:{...(identity?{'x-ms-client-principal':Buffer.from(JSON.stringify({auth_typ:'aad',claims})).toString('base64')}:{}),...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
function approved(capabilities=['news'],role='editor'){
  let state=model.bootstrap(owner,'owner@example.org');
  state=model.manage(state,owner,{action:'add',account:'editor@example.org',role,capabilities:role==='owner'?[]:capabilities});
  state=model.enrol(state,editor,'editor@example.org');
  const u=state.users[1];
  return model.manage(state,owner,{action:'approve',id:u.id,reviewKey:u.reviewKey});
}
function memory(state){let etag='v1';return{reads:0,writes:0,async read(){this.reads++;if(!state)throw Error('missing');return{state:structuredClone(state),etag};},async write(next,expected){if(expected!==etag)throw Object.assign(Error('conflict'),{statusCode:412});this.writes++;state=structuredClone(next);etag='v'+(this.writes+1);},set(next){state=next;}};}
test('pending and verified pending accounts have zero access until explicit owner approval',()=>{
  let state=model.bootstrap(owner,'owner@example.org');
  state=model.manage(state,owner,{action:'add',account:'editor@example.org',role:'editor',capabilities:['news']});
  assert.equal(model.resolve(state,editor),null);
  state=model.enrol(state,editor,'editor@example.org');
  assert.equal(state.users[1].status,'awaiting-approval');
  assert.equal(model.resolve(state,editor),null);
  assert.equal(model.allowed(state.users[1],'news'),false);
  assert.throws(()=>model.manage(state,editor,{action:'approve',id:state.users[1].id,reviewKey:state.users[1].reviewKey}),/owner-required/);
  assert.equal(model.resolve(approved(),editor).status,'active');
});
test('email label can never replace immutable binding, candidate cannot be overwritten',()=>{
  const state=approved();assert.equal(model.resolve(state,other),null);
  assert.throws(()=>model.enrol(state,other,'editor@example.org'),/request-not-available/);
  const pending=model.manage(model.bootstrap(owner,'owner@example.org'),owner,{action:'add',account:'new@example.org',role:'editor',capabilities:['events']});
  const presented=model.enrol(pending,editor,'new@example.org');
  assert.throws(()=>model.enrol(presented,other,'new@example.org'),/request-not-available/);
  assert.deepEqual(model.enrol(presented,editor,'new@example.org'),presented);
});
test('all eight capabilities are isolated and owners receive all registered capabilities only',async()=>{
  for(const capability of model.CAPABILITIES){
    const store=memory(approved([capability])),policy=createAccessPolicy({store,env:{ADMIN_ACCESS_MODE:'capabilities'}});
    for(const required of [...model.CAPABILITIES,'owner','unknown']){
      const result=await policy.requireAccess(request(editor),required);
      assert.equal(result?.status??200,required===capability?200:403,`${capability} -> ${required}`);
    }
    for(const required of [...model.CAPABILITIES,'owner'])assert.equal(await policy.requireAccess(request(owner),required),null);
  }
});
test('revocation applies to the next request with the same authenticated identity',async()=>{
  const state=approved(),store=memory(state),policy=createAccessPolicy({store,env:{ADMIN_ACCESS_MODE:'capabilities'}});
  assert.equal(await policy.requireAccess(request(editor),'news'),null);
  store.set(model.manage(state,owner,{action:'revoke',id:state.users[1].id}));
  assert.equal((await policy.requireAccess(request(editor),'news')).status,403);assert.equal(store.reads,2);
});
test('unavailable or corrupt permissions fail closed; malformed modes never fall back',async()=>{
  for(const state of [null,{}, {...approved(),users:[]}]){
    const policy=createAccessPolicy({store:memory(state),env:{ADMIN_ACCESS_MODE:'capabilities'}});
    assert.equal((await policy.requireAccess(request(owner),'news')).status,503);
  }
  assert.equal((await createAccessPolicy({env:{ADMIN_ACCESS_MODE:'typo'}}).requireAccess(request(owner),'news')).status,503);
  assert.equal((await createAccessPolicy({store:memory(approved()),env:{ADMIN_ACCESS_MODE:'capabilities'}}).requireAccess(request(null),'news')).status,401);
});
test('owners cannot self-revoke/demote; last-owner invariant validates resulting state',()=>{
  const state=approved();const id=state.users[0].id;
  assert.throws(()=>model.manage(state,owner,{action:'revoke',id}),/self-removal/);
  assert.throws(()=>model.manage(state,owner,{action:'update',id,role:'editor',capabilities:['news']}),/self-removal/);
  assert.throws(()=>model.validate({...state,users:state.users.filter(u=>u.id!==id)}),/last-owner/);
});
test('unknown capability/overposting, duplicate account and stale review are rejected',()=>{
  const state=approved();
  assert.throws(()=>model.manage(state,owner,{action:'add',account:'bad@example.org',role:'editor',capabilities:['owner']}),/invalid-sections/);
  assert.throws(()=>model.manage(state,owner,{action:'add',account:'editor@example.org',role:'editor',capabilities:['news']}),/account-already-exists/);
  assert.throws(()=>model.manage(state,owner,{action:'update',id:state.users[1].id,role:'owner',capabilities:[],identity:other}),/invalid-access-request/);
  assert.throws(()=>model.manage(state,owner,{action:'approve',id:state.users[1].id,reviewKey:'stale'}),/review-again/);
});
test('HTTP users management is owner-only before body parsing and version checked',async()=>{
  const store=memory(approved()),api=createAccessHandlers({store});
  assert.equal((await api.users(request(null))).status,401);
  assert.equal((await api.users(request(editor,{method:'POST',body:{}}))).status,403);assert.equal(store.writes,0);
  assert.equal((await api.users(request(owner,{method:'POST',etag:'stale',body:{action:'revoke',id:'x'}}))).status,409);
  assert.equal((await api.users(request(owner))).jsonBody.users.length,2);
  assert.equal((await api.verify(request(owner))).jsonBody.ownerVerified,true);
  assert.equal((await api.verify(request(editor))).status,403);
  assert.equal((await createAccessHandlers({store,env:{ADMIN_ACCESS_MODE:'unknown'}}).session(request(owner))).status,503);
});
test('HTTP pending session leaks no identities or section grants and cannot activate itself',async()=>{
  let state=model.bootstrap(owner,'owner@example.org');state=model.manage(state,owner,{action:'add',account:'editor@example.org',role:'editor',capabilities:['news']});
  const store=memory(state),api=createAccessHandlers({store});
  const result=await api.enrolment(request(editor,{method:'POST',body:{account:'editor@example.org'}}));
  assert.equal(result.status,200);
  const session=await api.session(request(editor));assert.equal(session.jsonBody.access,null);assert.equal(session.jsonBody.status,'awaiting-approval');
  assert.equal(JSON.stringify(session).includes(editor.objectId),false);
  assert.equal((await api.enrolment(request(other,{method:'POST',body:{account:'editor@example.org',identity:editor}}))).status,400);
  assert.equal((await api.users(request(editor))).status,403);
});
function blobService(){
  let data,revision=0,publicAccess;
  const blob={async getProperties(){if(!data)throw Object.assign(Error('missing'),{statusCode:404});return{etag:'v'+revision,contentLength:Buffer.byteLength(data)};},async downloadToBuffer(_a,_b,options){assert.equal(options.conditions.ifMatch,'v'+revision);return Buffer.from(data);},async upload(value,_length,options){const c=options.conditions;if((c.ifNoneMatch==='*'&&data)||(c.ifMatch&&c.ifMatch!=='v'+revision))throw Object.assign(Error('precondition'),{statusCode:412});data=value;revision++;return{etag:'v'+revision};}};
  return{setPublic(v){publicAccess=v;},getContainerClient(name){assert.equal(name,'church-website-access');return{async getProperties(){return{blobPublicAccess:publicAccess};},getBlockBlobClient(name){assert.equal(name,'permissions-v1.json');return blob;}};}};
}
test('private storage never initializes on read; bootstrap create-only and read-back verified',async()=>{
  const service=blobService(),store=createAccessStore({service});
  await assert.rejects(store.read(),e=>e.statusCode===404);
  const saved=await store.initialize(model.bootstrap(owner,'owner@example.org'));
  assert.equal(model.allowed(model.resolve(saved.state,owner),'owner'),true);
  await assert.rejects(store.initialize(saved.state),e=>e.statusCode===412);
  await assert.rejects(store.write(saved.state,'old'),e=>e.statusCode===412);
  assert.equal(await store.write(saved.state,saved.etag),'v2');
  service.setPublic('blob');await assert.rejects(store.read(),/not-private/);await assert.rejects(store.write(saved.state,'v2'),/not-private/);
});
test('operator bootstrap requires current live legacy owner verification and reads back the owner',async()=>{
  const {bootstrapAccess}=require('../scripts/bootstrap-access.cjs');
  const live=require('./fixtures/ed-live-identity.json'),revision='a'.repeat(40);
  const identity={...live,administrator:true,authorizationStatus:'http-200',authorizationBuild:{revision}};
  const service=blobService(),store=createAccessStore({service});
  const options={identity,account:'owner@example.org',expectedRevision:revision,env:{},store};
  await assert.rejects(bootstrapAccess({...options,identity:{...identity,authorizationStatus:'http-403'}}));
  await assert.rejects(bootstrapAccess({...options,expectedRevision:'b'.repeat(40)}));
  await assert.rejects(bootstrapAccess({...options,env:{ADMIN_ACCESS_MODE:'capabilities'}}));
  await assert.rejects(bootstrapAccess({...options,identity:{...identity,objectId:editor.objectId}}));
  const result=await bootstrapAccess(options);assert.equal(result.ownerReadBack,true);assert.equal(result.enforcementChanged,false);
  await assert.rejects(bootstrapAccess(options),e=>e.statusCode===412);
});
test('wrong-account presentation can be reset and revoked access needs new owner approval',()=>{
  let state=approved(),id=state.users[1].id;
  state=model.manage(state,owner,{action:'revoke',id});assert.equal(model.resolve(state,editor),null);
  state=model.manage(state,owner,{action:'restore',id});assert.equal(model.resolve(state,editor),null);
  state=model.manage(state,owner,{action:'reset-pending',id});assert.equal(state.users[1].identity,undefined);
  state=model.enrol(state,other,'editor@example.org');assert.equal(model.resolve(state,other),null);
  state=model.manage(state,owner,{action:'approve',id,reviewKey:state.users[1].reviewKey});assert.equal(model.resolve(state,other).status,'active');
});
test('every protected content handler rejects a News-only account before backend work',async()=>{
  // Inject the shared policy at the request boundary; do not bypass real model validation.
  const original=process.env.ADMIN_ACCESS_MODE;process.env.ADMIN_ACCESS_MODE='capabilities';
  const accessStore=require('../src/access-store'),originalFactory=accessStore.createAccessStore;
  accessStore.createAccessStore=()=>memory(approved(['news']));
  try{
    const rejectBackend=()=>{throw Error('protected backend touched before authorisation');};
    const cases=[
      require('../src/calendar').createCalendarHandler({readConfiguration:rejectBackend}),
      require('../src/contacts').createContactsHandler({readConfiguration:rejectBackend}),
      require('../src/homepage-verses').createHomepageVersesHandler({readConfiguration:rejectBackend}),
      require('../src/clergy-publishing').createClergyHandler({readConfiguration:rejectBackend}),
      require('../src/photo-albums').createPhotoAlbumsHandler({readConfiguration:rejectBackend}),
      require('../src/news-publishing').createNewsPublishingHandler('publications',{readConfiguration:rejectBackend}),
      require('../src/feedback').createFeedbackHandlers({store:{read:rejectBackend,locked:rejectBackend}}).adminHandler,
      require('../src/google-calendar-sync').createGoogleSyncHandler({readConfiguration:rejectBackend})
    ];
    for(const handler of cases)for(const method of ['GET','POST','PUT'])assert.equal((await handler(request(editor,{method}))).status,403);
  }finally{accessStore.createAccessStore=originalFactory;if(original===undefined)delete process.env.ADMIN_ACCESS_MODE;else process.env.ADMIN_ACCESS_MODE=original;}
});
