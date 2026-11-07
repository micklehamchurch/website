// Native details remains usable without JavaScript. Print expands all source copy.
(() => {
  const archive = document.querySelector('.pews-archive-toggle');
  if (!archive) return;
  const desktop = matchMedia('(min-width:1180px)');
  const update = () => { archive.open = desktop.matches || location.hash === '#edition-archive'; };
  update();
  desktop.addEventListener('change', update);
  addEventListener('hashchange', update);
  let printState = [];
  addEventListener('beforeprint', () => {
    printState = [...document.querySelectorAll('.pews-edition details')].map(node => [node,node.open]);
    printState.forEach(([node]) => { node.open = true; });
    document.querySelectorAll('.pews-edition img').forEach(img => { img.loading = 'eager'; });
  });
  addEventListener('afterprint', () => { printState.forEach(([node,open]) => { node.open = open; }); });
})();
