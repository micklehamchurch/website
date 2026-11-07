import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewsApi, newsMessage, attachNewsApi } from './news-api.mjs';
const sha = 'a'.repeat(40), headSha = 'b'.repeat(40);
test('News and publication operations acquire API token privately and use only their scoped authenticated routes', async () => {
  const calls = []; let acquisitions = 0;
  const api = createNewsApi({ getToken: async () => { acquisitions++; return 'test-credential'; }, fetchImpl: async (url, options) => {
    calls.push({ url, options }); return Response.json({ ok: true, sha, headSha, commitSha: headSha, articles: [], publications: [] });
  } });
  await api.loadNews(); await api.loadPublications(); await api.publishNews({ sha, headSha, originalSlug: null, article: {} }); await api.publishPublication({ sha, headSha, type: 'pews-news' });
  assert.equal(acquisitions, 4);
  assert.deepEqual(calls.map(item => new URL(item.url).pathname), ['/api/news', '/api/publications', '/api/news', '/api/publications']);
  for (const { options } of calls) { assert.equal(options.headers.Authorization, 'Bearer test-credential'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store'); }
  assert.equal('token' in api, false);
  const bridge = fs.readFileSync(new URL('./news-api.mjs', import.meta.url), 'utf8'); assert.match(bridge, /acquireAdminApiToken\(msal, account\)/);
});
test('missing API token prevents any request; error bodies become only fixed safe messages', async () => {
  const api = createNewsApi({ getToken: async () => null, fetchImpl: () => assert.fail('must not fetch') }); assert.equal((await api.loadNews()).category, 'authentication-required');
  for (const status of [400,401,403,409,413,502]) {
    const other = createNewsApi({ getToken: async () => 'fixture', fetchImpl: async () => Response.json({ error: 'Synthetic upstream private text' }, { status }) });
    const result = await other.publishNews({}); assert.equal(result.ok, false); assert.doesNotMatch(newsMessage(result.category), /Synthetic|private text/);
  }
});
test('duplicate writes are blocked while a scoped request is pending', async () => {
  let finish; const api = createNewsApi({ getToken: async () => 'fixture', fetchImpl: () => new Promise(resolve => { finish = resolve; }) });
  const pending = api.publishPublication({}); await Promise.resolve();
  assert.equal((await api.publishPublication({})).category, 'busy'); finish(Response.json({ ok: true, sha, headSha, commitSha: headSha })); assert.equal((await pending).ok, true);
});
test('invalid successful responses and unknown operations never expose raw data', async () => {
  const api = createNewsApi({ getToken: async () => 'fixture', fetchImpl: async () => Response.json({ ok: true, sha: 'bad', secret: 'upstream text' }) });
  assert.equal((await api.loadNews()).category, 'network-failure');
});

test('News bridge announces readiness only after an account exists, with no token exposure', () => {
  const original = globalThis.window, events = [];
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  try { attachNewsApi({}, () => null); assert.deepEqual(events, []); attachNewsApi({}, () => ({})); assert.deepEqual(events, ['admin-news-ready']); assert.equal('token' in window.churchNewsApi, false); }
  finally { if (original === undefined) delete globalThis.window; else globalThis.window = original; }
});
