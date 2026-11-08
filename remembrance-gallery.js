(() => {
  'use strict';

  const viewer = document.querySelector('.remembrance-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const gallery = document.querySelector('.remembrance-gallery');
  const frame = viewer.querySelector('.remembrance-viewer-image');
  let trigger;

  gallery.addEventListener('click', (event) => {
    const link = event.target.closest('[data-remembrance-photo]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const image = document.createElement('img');
    image.alt = link.querySelector('img').alt;
    image.src = link.href;
    frame.replaceChildren(image);
    trigger = link;
    viewer.showModal();
  });
  viewer.addEventListener('close', () => {
    frame.replaceChildren();
    trigger?.focus();
  });
})();
