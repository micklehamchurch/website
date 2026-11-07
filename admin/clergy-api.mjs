import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';
const messages = Object.freeze({
  'authentication-required':'Sign in with an authorised administrator account, then refresh the archive.',
  'administrator-required':'This account does not have permission to manage the archive.',
  'archive-version-conflict':'A newer saved archive exists. Publishing has stopped to protect it. Your pending edits and uploaded photographs are kept in this browser. Use Check saved version to check again; refreshing discards them.',
  'archive-name-required':'Please enter a name before publishing.',
  'archive-invalid-sources':'Give each source a title. Its link and notes are optional.',
  'archive-invalid-source-url':'Source links must use a full http:// or https:// address, or be left blank.',
  'archive-invalid-years':'Service years must be whole numbers between 1 and 9999. The end cannot precede the start. Leave unknown years blank.',
  'archive-invalid-image':'A photograph is unsupported or could not be decoded. Use a valid JPEG, PNG or WebP file.',
  'archive-unsafe-image':'A photograph has an invalid or unrecognised path. Refresh and select an existing photograph or upload it again.',
  'archive-unsafe-text':'A text field contains unsupported markup or exceeds its length limit. Remove HTML tags and shorten oversized text.',
  'archive-invalid-id':'A profile has a missing, invalid or duplicate identifier. Refresh the archive before retrying.',
  'archive-invalid-removal':'The requested removal does not match the saved archive. Refresh before selecting a person to remove.',
  'archive-record-removal':'Archive source references cannot be changed through this request. Refresh the archive before retrying.',
  'invalid-archive-request':'The archive request has an invalid data structure. Refresh the archive before retrying.',
  'archive-payload-too-large':'Publication stopped: the server rejected the upload or request as too large (HTTP 413). Your pending edits and photographs are still kept in this tab. Do not refresh or close it. Images must be at most 10 MiB each, six images and 20 MiB total; the saved archive text must fit within 1 MiB. If your files meet these limits, keep this tab open and report HTTP 413 to support.',
  'archive-repository-unavailable':'The archive could not be loaded. Try refreshing.',
  'archive-publish-unavailable':'Saving could not be confirmed. Refresh the archive to check its current state before trying again. Your pending edits and uploaded photographs are kept in this browser. Use Check saved version before deciding whether to refresh; refreshing discards them.',
  'network-failure':'The request could not be confirmed. Refresh the archive before trying again. Your pending edits and uploaded photographs are kept in this browser. Use Check saved version before deciding whether to refresh; refreshing discards them.',
  'archive-upload-expired':'The prepared photograph expired. Your pending edits and original photographs are kept. Choose Publish changes again to prepare them again.',
  'archive-upload-unavailable':'The photograph could not be prepared. Your pending edits and original photographs are kept. Try Publish changes again.',
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
      const url=new URL('historical-archive',ADMIN_API_HEALTH_URL);
      let body,contentType;
      if(method==='POST'){if(payload.file.size>10*1024*1024)return {ok:false,category:'archive-payload-too-large'};url.searchParams.set('id',payload.id);url.searchParams.set('fileName',payload.file.name);body=payload.file;contentType=payload.file.type;}
      if(method==='PUT'){
        body=JSON.stringify({sha:payload.sha,headSha:payload.headSha,archive:payload.archive,uploads:payload.uploads,...(payload.removedRecordIds?{removedRecordIds:payload.removedRecordIds}:{})});contentType='application/json';
        const limit=payload.uploads.every(u=>Object.hasOwn(u,'receipt'))?1024*1024+65536:29076140;
        if(new TextEncoder().encode(body).byteLength>limit)return {ok:false,category:'archive-payload-too-large'};
      }
      const result=await fetchImpl(url.href,{method,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,...(contentType?{'Content-Type':contentType}:{})},...(body!==undefined?{body}:{})});
      if(!result.ok){let category=({401:'authentication-required',403:'administrator-required',409:'archive-version-conflict',400:'invalid-archive-request',413:'archive-payload-too-large'})[result.status]||(method==='GET'?'archive-repository-unavailable':'archive-publish-unavailable');try{const data=await result.json();if(Object.hasOwn(messages,data?.error))category=data.error;}catch{}return {ok:false,category,status:result.status};}
      const data=await result.json(),sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
      if(method==='POST'){if(data.ok!==true||data.id!==payload.id||typeof data.receipt!=='string'||data.receipt.length>8192)throw new Error();return {ok:true,id:data.id,receipt:data.receipt};}
      if(data.ok!==true||!sha(data.sha)||!sha(data.headSha)||!Array.isArray(data.archive?.records)||(method==='PUT'&&!sha(data.commitSha)))throw new Error();
      return {ok:true,sha:data.sha,headSha:data.headSha,archive:data.archive,...(data.imageUploadProtocol==='git-blob-v1'?{imageUploadProtocol:data.imageUploadProtocol}:{}),...(method==='PUT'?{commitSha:data.commitSha}:{})};
    }catch{return {ok:false,category:'network-failure'};}finally{clearTimeout(timeout);busy=false;}
  }
  return Object.freeze({load:()=>request('GET'),upload:payload=>request('POST',payload),publish:payload=>request('PUT',payload),message:category=>messages[category]||'The archive request failed.'});
}
export function attachClergyApi(msal,getAccount,fetchImpl=fetch){
  window.churchClergyApi=createClergyApi({fetchImpl,getToken:async()=>{const account=getAccount();if(!account)throw new Error();return acquireAdminApiToken(msal,account);}});
  if(getAccount())window.dispatchEvent(new Event('admin-clergy-ready'));
}
