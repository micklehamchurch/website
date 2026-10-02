import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarVersion, watchCalendar, CALENDAR_CHECK_MS } from '../calendar-updates.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { buildCalendar } = require('../azure-function/src/calendar-model');
const event = { id: 'one', title: 'Public event', start: '2026-12-01T10:00', end: '2026-12-01T11:00', location: 'Church', timeZone: 'Europe/London' };
const data = items => ({ timeZone: 'Europe/London', items });
const sha = 'a'.repeat(40);
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
async function harness({ initial = data([event]), latest = initial, targetEditorialSha = null, failure = false, maxWaitMs = Infinity } = {}) {
  let manifest = { version: await calendarVersion(latest), editorialSha: sha }, payload = latest, failing = failure, clock = 100, live = 0, timeout = 0;
  const documentImpl = { hidden: false, addEventListener(_name, fn) { this.listener = fn; }, removeEventListener() { this.listener = null; } };
  const calls = [], changes = [], timers = new Map(); let nextTimer = 0;
  const watcher = watchCalendar({ baseUrl: 'https://example.org/website/', initialVersion: await calendarVersion(initial), targetEditorialSha, documentImpl, now: () => clock, maxWaitMs,
    setTimer: (fn, ms) => { timers.set(++nextTimer, { fn, ms }); return nextTimer; }, clearTimer: id => timers.delete(id),
    fetchImpl: async (url, options) => { calls.push({ url, options }); if (failing) throw new Error('temporary'); return Response.json(url.includes('calendar-version.json') ? manifest : payload); },
    onData: latest => changes.push(latest), onLive: () => live++, onTimeout: () => timeout++ });
  await flush();
  return { watcher, calls, changes, timers, documentImpl, get live() { return live; }, get timeout() { return timeout; }, set failing(value) { failing = value; }, set clock(value) { clock = value; },
    async setData(value, editorialSha = sha) { payload = value; manifest = { version: await calendarVersion(value), editorialSha }; },
    setPayload(value) { payload = value; } };
}
test('unchanged versions check only a tiny cache-busted manifest and never re-render/download events', async () => {
  const h = await harness(); await h.watcher.check();
  assert.equal(h.changes.length, 0); assert.equal(h.calls.length, 2);
  for (const call of h.calls) { assert.match(call.url, /calendar-version.json\?check=100$/); assert.equal(call.options.cache, 'no-store'); assert.equal(call.options.credentials, 'omit'); assert.equal(call.options.headers, undefined); }
  assert.equal(CALENDAR_CHECK_MS, 20000); assert.ok([...h.timers.values()].some(t => t.ms === 20000)); h.watcher.stop();
});
test('a new version replaces the event collection once, with no duplicates on repeated checks', async () => {
  const h = await harness(); const changed = data([{ ...event, title: 'Changed' }, { ...event, id: 'two' }]); await h.setData(changed); await h.watcher.check();
  assert.deepEqual(h.changes, [changed]); assert.match(h.calls.at(-1).url, /events.json\?version=[a-f0-9]{64}&check=100/);
  await h.watcher.check(); assert.equal(h.changes.length, 1); h.watcher.stop();
});
test('network failures and temporarily mismatched CDN data leave the last Calendar intact', async () => {
  const h = await harness({ failure: true }); assert.equal(h.changes.length, 0); assert.ok([...h.timers.values()].some(t => t.ms === 20000));
  h.failing = false; await h.setData(data([{ ...event, title: 'New' }])); h.setPayload(data([event])); await h.watcher.check(); assert.equal(h.changes.length, 0);
  await h.setData(data([{ ...event, title: 'New' }])); await h.watcher.check(); assert.equal(h.changes.length, 1); h.watcher.stop();
});
test('hidden tabs stop polling timers and returning to the tab checks immediately', async () => {
  const h = await harness(); h.documentImpl.hidden = true; h.documentImpl.listener(); const before = h.calls.length;
  assert.equal(h.timers.size, 0); await h.watcher.check(); assert.equal(h.calls.length, before);
  h.documentImpl.hidden = false; h.documentImpl.listener(); await flush(); assert.equal(h.calls.length, before + 1); assert.ok([...h.timers.values()].some(t => t.ms === 20000)); h.watcher.stop();
});
test('duplicate/malformed/draft public payloads are rejected without a render', async () => {
  for (const items of [[event, event], [null], [{ ...event, status: 'draft' }], [{ ...event, start: null }]]) {
    const h = await harness({ latest: data(items) }); assert.equal(h.changes.length, 0); h.watcher.stop();
  }
});
test('admin live confirmation requires the exact published blob SHA AND matching served public data', async () => {
  const h = await harness({ targetEditorialSha: 'b'.repeat(40) }); assert.equal(h.live, 0); assert.equal(h.calls.length, 1);
  const changed = data([{ ...event, title: 'Published' }]); await h.setData(changed, 'b'.repeat(40)); h.setPayload(data([event])); await h.watcher.check(); assert.equal(h.live, 0);
  await h.setData(changed, 'b'.repeat(40)); await h.watcher.check(); assert.equal(h.live, 1); assert.equal(h.timers.size, 0);
});
test('admin monitor can confirm an unchanged public payload after a draft-only publish, but times out safely', async () => {
  const h = await harness({ targetEditorialSha: sha }); assert.equal(h.live, 1); h.watcher.stop();
  const waiting = await harness({ targetEditorialSha: 'b'.repeat(40), maxWaitMs: 1000 }); waiting.clock = 1200; await waiting.watcher.check(); assert.equal(waiting.live, 0); assert.equal(waiting.timeout, 1);
});
test('existing generator excludes drafts and hidden events from public data; manifest holds only hashes', () => {
  const source = fs.readFileSync(new URL('../_content/calendar-source.ics', import.meta.url), 'utf8');
  const feed = buildCalendar(source, { hiddenEventIds: [], overrides: [], events: [] }).items;
  const result = buildCalendar(source, { hiddenEventIds: [feed[0].id], overrides: [{ id: feed[1].id, status: 'draft', title: 'Private draft' }], events: [{ ...event, id: 'secret-draft', status: 'draft', title: 'Private draft' }] });
  assert.equal(result.items.length, feed.length - 2); assert.doesNotMatch(JSON.stringify(result), /Private draft|secret-draft/);
});

test('committed static version artifact contains only hashes and matches the actual public Calendar', async () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../calendar-version.json', import.meta.url), 'utf8'));
  const events = JSON.parse(fs.readFileSync(new URL('../events.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), ['editorialSha', 'version']);
  assert.match(manifest.editorialSha, /^[a-f0-9]{40}$/); assert.equal(manifest.version, await calendarVersion(events));
  assert.ok(events.items.every(event => event.status !== 'draft'));
});
