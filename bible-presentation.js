(() => {
  'use strict';
  const get = name => document.getElementById(`bible-${name}`);
  const drawer = get('drawer'), browse = get('browse'), form = get('controls');
  const mobile = window.matchMedia('(max-width: 760px)');
  function placeControls() {
    const focused = document.activeElement;
    if (drawer.open) drawer.close();
    (mobile.matches ? get('drawer-content') : get('controls-home')).append(form);
    if (form.contains(focused)) {
      if (mobile.matches) browse.focus(); else focused.focus();
    }
  }
  browse.addEventListener('click', () => drawer.showModal());
  get('drawer-close').addEventListener('click', () => drawer.close());
  drawer.addEventListener('close', () => { if (mobile.matches) browse.focus(); });
  form.addEventListener('submit', () => { if (drawer.open) drawer.close(); });
  mobile.addEventListener('change', placeControls);
  placeControls();
})();
(() => {
  if (window.parent !== window && new URLSearchParams(location.search).get('book') === 'overlay') {
    document.body.classList.add('bible-overlay');
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('bible-drawer').open) {
        window.parent.postMessage('mickleham-close-bible', location.origin);
      }
    });
  }
})();
