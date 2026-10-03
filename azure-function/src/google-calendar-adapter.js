const ICAL = require('ical.js');
const { createHash } = require('node:crypto');
const SOURCE = 'micklehamcalendar@gmail.com';
const URL = 'https://calendar.google.com/calendar/ical/micklehamcalendar%40gmail.com/public/basic.ics';
const HORIZON = Object.freeze({ from: '2026-10-01', to: '2027-12-31' });
const MAX_BYTES = 2 * 1024 * 1024;
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = () => { throw new Error('google-feed-invalid'); };
function parseGoogleCalendar(text, range = HORIZON) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_BYTES || !text.startsWith('BEGIN:VCALENDAR') || !text.trim().endsWith('END:VCALENDAR') || text.includes('\u0000') || (text.match(/BEGIN:VEVENT/g)||[]).length > 5000) fail();
  const calendar = new ICAL.Component(ICAL.parse(text));
  if (calendar.getFirstPropertyValue('x-wr-calname') !== SOURCE || calendar.name !== 'vcalendar' || calendar.getFirstPropertyValue('x-wr-timezone') !== 'Europe/London') fail();
  const zones = calendar.getAllSubcomponents('vtimezone');
  if (zones.length !== 1) fail();
  for (const zone of zones) {
    if (zone.getFirstPropertyValue('tzid') !== 'Europe/London') fail();
    ICAL.TimezoneService.register('Europe/London', new ICAL.Timezone({ component: zone }));
  }
  const london = ICAL.TimezoneService.get('Europe/London');
  if (!london) fail();
  const allComponents = calendar.getAllSubcomponents('vevent');
  if (!allComponents.length || allComponents.length > 5000) fail();
  // Google retains malformed historical DATE recurrence identities. Do not
  // parse occurrences belonging to masters conclusively expired before the
  // approved horizon; in-horizon unsupported content still fails closed.
  const expired = new Set(allComponents.filter(e=>e.hasProperty('rrule') && e.getFirstPropertyValue('rrule').until?.toString().slice(0,10) < range.from).map(e=>e.getFirstPropertyValue('uid')));
  const components = allComponents.filter(e=>!expired.has(e.getFirstPropertyValue('uid')) && (e.hasProperty('rrule') || e.getFirstPropertyValue('dtend')?.toString().slice(0,10) >= range.from));
  const value = (e, name) => e.getFirstPropertyValue(name)?.toString() || '';
  const local = time => {
    if (!time) fail();
    if (!time.isDate && !['UTC', 'Europe/London'].includes(time.zone?.tzid)) fail();
    return time.isDate ? time.toString() + 'T00:00' : time.convertToZone(london).toString().slice(0,16);
  };
  const clean = value => String(value || '').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
  const masters = new Map(), exceptions = new Map();
  for (const component of components) {
    const uid = value(component,'uid');
    if (!uid || uid.length > 500 || !component.hasProperty('dtstart') || !component.hasProperty('dtend') || !value(component,'summary')) fail();
    if (component.hasProperty('rdate') || component.hasProperty('exrule') || component.getFirstProperty('recurrence-id')?.getParameter('range')) fail();
    if (component.hasProperty('rrule')) {
      const rule = component.getFirstPropertyValue('rrule');
      if (!['DAILY','WEEKLY','MONTHLY'].includes(rule.freq) || Object.keys(rule.parts).some(p => !['BYDAY','BYMONTHDAY'].includes(p))) fail();
      if (rule.interval > 52 || rule.count > 10000) fail();
    }
    if (component.hasProperty('recurrence-id')) {
      const key = JSON.stringify([uid, value(component,'recurrence-id')]);
      if (exceptions.has(key)) fail();
      exceptions.set(key, component);
    } else { if (masters.has(uid)) fail(); masters.set(uid, component); }
  }
  for (const exception of exceptions.values()) if (!masters.has(value(exception,'uid'))) fail();
  const rows = [], seen = new Set(); let steps = 0;
  for (const [uid, component] of masters) {
    const event = new ICAL.Event(component);
    for (const exception of exceptions.values()) if (value(exception,'uid') === uid) event.relateException(new ICAL.Event(exception));
    const add = details => {
      const start = local(details.startDate), end = local(details.endDate);
      if (start.slice(0,10) < range.from || start.slice(0,10) > range.to || value(details.item.component,'status') === 'CANCELLED') return;
      if (end <= start || rows.length >= 1000) fail();
      const original = details.recurrenceId ? (details.recurrenceId.isDate ? details.recurrenceId.toString() : local(details.recurrenceId)) : '';
      const key = JSON.stringify([uid, original]);
      if (seen.has(key)) fail(); seen.add(key);
      const state = { title: clean(details.item.summary), start, end, allDay: details.startDate.isDate, location: clean(details.item.location), description: clean(details.item.description) };
      if (!state.title || Object.values(state).some(v => typeof v === 'string' && v.length > 16000)) fail();
      const sequence=Number(value(details.item.component,'sequence') || 0); if(!Number.isSafeInteger(sequence)||sequence<0)fail();
      rows.push({ key, uid, recurrenceId: original, state, fingerprint: fingerprint(state), modified: value(details.item.component,'last-modified'), sequence });
    };
    if (event.isRecurring()) {
      const iterator = event.iterator(); let next;
      while ((next = iterator.next())) {
        if (++steps > 50000) fail();
        if (next.toString().slice(0,10) > range.to) break;
        add(event.getOccurrenceDetails(next));
      }
    } else add({ item: event, startDate: event.startDate, endDate: event.endDate });
  }
  rows.sort((a,b) => a.key.localeCompare(b.key));
  if (!rows.length) fail();
  return { rows, fingerprint: fingerprint(rows.map(r => [r.key,r.state])), series: [...masters].filter(([,c])=>c.hasProperty('rrule')).map(([uid,c])=>({uid,rule:value(c,'rrule')})).sort((a,b)=>a.uid.localeCompare(b.uid)) };
}
async function fetchGoogleCalendar(fetchImpl = fetch) {
  const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(),15000);
  try {
    const response = await fetchImpl(URL, { signal: controller.signal, redirect: 'error', cache: 'no-store' });
    if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES || !/^text\/calendar\b/i.test(response.headers.get('content-type') || '')) fail();
    const reader = response.body.getReader(), chunks = []; let bytes = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > MAX_BYTES) { await reader.cancel(); fail(); } chunks.push(Buffer.from(part.value)); } }
    finally { reader.releaseLock(); }
    return parseGoogleCalendar(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  } finally { clearTimeout(timeout); }
}
module.exports = { SOURCE, URL, HORIZON, MAX_BYTES, fingerprint, parseGoogleCalendar, fetchGoogleCalendar };
