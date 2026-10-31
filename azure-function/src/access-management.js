'use strict';
const {readIdentity}=require('./identity');
const model=require('./access-model');
const {createAccessStore}=require('./access-store');
function result(status,jsonBody){return{status,headers:{'Cache-Control':'no-store',Pragma:'no-cache'},jsonBody};}
function presentation(request){
  // Called only after readIdentity validated the trusted Easy Auth principal.
  const claims=JSON.parse(Buffer.from(request.headers.get('x-ms-client-principal'),'base64').toString('utf8')).claims;
  const first=types=>claims.find(c=>types.includes(c.typ))?.val;
  return {presentedAccount:first(['email','preferred_username','http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']),presentedName:first(['name','http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'])};
}
async function json(request){
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||'') || Number(request.headers.get('content-length'))>8192)throw Error('invalid-access-request');
  const reader=request.body?.getReader();if(!reader)throw Error('invalid-access-request');
  const chunks=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8192){await reader.cancel();throw Error('invalid-access-request');}chunks.push(Buffer.from(part.value));}}finally{reader.releaseLock();}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('invalid-access-request');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid-access-request');return value;
}
function createAccessHandlers({store=createAccessStore(),env=process.env}={}) {
  async function run(request,area){
    const identity=readIdentity(request);if(!identity)return result(401,{ok:false,error:'authentication-required'});
    if(env.ADMIN_ACCESS_MODE && !['legacy','capabilities'].includes(env.ADMIN_ACCESS_MODE))return result(503,{ok:false,error:'access-unavailable'});
    try {
      const current=await store.read(), actor=model.resolve(current.state,identity);
      if(area==='session') {
        if(request.method!=='GET')return result(405,{ok:false,error:'method-not-allowed'});
        const pending=current.state.users.find(u=>u.status==='awaiting-approval'&&u.identity&&require('./identity').isAdministrator(identity,[u.identity]));
        return result(200,{ok:true,environment:'preview',enforcement:env.ADMIN_ACCESS_MODE==='capabilities'?'capabilities':'legacy',access:actor?model.summary(actor):null,status:actor?'active':pending?'awaiting-approval':'no-access'});
      }
      if(area==='enrolment') {
        if(request.method!=='POST')return result(405,{ok:false,error:'method-not-allowed'});
        // No public account enumeration and no identity fields accepted from callers.
        const body=await json(request);if(Object.keys(body).length!==1||typeof body.account!=='string')throw Error('invalid-access-request');
        const state=model.enrol(current.state,identity,body.account,new Date().toISOString(),presentation(request));
        if(state.revision!==current.state.revision)await store.write(state,current.etag);
        return result(200,{ok:true,status:'awaiting-approval',message:'Your account is awaiting approval. You cannot manage content yet.'});
      }
      if(!model.allowed(actor,'owner'))return result(403,{ok:false,error:'owner-required'});
      if(area==='verify') {
        if(request.method!=='GET')return result(405,{ok:false,error:'method-not-allowed'});
        return result(200,{ok:true,ownerVerified:true,revision:current.state.revision,environment:'preview',enforcement:env.ADMIN_ACCESS_MODE==='capabilities'?'capabilities':'legacy'});
      }
      if(request.method==='GET')return result(200,{ok:true,etag:current.etag,revision:current.state.revision,users:current.state.users.map(u=>({...model.summary(u),...(u.status==='active'?{}:{capabilities:[]}),requestedCapabilities:u.role==='owner'?[...model.CAPABILITIES]:u.capabilities,presentedAccount:u.presentedAccount,presentedName:u.presentedName,reviewKey:u.status==='awaiting-approval'?u.reviewKey:undefined,identity:u.identity,createdAt:u.createdAt})),audit:current.state.audit.slice(-100)});
      if(request.method!=='POST')return result(405,{ok:false,error:'method-not-allowed'});
      if(request.headers.get('if-match')!==current.etag)return result(409,{ok:false,error:'review-again'});
      const state=model.manage(current.state,identity,await json(request));
      await store.write(state,current.etag);
      return result(200,{ok:true,revision:state.revision,message:'Website access saved.'});
    }catch(error){
      if(error.statusCode===412)return result(409,{ok:false,error:'review-again'});
      const safe=['invalid-account','invalid-role','invalid-sections','invalid-access-request','account-already-exists','self-removal','last-owner','account-not-found','account-revoked','review-again','access-audit-capacity'];
      if(safe.includes(error.message))return result(error.message==='review-again'?409:400,{ok:false,error:error.message});
      if(error.message==='request-not-available')return result(403,{ok:false,error:'request-not-available'});
      return result(503,{ok:false,error:'access-unavailable'});
    }
  }
  return {session:r=>run(r,'session'),enrolment:r=>run(r,'enrolment'),users:r=>run(r,'users'),verify:r=>run(r,'verify')};
}
module.exports={createAccessHandlers};
