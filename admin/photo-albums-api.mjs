import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';
export const PHOTO_ALBUMS_URL = new URL('photo-albums',ADMIN_API_HEALTH_URL).href;
const messages = Object.freeze({
  'authentication-required':'Sign in and authorise the Admin API connection, then reload Photo Albums.',
  'administrator-required':'This Microsoft account does not have administrator access.',
  'album-version-conflict':'Someone changed the shared Dev version. Your changes have not been saved. Reload albums before editing again.',
  'album-unsupported-format':'Use a JPEG, PNG or WebP photograph. For HEIC/HEIF, export or save a JPEG first.',
  'album-invalid-image':'A photograph could not be processed. Check that it opens correctly and export a fresh JPEG or PNG. Animated images and files with extra embedded content are not supported.',
  'album-too-large':'Use at most 6 photographs per save, each up to 10 MiB and 20 MiB in total. Save and add another batch for larger albums.',
  'album-consent-required':'Choose at least one photograph and confirm the church has permission to publish.',
  'album-delete-confirmation-required':'Type the album title exactly to confirm deletion.',
  'invalid-album-request':'Check the title, description, cover, captions and image descriptions. Titles are limited to 150 characters, descriptions to 500 and captions/image descriptions to 300.',
  'album-repository-unavailable':'Albums could not be loaded. Try reloading or contact the website administrator.',
  'album-save-unavailable':'The save could not be confirmed. Reload albums to check the shared version before trying again.',
  'network-failure':'The connection failed or timed out. Reload albums to check whether the save completed.',
  busy:'Another album request is in progress.'
});
export const albumMessage = code => messages[code] || 'The album request failed. Reload and try again.';
export function createPhotoAlbumsApi({getToken,fetchImpl=fetch}) {
  let busy=false;
  async function request(method,payload) {
    if(busy)return {ok:false,category:'busy'};busy=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
    try {
      let token;try{token=await getToken();}catch{return {ok:false,category:'authentication-required'};}
      if(!token)return {ok:false,category:'authentication-required'};
      const result=await fetchImpl(PHOTO_ALBUMS_URL,{method,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
      if(!result.ok){let category=({401:'authentication-required',403:'administrator-required',409:'album-version-conflict',413:'album-too-large',400:'invalid-album-request'})[result.status] || (method==='GET'?'album-repository-unavailable':'album-save-unavailable');try{const d=await result.json();if(Object.hasOwn(messages,d?.error))category=d.error;}catch{}return {ok:false,category};}
      const data=await result.json(),sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
      if(data.ok!==true||!sha(data.sha)||!sha(data.headSha)||!Array.isArray(data.albums)||(method==='POST'&&!sha(data.commitSha)))throw Error();
      return data;
    }catch{return {ok:false,category:'network-failure'};}finally{clearTimeout(timeout);busy=false;}
  }
  return Object.freeze({load:()=>request('GET'),save:payload=>request('POST',payload),message:albumMessage});
}
export function attachPhotoAlbumsApi(msal,getAccount,fetchImpl=fetch) {
  // Tokens remain in the existing MSAL closure; the editor receives scoped methods only.
  window.churchPhotoAlbumsApi=createPhotoAlbumsApi({fetchImpl,getToken:async()=>{const account=getAccount();if(!account)throw Error();return acquireAdminApiToken(msal,account);}});
  if(getAccount())window.dispatchEvent(new Event('admin-photo-albums-ready'));
}
