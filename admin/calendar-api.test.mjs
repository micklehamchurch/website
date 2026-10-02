import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalendarApi, CALENDAR_URL, calendarMessage, attachCalendarApi } from './calendar-api.mjs';
import { ADMIN_API_SCOPE } from './auth-config.mjs';
const sha = 'a'.repeat(40), sourceSha = 'b'.repeat(40), commitSha = 'c'.repeat(40);
const calendar = { hiddenEventIds: [], overrides: [], events: [] };
test('Calendar loads shared backend and publishes only scoped fields using separate API bearer token', async () => {
  const calls = [];
  const api = createCalendarApi({ getToken: async () => 'synthetic-token', fetchImpl: async (url, options) => { calls.push({ url, options }); return Response.json(options.method === 'GET' ? { ok: true, sha, sourceSha, calendar, feedItems: [] } : { ok: true, sha, commitSha, privateToken: 'must-not-be-returned' }); } });
  assert.deepEqual(await api.load(), { ok: true, sha, sourceSha, calendar, feedItems: [] });
  assert.deepEqual(await api.publish({ sha, sourceSha, calendar, branch: 'main', path: 'x' }), { ok: true, sha, commitSha, unchanged: false });
  for (const { url, options } of calls) { assert.equal(url, CALENDAR_URL); assert.match(url, /\/api\/calendar$/); assert.equal(options.headers.Authorization, 'Bearer synthetic-token'); assert.equal(options.cache, 'no-store'); }
  assert.deepEqual(JSON.parse(calls[1].options.body), { sha, sourceSha, calendar });
});
test('duplicate publishing is prevented until the first request settles', async () => {
  let resolve, count = 0;
  const api = createCalendarApi({ getToken: async () => 'synthetic', fetchImpl: () => { count++; return new Promise(done => { resolve = done; }); } });
  const first = api.publish({ sha, sourceSha, calendar }); await Promise.resolve();
  assert.deepEqual(await api.publish({ sha, sourceSha, calendar }), { ok: false, category: 'busy' });
  assert.equal(count, 1); resolve(Response.json({ ok: true, sha, commitSha })); assert.equal((await first).ok, true);
});
test('authentication, permission, validation, conflict and network errors use fixed safe messages', async () => {
  for (const [status, category] of [[401, 'authentication-required'], [403, 'administrator-required'], [400, 'invalid-calendar'], [409, 'calendar-version-conflict'], [413, 'calendar-too-large'], [502, 'calendar-publish-unavailable']]) {
    const api = createCalendarApi({ getToken: async () => 'synthetic', fetchImpl: async () => new Response('secret upstream response', { status }) });
    assert.deepEqual(await api.publish({ sha, sourceSha, calendar }), { ok: false, category });
    assert.doesNotMatch(api.message(category), /secret|upstream/); assert.ok(api.message(category).length > 20);
  }
  const api = createCalendarApi({ getToken: async () => { throw new Error('secret'); }, fetchImpl: () => assert.fail('must not fetch') });
  assert.equal((await api.load()).category, 'authentication-required');
  const network = createCalendarApi({ getToken: async () => 'synthetic', fetchImpl: async () => { throw new Error('secret'); } });
  assert.equal((await network.publish({ sha, sourceSha, calendar })).category, 'network-failure');
  assert.match(calendarMessage('success'), /website is rebuilding/); assert.match(calendarMessage('calendar-version-conflict'), /Reload/);
});
test('MSAL bridge acquires the Admin API scope and exposes operations without exposing tokens', async () => {
  const previous = globalThis.window; globalThis.window = {};
  try {
    let requested;
    attachCalendarApi({ acquireTokenSilent: async request => { requested = request; return { accessToken: 'synthetic' }; } }, () => ({ id: 'test-account' }), async () => Response.json({ ok: true, sha, sourceSha, calendar, feedItems: [] }));
    assert.equal((await window.churchCalendarApi.load()).ok, true);
    assert.deepEqual(requested.scopes, [ADMIN_API_SCOPE]);
    assert.deepEqual(Object.keys(window.churchCalendarApi).sort(), ['load', 'message', 'publish']);
  } finally { globalThis.window = previous; }
});
