/* One shared responsive menu: move the real navigation, never clone its tree. */
(() => {
  'use strict';
  const nav=document.querySelector('#mainNav'),opener=document.querySelector('.menu-toggle');
  if(!nav||!opener||typeof HTMLDialogElement==='undefined')return;
  const compact=matchMedia('(max-width:1359px)'),slot=document.createComment('Shared navigation position');nav.before(slot);
  const contacts=document.createElement('div');contacts.className='drawer-only drawer-contact';
  const script=document.querySelector('script[src*="site.js"]');const url=file=>new URL(file,script.src).href;
  contacts.innerHTML=`<a href="${url('contact.html')}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>Contact</a><a href="${url('finding-us.html')}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg>Find Us</a>`;nav.querySelector('.header-visit').before(contacts);
  const dialog=document.createElement('dialog');dialog.id='responsive-navigation';dialog.className='responsive-navigation-dialog';dialog.setAttribute('aria-label','Website navigation');dialog.setAttribute('aria-modal','true');dialog.innerHTML='<div class="responsive-navigation-heading"><button class="responsive-navigation-close" type="button" aria-label="Close navigation" autofocus>×</button></div><div class="responsive-navigation-scroll"></div>';
  const brand=document.querySelector('.header-branding .brand').cloneNode(true);dialog.querySelector('.responsive-navigation-heading').prepend(brand);document.body.append(dialog);
  const closeButton=dialog.querySelector('button'),scroll=dialog.querySelector('.responsive-navigation-scroll');let savedScroll=0,outsidePress=false;
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom;};
  function close(){if(!dialog.open)return false;dialog.close();return true;}
  function open(){if(dialog.open||!compact.matches)return;savedScroll=scrollY;document.documentElement.style.setProperty('--responsive-navigation-scroll-top',`-${savedScroll}px`);document.documentElement.classList.add('responsive-navigation-open');scroll.append(nav);nav.classList.add('is-open');opener.setAttribute('aria-expanded','true');opener.setAttribute('aria-label','Close menu');dialog.showModal();scroll.scrollTop=0;closeButton.focus({preventScroll:true});globalThis.syncNavigationBackdrop?.();}
  dialog.addEventListener('close',()=>{slot.after(nav);document.documentElement.classList.remove('responsive-navigation-open');document.documentElement.style.removeProperty('--responsive-navigation-scroll-top');nav.classList.remove('is-open');opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-label','Open menu');globalThis.closeDropdowns?.();globalThis.syncNavigationBackdrop?.();window.scrollTo({top:savedScroll,behavior:'instant'});(compact.matches?opener:document.querySelector('.header-branding .brand'))?.focus({preventScroll:true});});
  closeButton.addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('pointerdown',e=>{outsidePress=e.isPrimary&&e.button===0&&e.target===dialog&&outside(e);});dialog.addEventListener('click',e=>{if(outsidePress&&e.target===dialog&&outside(e)){e.preventDefault();e.stopPropagation();close();}outsidePress=false;});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const targets=[...dialog.querySelectorAll('button,a[href],input')].filter(e=>!e.disabled&&e.getClientRects().length);if(e.shiftKey&&document.activeElement===targets[0]){e.preventDefault();targets.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===targets.at(-1)){e.preventDefault();targets[0].focus();}});
  nav.addEventListener('click',e=>{if(e.target.closest('a')&&dialog.open)close();});
  opener.addEventListener('click',e=>{if(!compact.matches)return;e.preventDefault();e.stopImmediatePropagation();if(dialog.open)close();else open();},true);
  const sync=()=>{opener.setAttribute('aria-controls',compact.matches?dialog.id:'mainNav');if(!compact.matches&&dialog.open)close();};compact.addEventListener('change',sync);sync();globalThis.churchResponsiveNavigation=Object.freeze({isOpen:()=>dialog.open,close});
})();
