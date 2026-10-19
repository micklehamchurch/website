(() => {
  'use strict';
  const get = name => document.getElementById(`bible-${name}`);
  const drawer = get('drawer'), browse = get('browse'), form = get('controls');
  const mobile = window.matchMedia('(max-width: 760px)');
  const paginated = document.body.classList.contains('bible-paginated');
  function placeControls() {
    const focused = document.activeElement;
    if (drawer.open) drawer.close();
    ((paginated || mobile.matches) ? get('drawer-content') : get('controls-home')).append(form);
    if (form.contains(focused)) {
      if (paginated || mobile.matches) browse.focus(); else focused.focus();
    }
  }
  browse.addEventListener('click', () => drawer.showModal());
  get('drawer-close').addEventListener('click', () => drawer.close());
  drawer.addEventListener('close', () => { if (paginated || mobile.matches) browse.focus(); });
  form.addEventListener('submit', () => { if (drawer.open) drawer.close(); });
  mobile.addEventListener('change', placeControls);
  placeControls();
  const about = get('about'), information = get('information');
  about.addEventListener('click', () => {
    get('information-translation').textContent = get('translation-name').textContent;
    const notice = get('copyright').textContent;
    if (notice) get('information-copyright').textContent = notice;
    information.showModal();
  });
  get('information-close').addEventListener('click', () => information.close());
  information.addEventListener('close', () => about.focus());
})();
(() => {
  if (window.parent !== window && new URLSearchParams(location.search).get('book') === 'overlay') {
    document.body.classList.add('bible-overlay');
    const close = document.getElementById('bible-close');
    close.hidden = false;
    document.querySelector('.bible-toolbar').append(close);
    close.addEventListener('click', () => window.parent.postMessage('mickleham-close-bible', location.origin));
    window.parent.postMessage('mickleham-bible-toolbar-ready', location.origin);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        window.parent.postMessage('mickleham-close-bible', location.origin);
      }
    });
  }
})();
// Overlay background belongs to the parent site's native modal, not to the book.
(() => {
  const overlay = window.parent !== window && new URLSearchParams(location.search).get('book') === 'overlay';
  if (!overlay) return;
  let outside = false;
  const background = target => target === document.body || target === document.getElementById('main-content') || (target.classList?.contains('bible-shell') || target.classList?.contains('bible-toolbar'));
  document.addEventListener('pointerdown', event => { outside = event.button === 0 && event.isPrimary !== false && !document.querySelector('dialog[open]') && background(event.target); });
  document.addEventListener('pointercancel', () => { outside = false; });
  document.addEventListener('click', event => {
    const close = outside && background(event.target) && !document.querySelector('dialog[open]');
    outside = false;
    if (close) window.parent.postMessage('mickleham-close-bible', location.origin);
  });
})();
