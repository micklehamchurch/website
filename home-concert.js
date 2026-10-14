/* Midnight after 17 October in Europe/London (still British Summer Time).
 * Hidden in HTML so expired promotions cannot flash or appear without JS.
 */
(() => {
  const promotion = document.querySelector('[data-home-concert]');
  if (!promotion) return;
  const expiresAt = Date.parse('2026-10-18T00:00:00+01:00');
  let timer;
  const refresh = () => {
    clearTimeout(timer);
    const remaining = expiresAt - Date.now();
    promotion.hidden = remaining <= 0;
    // Refresh open tabs at expiry; cap the delay to the browser timer limit.
    if (remaining > 0) timer = setTimeout(refresh, Math.min(remaining, 2147483647));
  };
  refresh();
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
})();
