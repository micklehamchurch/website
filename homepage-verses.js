(() => {
  'use strict';
  const hero = document.querySelector('.home-hero');
  const element = document.querySelector('[data-home-verse]');
  const model = window.churchHomepageVersesModel;
  if (!hero || !element || !model) return;
  const footer = document.querySelector('.footer-bottom-links');
  if (footer) {
    const link = document.createElement('a');
    link.href = 'bible-translation.html';
    link.textContent = 'Bible translation acknowledgement';
    footer.append(link);
  }
  const anchor = document.createComment('Weekly Scripture in narrow-screen flow');
  element.before(anchor);
  let schedule = null, loading = false;
  function render() {
    const verse = model.selectVerse(schedule);
    element.hidden = !verse;
    if (!verse) return;
    element.querySelector('p').textContent = `“${verse.quotation.trim()}”`;
    element.querySelector('cite').textContent = `${verse.reference.trim()} · ${verse.translation.trim()}`;
    // Long quotations use the same safe reading flow as narrow screens.
    if (matchMedia('(min-width: 1000px)').matches && verse.quotation.length <= 160) hero.append(element);
    else anchor.after(element);
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(new URL('homepage-verses.json', document.baseURI), {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('unavailable');
      const text = await response.text();
      if (text.length > model.MAX_HOMEPAGE_VERSES_BYTES) throw new Error('oversize');
      schedule = model.validateHomepageVerses(JSON.parse(text));
    } catch { schedule = null; }
    finally { clearTimeout(timeout); loading = false; render(); }
  }
  window.addEventListener('resize', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  setInterval(render, 60000); // London midnight/week changes also work in an open tab.
  setInterval(refresh, 900000);
  void refresh();
})();
