(() => {
  'use strict';
  const trigger = document.getElementById('header-bible-open');
  if (!trigger || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'home-bible-dialog';
  dialog.setAttribute('aria-label', 'Read the Bible');
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'home-bible-close';
  close.textContent = 'Close Bible ×';
  const frame = document.createElement('iframe');
  frame.title = 'Mickleham Church Bible reader';
  dialog.append(close, frame); document.body.append(dialog);
  function openBook() {
    close.hidden = false;
    if (!frame.getAttribute('src')) frame.src = 'bible.html?book=overlay&v=20261018-polish4';
    dialog.showModal(); document.documentElement.classList.add('bible-modal-open');
  }
  trigger.addEventListener('click', event => {
    event.preventDefault();
    // The landscape menu restores its real navigation nodes when it closes.
    const navigationDialog = trigger.closest('dialog');
    if (navigationDialog?.open) navigationDialog.addEventListener('close', openBook, { once: true });
    else openBook();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // Unload the reader so every fresh opening fetches and reports its displayed chapter.
    frame.removeAttribute('src');
    close.hidden = false;
    document.documentElement.classList.remove('bible-modal-open');
    const returnTo = trigger.getClientRects().length ? trigger : document.querySelector('.menu-toggle');
    returnTo?.focus({ preventScroll: true });
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data === 'mickleham-close-bible') dialog.close();
    if (event.data === 'mickleham-bible-toolbar-ready' && dialog.open) close.hidden = true;
  });
})();
