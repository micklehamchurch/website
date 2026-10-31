import {ADMIN_API_HEALTH_URL} from './auth-config.mjs';
import {acquireAdminApiToken} from './auth-tokens.mjs';
export function createAccessClient(msal,getAccount,{fetchImpl=globalThis.fetch}={}){
 return async function call(route,{method='GET',body,etag,interactive=false}={}){
  const account=getAccount();if(!account)return {ok:false,error:'authentication-required'};
  try{
   const token=await acquireAdminApiToken(msal,account,{interactive});
   if(!token)return {ok:false,error:'authentication-required'};
   const response=await fetchImpl(ADMIN_API_HEALTH_URL.replace(/health$/,`access/${route}`),{method,credentials:'omit',cache:'no-store',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json();
   if(response.status===403&&data.error==='owner-required')globalThis.window?.dispatchEvent(new Event('admin-access-recheck'));
   return response.ok&&data.ok?data:{ok:false,error:data.error||'access-unavailable',status:response.status};
  }catch(error){if(error?.errorCode?.includes('interaction_required')||error?.errorCode?.includes('consent_required'))return {ok:false,error:'connection-required'};return {ok:false,error:'access-unavailable'};}
 };
}
