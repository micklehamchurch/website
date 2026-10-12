// No third-party map requests until the visitor chooses to load it.
(() => {
  const button = document.querySelector('[data-load-find-map]');
  button?.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.title = 'OpenStreetMap of Mickleham, Westhumble and Box Hill & Westhumble station';
    frame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=-0.339%2C51.252%2C-0.313%2C51.273&layer=mapnik';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    frame.setAttribute('tabindex', '0');
    const panel = document.querySelector('[data-find-map]');
    panel.replaceChildren(frame);
    frame.focus();
  }, { once: true });
})();
