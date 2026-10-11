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
    let swiped = false;
    carousel.querySelector('.parish-carousel-images').addEventListener('pointerdown', event => { swiped = false; start = { x: event.clientX, y: event.clientY }; });
    carousel.querySelector('.parish-carousel-images').addEventListener('pointerup', event => {
      if (start && Math.abs(event.clientX - start.x) > 50 && Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y)) {
        swiped = true; show(current + (event.clientX < start.x ? 1 : -1));
      }
      start = null;
    });
    carousel.querySelector('.parish-carousel-images').addEventListener('click', event => {
      if (swiped && event.detail !== 0) event.preventDefault();
      swiped = false;
    });
    carousel.querySelector('.parish-carousel-images').addEventListener('pointercancel', () => { start = null; });
  });
  const dialog = document.querySelector('#parish-gallery-dialog');
  if (!dialog) return;
  const landing = document.querySelector('[data-album-landing]');
  const view = document.querySelector('[data-album-view]');
  const templates = [...document.querySelectorAll('[data-album-template]')];
  let links = [];
  let activeAlbum;
  let current = 0;
  function route(focus = false) {
    const template = templates.find(item => item.dataset.albumTemplate === location.hash.slice(1));
    if (dialog.open) dialog.close();
    view.replaceChildren();
    landing.hidden = !!template;
    view.hidden = !template;
    if (template) {
      activeAlbum = template.dataset.albumTemplate;
      view.append(template.content.cloneNode(true));
      links = [...view.querySelectorAll('[data-gallery-photo]')];
      dialog.querySelector('h2').textContent = view.querySelector('h2').textContent;
      if (focus) view.querySelector('h2').focus();
    } else {
      links = [];
      if (focus) [...landing.querySelectorAll('[data-album-card]')].find(card => card.dataset.albumCard === activeAlbum)?.focus();
    }
  }
  window.addEventListener('hashchange', () => route(true));
  route();
  function show(position) {
    current = (position + links.length) % links.length;
    const link = links[current];
    const image = dialog.querySelector('img');
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    dialog.querySelector('[data-gallery-status]').textContent = `${current + 1} of ${links.length} · ${image.alt}`;
  }
  view.addEventListener('click', event => {
    const link = event.target.closest('[data-gallery-photo]');
    if (!link) return;
    event.preventDefault(); show(links.indexOf(link)); openPublicDialog(dialog, link);
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-previous]').addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const buttons = [...dialog.querySelectorAll('button')];
      const position = buttons.indexOf(document.activeElement);
      if (event.shiftKey && position <= 0) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && (position === buttons.length - 1 || position < 0)) { event.preventDefault(); buttons[0].focus(); }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
})();
