/* Progressive disclosure: one panel moves with the existing shared navigation. */
(() => {
  'use strict';
  const header=document.querySelector('[data-site-header]'),nav=document.getElementById('mainNav');
  const original=nav?.querySelector('.header-information a[href$="policies.html"]');
  if(!header||!original)return;
  const base=new URL('.',document.querySelector('script[src*="site.js"]').src),url=file=>new URL(file,base).href;
  const compact=matchMedia('(max-width:999px), (max-width:1279px) and (max-height:999px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const trigger=document.createElement('button');trigger.type='button';trigger.className='policies-trigger';trigger.id='policies-trigger';trigger.innerHTML=original.innerHTML;trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','policies-navigation');
  const icons={shield:'<path d="M12 2 3 5v6c0 5 4 9 9 11 5-2 9-6 9-11V5Z"/>',water:'<path d="M3 12h18c0 5-4 7-9 7s-9-2-9-7ZM12 19v3M7 22h10M12 1c-5 6-5 9 0 9s5-3 0-9Z"/>',memorial:'<path d="M9 2h6v4h4v4h-4v9H9v-9H5V6h4ZM5 19h14v3H5Z"/>',documents:'<path d="M6 5h9l5 5v12H6ZM15 5v6h5M3 18H1V1h13v2"/>'};
  const icon=name=>`<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${icons[name]}</svg>`;
  const categories=[
    ['Safeguarding','Our safeguarding information, procedures and contacts.','View safeguarding','safeguarding.html','shield'],
    ['Baptisms','Information and guidance for baptisms in our parish.','Baptism guidance','baptisms.html','water'],
    ['Churchyard','Regulations and information about our churchyard.','Churchyard regulations','churchyard-regulations.html','memorial'],
    ['Other policies','Additional parish policies and useful documents.','View other documents','policies.html#policies-3','documents']
  ];
  const panel=document.createElement('section');panel.id='policies-navigation';panel.className='policies-navigation';panel.setAttribute('aria-label','Policies and documents');panel.hidden=true;panel.inert=true;
  panel.innerHTML=`<div class="policies-menu-visual"><img data-src="${url('assets/images/about/church-card.webp')}" width="720" height="405" alt="" decoding="async"><div><h2>Policies &amp;<br> documents</h2><p>Parish policies, guidance and key documents.</p></div></div><div class="policies-menu-content"><div class="policies-menu-categories">${categories.map(([title,description,label,href,symbol])=>`<div class="policies-menu-category"><span class="policies-menu-icon">${icon(symbol)}</span><h3>${title}</h3><p>${description}</p><a href="${url(href)}"><span class="policies-label-desktop">${label}</span><span class="policies-label-mobile">${title==='Churchyard'?'Churchyard Regulations':title}</span><span aria-hidden="true"> →</span></a></div>`).join('')}</div><div class="policies-menu-all"><a href="${url('policies.html')}">${icon('documents')}<span>View all policies &amp; documents</span><span aria-hidden="true"> →</span></a></div></div>`;
  original.replaceWith(trigger);nav.append(panel);
  let open=false,movement=null,frame=0;
  function position(){frame=0;if(!compact.matches){const r=header.getBoundingClientRect();panel.style.top=`${r.bottom+8}px`;panel.style.maxHeight=`${Math.max(0,innerHeight-r.bottom-24)}px`;}}
  function schedule(){if(!frame)frame=requestAnimationFrame(position);}
  function close(restore=false){if(!open&&panel.hidden)return;open=false;movement?.cancel();movement=null;panel.hidden=true;panel.inert=true;trigger.setAttribute('aria-expanded','false');if(restore){const target=trigger.getClientRects().length?trigger:header.querySelector('.header-branding .brand');target?.focus({preventScroll:true});}}
  function show(){movement?.cancel();globalThis.closeDropdowns?.();globalThis.syncNavigationBackdrop?.();open=true;panel.hidden=false;panel.inert=false;trigger.setAttribute('aria-expanded','true');position();if(!compact.matches){const img=panel.querySelector('img');if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}if(!reduced.matches)movement=panel.animate([{opacity:0,transform:'translate(-50%,-8px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:220,easing:'ease-out'});}}
  trigger.addEventListener('click',()=>open?close():show());
  panel.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  document.addEventListener('click',event=>{if(open&&!panel.contains(event.target)&&!trigger.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
  document.addEventListener('focusin',event=>{if(open&&!panel.contains(event.target)&&!trigger.contains(event.target))close();});
  // Tab from the trigger enters the panel; the panel itself never traps focus.
  trigger.addEventListener('keydown',event=>{if(open&&event.key==='Tab'&&!event.shiftKey){event.preventDefault();panel.querySelector('a').focus();}});
  panel.querySelector('a').addEventListener('keydown',event=>{if(event.key==='Tab'&&event.shiftKey){event.preventDefault();trigger.focus();}});
  function sync(){const focused=panel.contains(document.activeElement);close(focused);(compact.matches?trigger.parentElement:nav).append(panel);panel.style.removeProperty('top');panel.style.removeProperty('max-height');}
  compact.addEventListener('change',sync);sync();
  document.addEventListener('close',event=>{if(event.target.id==='responsive-navigation')close();},true);
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);new ResizeObserver(schedule).observe(header);
  addEventListener('pagehide',()=>close());addEventListener('pageshow',()=>close());reduced.addEventListener('change',()=>movement?.cancel());
})();
