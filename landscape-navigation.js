/* Reuses the real navigation nodes and their existing link/accordion listeners.
   Nothing changes outside the existing short-landscape breakpoint. */
(() => {
  'use strict';
  if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
  const nav = document.querySelector('#mainNav');
  const opener = document.querySelector('.menu-toggle');
  if (!nav || !opener) return;
  const viewport = matchMedia('(orientation: landscape) and (max-width: 999px) and (max-height: 460px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const home = document.createComment('Original shared navigation position');
  nav.before(home);
  const dialog = document.createElement('dialog');
  dialog.className = 'landscape-navigation-dialog';
  dialog.setAttribute('aria-labelledby', 'landscape-navigation-title');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = '<div class="landscape-navigation-heading"><p id="landscape-navigation-title">Navigation</p><button type="button" class="landscape-navigation-close" aria-label="Close navigation" autofocus>×</button></div><div class="landscape-navigation-scroll"></div>';
  document.body.append(dialog);
  const closeButton = dialog.querySelector('button');
  const scroll = dialog.querySelector('.landscape-navigation-scroll');
  let pageScroll = 0, closing = false, preserveMenu = false, animation;
  let outsidePress = false, swipe = null;
  const outside = event => {
    const b = dialog.getBoundingClientRect();
    return event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom;
  };

  function finish() {
    animation?.cancel();
    if (dialog.open) dialog.close();
  }
  function close(returnFocus = true, immediate = false) {
    if (!dialog.open) return false;
    if (closing) return true;
    closing = true;
    if (!immediate && !reduced.matches && dialog.animate) {
      animation?.cancel();
      animation = dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(4px)'}], {duration:100,easing:'ease-in'});
      animation.finished.then(finish, finish);
    } else finish();
    // The native close event restores the DOM and focus once the reverse motion ends.
    return true;
  }
  function open() {
    if (dialog.open || !viewport.matches) return;
    closing = false;
    preserveMenu = false;
    pageScroll = window.scrollY;
    document.documentElement.style.setProperty('--landscape-navigation-scroll-top', `-${pageScroll}px`);
    document.documentElement.classList.add('landscape-navigation-open');
    scroll.append(nav);
    nav.classList.add('is-open');
    opener.setAttribute('aria-expanded', 'true');
    opener.setAttribute('aria-label', 'Close navigation');
    dialog.showModal();
    scroll.scrollTop = 0;
    closeButton.focus({preventScroll:true});
    globalThis.syncNavigationBackdrop?.();
    if (!reduced.matches && dialog.animate) {
      animation = dialog.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}], {duration:140,easing:'ease-out'});
    }
  }
  dialog.addEventListener('close', () => {
    animation?.cancel();
    home.after(nav);
    document.documentElement.classList.remove('landscape-navigation-open');
    document.documentElement.style.removeProperty('--landscape-navigation-scroll-top');
    window.scrollTo({top:pageScroll,behavior:'instant'});
    closing = false;
    swipe = null;
    outsidePress = false;
    if (preserveMenu) globalThis.syncNavigationBackdrop?.();
    else globalThis.closeNavigation?.(false);
    opener.focus({preventScroll:true});
  });
  closeButton.addEventListener('click', () => close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('pointerdown', event => {
    outsidePress = event.isPrimary && event.button === 0 && event.target === dialog && outside(event);
  });
  dialog.addEventListener('click', event => {
    if (outsidePress && event.target === dialog && outside(event)) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    outsidePress = false;
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const targets = [...dialog.querySelectorAll('button, a[href], input')].filter(e => !e.disabled && e.getClientRects().length);
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Passive touch observation only: never intercept scrolling, browser zoom or
  // gestures starting inside the panel. A deliberate backdrop swipe is optional.
  dialog.addEventListener('touchstart', event => {
    swipe = null;
    if (event.touches.length !== 1 || event.target !== dialog) return;
    const t = event.touches[0];
    if (outside(t)) swipe = {id:t.identifier,x:t.clientX,y:t.clientY,time:performance.now()};
  }, {passive:true});
  dialog.addEventListener('touchmove', event => { if (event.touches.length !== 1) swipe = null; }, {passive:true});
  dialog.addEventListener('touchcancel', () => { swipe = null; }, {passive:true});
  dialog.addEventListener('touchend', event => {
    if (!swipe) return;
    const t = [...event.changedTouches].find(t => t.identifier === swipe.id);
    if (t && swipe.y - t.clientY >= 70 && Math.abs(t.clientX - swipe.x) <= 48 && performance.now() - swipe.time <= 1200) close();
    swipe = null;
  }, {passive:true});

  opener.addEventListener('click', event => {
    if (!viewport.matches) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (dialog.open) close(); else open();
  }, true);
  viewport.addEventListener('change', () => {
    if (!viewport.matches && dialog.open) {
      preserveMenu = true;
      closing = false;
      close(true, true);
    } else if (viewport.matches && nav.classList.contains('is-open')) open();
  });
  globalThis.churchLandscapeNavigation = Object.freeze({isOpen:()=>dialog.open, close});
  if (viewport.matches && nav.classList.contains('is-open')) open();
})();
