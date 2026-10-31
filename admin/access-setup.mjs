import {ADMIN_API_HEALTH_URL} from './auth-config.mjs';
import {acquireAdminApiToken} from './auth-tokens.mjs';
export async function verifyPrivateOwner(msal,account,{fetchImpl=globalThis.fetch}={}){
  const token=await acquireAdminApiToken(msal,account,{interactive:true});
  if(!token)throw Error('connection-required');
  const response=await fetchImpl(ADMIN_API_HEALTH_URL.replace(/health$/,'access/verify'),{method:'GET',credentials:'omit',cache:'no-store',headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)return{ok:false,status:response.status};
  const body=await response.json();
  return{ok:body.ok===true&&body.ownerVerified===true&&body.environment==='preview'&&Number.isSafeInteger(body.revision),enforcement:body.enforcement};
}
