// Homepage-only enhancement. State follows the hero edge, not a scroll constant.
(() => {
  const header = document.querySelector('[data-site-header]');
  const hero = document.querySelector('.home-hero');
  if (!document.body.classList.contains('home-header-hero') || !header || !hero) return;
  const desktop = window.matchMedia('(min-width: 1000px)');
  let observer;
  let frame;
  let observedHeight = -1;
  function syncState() {
    const rect = hero.getBoundingClientRect();
    header.classList.toggle('is-over-hero', desktop.matches && rect.bottom > header.getBoundingClientRect().height && rect.top <= 0);
  }
  function update() {
    const height = header.getBoundingClientRect().height;
    if (height !== observedHeight) {
      observedHeight = height;
      observer?.disconnect();
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(syncState, { rootMargin: `-${height}px 0px 0px 0px`, threshold: 0 });
        observer.observe(hero);
      }
    }
    syncState();
  }
  function scheduleUpdate() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }
  desktop.addEventListener('change', scheduleUpdate);
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  window.addEventListener('popstate', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  document.addEventListener('focusin', scheduleUpdate);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleUpdate).observe(header);
  // Also covers browsers without IntersectionObserver and restored scroll timing.
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  update();
})();
