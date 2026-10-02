const recurrence = require('./calendar-recurrence');
const EVENT_FIELDS = new Set(['id', 'uid', 'title', 'start', 'end', 'timeZone', 'location', 'description', 'sourceUrl', 'geo', 'address', 'category', 'image', 'externalLink', 'status', 'allDay']);
function validateEditorial(editorial) {
  const fail = () => { throw new Error('Invalid calendar schema or content.'); };
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(editorial) || Object.keys(editorial).some(key => !['hiddenEventIds','overrides','events','series','exceptions'].includes(key)) || !['hiddenEventIds', 'overrides', 'events'].every(key => Array.isArray(editorial[key]))) fail();
  for (const entries of Object.values(editorial)) if (!Array.isArray(entries) || entries.length > 1000) fail();
  const text = value => typeof value === 'string' && value.length <= 16000 && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
  if (editorial.hiddenEventIds.some(id => !text(id) || !id.trim()) || new Set(editorial.hiddenEventIds).size !== editorial.hiddenEventIds.length) fail();
  for (const event of [...editorial.overrides, ...editorial.events]) {
    if (!object(event) || !text(event.id) || !event.id.trim() || event.id.length > 500) fail();
    for (const [key, value] of Object.entries(event)) {
      if (!EVENT_FIELDS.has(key)) fail();
      if (key === 'allDay') { if (typeof value !== 'boolean') fail(); } else if (key === 'geo') {
        if (!object(value) || Object.keys(value).length !== 2 || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) fail();
      } else if (!text(value)) fail();
      if (['sourceUrl', 'externalLink'].includes(key) && value) {
        try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(); } catch { fail(); }
      }
      if (key === 'image' && value && !/^(?:\.\.\/)?assets\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp|gif)$/.test(value)) fail();
      if (key === 'status' && !['published', 'draft'].includes(value)) fail();
    }
  }
  recurrence.validateCollections(editorial.series || [], editorial.exceptions || [], event => {
    validateEditorial({ hiddenEventIds: [], overrides: [], events: [event] });
    if (!event.title?.trim() || !event.location?.trim() || !event.timeZone || recurrence.local(event.end) <= recurrence.local(event.start)) fail();
    if (event.allDay && (!/T00:00(?::00)?$/.test(event.start) || !/T00:00(?::00)?$/.test(event.end))) fail();
  });
}

function buildCalendar(input, editorial, { includeDrafts = false, range = recurrence.defaultRange() } = {}) {
  validateEditorial(editorial);
  const source = input.replace(/^\uFEFF/, '').replace(/\r?\n[ \t]/g, '');
  function unescapeText(value) {
    return value.replace(/\\([nN,;\\])/g, (_, character) => ({ n: '\n', N: '\n', ',': ',', ';': ';', '\\': '\\' })[character]);
  }

  function parseProperties(block) {
    const properties = new Map();
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(':');
      if (separator < 0) continue;
      const [name, ...parameters] = line.slice(0, separator).split(';');
      properties.set(name.toUpperCase(), { value: line.slice(separator + 1).replace(/\r$/, ''), parameters });
    }
    return properties;
  }

  function get(properties, name) {
    return properties.get(name)?.value ?? '';
  }

  function dateProperty(properties, name, fallbackZone) {
    const property = properties.get(name);
    if (!property) return null;
    const zone = property.parameters.map(parameter => parameter.split('=')).find(([key]) => key.toUpperCase() === 'TZID')?.[1] || fallbackZone;
    const match = property.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
    if (!match) throw new Error(`Unsupported ${name} value in calendar source: ${property.value}`);
    return { value: `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`, timeZone: zone };
  }

  function validLocalDateTime(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return false;
    const [, year, month, day, hour, minute, second = '0'] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
    return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
      && Number(hour) < 24 && Number(minute) < 60 && Number(second) < 60;
  }

  const comparableDateTime = value => value.length === 16 ? `${value}:00` : value;

  const sourceTimeZone = source.match(/^X-WR-TIMEZONE:(.+)$/m)?.[1]?.trim() || 'Europe/London';
  const blocks = [...source.matchAll(/BEGIN:VEVENT\s*\n([\s\S]*?)\nEND:VEVENT/g)].map(match => match[1]);
  if (!blocks.length) throw new Error('The calendar source contains no VEVENT entries.');

  const items = blocks.map(block => {
    const properties = parseProperties(block);
    const start = dateProperty(properties, 'DTSTART', sourceTimeZone);
    const end = dateProperty(properties, 'DTEND', start?.timeZone || sourceTimeZone);
    const title = unescapeText(get(properties, 'SUMMARY'));
    const location = unescapeText(get(properties, 'LOCATION'));
    const uid = get(properties, 'UID');
    if (!title || !start || !end || !location || !uid) throw new Error(`Calendar event is missing a required source field: ${uid || title || '(unknown)'}`);
    const geo = get(properties, 'GEO').match(/^(-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?)$/);
    const item = {
      id: `${uid}-${start.value.replace(/[-:]/g, '')}`,
      uid,
      title,
      start: start.value,
      end: end.value,
      timeZone: start.timeZone,
      location,
      description: unescapeText(get(properties, 'DESCRIPTION')),
      sourceUrl: get(properties, 'URL')
    };
    if (geo) item.geo = { longitude: Number(geo[1]), latitude: Number(geo[2]) };
    if (location === 'Mickleham: St Michael and All Angels') {
      item.address = "St Michael's & All Angels Church, Old London Road, Mickleham, Dorking, Surrey RH5 6DU, England";
    }
    return item;
  });

  // Raw feed data and editorial entries live under _content/, which GitHub Pages
  // (Jekyll) does not publish. The built events.json contains published entries only.
  if (!Array.isArray(editorial.hiddenEventIds) || !Array.isArray(editorial.overrides) || !Array.isArray(editorial.events)) {
    throw new Error('_content/calendar.json must contain hiddenEventIds, overrides and events arrays.');
  }
  const feedIds = new Set(items.map(item => item.id));
  const overrideIds = new Set();
  for (const id of editorial.hiddenEventIds) if (!feedIds.has(id)) throw new Error(`Calendar hiddenEventIds contains an unknown feed event id: ${id}`);
  for (const override of editorial.overrides) {
    if (!override.id || !feedIds.has(override.id)) throw new Error(`Calendar override references an unknown feed event id: ${override.id || '(missing)'}`);
    if (overrideIds.has(override.id)) throw new Error(`Duplicate calendar override: ${override.id}`);
    overrideIds.add(override.id);
    if (override.status && !['published', 'draft'].includes(override.status)) throw new Error(`Invalid status for calendar override ${override.id}: ${override.status}`);
    if (Object.hasOwn(override, 'title') && !String(override.title).trim()) throw new Error(`Calendar override has an empty title: ${override.id}`);
  }
  const hiddenIds = new Set(editorial.hiddenEventIds || []);
  const overrides = new Map((editorial.overrides || []).map(item => [item.id, item]));
  const mergedItems = items
    .map(item => {
      const override = overrides.get(item.id);
      if (!override) return item;
      const { id, status, ...changes } = override;
      return { ...item, ...changes, id: item.id, status: status || 'published' };
    });

  for (const item of mergedItems) {
    if (item.allDay && (!/T00:00(?::00)?$/.test(item.start) || !/T00:00(?::00)?$/.test(item.end))) throw new Error('Invalid all-day event dates.');
    if (item.status && !['published', 'draft'].includes(item.status)) throw new Error(`Invalid status for calendar event ${item.id}: ${item.status}`);
    if (!String(item.title || '').trim() || !validLocalDateTime(item.start) || !validLocalDateTime(item.end) || !item.timeZone || !String(item.location || '').trim() || comparableDateTime(item.end) <= comparableDateTime(item.start)) throw new Error(`Calendar event has incomplete or invalid details: ${item.id}`);
    try { new Intl.DateTimeFormat('en', { timeZone: item.timeZone }); }
    catch { throw new Error(`Calendar event has an invalid time zone: ${item.id}`); }
  }

  const allIds = new Set(items.map(item => item.id));
  for (const item of editorial.events || []) {
    if (!item.id || !item.title || !item.start || !item.end || !item.timeZone || !item.location) {
      throw new Error(`Editorial calendar event needs id, title, start, end, timeZone and location: ${item.id || '(unknown)'}`);
    }
    if (item.status && !['published', 'draft'].includes(item.status)) throw new Error(`Invalid status for editorial calendar event ${item.id}: ${item.status}`);
    if (allIds.has(item.id)) throw new Error(`Duplicate calendar event id: ${item.id}`);
    allIds.add(item.id);
    if (!String(item.title).trim() || !String(item.location).trim() || !validLocalDateTime(item.start) || !validLocalDateTime(item.end) || comparableDateTime(item.end) <= comparableDateTime(item.start)) {
      throw new Error(`Editorial calendar event has an invalid time range: ${item.id}`);
    }
    if (item.allDay && (!/T00:00(?::00)?$/.test(item.start) || !/T00:00(?::00)?$/.test(item.end))) throw new Error('Invalid all-day event dates.');
    try { new Intl.DateTimeFormat('en', { timeZone: item.timeZone }); }
    catch { throw new Error(`Editorial calendar event has an invalid time zone: ${item.id}`); }
    if (includeDrafts || item.status !== 'draft') mergedItems.push(item);
  }

  for (const series of editorial.series || []) {
    if (allIds.has(series.id)) throw new Error('Duplicate calendar series ID.');
    allIds.add(series.id);
    mergedItems.push(...recurrence.expandSeries(series, editorial.exceptions || [], { range, includeDrafts }));
  }
  if (mergedItems.length > recurrence.LIMITS.occurrences) throw new Error('Calendar expansion limit exceeded.');
  const ids = new Set(mergedItems.map(item => item.id));
  if (ids.size !== mergedItems.length) throw new Error('The published calendar contains duplicate event IDs.');

  return {
    sourceFile: '_content/calendar-source.ics',
    editorialFile: '_content/calendar.json',
    timeZone: items[0].timeZone || sourceTimeZone,
    sourceTimeZone,
    searchPages: ['index.html', 'calendar.html', 'whats-on.html'],
    items: mergedItems.filter(item => !hiddenIds.has(item.id) && (includeDrafts || item.status !== 'draft'))
  };

}
module.exports = { buildCalendar, validateEditorial };
