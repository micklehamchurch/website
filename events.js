function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function dateKey(value) {
  return value.slice(0, 10);
}

function localDateTime(timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function formatDate(value, options = {}) {
  const [year, month, day] = dateKey(value).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatMonth(year, month) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1)));
}

function googleCalendarLink(event, data) {
  if (!event.title || !event.start || !event.end || !event.timeZone || !event.location) return null;
  const googleTime = value => (value.length === 16 ? value + ':00' : value).replace(/[-:]/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: event.allDay ? `${event.start.slice(0,10).replace(/-/g,'')}/${event.end.slice(0,10).replace(/-/g,'')}` : `${googleTime(event.start)}/${googleTime(event.end)}`,
    ctz: event.timeZone,
    details: event.description || ''
  });
  params.set('location', event.address || event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function compactEventCard(event) {
  const date = formatDate(event.start, { day: 'numeric', month: 'short' });
  return `<article class="event-card event-card-compact">
    <div class="event-date"><span>${escapeHTML(date)}</span><strong>${escapeHTML(event.allDay ? 'All day' : event.start.slice(11, 16))}</strong></div>
    <div class="event-details"><p class="eyebrow">${escapeHTML(event.location)}</p><h3>${escapeHTML(event.title)}</h3><p class="event-venue">${escapeHTML(event.description)}</p></div>
    <a class="event-link" href="calendar.html?event=${encodeURIComponent(event.id)}">Event details <span aria-hidden="true">→</span></a>
  </article>`;
}

function renderUpcomingPreview(items, container, timeZone) {
  if (!container) return;
  const now = localDateTime(timeZone);
  const upcoming = items.filter(event => event.start >= now).slice(0, 3);
  container.classList.add('calendar-preview');
  if (!upcoming.length) {
    container.innerHTML = '<p class="calendar-empty">There are no upcoming events to show. View the Calendar for other dates.</p>';
    return;
  }
  container.innerHTML = upcoming.map(compactEventCard).join('');
}

function eventButton(event) {
  const date = formatDate(event.start, { weekday: 'long', day: 'numeric', month: 'long' });
  return `<button class="calendar-event-button" type="button" data-event-id="${escapeHTML(event.id)}" aria-label="${escapeHTML(`${event.title}, ${date}, ${event.allDay ? 'All day' : event.start.slice(11, 16)}`)}"><time>${escapeHTML(event.allDay ? 'All day' : event.start.slice(11, 16))}</time><span>${escapeHTML(event.title)}</span></button>`;
}

function renderMonth(year, month, items, grid, agenda, status, bounds, timeZone) {
  const firstDate = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (firstDate.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = dateKey(localDateTime(timeZone));
  const byDate = new Map();
  items.forEach(event => {
    const key = dateKey(event.start);
    if (key.slice(0, 7) !== `${year}-${String(month + 1).padStart(2, '0')}`) return;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(event);
  });

  grid.replaceChildren();
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  weekdays.forEach(day => {
    const heading = document.createElement('div');
    heading.className = 'calendar-weekday';
    heading.setAttribute('role', 'columnheader');
    heading.textContent = day;
    grid.append(heading);
  });

  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  for (let index = 0; index < cellCount; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day calendar-day-empty';
      empty.setAttribute('role', 'presentation');
      grid.append(empty);
      continue;
    }
    const day = new Date(Date.UTC(year, month, dayNumber));
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = `calendar-day${iso === today ? ' is-today' : ''}`;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    const number = document.createElement('time');
    number.className = 'calendar-day-number';
    number.dateTime = iso;
    number.textContent = String(dayNumber);
    cell.append(number);
    (byDate.get(iso) || []).forEach(event => {
      const item = document.createElement('div');
      item.innerHTML = eventButton(event);
      cell.append(item.firstElementChild);
    });
    grid.append(cell);
  }

  agenda.replaceChildren();
  const daysWithEvents = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  daysWithEvents.forEach(([iso, events]) => {
    const group = document.createElement('section');
    group.className = 'calendar-agenda-day';
    const heading = document.createElement('h3');
    heading.textContent = formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
    group.append(heading);
    events.forEach(event => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = eventButton(event);
      group.append(wrapper.firstElementChild);
    });
    agenda.append(group);
  });
  if (!daysWithEvents.length) {
    const empty = document.createElement('p');
    empty.className = 'calendar-empty';
    empty.textContent = 'There are no events listed for this month.';
    agenda.append(empty);
  }
  status.textContent = `${byDate.size} ${byDate.size === 1 ? 'date' : 'dates'} with events in ${formatMonth(year, month)}.`;
  const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  document.querySelector('#calendar-previous').disabled = currentMonth <= bounds.first;
  document.querySelector('#calendar-next').disabled = currentMonth >= bounds.last;
  document.querySelector('#calendar-month-label').textContent = formatMonth(year, month);
}

function showEvent(event, dialog, timeZone) {
  const title = document.querySelector('#event-detail-title');
  const details = document.querySelector('#event-detail-content');
  const date = formatDate(event.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const googleUrl = googleCalendarLink(event);
  const location = event.address ? `${event.location} · ${event.address}` : event.location;
  title.textContent = event.title;
  details.innerHTML = `<dl class="calendar-event-facts">
    <div><dt>Date</dt><dd>${escapeHTML(date)}</dd></div>
    <div><dt>Time</dt><dd>${event.allDay ? 'All day' : `${escapeHTML(event.start.slice(11, 16))}–${escapeHTML(event.end.slice(11, 16))} (${escapeHTML(event.timeZone || timeZone)})`}</dd></div>
    ${event.location ? `<div><dt>Location</dt><dd>${escapeHTML(location)}</dd></div>` : ''}
    ${event.description ? `<div><dt>Description</dt><dd>${escapeHTML(event.description)}</dd></div>` : ''}
  </dl>
  <h3 class="calendar-action-title">Add this event</h3><div class="calendar-event-actions">${googleUrl ? `<a class="btn btn-green" href="${escapeHTML(googleUrl)}" target="_blank" rel="noopener noreferrer">Google Calendar <span aria-hidden="true">↗</span></a>` : ''}
    <button class="btn btn-outline-green" type="button" data-event-ics>Apple / Outlook</button>
    ${event.sourceUrl ? `<a class="btn btn-outline-green" href="${escapeHTML(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">View source event <span aria-hidden="true">↗</span></a>` : ''}</div>
    <p><button class="btn btn-outline-green" type="button" data-calendar-subscribe>Subscribe to Church Calendar</button></p>
    <p class="calendar-download-status" role="status"></p>`;
  details.querySelector('[data-event-ics]').addEventListener('click', async () => {
    try {
      const text = await churchCalendarExport.calendar([event]);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'church-event.ics'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { details.querySelector('.calendar-download-status').textContent = 'The event could not be downloaded. Please try again.'; }
  });
  if (!dialog.open) dialog.showModal();
}

async function initializeEvents() {
  try {
    const response = await fetch(`events.json?check=${Date.now()}`, { cache: 'no-store', credentials: 'omit', headers: { 'Cache-Control': 'no-cache, max-age=0', Pragma: 'no-cache' } });
    if (!response.ok) throw new Error(`Unable to load calendar (${response.status})`);
    let calendar = await response.json();
    let items = [...calendar.items].sort((a, b) => a.start.localeCompare(b.start));
    renderUpcomingPreview(items, document.querySelector('[data-event-preview]'), calendar.timeZone);

    const grid = document.querySelector('#calendar-grid');
    if (!grid) return;
    const agenda = document.querySelector('#calendar-agenda');
    const status = document.querySelector('#calendar-status');
    const dialog = document.querySelector('#event-detail-dialog');
    const closeButton = document.querySelector('#event-detail-close');
    const months = items.map(event => event.start.slice(0, 7)).sort();
    const nowMonth = localDateTime(calendar.timeZone).slice(0, 7);
    let bounds = { first: months[0] || nowMonth, last: months.at(-1) || nowMonth };
    const initialMonth = nowMonth < bounds.first ? bounds.first : nowMonth > bounds.last ? bounds.last : nowMonth;
    let [year, month] = initialMonth.split('-').map(Number);
    let openEventId = null;
    month -= 1;
    const update = () => renderMonth(year, month, items, grid, agenda, status, bounds, calendar.timeZone);
    update();

    document.querySelector('#calendar-previous').addEventListener('click', () => { month -= 1; if (month < 0) { month = 11; year -= 1; } update(); });
    document.querySelector('#calendar-next').addEventListener('click', () => { month += 1; if (month > 11) { month = 0; year += 1; } update(); });
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-event-id]');
      if (button) {
        const selected = items.find(item => item.id === button.dataset.eventId);
        if (selected) { openEventId = selected.id; showEvent(selected, dialog, calendar.timeZone); }
      }
    });
    agenda.addEventListener('click', event => {
      const button = event.target.closest('[data-event-id]');
      if (button) {
        const selected = items.find(item => item.id === button.dataset.eventId);
        if (selected) { openEventId = selected.id; showEvent(selected, dialog, calendar.timeZone); }
      }
    });
    document.querySelector('[data-event-preview]')?.addEventListener('click', event => {
      const link = event.target.closest('a[href^="calendar.html?event="]');
      if (link) sessionStorage.setItem('calendar-open-event', new URL(link.href).searchParams.get('event'));
    });
    closeButton.addEventListener('click', () => dialog.close());

    const requestedEvent = new URLSearchParams(location.search).get('event') || sessionStorage.getItem('calendar-open-event');
    if (requestedEvent) {
      const selected = items.find(item => item.id === requestedEvent);
      sessionStorage.removeItem('calendar-open-event');
      if (selected) {
        year = Number(selected.start.slice(0, 4));
        month = Number(selected.start.slice(5, 7)) - 1;
        update();
        showEvent(selected, dialog, calendar.timeZone);
        openEventId = selected.id;
      }
    }
    // Replace the event collection, never append it. Month and view controls
    // remain in place; unchanged versions do not rebuild any Calendar DOM.
    let updatesStarted = false;
    async function startUpdates() {
    if (updatesStarted) return;
    if (document.hidden) { setTimeout(() => void startUpdates(), 20000); return; }
    try {
      // Retry with a fresh module URL if initialization fails. Browsers cache
      // failed dynamic imports too; one transient failure must not stop updates forever.
      const { watchCalendar, calendarVersion } = await import(`./calendar-updates.mjs?v=2&attempt=${Date.now()}`);
      grid.dataset.calendarRefresh = 'starting';
      watchCalendar({ initialVersion: await calendarVersion(calendar), onState: state => {
        grid.dataset.calendarRefresh = state;
        grid.dataset.calendarLastCheck = new Date().toISOString();
        const indicator = document.querySelector('#calendar-refresh-status');
        if (indicator) {
          const checked = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
          indicator.textContent = state === 'paused' ? 'Automatic checks pause while this tab is hidden.'
            : state === 'current' ? `Calendar updated automatically at ${checked}.`
            : state === 'unchanged' ? `Last automatic check: ${checked}. No new Calendar version.`
            : state === 'checking' ? `Checking for Calendar updates at ${checked}…`
            : `Keeping the displayed Calendar; the automatic check will retry. Last check: ${checked}.`;
        }
      }, onData: latest => {
        calendar = latest;
        items = [...latest.items].sort((a, b) => a.start.localeCompare(b.start));
        const newMonths = items.map(event => event.start.slice(0, 7)).sort();
        const displayedMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
        bounds = { first: newMonths[0] || displayedMonth, last: newMonths.at(-1) || displayedMonth };
        const focusedId = document.activeElement?.dataset?.eventId;
        update();
        grid.dataset.calendarLastUpdate = new Date().toISOString();
        renderUpcomingPreview(items, document.querySelector('[data-event-preview]'), calendar.timeZone);
        if (dialog.open && openEventId) {
          const selected = items.find(item => item.id === openEventId);
          if (selected) showEvent(selected, dialog, calendar.timeZone);
          else dialog.close();
        }
        if (focusedId) [...grid.querySelectorAll('[data-event-id]'), ...agenda.querySelectorAll('[data-event-id]')].find(node => node.dataset.eventId === focusedId)?.focus({ preventScroll: true });
      } });
      updatesStarted = true;
    } catch {
      grid.dataset.calendarRefresh = 'initialization-failed';
      const indicator = document.querySelector('#calendar-refresh-status');
      if (indicator) indicator.textContent = 'Keeping the displayed Calendar; automatic checks will retry shortly.';
      setTimeout(() => void startUpdates(), 20000);
    }
    }
    void startUpdates();
  } catch (error) {
    console.error(error);
    document.querySelectorAll('[data-event-preview], #calendar-grid, #calendar-agenda').forEach(node => {
      node.textContent = 'The church calendar is temporarily unavailable. Please contact the parish for event information.';
    });
    const status = document.querySelector('#calendar-status');
    if (status) status.textContent = 'The church calendar could not be loaded.';
  }
}

initializeEvents();
