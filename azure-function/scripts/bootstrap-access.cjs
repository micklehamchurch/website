'use strict';
// Run ONLY by the Azure owner in Cloud Shell, after verifying the existing live
// Microsoft identity. No credentials or full identity records are printed.
const {readIdentity,isAdministrator}=require('../src/identity');
const allowlist=require('../src/admin-identities.json');
const model=require('../src/access-model');
const {createAccessStore}=require('../src/access-store');
function verify(identity,expectedRevision,env=process.env){
  if(env.ADMIN_ACCESS_MODE==='capabilities')throw Error('Bootstrap is unavailable after enforcement is enabled.');
  const entry=allowlist.length===1?allowlist[0]:null;
  if(!entry)throw Error('Expected exactly one verified legacy owner.');
  // Existing allowlist binding is independently compared with live verification
  // supplied in memory by the operator, never derived from an email address.
  if(identity?.administrator!==true || identity?.authorizationStatus!=='http-200' || !/^[a-f0-9]{40}$/.test(expectedRevision||'') || identity?.authorizationBuild?.revision!==expectedRevision)throw Error('Current signed-in owner verification is required.');
  if(!isAdministrator(identity,[entry]))throw Error('Live owner verification does not match existing policy.');
  // Exercise the same parser as HTTP requests; reject malformed bootstrap claims.
  const aliases={tenantId:'tid',objectId:'oid',issuer:'iss',subject:'sub'};
  const parsed=readIdentity({headers:new Headers({'x-ms-client-principal':Buffer.from(JSON.stringify({auth_typ:'aad',claims:Object.entries(aliases).filter(([k])=>identity[k]).map(([k,typ])=>({typ,val:identity[k]}))})).toString('base64')})});
  if(!parsed||!isAdministrator(parsed,[entry]))throw Error('Invalid live owner identity.');
  return parsed;
}
async function bootstrapAccess({identity,account,expectedRevision,env=process.env,store=createAccessStore()}={}){
  const parsed=verify(identity,expectedRevision,env);
  const state=model.bootstrap(parsed,account);
  const saved=await store.initialize(state);
  const owner=model.resolve(saved.state,parsed);
  if(!model.allowed(owner,'owner') || saved.state.revision!==1)throw Error('Owner read-back failed. Do not enable enforcement.');
  return {ok:true,privateStoreReadWrite:true,ownerReadBack:true,revision:saved.state.revision,enforcementChanged:false};
}
async function main(){
  const identity=JSON.parse(process.env.ACCESS_VERIFIED_OWNER_IDENTITY || 'null'),expectedRevision=process.env.ACCESS_EXPECTED_REVISION;
  if(process.argv.includes('--check')){verify(identity,expectedRevision);model.bootstrap(identity,process.env.ACCESS_OWNER_ACCOUNT);return {ok:true,ownerVerification:true,storageChanged:false};}
  return bootstrapAccess({identity,account:process.env.ACCESS_OWNER_ACCOUNT,expectedRevision});
}
if(require.main===module)main().then(value=>console.log(JSON.stringify(value))).catch(error=>{console.error([409,412].includes(error.statusCode)?'Bootstrap refused: permission state already exists.':'Bootstrap failed. Check the live owner verification and private storage. Do not enable enforcement. No credentials displayed.');process.exitCode=1;});
module.exports={verify,bootstrapAccess};
