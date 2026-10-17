(() => {
  'use strict';
  const trigger = document.getElementById('home-bible-open');
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
  trigger.addEventListener('click', event => {
    event.preventDefault();
    if (!frame.getAttribute('src')) frame.src = 'bible.html?book=overlay';
    dialog.showModal(); document.documentElement.classList.add('bible-modal-open');
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // Unload the reader so every fresh opening fetches and reports its displayed chapter.
    frame.removeAttribute('src');
    document.documentElement.classList.remove('bible-modal-open'); trigger.focus();
  });
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame.contentWindow && event.data === 'mickleham-close-bible') dialog.close();
  });
})();
