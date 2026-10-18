import {acquireAdminApiToken} from './auth-tokens.mjs';
import {createFeedbackClient,mountFeedback} from '../feedback-ui.mjs';
export function attachFeedbackApi(msal,getAccount){
 const api=createFeedbackClient({admin:true,getToken:async()=>{const account=getAccount();if(!account)throw Error('Please sign in to manage feedback.');return acquireAdminApiToken(msal,account);}});
 window.churchFeedbackAdmin={mount:root=>mountFeedback(root,{api,admin:true,context:{title:'Website review',path:'/website/',canonicalPath:'/website/'}})};
 window.dispatchEvent(new Event('admin-feedback-ready'));
}
