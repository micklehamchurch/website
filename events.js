function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function eventCard(event, compact = false) {
  return `<article class="event-card${compact ? ' event-card-compact' : ''}" data-event-venue="${escapeHTML(event.venue)}" data-event-schedule="${escapeHTML(event.schedule)}">
    <div class="event-date"><span>${escapeHTML(event.label)}</span><strong>${escapeHTML(event.time)}</strong></div>
    <div class="event-details"><p class="eyebrow">${escapeHTML(event.scheduleLabel)}</p><h3>${escapeHTML(event.title)}</h3><p class="event-venue">${escapeHTML(event.venueLabel)}</p></div>
    <a class="event-link" href="contact.html">Ask about this service <span aria-hidden="true">→</span></a>
  </article>`;
}

async function loadEvents() {
  const response = await fetch('events.json');
  if (!response.ok) throw new Error(`Unable to load events (${response.status})`);
  return response.json();
}

loadEvents().then(eventData => {
  const parishEvents = eventData.items;
  const preview = document.querySelector('[data-event-preview]');
  if (preview) preview.innerHTML = parishEvents.map(event => eventCard(event, true)).join('');

  const eventList = document.querySelector('[data-event-list]');
  if (!eventList) return;

  const venueFilter = document.querySelector('#venueFilter');
  const scheduleFilter = document.querySelector('#scheduleFilter');
  const emptyState = document.querySelector('[data-empty-state]');

  function renderEvents() {
    const filtered = parishEvents.filter(event =>
      (venueFilter.value === 'all' || event.venue === venueFilter.value)
      && (scheduleFilter.value === 'all' || event.schedule === scheduleFilter.value)
    );
    eventList.innerHTML = filtered.map(event => eventCard(event)).join('');
    emptyState.hidden = filtered.length > 0;
  }

  venueFilter.addEventListener('change', renderEvents);
  scheduleFilter.addEventListener('change', renderEvents);
  renderEvents();
}).catch(error => {
  console.error(error);
  document.querySelectorAll('[data-event-preview], [data-event-list]').forEach(node => {
    node.textContent = 'The event list is temporarily unavailable. Please contact the church for details.';
  });
});
