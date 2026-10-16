(() => {
  'use strict';
  if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
  const entries = document.querySelectorAll('.history-timeline .history-period');
  if (!entries.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'history-story-dialog';
  dialog.setAttribute('aria-labelledby', 'history-story-title');
  dialog.innerHTML = '<button type="button" class="history-story-close" aria-label="Close historical story" autofocus>×</button><div class="history-story-scroll" tabindex="0" role="document" aria-label="Historical story"><p class="history-story-date"></p><h2 id="history-story-title"></h2><div class="history-story-body" aria-busy="false"></div><p class="history-story-status" role="status"></p></div>';
  document.body.append(dialog);
  const close = dialog.querySelector('button');
  const title = dialog.querySelector('h2');
  const date = dialog.querySelector('.history-story-date');
  const body = dialog.querySelector('.history-story-body');
  const status = dialog.querySelector('[role="status"]');
  const scroller = dialog.querySelector('.history-story-scroll');
  const cache = new Map();
  let opener, request, pageScroll = 0;

  async function open(entry) {
    if (dialog.open) return;
    opener = entry;
    title.textContent = entry.querySelector('h3').textContent;
    date.textContent = entry.querySelector('.history-date').textContent;
    body.replaceChildren();
    body.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading historical story…';
    pageScroll = window.scrollY;
    document.documentElement.style.setProperty('--history-scroll-top', `-${pageScroll}px`);
    document.documentElement.classList.add('history-modal-open');
    dialog.showModal();
    scroller.scrollTop = 0;
    close.focus({preventScroll:true});
    const controller = new AbortController();
    request = controller;
    try {
      const url = entry.href;
      let paragraphs = cache.get(url);
      if (!paragraphs) {
        const response = await fetch(url, {signal:controller.signal});
        if (!response.ok) throw new Error('Story unavailable');
        const source = new DOMParser().parseFromString(await response.text(), 'text/html');
        paragraphs = [...source.querySelectorAll('.history-detail-copy > p')].map(p => p.textContent);
        if (!paragraphs.length) throw new Error('Story unavailable');
        cache.set(url, paragraphs);
      }
      if (controller.signal.aborted || !dialog.open) return;
      body.replaceChildren(...paragraphs.map(text => {
        const p = document.createElement('p');
        p.textContent = text;
        return p;
      }));
      status.textContent = '';
    } catch (error) {
      if (controller.signal.aborted) return;
      status.textContent = 'This story could not be loaded. ';
      const link = document.createElement('a');
      link.href = entry.href;
      link.textContent = 'Open the history detail page';
      status.append(link);
    } finally {
      if (request === controller) body.setAttribute('aria-busy', 'false');
    }
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const targets = [...dialog.querySelectorAll('button, a[href], [tabindex="0"]')];
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  // Native showModal supplies background inertness, focus containment and Escape.
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    request?.abort();
    document.documentElement.classList.remove('history-modal-open');
    document.documentElement.style.removeProperty('--history-scroll-top');
    window.scrollTo({top:pageScroll, behavior:'instant'});
    if (opener?.isConnected) opener.focus({preventScroll:true});
  });
  entries.forEach(entry => {
    entry.setAttribute('aria-haspopup', 'dialog');
    entry.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      void open(entry);
    });
  });
})();
