import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { calendarMessage } from './calendar-api.mjs';
const code = fs.readFileSync(new URL('./admin.js', import.meta.url), 'utf8');
const feed = { id: 'feed-id', uid: 'source-uid', title: 'Feed event', start: '2026-12-01T10:00:00', end: '2026-12-01T11:00:00', timeZone: 'Europe/London', location: 'Church', description: 'Feed description', sourceUrl: 'https://example.org', geo: { latitude: 51, longitude: 0 }, address: 'Original address' };
const initial = () => ({ ok: true, sha: 'a'.repeat(40), sourceSha: 'b'.repeat(40), feedItems: [structuredClone(feed)], calendar: { hiddenEventIds: [], overrides: [], events: [] } });
async function harness({ publish = async () => ({ ok: true, sha: 'c'.repeat(40) }) } = {}) {
  const elements = new Map(), listeners = {}, calls = [], storage = [], monitors = [];
  const node = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', dataset: {}, hidden: false, listeners: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelector: node, querySelectorAll: () => [], setAttribute() {}, focus() {}, showModal() {}, close() {}, reportValidity: () => true,
      addEventListener(name, callback) { this.listeners[name] = callback; } });
    return elements.get(selector);
  };
  const window = { monitorPublishedCalendar: (sha, onLive, onTimeout) => monitors.push({ sha, onLive, onTimeout }), confirm: () => true, addEventListener: (name, fn) => { listeners[name] = fn; }, churchCalendarApi: {
    load: async () => { calls.push({ method: 'GET' }); return initial(); },
    publish: async payload => { calls.push({ method: 'PUT', payload: structuredClone(payload) }); return publish(payload); }, message: calendarMessage
  } };
  const location = { hash: '#calendar' };
  const context = { window, location, document: { querySelector: node, documentElement: { dataset: {} } }, sessionStorage: { getItem: () => JSON.stringify({ calendar: { created: [{ id: 'old-demo' }] } }), setItem: (key, value) => storage.push(JSON.parse(value)), removeItem() {} }, console, Date, Intl, URL, setTimeout: () => 0, clearTimeout() {}, FormData: class { constructor(form) { this.form = form; } entries() { return Object.entries(this.form.values); } },
    fetch: async url => ({ ok: true, json: async () => url.includes('events') ? { items: [] } : url.includes('contacts') ? { sections: [], contacts: [], pccMembers: [] } : url.includes('news') ? { articles: [] } : url.includes('pages') ? { pages: [] } : [] }) };
  vm.runInNewContext(code, context);
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
  await flush();
  const click = (action, kind = 'calendar', id = '') => node('#admin-content').listeners.click({ target: { closest: selector => selector === '[data-action]' ? { dataset: { action, kind, id } } : null } });
  const submit = (values, id = '') => {
    click(id ? 'edit' : 'add', 'calendar', id);
    const form = node('#admin-editor-form');
    form.values = { kind: 'calendar', id, title: 'Edited event', date: '2026-12-01', startTime: '10:00', endDate: '', endTime: '11:00', location: 'Church', description: 'Description', category: 'Parish event', image: '', externalLink: '', status: 'published', ...values };
    form.listeners.submit({ preventDefault() {} });
  };
  return { node, window, calls, storage, flush, click, submit, listeners, monitors };
}
test('actual editor loads shared Calendar, ignores old demo events and preserves feed metadata on edits', async () => {
  const h = await harness();
  assert.equal(h.calls[0].method, 'GET'); assert.match(h.node('#admin-content').innerHTML, /Feed event/); assert.doesNotMatch(h.node('#admin-content').innerHTML, /old-demo/);
  h.submit({ title: 'Changed feed event' }, feed.id);
  assert.match(h.node('#admin-content').innerHTML, /Changes are staged/);
  h.click('publish-calendar'); await h.flush();
  const payload = h.calls.find(call => call.method === 'PUT').payload;
  assert.equal(payload.sha, 'a'.repeat(40)); assert.equal(payload.calendar.overrides[0].title, 'Changed feed event');
  assert.deepEqual(payload.calendar.overrides[0].geo, feed.geo); assert.equal(payload.calendar.overrides[0].address, feed.address);
  assert.equal(payload.calendar.overrides[0]._origin, undefined); assert.equal(h.storage.length, 0);
  assert.match(h.node('#admin-content').innerHTML, /published successfully/);
});
test('actual editor stages Add/Delete, confirms publishing and prevents duplicate requests', async () => {
  let resolve;
  const h = await harness({ publish: () => new Promise(done => { resolve = done; }) });
  h.submit({ title: 'New event' });
  h.click('delete', 'calendar', feed.id);
  h.node('#admin-dialog').listeners.click({ target: { closest: selector => selector === '[data-action="confirm-delete"]' ? { dataset: { kind: 'calendar', id: feed.id } } : null } });
  h.window.confirm = () => false; h.click('publish-calendar'); assert.equal(h.calls.length, 1);
  h.window.confirm = () => true; h.click('publish-calendar'); h.click('publish-calendar');
  assert.equal(h.calls.filter(call => call.method === 'PUT').length, 1);
  const payload = h.calls[1].payload;
  assert.deepEqual(payload.calendar.hiddenEventIds, [feed.id]); assert.equal(payload.calendar.events[0].title, 'New event');
  assert.match(h.node('#admin-content').innerHTML, /Publishing Calendar/);
  resolve({ ok: true, sha: 'c'.repeat(40) }); await h.flush();
  assert.match(h.node('#admin-content').innerHTML, /published successfully/);
});
test('actual editor keeps staged data on conflict and requires explicit reload before another publication', async () => {
  const h = await harness({ publish: async () => ({ ok: false, category: 'calendar-version-conflict' }) });
  h.submit({ title: 'Staged change' }, feed.id); h.click('publish-calendar'); await h.flush();
  assert.match(h.node('#admin-content').innerHTML, /shared Calendar changed/); assert.match(h.node('#admin-content').innerHTML, /Staged change/);
  h.click('publish-calendar'); assert.equal(h.calls.filter(c => c.method === 'PUT').length, 1);
  h.window.confirm = () => false; h.click('reload-calendar'); await h.flush(); assert.equal(h.calls.filter(c => c.method === 'GET').length, 1);
  h.window.confirm = () => true; h.click('reload-calendar'); await h.flush(); assert.equal(h.calls.filter(c => c.method === 'GET').length, 2);
  assert.match(h.node('#admin-content').innerHTML, /Feed event/); assert.doesNotMatch(h.node('#admin-content').innerHTML, /Staged change/);
});

test('dashboard reports rebuilding until verified live confirmation, and timeout never falsely claims live', async () => {
  const h = await harness(); h.submit({ title: 'Published event' }, feed.id); h.click('publish-calendar'); await h.flush();
  assert.match(h.node('#admin-content').innerHTML, /website is rebuilding/); assert.doesNotMatch(h.node('#admin-content').innerHTML, /Calendar is live/);
  assert.equal(h.monitors[0].sha, 'c'.repeat(40)); h.monitors[0].onLive(); assert.match(h.node('#admin-content').innerHTML, /Calendar is live/);
  const waiting = await harness(); waiting.submit({}, feed.id); waiting.click('publish-calendar'); await waiting.flush(); waiting.monitors[0].onTimeout();
  assert.match(waiting.node('#admin-content').innerHTML, /not yet been confirmed/); assert.doesNotMatch(waiting.node('#admin-content').innerHTML, /Calendar is live/);
});
