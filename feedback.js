import {createFeedbackClient,currentFeedbackPage,mountFeedback} from './feedback-ui.mjs';
const api=createFeedbackClient(),context=currentFeedbackPage();
const board=document.querySelector('#website-feedback-board');
if(board){
 const page=new URL(location.href).searchParams.get('page');
 if(page&&/^\/website\/[a-z0-9/.-]*$/i.test(page)&&!page.includes('..')){context.path=page;context.canonicalPath=page;context.title='Selected website page';}
 void mountFeedback(board,{api,context});
}else{
 try{
  const config=await api.call('config');
  if(config.mode==='pcc'||config.mode==='public'){
   const launch=document.createElement('button');launch.className='feedback-launcher';launch.type='button';launch.textContent=config.mode==='pcc'?'💬 PCC Feedback':'💬 Website Feedback';launch.setAttribute('aria-haspopup','dialog');
   const dialog=document.createElement('dialog');dialog.className='feedback-dialog';dialog.setAttribute('aria-labelledby','feedback-dialog-title');
   dialog.innerHTML='<header class="fb-dialog-heading"><h2 id="feedback-dialog-title">'+(config.mode==='pcc'?'PCC Feedback':'Website Feedback')+'</h2><button type="button" aria-label="Close feedback">×</button></header><div class="fb-dialog-scroll"><p>Feedback about: <strong></strong></p><div class="feedback-content"></div><p><a class="fb-board-link">Open full feedback board →</a></p></div>';
   dialog.querySelector('strong').textContent=context.title;dialog.querySelector('.fb-board-link').href=new URL('feedback.html?page='+encodeURIComponent(context.path),import.meta.url).href;
   const close=dialog.querySelector('button');close.onclick=()=>dialog.close();
   launch.onclick=()=>{dialog.showModal();document.documentElement.classList.add('feedback-dialog-open');close.focus();void mountFeedback(dialog.querySelector('.feedback-content'),{api,context});};
   dialog.addEventListener('close',()=>{document.documentElement.classList.remove('feedback-dialog-open');requestAnimationFrame(()=>launch.focus({preventScroll:true}));});
   dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
   dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
   document.body.append(launch,dialog);document.documentElement.classList.add('feedback-enabled');
  }
 }catch{/* Fail closed: an unavailable/unconfigured feedback API never obstructs the site. */}
}
