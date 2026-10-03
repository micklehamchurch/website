import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';
const URL = new globalThis.URL('google-calendar-sync',ADMIN_API_HEALTH_URL).href;
export function createGoogleSyncApi({getToken,fetchImpl=fetch}) {
  let busy=false;
  async function request(method,review) {
    if(busy)return{ok:false,error:'busy'};busy=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try {
      let token;try{token=await getToken();}catch{return{ok:false,error:'authentication-required'};}if(!token)return{ok:false,error:'authentication-required'};
      const result=await fetchImpl(URL,{method,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,...(review?{'Content-Type':'application/json'}:{})},...(review?{body:JSON.stringify({headSha:review.headSha,calendarSha:review.calendarSha,registrySha:review.registrySha,reviewDigest:review.reviewDigest,confirm:true})}:{})});
      if(!result.ok)return{ok:false,error:result.status===401?'authentication-required':result.status===403?'administrator-required':result.status===409?'review-again':'sync-unavailable'};
      const data=await result.json();if(data.ok!==true||!data.report||!Array.isArray(data.report.additions)||typeof data.canApply!=='boolean')throw Error();
      return data;
    } catch{return{ok:false,error:'sync-unavailable'};}finally{clearTimeout(timeout);busy=false;}
  }
  return{check:()=>request('GET'),apply:review=>request('POST',review)};
}
export function attachGoogleSyncApi(msal,getAccount,fetchImpl=fetch) {
  window.churchGoogleSyncApi=createGoogleSyncApi({fetchImpl,getToken:async()=>{const account=getAccount();if(!account)throw Error();return acquireAdminApiToken(msal,account);}});
}
