/* State and keyboard enhancement for the shared public header only. */
(() => {
  'use strict';
  const header=document.querySelector('[data-site-header]');
  if(!header)return;
  const space=document.createElement('div');space.className='public-header-space';space.setAttribute('aria-hidden','true');header.after(space);
  const photo=document.querySelector('main :is(.home-hero-photo,.visit-principal-photo,.parish-about-hero-photo,.history-hero-photo,.wedding-hero-photo,.baptism-hero-photo,.funeral-hero-photo)');
  if(photo)document.body.classList.add('header-photo-page');
  const compact=matchMedia('(max-width:1359px)');
  let frame=0;
  function update(){header.classList.toggle('is-condensed',!compact.matches&&scrollY>64);frame=0;}
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('pageshow',schedule);compact.addEventListener('change',schedule);update();
  // Keep the existing skip link first; supply it for future standard public pages.
  if(!document.querySelector('.skip-link')){const main=document.querySelector('main');if(main){main.id ||= 'main-content';const skip=document.createElement('a');skip.className='skip-link';skip.href='#'+main.id;skip.textContent='Skip to main content';document.body.prepend(skip);}}
  const items=[...header.querySelectorAll('.nav-item')];
  function show(item,hover=false){const button=item.querySelector('.nav-trigger');if(hover)button.dataset.openedByHover='true';else delete button.dataset.openedByHover;globalThis.closeDropdowns?.(item.querySelector('.nav-trigger'));item.classList.add('is-open');item.querySelector('.nav-trigger').setAttribute('aria-expanded','true');globalThis.syncNavigationBackdrop?.();}
  function hide(item){delete item.querySelector('.nav-trigger').dataset.openedByHover;item.classList.remove('is-open');item.querySelector('.nav-trigger').setAttribute('aria-expanded','false');globalThis.syncNavigationBackdrop?.();}
  items.forEach(item=>{
    item.addEventListener('pointerenter',event=>{if(!compact.matches&&event.pointerType==='mouse')show(item,true);});
    item.addEventListener('pointerleave',()=>{if(!compact.matches&&!item.contains(document.activeElement))hide(item);});
    item.addEventListener('focusout',()=>{queueMicrotask(()=>{if(!compact.matches&&!item.contains(document.activeElement))hide(item);});});
    item.addEventListener('keydown',event=>{
      const trigger=item.querySelector('.nav-trigger'),links=[...item.querySelectorAll('.dropdown a')],i=links.indexOf(document.activeElement);
      if(event.key==='Escape'&&trigger.getAttribute('aria-expanded')==='true'){event.preventDefault();event.stopPropagation();hide(item);trigger.focus();}
      else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(item);links[i<0?(event.key==='ArrowDown'?0:links.length-1):(i+(event.key==='ArrowDown'?1:-1)+links.length)%links.length].focus();}
      else if(i>=0&&(event.key==='Home'||event.key==='End')){event.preventDefault();links[event.key==='Home'?0:links.length-1].focus();}
    });
  });
})();

