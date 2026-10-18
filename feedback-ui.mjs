const API='https://stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net/api/';
const STATUSES=['New','In discussion','Planned','In development','Done'];
const sessionKey='church-pcc-review-v1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=v=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(v));
function session(){try{const s=JSON.parse(localStorage.getItem(sessionKey));return s?.expires>Date.now()?s:null;}catch{return null;}}
const messages={
 'review-access-required':'Please join the website review again to continue.',
 'feedback-rate-limited':'There have been too many attempts or messages. Please wait five minutes before trying again.',
 'feedback-off':'Website feedback is currently closed. Existing discussions are kept for the Website Admin.',
 'review-code-required':'Set a PCC review code before enabling PCC Review.',
 'review-code-too-short':'Use a review code of at least 12 characters.',
 'feedback-not-found':'This discussion is no longer available.',
 'feedback-capacity':'Feedback storage has reached its current limit. Please contact the Website Admin.',
 'invalid-feedback':'Please check the fields and length limits, then try again.',
 'administrator-required':'This action requires Website Admin access.'
};
export function createFeedbackClient({admin=false,getToken=()=>session()?.token,fetchImpl=fetch}={}){
 return {admin,async call(action,{method='GET',body,id,page,status,q,cursor}={}){
  const url=new URL(admin?'feedback-admin':'website-feedback',API);url.searchParams.set('action',action);
  for(const [key,value] of Object.entries({id,page,status,q,cursor}))if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,value);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const token=await getToken();const response=await fetchImpl(url.href,{method,credentials:'omit',cache:'no-store',signal:controller.signal,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   let data;try{data=await response.json();}catch{throw Error('Feedback is not available yet. The Website Admin may need to complete the Azure setup.');}
   if(!response.ok||data.ok!==true){const error=Error(messages[data.error]||(response.status===401?'Please sign in again.':'Feedback could not be saved. Your text remains here; please try again.'));error.code=data.error;throw error;}
   return data;
  }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('Feedback could not be reached. Your text remains here. Please try again.');throw e;}finally{clearTimeout(timer);}
 }};
}
export function currentFeedbackPage(){
 const base=new URL('.',document.querySelector('script[src*="site.js"]')?.src||new URL('/website/',location.href).href),canonical=document.querySelector('link[rel=canonical]');
 const safePath=value=>{const path=new URL(value,location.href).pathname;return path.startsWith(base.pathname)?path:base.pathname+path.replace(/^\//,'');};
 return {title:(document.querySelector('main h1')?.textContent||document.title).trim().slice(0,200),path:safePath(location.href),canonicalPath:safePath(canonical?.href||location.href)};
}
export async function mountFeedback(root,{api=createFeedbackClient(),context=currentFeedbackPage(),admin=false}={}){
 let config,topic=null,topics=[],next=null,filter='',query='',pageOnly=false,error='',notice='',busy=false;
 const drafts=new Map();
 const button=(label,action,extra='')=>`<button type="button" data-fb-action="${action}" ${extra}>${label}</button>`;
 const author=a=>`${esc(a.name)}${a.role==='admin'?'<span class="fb-admin-badge">Website Admin</span>':a.role==='reviewer'?'<span class="fb-reviewer">PCC reviewer</span>':''}`;
 const message=(a,body,at)=>`<article class="fb-message ${a.role==='admin'?'fb-admin-message':''}"><header><strong>${author(a)}</strong><time datetime="${esc(at)}">${esc(time(at))}</time></header><p>${esc(body)}</p></article>`;
 function render(){
  for(const form of root.querySelectorAll('[data-fb-form=create],[data-fb-form=reply]'))drafts.set(form.dataset.fbForm+':'+(form.dataset.fbForm==='reply'?(form.dataset.fbTopic||''):''),Object.fromEntries(new FormData(form)));
  const pcc=config?.mode==='pcc',publicMode=config?.mode==='public';
  let content='';
  if(!config)content=error?'':'<p>Loading feedback…</p>';
  else if(!admin&&config.mode==='off')content='<p>Website feedback is currently closed. Existing discussions are kept for the Website Admin.</p>';
  else if(!admin&&pcc&&!session())content=`<form data-fb-form="access"><h3 tabindex="-1">Welcome to the website review</h3><p>${config.requireCode===false?'Please enter your name to continue.':'Please enter your name and the shared PCC code to continue.'} Your name will appear beside your discussions and replies. This browser remembers you for up to 14 days.</p><label>Your name<input name="name" maxlength="80" autocomplete="name" required></label>${config.requireCode===false?'':'<label>PCC review code<input name="code" type="password" minlength="12" maxlength="128" autocomplete="off" required></label>'}<button>Join the review</button></form>`;
  else if(topic){
   content=`${button('← All discussions','back')}<h3 tabindex="-1">${esc(topic.page.title)}</h3><a href="${esc(topic.page.path)}">View related page →</a><p class="fb-status">${esc(topic.status)}${topic.removed?' · Removed from board':''}</p>${message(topic.author,topic.body,topic.createdAt)}<section aria-label="Replies">${topic.replies.map(r=>message(r.author,r.body,r.createdAt)).join('')}</section>${topic.history.map(h=>`<p class="fb-history">Website Admin marked this as ${esc(h.status)} · ${esc(time(h.at))}</p>`).join('')}
    <form data-fb-form="reply" data-fb-topic="${esc(topic.id)}"><label>${admin?'Reply as Website Admin':'Add your reply'}<textarea name="body" maxlength="3000" rows="3" required></textarea></label><button>Send reply</button></form>
    ${admin?`<form data-fb-form="moderate"><label>Status<select name="status">${STATUSES.map(s=>`<option ${s===topic.status?'selected':''}>${s}</option>`).join('')}</select></label><label class="fb-checkbox"><input type="checkbox" name="reviewed" ${topic.reviewed?'checked':''}>Reviewed</label><button>Save status</button>${button(topic.removed?'Restore to board':'Remove from board',topic.removed?'restore':'remove')}</form>`:''}`;
  }else{
   if(admin)content+=`<details class="fb-settings"><summary>Feedback settings and PCC access</summary><form data-fb-form="settings"><label>Feedback mode<select name="mode"><option value="off" ${config.mode==='off'?'selected':''}>Off</option><option value="pcc" ${pcc?'selected':''}>PCC Review</option><option value="public" ${publicMode?'selected':''}>Public Feedback</option></select></label><button>Save mode</button></form><form data-fb-form="access-settings"><label>Require PCC access code<select name="requireCode"><option value="true" ${config.requireCode!==false?'selected':''}>On</option><option value="false" ${config.requireCode===false?'selected':''}>Off</option></select></label><p>On: reviewers must enter the shared PCC code. Off: reviewers can join by entering their name only. Anyone who can visit the website can then join PCC discussions. Turning On asks existing reviewers to join again. Your saved code is kept.</p><button>Save PCC access</button></form><form data-fb-form="rotate-code"><label>${config.codeConfigured?'Change':'Set'} PCC review code<input name="code" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><p>At least 12 characters. Changing the code ends existing reviewer sessions. Share it privately with approved PCC reviewers.</p><button>Save review code</button></form></details><p>${config.newCount} new / unreviewed discussions</p>`;
   if(admin||pcc){content+=`<div class="fb-tools"><label>Show<select data-fb-filter><option value="">All</option>${STATUSES.map(s=>`<option ${s===filter?'selected':''}>${s}</option>`).join('')}</select></label><form data-fb-form="search"><label>Search discussions<input name="q" maxlength="100" value="${esc(query)}"></label><button>Search</button></form>${button(pageOnly?'Show all pages':'Only this page','page')}${button('Refresh discussions','refresh')}</div><p class="fb-note">Choose Refresh for the latest replies. This is a shared discussion board, not a live chat.</p><div class="fb-topics">${topics.map(t=>`<article class="fb-topic"><button data-fb-open="${esc(t.id)}"><strong>${esc(t.page.title)}</strong><span class="fb-status">${esc(t.status)}${t.removed?' · Removed':''}</span><span>${esc(t.body.slice(0,180))}${t.body.length>180?'…':''}</span><small>${esc(t.author.name)} · ${esc(time(t.createdAt))} · ${t.replyCount} replies<br>Latest activity: ${esc(time(t.updatedAt))}${admin?' · '+esc(t.audience)+' · '+(t.reviewed?'Reviewed':'Unreviewed'):''}</small></button></article>`).join('')||'<p>No discussions here yet. You are welcome to start one.</p>'}</div>${next!==null?button('More discussions','more'):''}`;}
   if(!admin)content+=`<form data-fb-form="create"><h3 tabindex="-1">${pcc?'Start a discussion':'Send website feedback'}</h3><p>Feedback about: <strong>${esc(context.title)}</strong></p>${pcc?'<p class="fb-note">Your name, feedback and replies are visible to other PCC reviewers and the Website Admin. Please keep sensitive personal matters out of this discussion.</p>':''}${publicMode?'<p>Your feedback goes privately to the Website Admin. Public submissions and replies are not published as a forum. Please do not include sensitive personal information.</p><label>Your name (optional)<input name="name" maxlength="80" autocomplete="name"></label>':''}<label>Your feedback<textarea name="body" maxlength="5000" rows="4" required></textarea></label><label class="fb-honeypot" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label><button>${pcc?'Post discussion':'Send feedback'}</button></form>${pcc?button('Leave review on this browser','logout'):''}`;
  }
  root.innerHTML=`${admin?'<h1>Website feedback</h1>':''}<div class="feedback-view"><p class="fb-error" role="alert" tabindex="-1" ${error?'':'hidden'}>${esc(error)}</p><p role="status">${esc(notice)}</p><fieldset ${busy?'disabled':''}>${content}</fieldset></div>`;
  for(const form of root.querySelectorAll('[data-fb-form=create],[data-fb-form=reply]')){const saved=drafts.get(form.dataset.fbForm+':'+(form.dataset.fbForm==='reply'?(topic?.id||''):''));if(saved)for(const [name,value]of Object.entries(saved)){const field=form.elements.namedItem(name);if(field)field.value=value;}}
 }
 async function fail(e){if(!admin&&e.code==='review-access-required'){try{localStorage.removeItem(sessionKey);}catch{}topic=null;topics=[];try{config=await api.call('config');}catch{}error=e.message;render();}error=e.message;const alert=root.querySelector('.fb-error');alert.textContent=error;alert.hidden=false;alert.focus();}
 async function refresh(){config=await api.call('config');if(!admin&&config.mode!=='pcc'){topics=[];topic=null;next=null;}else if(admin||session()){if(topic)topic=(await api.call('topic',{id:topic.id})).topic;else{const data=await api.call('topics',{page:pageOnly?context.path:undefined,status:filter,q:query});topics=data.topics;next=data.next;}}error='';render();}
 root.onclick=async event=>{
  const open=event.target.closest('[data-fb-open]'),action=event.target.closest('[data-fb-action]')?.dataset.fbAction;if(!open&&!action||busy)return;
  busy=true;try{if(open)topic=(await api.call('topic',{id:open.dataset.fbOpen})).topic;
   if(action==='back'){topic=null;await refresh();}if(action==='refresh')await refresh();if(action==='page'){pageOnly=!pageOnly;topic=null;await refresh();}
   if(action==='logout'){try{localStorage.removeItem(sessionKey);}catch{}topic=null;topics=[];}
   if(action==='more'){const data=await api.call('topics',{page:pageOnly?context.path:undefined,status:filter,q:query,cursor:next});topics.push(...data.topics);next=data.next;}
   if(['remove','restore'].includes(action)&&confirm(action==='remove'?'Remove this discussion from the PCC board? Admin keeps it and can restore it.':'Restore this discussion to the board?')){await api.call('moderate',{method:'POST',id:topic.id,body:{removed:action==='remove'}});await refresh();}
   error='';busy=false;render();root.querySelector('h3,button')?.focus();
  }catch(e){busy=false;fail(e);}
 };
 root.onchange=async event=>{if(event.target.matches('[data-fb-filter]')){filter=event.target.value;try{await refresh();}catch(e){fail(e);}}};
 root.onsubmit=async event=>{
  const form=event.target.closest('[data-fb-form]');if(!form)return;event.preventDefault();if(busy)return;const action=form.dataset.fbForm,values=Object.fromEntries(new FormData(form));busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   if(action==='access'){const data=await api.call('access',{method:'POST',body:values});try{localStorage.setItem(sessionKey,JSON.stringify({token:data.token,name:data.name,expires:data.expires}));}catch{throw Error('This browser cannot remember reviewer access. Enable site storage, then try again.');}form.reset();}
   else if(action==='create'){const data=await api.call('create',{method:'POST',body:{body:values.body,page:context,website:values.website||'',...(values.name?{name:values.name}:{})}});notice=config.mode==='pcc'?'Your discussion has been posted.':'Thank you. Your feedback has been sent privately to the Website Admin.';form.reset();if(config.mode==='pcc')topic=(await api.call('topic',{id:data.id})).topic;}
   else if(action==='reply'){await api.call('reply',{method:'POST',id:topic.id,body:values});form.reset();}
   else if(action==='moderate')await api.call('moderate',{method:'POST',id:topic.id,body:{status:values.status,reviewed:values.reviewed==='on'}});
   else if(action==='access-settings')await api.call('settings',{method:'POST',body:{requireCode:values.requireCode==='true'}});
   else if(action==='settings')await api.call('settings',{method:'POST',body:values});
   else if(action==='rotate-code'){if(!confirm('Save this review code and end all existing reviewer sessions?'))return;await api.call(action,{method:'POST',body:values});form.reset();notice='Review code saved. Share it privately with PCC reviewers.';}
   else if(action==='search'){query=values.q;topic=null;}
   await refresh();
  }catch(e){fail(e);}finally{busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);const fieldset=root.querySelector('fieldset');if(fieldset)fieldset.disabled=false;}
 };
 try{await refresh();}catch(e){error=e.message;render();fail(e);}
}
