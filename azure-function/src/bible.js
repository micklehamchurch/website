// Deliberately independent of publishing/authentication and calendar state.
const TTL = 14 * 86400000;
const MAX_CACHE = 256;
const fail = (status, error) => ({ status, jsonBody: { error }, headers: { 'Cache-Control': 'no-store' } });
const emptyState = () => ({ version: 1, days: {}, cache: {} });
function validateState(s) {
  if (!s || s.version !== 1 || !s.days || !s.cache || Array.isArray(s.days) || Array.isArray(s.cache) || Object.keys(s.cache).length > MAX_CACHE || Object.keys(s.days).length > 32) throw Error('invalid-state');
  for (const [day, count] of Object.entries(s.days)) if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(count) || count < 0 || count > 4500) throw Error('invalid-state');
  for (const entry of Object.values(s.cache)) if (!entry || !Number.isFinite(entry.until) || !entry.body || !('data' in entry.body)) throw Error('invalid-state');
  return s;
}
function route(request) {
  const u = new URL(request.url);
  if ([...u.searchParams].length) return null;
  const p = request.params.path || '';
  if (p === 'translations') return { path: '/bibles?language=eng', kind: 'translations' };
  const m = /^(niv|nirv)\/(metadata|books|books\/([A-Z0-9]{3})\/chapters|chapters\/([A-Z0-9]{3}\.[1-9][0-9]{0,2})|passages\/([A-Z0-9]{3}\.[1-9][0-9]{0,2}\.[1-9][0-9]{0,2}(?:-[A-Z0-9]{3}\.[1-9][0-9]{0,2}\.[1-9][0-9]{0,2})?))$/.exec(p);
  if (!m) return null;
  // Passage ranges stay within one chapter, at most 100 verses; no bulk downloads.
  if (m[5]) {
    const [start, end = start] = m[5].split('-').map(v => v.split('.'));
    if (start[0] !== end[0] || start[1] !== end[1] || +end[2] < +start[2] || +end[2] - +start[2] >= 100) return null;
  }
  return { translation: m[1], resource: m[2], content: !!(m[4] || m[5]) };
}
function createBibleHandler({ env = process.env, fetchImpl = fetch, store, now = Date.now } = {}) {
  let cooldown = 0;
  return async request => {
    const origin = request.headers.get('origin');
    // Origins are explicit app settings. No wildcard, credentials or reflected origins.
    const origins = (env.API_BIBLE_ALLOWED_ORIGINS || 'https://micklehamchurch.github.io').split(',').map(s => s.trim());
    if (origin && !origins.includes(origin)) return fail(403, 'bible-origin-denied');
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const finish = response => ({ ...response, headers: { ...response.headers, ...cors, 'X-Content-Type-Options': 'nosniff' } });
    const target = route(request);
    if (!target) return finish(fail(400, 'bible-invalid-request'));
    if (request.method === 'OPTIONS') return finish({ status: 204, headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600' } });
    if (request.method !== 'GET') return finish(fail(405, 'bible-method-not-allowed'));
    if (env.API_BIBLE_ENABLED !== 'true' || !env.API_BIBLE_KEY) return finish(fail(503, 'bible-not-configured'));
    if (now() < cooldown) return finish(fail(503, 'bible-upstream-unavailable'));
    try {
      const result = await store.locked(async ({ state, save }) => {
        const time = now();
        for (const [key, entry] of Object.entries(state.cache)) if (entry.until <= time) delete state.cache[key];
        const today = new Date(time).toISOString().slice(0, 10);
        for (const day of Object.keys(state.days)) if (Date.parse(day) < Date.parse(today) - 31 * 86400000) delete state.days[day];
        const ids = { niv: env.API_BIBLE_NIV_ID, nirv: env.API_BIBLE_NIRV_ID };
        const id = ids[target.translation];
        if (target.translation && (!id || !/^[a-f0-9]{16}-[0-9]{2}$/.test(id))) return fail(503, 'bible-translation-not-configured');
        let path = target.path || `/bibles/${id}${target.resource === 'metadata' ? '' : '/' + target.resource}`;
        if (target.content) path += '?content-type=text&include-notes=false&include-titles=true&include-verse-numbers=true&fums-version=3';
        const cached = state.cache[path];
        if (cached) return { status: 200, jsonBody: cached.body, headers: { 'Cache-Control': 'no-store' } };
        // Durable rolling 31-day budget survives restarts and scale-out. Reserve
        // BEFORE the request; failures count too. Leave 500 calls of headroom.
        if (Object.values(state.days).reduce((a, b) => a + b, 0) >= 4500) return fail(429, 'bible-call-budget-exhausted');
        const day = today;
        state.days[day] = (state.days[day] || 0) + 1;
        await save(state);
        let upstream;
        try {
          upstream = await fetchImpl(`https://rest.api.bible/v1${path}`, { headers: { 'api-key': env.API_BIBLE_KEY, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
          if (!upstream.ok) {
            if (upstream.status === 404) return fail(404, 'bible-content-not-found');
            throw Error('upstream');
          }
          // Bound streamed response size; never return upstream error bodies.
          const reader = upstream.body.getReader(); const chunks = []; let length = 0;
          try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 512 * 1024) throw Error('size'); chunks.push(value); } }
          finally { await reader.cancel().catch(() => {}); }
          upstream = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!upstream || !upstream.data || (target.content && (typeof upstream.data.content !== 'string' || !upstream.data.copyright))) throw Error('shape');
        } catch {
          cooldown = now() + 60000;
          return fail(503, 'bible-upstream-unavailable');
        }
        if (target.kind === 'translations') {
          if (!Array.isArray(upstream.data)) return fail(503, 'bible-upstream-unavailable');
          upstream.data = upstream.data.filter(b => Object.values(ids).includes(b.id));
        }
        // Keep full provider metadata/copyright, including view-tracking data.
        const body = { data: upstream.data, ...(upstream.meta ? { meta: upstream.meta } : {}), attribution: { name: 'API.Bible', url: 'https://api.bible' } };
        if (Object.keys(state.cache).length >= MAX_CACHE) delete state.cache[Object.keys(state.cache)[0]];
        state.cache[path] = { until: time + TTL, body };
        while (Buffer.byteLength(JSON.stringify(state)) > 6 * 1024 * 1024) delete state.cache[Object.keys(state.cache)[0]];
        await save(state);
        return { status: 200, jsonBody: body, headers: { 'Cache-Control': 'no-store' } };
      });
      return finish(result.busy ? fail(503, 'bible-busy') : result);
    } catch { return finish(fail(503, 'bible-storage-unavailable')); }
  };
}
module.exports = { createBibleHandler, emptyState, validateState, route, TTL };
