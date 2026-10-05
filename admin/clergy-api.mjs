import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';
const messages = Object.freeze({
  'authentication-required':'Sign in and authorise the Admin API connection, then reload Historical Archive.',
  'administrator-required':'This account does not have server-side administrator access.',
  'archive-version-conflict':'Dev changed since you loaded the archive. Your changes were not published. Reload shared content before trying again; copy any research changes you need to retain first.',
  'invalid-archive-request':'Check names, service years and image details. Upload JPEG, PNG or WebP photographs only. Existing records must be unpublished rather than deleted.',
  'archive-payload-too-large':'Each image must be at most 10 MiB, with at most six images and 20 MiB total per publication. Shorten oversized text.',
  'archive-repository-unavailable':'The shared archive could not be loaded. Try reloading.',
  'archive-publish-unavailable':'Saving could not be confirmed. Reload shared content to check its current state before trying again.',
  'network-failure':'The request could not be confirmed. Reload shared content before retrying.',
  busy:'Another archive request is in progress.'
});
export function createClergyApi({getToken,fetchImpl=fetch}) {
  let busy=false;
  async function request(method,payload){
    if(busy)return {ok:false,category:'busy'};busy=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
    try{
      let token;try{token=await getToken();}catch{return {ok:false,category:'authentication-required'};}
      if(!token)return {ok:false,category:'authentication-required'};
      const result=await fetchImpl(new URL('historical-archive',ADMIN_API_HEALTH_URL).href,{method,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,...(method==='PUT'?{'Content-Type':'application/json'}:{})},...(method==='PUT'?{body:JSON.stringify({sha:payload.sha,headSha:payload.headSha,archive:payload.archive,uploads:payload.uploads})}:{})});
      if(!result.ok){let category=({401:'authentication-required',403:'administrator-required',409:'archive-version-conflict',400:'invalid-archive-request',413:'archive-payload-too-large'})[result.status]||(method==='GET'?'archive-repository-unavailable':'archive-publish-unavailable');try{const data=await result.json();if(Object.hasOwn(messages,data?.error))category=data.error;}catch{}return {ok:false,category};}
      const data=await result.json(),sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
      if(data.ok!==true||!sha(data.sha)||!sha(data.headSha)||!Array.isArray(data.archive?.records)||(method==='PUT'&&!sha(data.commitSha)))throw new Error();
      return {ok:true,sha:data.sha,headSha:data.headSha,archive:data.archive,...(method==='PUT'?{commitSha:data.commitSha}:{})};
    }catch{return {ok:false,category:'network-failure'};}finally{clearTimeout(timeout);busy=false;}
  }
  return Object.freeze({load:()=>request('GET'),publish:payload=>request('PUT',payload),message:category=>messages[category]||'The archive request failed.'});
}
export function attachClergyApi(msal,getAccount,fetchImpl=fetch){
  window.churchClergyApi=createClergyApi({fetchImpl,getToken:async()=>{const account=getAccount();if(!account)throw new Error();return acquireAdminApiToken(msal,account);}});
  if(getAccount())window.dispatchEvent(new Event('admin-clergy-ready'));
}
