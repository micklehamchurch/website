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
  // Import only editorial markup and safe links from the retained period pages.
  // Do not copy scripts, inline handlers, arbitrary classes or embedded content.
  function editorialContent(source) {
    const container = document.createElement('div');
    const allowed = new Set(['P','SECTION','H3','UL','OL','LI','STRONG','EM','BLOCKQUOTE','DETAILS','SUMMARY','A']);
    const classes = new Set(['history-period-panel','history-period-quote','history-period-sequence','history-period-sources','history-period-related']);
    function copy(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE || !allowed.has(node.tagName)) return;
      const element = document.createElement(node.tagName.toLowerCase());
      for (const name of node.classList) if (classes.has(name)) element.classList.add(name);
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        const url = new URL(href, location.href);
        if (url.protocol !== 'https:' && !(url.origin === location.origin && url.protocol === location.protocol)) return;
        element.href = url.href;
      }
      for (const child of node.childNodes) copy(child, element);
      parent.append(element);
    }
    const rich = source.querySelector('.history-period-content');
    const nodes = rich ? rich.childNodes : source.querySelectorAll('.history-detail-copy > p');
    for (const node of nodes) copy(node, container);
    if (!container.children.length) throw new Error('Story unavailable');
    return container;
  }
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
      let content = cache.get(url);
      if (!content) {
        const response = await fetch(url, {signal:controller.signal});
        if (!response.ok) throw new Error('Story unavailable');
        const source = new DOMParser().parseFromString(await response.text(), 'text/html');
        content = editorialContent(source);
        cache.set(url, content);
      }
      if (controller.signal.aborted || !dialog.open) return;
      body.replaceChildren(...content.cloneNode(true).childNodes);
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
    const targets = [...dialog.querySelectorAll('button, a[href], summary, [tabindex="0"]')].filter(e => e.getClientRects().length && (e.tagName === 'SUMMARY' || !e.closest('details:not([open])')));
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
