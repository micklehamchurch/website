// Native details keeps the full archive usable without JavaScript.
(() => {
  const archive = document.querySelector('.pews-archive-toggle');
  const desktop = matchMedia('(min-width:1201px)');
  const update = () => { archive.open = desktop.matches; };
  update();
  desktop.addEventListener('change', update);
})();
