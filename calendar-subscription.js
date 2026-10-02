(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'calendar-event-dialog calendar-subscription-dialog';
  dialog.id = 'calendar-subscription-dialog';
  dialog.setAttribute('aria-labelledby','calendar-subscription-title');
  dialog.innerHTML = `<div class="calendar-dialog-header"><p class="eyebrow">Ongoing calendar updates</p><button class="dialog-close" type="button" aria-label="Close subscription options">×</button></div>
    <h2 id="calendar-subscription-title">Subscribe to Church Calendar</h2>
    <p>Subscribe once. Updates appear according to your calendar app’s refresh schedule; they are not instantaneous.</p>
    <p><a class="btn btn-green" data-apple-subscription>Apple Calendar / iPhone / iPad / Mac</a></p>
    <p>Apple: open the link above, or use your calendar app’s subscription option with the link below.</p>
    <details><summary>Google Calendar</summary><p>On a computer, open Google Calendar. Next to Other calendars, choose + → From URL. Paste the link below and choose Add calendar.</p></details>
    <details><summary>Outlook</summary><p>In Outlook on the web, choose Add calendar → Subscribe from web. Paste the link below. Options differ in other Outlook versions.</p></details>
    <label for="calendar-subscription-link">Subscription link</label>
    <input id="calendar-subscription-link" type="url" readonly>
    <p><button class="btn btn-outline-green" type="button" data-copy-calendar-link>Copy subscription link</button></p>
    <p data-copy-calendar-status role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const url = churchCalendarExport.subscriptionURL(document.location.href);
  input.value = url;
  dialog.querySelector('[data-apple-subscription]').href = url.replace(/^https?:/,'webcal:');
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',event=>{
    if(event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, a[href], input, summary')].filter(element=>!element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-calendar-subscribe]')) {
      dialog.querySelector('[data-copy-calendar-status]').textContent='';
      if(!dialog.open) dialog.showModal();
    }
  });
  dialog.querySelector('[data-copy-calendar-link]').addEventListener('click',async()=>{
    const status = dialog.querySelector('[data-copy-calendar-status]');
    try { await navigator.clipboard.writeText(url); status.textContent='Calendar link copied'; }
    catch { input.focus(); input.select(); status.textContent='Select Copy, or press Ctrl+C (Command+C on Mac), to copy the selected link.'; }
  });
})();
