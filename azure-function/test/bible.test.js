const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { createBibleHandler, emptyState, validateState, TTL } = require('../src/bible');
function setup({ response, status = 200, state = emptyState(), storageError = false } = {}) {
  let calls = 0, saves = 0, time = Date.parse('2026-10-17T12:00Z');
  // Ephemeral synthetic credential only in memory; never serialized or logged.
  const env = { API_BIBLE_ENABLED: 'true', API_BIBLE_KEY: randomBytes(16).toString('hex'), API_BIBLE_NIV_ID: '0000000000000000-01' };
  const handler = createBibleHandler({ env, now: () => time, store: { locked: async action => {
    if (storageError) throw Error('private-storage-detail');
    return action({ state, save: async () => { validateState(state); saves++; } });
  } }, fetchImpl: async (url, options) => {
    calls++; assert.equal(options.headers['api-key'], env.API_BIBLE_KEY);
    assert.equal(new URL(url).origin, 'https://rest.api.bible');
    if (/\/(chapters|passages)\//.test(new URL(url).pathname)) assert.equal(new URL(url).searchParams.get('fums-version'), '3');
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify(response || { data: { content: 'Synthetic content', copyright: 'Synthetic notice' }, meta: { fumsId: 'synthetic-view-id' } }), { status });
  } });
  const request = (path = 'niv/chapters/JHN.3', origin = 'https://micklehamchurch.github.io', method = 'GET') => handler({ url: `https://example.invalid/api/bible/${path}`, method, params: { path: path.split('?')[0] }, headers: new Headers(origin ? { origin } : {}) });
  return { request, env, state, calls: () => calls, saves: () => saves, advance: n => { time += n; } };
}
test('cache retains copyright, attribution and tracking; expires within 14 days', async () => {
  const s = setup(); const a = await s.request(); const b = await s.request();
  assert.deepEqual(a, b); assert.equal(a.jsonBody.data.copyright, 'Synthetic notice');
  assert.equal(a.jsonBody.meta.fumsId, 'synthetic-view-id'); assert.equal(a.jsonBody.attribution.url, 'https://api.bible');
  assert.equal(s.calls(), 1); s.advance(TTL + 1); await s.request(); assert.equal(s.calls(), 2);
});
test('invalid routes and selectors never spend upstream calls', async () => {
  const s = setup();
  for (const path of ['niv/books/../chapters', 'other/books', 'niv/chapters/JHN.0', 'niv/books?api-key=x', 'niv/passages/JHN.3.1-GEN.1.2', 'niv/passages/JHN.3.1-JHN.4.2', 'niv/passages/JHN.3.9-JHN.3.1', 'niv/passages/JHN.3.1-JHN.3.101', 'niv/search']) assert.equal((await s.request(path)).status, 400, path);
  assert.equal(s.calls(), 0);
});
test('exact origin checks, preflight and disabled config do not call upstream', async () => {
  const s = setup(); assert.equal((await s.request(undefined, 'https://evil.invalid')).status, 403);
  assert.equal((await s.request(undefined, 'https://micklehamchurch.github.io.evil.invalid')).status, 403);
  assert.equal((await s.request(undefined, undefined, 'OPTIONS')).status, 204);
  assert.equal((await s.request(undefined, undefined, 'POST')).status, 405);
  delete s.env.API_BIBLE_KEY; assert.equal((await s.request()).status, 503); assert.equal(s.calls(), 0);
});
test('durable rolling budget fails closed, including across handler restarts', async () => {
  const state = emptyState(); state.days['2026-10-16'] = 4500;
  const s = setup({ state }); assert.equal((await s.request()).status, 429); assert.equal(s.calls(), 0);
  assert.equal((await setup({ state }).request()).status, 429);
  s.advance(32 * 86400000); assert.equal((await s.request()).status, 200);
});
test('upstream failure is charged, redacted and cooled down; storage failure fails closed', async () => {
  const s = setup({ status: 401, response: { secret: 'private-provider-detail' } });
  const r = await s.request(); assert.equal(r.status, 503); assert.equal(JSON.stringify(r).includes('private-provider-detail'), false);
  await s.request(); assert.equal(s.calls(), 1); assert.equal(Object.values(s.state.days)[0], 1); assert.equal(Object.keys(s.state.cache).length, 0);
  const f = setup({ storageError: true }); assert.equal((await f.request()).status, 503); assert.equal(f.calls(), 0);
});
test('only configured translations are discoverable and unknown IDs fail closed', async () => {
  const s = setup({ response: { data: [{ id: '0000000000000000-01', name: 'Synthetic licensed translation' }, { id: 'other' }] } });
  assert.equal((await s.request('translations')).jsonBody.data.length, 1);
  assert.equal((await s.request('nirv/books')).status, 503);
});
