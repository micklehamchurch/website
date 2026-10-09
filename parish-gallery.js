(() => {
  document.querySelectorAll('[data-parish-carousel]').forEach(carousel => {
    const slides = [...carousel.querySelectorAll('[data-slide]')];
    const dots = [...carousel.querySelectorAll('[data-position]')];
    let current = 0;
    function show(position) {
      current = (position + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      dots.forEach((dot, i) => { dot.setAttribute('aria-pressed', String(i === current)); });
      carousel.querySelector('[data-status]').textContent = `Photograph ${current + 1} of ${slides.length}`;
    }
    carousel.querySelector('[data-previous]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-next]').addEventListener('click', () => show(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    let start;
    carousel.querySelector('.parish-carousel-images').addEventListener('pointerdown', event => { start = { x: event.clientX, y: event.clientY }; });
    carousel.querySelector('.parish-carousel-images').addEventListener('pointerup', event => {
      if (start && Math.abs(event.clientX - start.x) > 50 && Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y)) show(current + (event.clientX < start.x ? 1 : -1));
      start = null;
    });
    carousel.querySelector('.parish-carousel-images').addEventListener('pointercancel', () => { start = null; });
  });
  const dialog = document.querySelector('#parish-gallery-dialog');
  if (!dialog) return;
  const links = [...document.querySelectorAll('[data-gallery-photo]')];
  let current = 0;
  function show(position) {
    current = (position + links.length) % links.length;
    const link = links[current];
    const image = dialog.querySelector('img');
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    dialog.querySelector('[data-gallery-status]').textContent = `${current + 1} of ${links.length} · ${image.alt}`;
  }
  links.forEach((link, i) => link.addEventListener('click', event => {
    event.preventDefault(); show(i); openPublicDialog(dialog, link);
  }));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-previous]').addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
})();
