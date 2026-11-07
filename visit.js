// Enhance the transport shortcut; the native disclosure also works without JavaScript.
(() => {
  const disclosure = document.querySelector('.visit-travel-details');
  const reveal = () => { if (disclosure) disclosure.open = true; };
  document.querySelector('a[href="#travel-information"]')?.addEventListener('click', reveal);
  if (location.hash === '#travel-information') reveal();
  addEventListener('hashchange', () => { if (location.hash === '#travel-information') reveal(); });
})();
