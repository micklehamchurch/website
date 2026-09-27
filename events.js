const parishEvents = [
  {
    id: 'holy-communion',
    title: 'Holy Communion',
    label: 'Next service',
    time: '10:00',
    schedule: 'sunday',
    scheduleLabel: 'Sunday · date to be confirmed',
    venue: 'mickleham',
    venueLabel: 'St Michael & All Angels, Mickleham',
  },
  {
    id: 'morning-prayer',
    title: 'Morning Prayer',
    label: 'Weekday',
    time: '10:30',
    schedule: 'weekday',
    scheduleLabel: 'Weekday · date to be confirmed',
    venue: 'westhumble',
    venueLabel: 'Westhumble Chapel',
  },
  {
    id: 'family-service',
    title: 'Family Service',
    label: 'Sunday',
    time: '10:00',
    schedule: 'sunday',
    scheduleLabel: 'Sunday · date to be confirmed',
    venue: 'mickleham',
    venueLabel: 'St Michael & All Angels, Mickleham',
  },
];

function eventCard(event, compact = false) {
  return `<article class="event-card${compact ? ' event-card-compact' : ''}" data-event-venue="${event.venue}" data-event-schedule="${event.schedule}">
    <div class="event-date"><span>${event.label}</span><strong>${event.time}</strong></div>
    <div class="event-details"><p class="eyebrow">${event.scheduleLabel}</p><h3>${event.title}</h3><p class="event-venue">${event.venueLabel}</p></div>
    <a class="event-link" href="contact.html">Ask about this service <span aria-hidden="true">→</span></a>
  </article>`;
}

const preview = document.querySelector('[data-event-preview]');
if (preview) preview.innerHTML = parishEvents.map(event => eventCard(event, true)).join('');

const eventList = document.querySelector('[data-event-list]');
if (eventList) {
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
}
