/* State and keyboard enhancement for the shared public header only. */
(() => {
  'use strict';
  const header=document.querySelector('[data-site-header]');
  if(!header)return;
  const space=document.createElement('div');space.className='public-header-space';space.setAttribute('aria-hidden','true');header.after(space);
  const photo=document.querySelector('main :is(.home-hero-photo,.visit-principal-photo,.parish-about-hero-photo,.history-hero-photo,.wedding-hero-photo,.baptism-hero-photo,.funeral-hero-photo)');
  if(photo)document.body.classList.add('header-photo-page');
  const compact=matchMedia('(max-width:1535px)');
  let frame=0;
  function update(){header.classList.toggle('is-condensed',!compact.matches&&scrollY>64);frame=0;}
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('pageshow',schedule);compact.addEventListener('change',schedule);update();
  // Keep the existing skip link first; supply it for future standard public pages.
  if(!document.querySelector('.skip-link')){const main=document.querySelector('main');if(main){main.id ||= 'main-content';const skip=document.createElement('a');skip.className='skip-link';skip.href='#'+main.id;skip.textContent='Skip to main content';document.body.prepend(skip);}}

  // Enhancement is lazy; the original link remains a working fallback.
  const search=header.querySelector('.compact-search');
  if(search){
  const base=new URL('.',document.querySelector('script[src*="site.js"]').src);
  let searchModule;
  search.setAttribute('role','button');search.setAttribute('aria-expanded','false');
  search.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();search.click();}});
  search.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const drawer=search.closest('dialog');
    const closed=drawer?.open?new Promise(resolve=>{drawer.addEventListener('close',resolve,{once:true});globalThis.churchResponsiveNavigation.close();}):Promise.resolve();
    globalThis.closeDropdowns?.();globalThis.syncNavigationBackdrop?.();
    try{searchModule ||= import(new URL('header-search.js?v=20261022-inline-2',base).href);const module=await searchModule;await closed;module.open(search,base);}catch{location.assign(search.href);}
  },true);
  }
  // Non-modal desktop disclosure; the same sections become mobile accordions.
  const buttons=[...header.querySelectorAll('.nav-trigger')];
  function activate(button){globalThis.closeDropdowns?.(button);button.setAttribute('aria-expanded','true');button.closest('.nav-item').classList.add('is-open');globalThis.syncNavigationBackdrop?.();}
  buttons.forEach(button=>button.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();activate(button);
    const links=document.getElementById('menu-'+button.closest('.nav-item').dataset.category).querySelectorAll('a');
    (event.key==='ArrowDown'?links[0]:links[links.length-1])?.focus();
  }));
  document.querySelectorAll('.hub-column').forEach(column=>column.addEventListener('keydown',event=>{
    const links=[...column.querySelectorAll('a')],i=links.indexOf(document.activeElement);
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();globalThis.closeDropdowns?.();globalThis.syncNavigationBackdrop?.();
      document.getElementById(`trigger-${column.dataset.category}`)?.focus();
    }else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&i>=0){event.preventDefault();links[event.key==='Home'?0:event.key==='End'?links.length-1:(i+(event.key==='ArrowDown'?1:-1)+links.length)%links.length].focus();}
  }));
  document.addEventListener('focusin',event=>{if(!compact.matches&&!header.contains(event.target)){globalThis.closeDropdowns?.();globalThis.syncNavigationBackdrop?.();}});
})();
