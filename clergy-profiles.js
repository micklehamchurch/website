(() => {
  const profile = document.getElementById('clergy-profile-dialog');
  const viewer = document.getElementById('clergy-image-dialog');
  if (!profile || typeof profile.showModal !== 'function') return;
  const content = profile.querySelector('[data-profile-content]');
  // Keep Tab within the top archive dialog, including at browser-chrome boundaries.
  for (const dialog of [profile, viewer]) dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(item => !item.hidden && item.getClientRects().length);
    if (!controls.length) return;
    event.preventDefault();
    const current = controls.indexOf(document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next].focus();
  });
  let records, images = [], imageIndex = 0;
  const dataReady = fetch('clergy-data.json').then(response => { if (!response.ok) throw new Error('Archive images unavailable'); return response.json(); }).then(data => { records = data; }).catch(() => {});
  document.documentElement.classList.add('clergy-enhanced');
  function showProfile(id, opener) {
    const original = document.getElementById(id);
    if (!original?.classList.contains('clergy-profile')) return;
    content.replaceChildren(original.querySelector('.clergy-profile-content').cloneNode(true));
    content.querySelector('h2').id = 'clergy-dialog-title';
    images = records?.find(record => record.id === id)?.archiveImages || [];
    profile.dataset.person = id;
    if (!profile.open) openPublicDialog(profile, opener || document.querySelector(`.clergy-card[href="#${id}"]`));
    profile.scrollTop = 0;
  }
  function fromLocation() {
    const id = location.hash.slice(1);
    if (viewer.open) viewer.close();
    if (document.getElementById(id)?.classList.contains('clergy-profile')) showProfile(id);
    else if (profile.open) profile.close();
  }
  document.querySelectorAll('.clergy-card').forEach(card => card.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const id = card.hash.slice(1);
    history.pushState(null, '', card.hash);
    showProfile(id, card);
  }));
  window.addEventListener('popstate', fromLocation);
  window.addEventListener('hashchange', fromLocation);
  profile.addEventListener('close', () => {
    if (location.hash.slice(1) === profile.dataset.person) history.replaceState(null, '', location.pathname + location.search);
  });
  profile.querySelector('[data-close-profile]').addEventListener('click', () => profile.close());
  viewer.querySelector('[data-close-image]').addEventListener('click', () => viewer.close());
  function paintImage() {
    const item = images[imageIndex];
    if (!item) return;
    const image = viewer.querySelector('[data-large-image]');
    image.src = item.src; image.alt = item.alt;
    viewer.querySelector('[data-image-caption]').textContent = item.caption || '';
    viewer.querySelector('[data-image-counter]').textContent = `${imageIndex + 1} of ${images.length}`;
    viewer.querySelectorAll('[data-image-previous],[data-image-next]').forEach(button => { button.hidden = images.length < 2; });
  }
  content.addEventListener('click', async event => {
    const link = event.target.closest('[data-archive-image]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    await dataReady;
    if (!profile.open || !link.isConnected) return;
    images = records?.find(record => record.id === profile.dataset.person)?.archiveImages || [];
    if (!images.length) { location.assign(link.href); return; }
    imageIndex = Number(link.dataset.archiveImage); paintImage(); openPublicDialog(viewer, link);
  });
  function move(delta) { imageIndex = (imageIndex + delta + images.length) % images.length; paintImage(); }
  viewer.querySelector('[data-image-previous]').addEventListener('click', () => move(-1));
  viewer.querySelector('[data-image-next]').addEventListener('click', () => move(1));
  viewer.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } });
  let start;
  viewer.querySelector('[data-large-image]').addEventListener('touchstart', event => { start = {x:event.touches[0].clientX,y:event.touches[0].clientY}; }, {passive:true});
  viewer.querySelector('[data-large-image]').addEventListener('touchend', event => { if (!start) return; const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y; if (Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5 && images.length>1) move(dx<0?1:-1); start=null; }, {passive:true});
  fromLocation();
})();
