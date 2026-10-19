import {createFeedbackClient,mountFeedback,readReviewerSession,reviewerSessionKey} from './feedback-ui.mjs?v=simple-1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountQuickFeedback(root,{api=createFeedbackClient(),context}={}){
 let config,draft='',nameDraft='',error='',busy=false;
 const clearAccess=()=>{try{localStorage.removeItem(reviewerSessionKey);}catch{}};
 function render(sent=false){
  const remembered=readReviewerSession();
  root.innerHTML=`<div class="feedback-view fb-quick"><p class="fb-error" role="alert" tabindex="-1" ${error?'':'hidden'}>${escape(error)}</p>${sent?'<section class="fb-thanks"><h3 tabindex="-1">Thank you!</h3><p>Your feedback has been sent.</p><button type="button" data-quick-board>View discussions</button></section>':config?.mode!=='pcc'?'<p>Website feedback is currently closed.</p>':`<form data-quick-form><h3>What do you think about this page?</h3>${remembered?'':`<label>Your name<input name="name" value="${escape(nameDraft)}" maxlength="80" autocomplete="name" required></label>${config.requireCode===false?'':'<label>PCC access code<input name="code" type="password" minlength="12" maxlength="128" autocomplete="off" required></label>'}`}<label>Your feedback<textarea name="body" maxlength="5000" rows="4" required>${escape(draft)}</textarea></label><label class="fb-honeypot" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label><button type="submit">Send feedback</button><p class="fb-note">Your feedback will be shared with the PCC and website team.</p><button class="fb-quiet" type="button" data-quick-board>View discussions</button></form>`}</div>`;
 }
 async function join(form){
  if(readReviewerSession())return;
  for(const name of ['name','code']){const input=form?.elements.namedItem(name);if(input&&!input.reportValidity())return false;}
  const values=Object.fromEntries(new FormData(form));
  const data=await api.call('access',{method:'POST',body:{name:values.name,...(values.code!==undefined?{code:values.code}:{})}});
  try{localStorage.setItem(reviewerSessionKey,JSON.stringify({token:data.token,name:data.name,expires:data.expires}));}catch{throw Error('This browser cannot remember your name. Please allow site storage and try again.');}
 }
 async function fail(e){
  error=e.message;
  if(e.code==='review-access-required'){clearAccess();try{config=await api.call('config');}catch{}render();}
  const alert=root.querySelector('.fb-error');if(alert){alert.textContent=error;alert.hidden=false;alert.focus();}
 }
 root.onsubmit=async event=>{
  const form=event.target.closest('[data-quick-form]');if(!form)return;event.preventDefault();if(busy)return;
  draft=form.elements.body.value;nameDraft=form.elements.namedItem('name')?.value||nameDraft;busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{if(await join(form)===false)return;const values=Object.fromEntries(new FormData(form));await api.call('create',{method:'POST',body:{body:values.body,page:context,website:values.website||''}});draft='';error='';render(true);root.querySelector('h3')?.focus();}
  catch(e){await fail(e);}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
 };
 root.onclick=async event=>{
  if(!event.target.closest('[data-quick-board]')||busy)return;busy=true;const form=root.querySelector('form');if(form)draft=form.elements.body.value;
  try{if(!readReviewerSession()&&!form){error='Please enter your name to continue.';config=await api.call('config');render();return;}if(!readReviewerSession()&&await join(form)===false)return;root.onsubmit=null;root.onclick=null;await mountFeedback(root,{api,context});root.querySelector('h3,button,input,select')?.focus();}catch(e){await fail(e);}finally{busy=false;}
 };
 try{config=await api.call('config');render();}catch(e){error=e.message;render();}
}
