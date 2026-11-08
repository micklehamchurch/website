/* State and keyboard enhancement for the shared public header only. */
(() => {
  'use strict';
  const header=document.querySelector('[data-site-header]');
  if(!header)return;
  const space=document.createElement('div');space.className='public-header-space';space.setAttribute('aria-hidden','true');header.after(space);
  const photo=document.querySelector('main :is(.home-hero-photo,.visit-principal-photo,.parish-about-hero-photo,.history-hero-photo,.wedding-hero-photo,.baptism-hero-photo,.funeral-hero-photo)');
  if(photo)document.body.classList.add('header-photo-page');
  const compact=globalThis.churchHeaderMode;
  const eligible=matchMedia('(min-width:1280px) and (min-width:80em)');
  const portraitPhone=matchMedia('(max-width:599px) and (orientation:portrait)');
  const nav=header.querySelector('.nav');
  const wrap=header.querySelector('.nav-wrap');
  const searchLink=header.querySelector('.compact-search');

  // Move the real links, so visual order and Tab order stay aligned.
  function headerRows(tree) {
    const nav=tree.querySelector('.nav');
    const information=nav.querySelector('.header-information');
    const socials=nav.querySelector('.header-socials');
    const opening=nav.querySelector('.header-opening');
    const primary=nav.querySelector('.nav-primary');
    const utilities=nav.querySelector('.nav-utilities');
    const actions=utilities.querySelector('.nav-actions');
    const search=nav.querySelector('.compact-search');
    const calendar=nav.querySelector('.nav-calendar');
    const bible=nav.querySelector('.nav-bible');
    const visit=nav.querySelector('.header-visit');
    const group=name=>Object.assign(document.createElement('div'),{className:'option-d-'+name});
    const upper=nav.querySelector('.option-d-upper')||group('upper');
    const lower=nav.querySelector('.option-d-lower')||group('lower');
    const right=upper.querySelector('.option-d-right')||group('right');
    const tools=right.querySelector('.option-d-tools')||group('tools');
    return twoTier=>{
      if(twoTier===(upper.parentNode===nav))return;
      if(twoTier){
        tools.append(search,calendar,bible);
        right.append(information,tools,opening);
        upper.append(socials,right);
        lower.append(primary,visit);
        nav.prepend(upper,lower);
      }else{
        nav.prepend(information,opening,primary);
        utilities.prepend(search);
        actions.append(calendar,bible);
        utilities.append(visit);
        utilities.before(socials);
        upper.remove();
        lower.remove();
      }
    };
  }

  const setRows=headerRows(header);
  let frame=0,dirty=true,topFits=false,condensedFits=false;

  // The temporary, inert probe is measured only when width or text metrics
  // change. It has no IDs, overlays or event handlers and is never painted.
  function measureFit(){
    const probe=header.cloneNode(true);
    probe.inert=true;
    probe.setAttribute('aria-hidden','true');
    probe.removeAttribute('id');
    probe.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    probe.querySelectorAll('.navigation-hub,.dropdown,.policies-navigation,.header-inline-search').forEach(node=>node.remove());
    probe.classList.remove('is-condensed','header-search-open');
    probe.classList.add('is-full','option-d');
    probe.style.visibility='hidden';
    const rows=headerRows(probe);
    rows(true);
    header.after(probe);
    try{
      const wrap=probe.querySelector('.nav-wrap');
      const fits=()=>{
        const bounds=wrap.getBoundingClientRect();
        const items=[...probe.querySelectorAll('.brand,.nav-trigger,.nav-primary>.nav-link,.header-information a,.policies-trigger,.header-opening,.compact-search,.nav-calendar,.nav-bible,.header-visit,.header-social-link')]
          .filter(node=>node.getClientRects().length);
        const boxes=items.map(node=>node.getBoundingClientRect());
        return items.every((node,index)=>{
          const a=boxes[index];
          return node.scrollWidth<=node.clientWidth+1&&a.left>=bounds.left-1&&a.right<=bounds.right+1&&a.top>=bounds.top-1&&a.bottom<=bounds.bottom+1
            &&boxes.slice(index+1).every(b=>a.right<=b.left+0.5||b.right<=a.left+0.5||a.bottom<=b.top+0.5||b.bottom<=a.top+0.5);
        });
      };
      topFits=fits();
      rows(false);
      probe.classList.remove('option-d');
      probe.classList.add('is-condensed');
      condensedFits=topFits&&fits();
    }finally{probe.remove();}
  }

  function update(){
    frame=0;
    if(!header.contains(nav))return; // Keep the drawer stable while it owns the nav.
    if(dirty){
      topFits=condensedFits=false;
      if(eligible.matches)measureFit();
      dirty=false;
    }
    const condensed=topFits&&scrollY>64;
    const twoTier=topFits&&!condensed;
    const full=twoTier||(condensed&&condensedFits);
    const changed=header.classList.contains('is-full')!==full||header.classList.contains('option-d')!==twoTier||header.classList.contains('is-condensed')!==condensed;
    const focused=header.contains(document.activeElement)?document.activeElement:null;
    setRows(twoTier);
    header.classList.toggle('is-full',full);
    header.classList.toggle('option-d',twoTier);
    header.classList.toggle('is-condensed',condensed);
    // Two 44px targets, their 4px gap and clearance from the first utility.
    const mobileRoom=portraitPhone.matches&&searchLink.getBoundingClientRect().left-wrap.getBoundingClientRect().left>=98;
    const mobileChanged=header.classList.contains('has-mobile-socials')!==mobileRoom;
    header.classList.toggle('has-mobile-socials',mobileRoom);
    document.documentElement.classList.toggle('has-full-header',topFits);
    if(changed)compact.dispatchEvent(new Event('change'));
    if(changed&&focused&&document.activeElement!==focused&&focused.getClientRects().length)focused.focus({preventScroll:true});
    if((changed||mobileChanged)&&focused&&!focused.getClientRects().length){
      header.querySelector(full?'.brand':'.menu-toggle').focus({preventScroll:true});
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function remeasure(){dirty=true;schedule();}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',remeasure);
  addEventListener('pageshow',remeasure);
  eligible.addEventListener('change',remeasure);
  portraitPhone.addEventListener('change',remeasure);
  document.fonts?.ready.then(remeasure);
  document.fonts?.addEventListener('loadingdone',remeasure);
  document.addEventListener('close',event=>{if(event.target.id==='responsive-navigation')remeasure();},true);
  const observer=new ResizeObserver(remeasure);
  for(const element of header.querySelectorAll('.nav-wrap,.brand,.header-information,.nav-primary,.compact-search,.nav-calendar,.nav-bible,.header-visit'))observer.observe(element);
  document.querySelector('link[href*="header-navigation.css"]')?.addEventListener('load',remeasure,{once:true});
  update();
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
    try{searchModule ||= import(new URL('header-search.js?v=20261108-header-social-1',base).href);const module=await searchModule;await closed;module.open(search,base);}catch{location.assign(search.href);}
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

/* Policies navigation enhancement; retain the direct link if either asset fails. */
(() => {
  const script=document.querySelector('script[src*="site.js"]');
  if(!script||!document.querySelector('.header-information'))return;
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('policies-navigation.css?v=20261108-header-social-1',script.src).href;
  css.addEventListener('load',()=>{const enhancement=document.createElement('script');enhancement.src=new URL('policies-navigation.js?v=20261108-header-social-1',script.src).href;document.head.append(enhancement);},{once:true});
  document.head.append(css);
})();
