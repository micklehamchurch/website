/* Progressive enhancement: server-rendered guidance stays fully readable without JS. */
(() => {
 'use strict';
 const root=document.querySelector('.reg-page');if(!root)return;
 const triggers=[...root.querySelectorAll('.reg-accordion-trigger')];
 const animations=new WeakMap();
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function setOpen(button,open,animate=false){
  const panel=document.getElementById(button.getAttribute('aria-controls'));
  animations.get(panel)?.cancel();animations.delete(panel);
  button.setAttribute('aria-expanded',String(open));panel.inert=!open;
  const finish=()=>{panel.hidden=!open;panel.style.overflow='';};
  if(!animate||reduced()||!panel.animate){finish();return;}
  const from=panel.hidden?0:panel.getBoundingClientRect().height;panel.hidden=false;
  const to=open?panel.scrollHeight:0;panel.style.overflow='hidden';
  const animation=panel.animate([{height:from+'px',opacity:open?0:1},{height:to+'px',opacity:open?1:0}],{duration:160,easing:'ease-out'});
  animations.set(panel,animation);animation.finished.then(()=>{if(animations.get(panel)!==animation)return;animations.delete(panel);finish();}).catch(()=>{});
 }
 function reveal(hash,scroll=true){
  const id=hash.replace(/^#/,'');let target=root.querySelectorAll('[id]');target=[...target].find(el=>el.id===id);if(!target)return;
  const section=target.closest('.reg-accordion');
  if(section){const button=section.querySelector('.reg-accordion-trigger');setOpen(button,true);button.focus({preventScroll:true});target=section;}
  else if(target.id==='churchyard-regulations-docs')target.focus({preventScroll:true});
  if(scroll)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:reduced()?'instant':'smooth'}));
 }
 for(const button of triggers){
  setOpen(button,false);
  button.addEventListener('click',()=>setOpen(button,button.getAttribute('aria-expanded')!=='true',true));
  button.addEventListener('keydown',event=>{let index=triggers.indexOf(button),next;if(event.key==='ArrowDown')next=(index+1)%triggers.length;else if(event.key==='ArrowUp')next=(index-1+triggers.length)%triggers.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=triggers.length-1;else return;event.preventDefault();triggers[next].focus();});
 }
 root.querySelectorAll('.reg-navigation a').forEach(link=>link.addEventListener('click',()=>reveal(new URL(link.href).hash,false)));
 window.addEventListener('hashchange',()=>reveal(location.hash));
 if(location.hash)reveal(location.hash);
})();
