'use strict';
const {readIdentity,requireAdministrator}=require('./identity');
const model=require('./access-model');
const response=(status,error)=>({status,headers:{'Cache-Control':'no-store'},jsonBody:{ok:false,error}});
function createAccessPolicy({store,env=process.env}={}) {
  // Legacy mode is a deployment staging boundary, NOT a fallback for a missing store.
  // Enabling capabilities is an explicit operator action after private owner read-back.
  async function requireAccess(request,capability){
    const identity=readIdentity(request);
    if(!identity) return response(401,'authentication-required');
    if(!model.CAPABILITIES.includes(capability)&&!['owner','session'].includes(capability))return response(403,'access-denied');
    if(!env.ADMIN_ACCESS_MODE || env.ADMIN_ACCESS_MODE==='legacy') return requireAdministrator(request);
    if(env.ADMIN_ACCESS_MODE!=='capabilities')return response(503,'access-unavailable');
    try {
      const current=await (store || require('./access-store').createAccessStore()).read();
      const user=model.resolve(current.state,identity);
      return (capability==='session'?!!user:model.allowed(user,capability))?null:response(403,'access-denied');
    } catch {return response(503,'access-unavailable');}
  }
  return {requireAccess};
}
const policy=createAccessPolicy();
module.exports={createAccessPolicy,requireAccess:policy.requireAccess,response};
