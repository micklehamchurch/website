const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCalendarHandler, MAX_BODY_BYTES } = require('../src/calendar');
const { buildCalendar } = require('../src/calendar-model');
const { createInstallationClient } = require('../src/github-status');
const editorial = JSON.parse(fs.readFileSync(path.join(__dirname, '../../_content/calendar.json'), 'utf8'));
const source = fs.readFileSync(path.join(__dirname, '../../test/fixtures/legacy-calendar.ics'), 'utf8');
const identity = { auth_typ: 'aad', claims: Object.entries({ tid: '9188040d-6c67-4c5b-b112-36a304b66dad', oid: '00000000-0000-0000-f978-44e4d44cc925', sub: 'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc', iss: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0' }).map(([typ, val]) => ({ typ, val })) };
const SHA = 'a'.repeat(40), SOURCE_SHA = SHA, NEXT_SHA = 'c'.repeat(40), COMMIT = 'd'.repeat(40);
const empty = () => ({ hiddenEventIds: [], overrides: [], events: [] });
const event = () => ({ id: 'test-event', title: 'Test event', start: '2026-12-01T10:00', end: '2026-12-01T11:00', timeZone: 'Europe/London', location: 'Church', description: 'Mock test only', status: 'published' });
function request(method = 'PUT', calendar = { ...empty(), events: [event()] }, options = {}) {
  const principal = options.principal === undefined ? identity : options.principal;
  const headers = new Headers({ 'Content-Type': 'application/json', ...(options.headers || {}) });
  if (principal) headers.set('x-ms-client-principal', typeof principal === 'string' ? principal : Buffer.from(JSON.stringify(principal)).toString('base64'));
  const payload = options.body === undefined ? { sha: SHA, sourceSha: SOURCE_SHA, calendar, ...options.extra } : options.body;
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return { method, headers, query: new URLSearchParams(options.query || ''), body: new Blob([text]).stream() };
}
function fixture(options = {}) {
  const reads = [], writes = [], permissions = [];
  const handler = createCalendarHandler({ readConfiguration: () => ({}), createClient: async (_config, permission) => {
    permissions.push(permission);
    return { rest: { repos: {
      async getContent(params) {
        reads.push(params);
        if (options.readError) throw new Error('Synthetic credential should never appear');
        const text = params.path === '_content/calendar.json' ? JSON.stringify(options.current || editorial) : source;
        return { data: { type: 'file', path: params.path, encoding: 'base64', content: Buffer.from(text).toString('base64'), sha: params.path === '_content/calendar.json' ? SHA : SOURCE_SHA } };
      },
      async createOrUpdateFileContents(params) {
        writes.push(params);
        if (options.writeError) throw Object.assign(new Error('Synthetic credential should never appear'), { status: options.writeError });
        return { data: { content: { sha: NEXT_SHA }, commit: { sha: COMMIT } } };
      }
    } } };
  } });
  return { handler, reads, writes, permissions };
}

test('Calendar GET loads complete editorial data and preserves every current feed event', async () => {
  const f = fixture(); const result = await f.handler(request('GET'));
  assert.equal(result.status, 200); assert.deepEqual(result.jsonBody.calendar, editorial);
  assert.equal(result.jsonBody.sha, SHA); assert.equal(result.jsonBody.sourceSha, SOURCE_SHA);
  assert.equal(result.jsonBody.feedItems.length, 0); assert.equal(f.reads.length,1); assert.deepEqual(f.permissions, ['read']); assert.equal(f.writes.length, 0);
  for (const read of f.reads) assert.deepEqual({ owner: read.owner, repo: read.repo, ref: read.ref }, { owner: 'micklehamchurch', repo: 'website', ref: 'Dev' });
  const generated = JSON.parse(fs.readFileSync(path.join(__dirname, '../../events.json'), 'utf8'));
  assert.deepEqual(buildCalendar(null, editorial), generated);
});

test('Calendar auth rejects missing/malformed principal, non-admin and browser-supplied identity before GitHub access', async () => {
  const wrong = structuredClone(identity); wrong.claims.find(c => c.typ === 'sub').val = 'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB9318aduYc';
  for (const [principal, status] of [[null, 401], ['bad', 401], [{ auth_typ: 'aad', claims: [] }, 401], [wrong, 403]]) {
    const f = fixture();
    const result = await f.handler(request('PUT', empty(), { principal, headers: { 'x-admin-email': 'edward.popov@outlook.com', 'x-admin-authorized': 'true' }, extra: { administrator: true } }));
    assert.equal(result.status, status); assert.equal(f.permissions.length, 0); assert.equal(f.writes.length, 0);
  }
});

test('every immutable identity binding remains required before a Calendar write', async () => {
  for (const typ of ['tid', 'oid', 'sub', 'iss']) {
    const principal = structuredClone(identity); principal.claims.find(claim => claim.typ === typ).val += 'x';
    const f = fixture(); assert.ok([401, 403].includes((await f.handler(request('PUT', empty(), { principal }))).status)); assert.equal(f.permissions.length, 0);
  }
  const f = fixture(); assert.equal((await f.handler(request('PUT', empty(), { principal: { ...identity, auth_typ: 'other' } }))).status, 401); assert.equal(f.permissions.length, 0);
});

test('Ed can publish only the fixed Calendar file on Dev with a narrowly scoped write client', async () => {
  const f = fixture(); const result = await f.handler(request());
  assert.equal(result.status, 200); assert.deepEqual(result.jsonBody, { ok: true, sha: NEXT_SHA, commitSha: COMMIT });
  assert.deepEqual(f.permissions, ['read', 'write']); assert.equal(f.writes.length, 1);
  const write = f.writes[0];
  assert.deepEqual({ ...write, content: undefined }, { owner: 'micklehamchurch', repo: 'website', branch: 'Dev', path: '_content/calendar.json', sha: SHA, message: 'Update calendar via Admin Dashboard', content: undefined });
  assert.deepEqual(JSON.parse(Buffer.from(write.content, 'base64').toString()), { ...empty(), events: [event()] });
});

test('the production Azure HttpRequest stream follows the same authorized publish path', async () => {
  const { HttpRequest } = require('@azure/functions');
  const input = request();
  const f = fixture();
  const real = new HttpRequest({ method: 'PUT', url: 'https://example.org/api/calendar', headers: Object.fromEntries(input.headers),
    body: { string: JSON.stringify({ sha: SHA, sourceSha: SOURCE_SHA, calendar: { ...empty(), events: [event()] } }) } });
  assert.equal((await f.handler(real)).status, 200); assert.equal(f.writes.length, 1);
});

test('browser cannot select owner, repository, branch, path or any other write target', async () => {
  for (const extra of [{ branch: 'main' }, { path: '.github/workflows/x.yml' }, { owner: 'other' }, { repo: 'other' }, { filename: 'x.js' }, { userId: 'ed' }]) {
    const f = fixture(); assert.equal((await f.handler(request('PUT', empty(), { extra }))).status, 400); assert.equal(f.permissions.length, 0);
  }
  const f = fixture(); assert.equal((await f.handler(request('PUT', empty(), { query: 'branch=main' }))).status, 400); assert.equal(f.writes.length, 0);
});

test('complete schema validation rejects unknown properties, malformed objects, unsafe content, dates, timezone and duplicate IDs', async () => {
  const bad = [null, [], {}, { ...empty(), newSchema: true }, { ...empty(), events: [null] }, { ...empty(), events: [{ id: 'x' }] }];
  for (const changes of [ { title: '' }, { title: '<script>alert(1)</script>' }, { description: '\u0000bad' }, { start: '2026-02-30T10:00' }, { start: '2026-12-01T24:00' }, { end: '2026-12-01T09:00' }, { timeZone: 'Not/AZone' }, { location: 5 }, { status: 'invalid' }, { externalLink: 'javascript:alert(1)' }, { image: '../secrets/x.png' }, { image: 'assets/../../x.png' }, { geo: { latitude: 91, longitude: 0 } }, { unexpected: 'field' } ]) bad.push({ ...empty(), events: [{ ...event(), ...changes }] });
  bad.push({ ...empty(), events: [event(), event()] });
  const feedId = buildCalendar(source, empty()).items[0].id;
  bad.push({ ...empty(), overrides: [{ id: 'unknown' }] }, { ...empty(), overrides: [{ id: feedId }, { id: feedId }] }, { ...empty(), hiddenEventIds: ['unknown'] }, { ...empty(), hiddenEventIds: [feedId, feedId] }, { ...empty(), hiddenEventIds: [feedId], overrides: [{ id: feedId, end: 'bad' }] });
  for (const calendar of bad) { const f = fixture(); assert.equal((await f.handler(request('PUT', calendar))).status, 400); assert.equal(f.writes.length, 0); assert.ok(!f.permissions.includes('write')); }
});

test('invalid JSON and excessive streamed or declared payload size cannot commit', async () => {
  for (const [options, expected] of [[{ body: '{' }, 400], [{ body: 'x'.repeat(MAX_BODY_BYTES + 1) }, 413], [{ headers: { 'content-length': String(MAX_BODY_BYTES + 1) } }, 413], [{ headers: { 'content-type': 'text/plain' } }, 400]]) {
    const f = fixture(); assert.equal((await f.handler(request('PUT', empty(), options))).status, expected); assert.equal(f.permissions.length, 0);
  }
});

test('stale editorial or deprecated SHA alias returns conflict with no commit; GitHub race also returns conflict', async () => {
  for (const extra of [{ sha: NEXT_SHA }, { sourceSha: NEXT_SHA }]) { const f = fixture(); assert.equal((await f.handler(request('PUT', { ...empty(), events: [event()] }, { extra }))).status, 409); assert.equal(f.writes.length, 0); assert.deepEqual(f.permissions, ['read']); }
  for (const status of [409, 422]) { const f = fixture({ writeError: status }); assert.equal((await f.handler(request())).status, 409); }
});

test('unchanged calendar does not request a write token or create a formatting commit', async () => {
  const f = fixture(); const result = await f.handler(request('PUT', editorial));
  assert.deepEqual(result.jsonBody, { ok: true, sha: SHA, unchanged: true }); assert.deepEqual(f.permissions, ['read']); assert.equal(f.writes.length, 0);
});

test('no-feed PUT supports Calendar SHA without a deprecated source alias', async () => {
  const f = fixture();
  const result = await f.handler(request('PUT', editorial, { body: { sha: SHA, calendar: editorial } }));
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.unchanged, true);
  assert.equal(f.reads.length, 1);
  assert.equal(f.reads[0].path, '_content/calendar.json');
  assert.equal(f.writes.length, 0);
});

test('repository and publish failures return safe categories without credential details or false success', async () => {
  for (const options of [{ readError: true }, { writeError: 500 }, { writeError: 403 }]) {
    const f = fixture(options); const result = await f.handler(request());
    assert.equal(result.status, 502); assert.equal(result.jsonBody.ok, false); assert.doesNotMatch(JSON.stringify(result), /Synthetic|credential|token/i);
  }
});

test('drafts, feed overrides and hidden entries keep existing schema and publish filtering', () => {
  const feed = buildCalendar(source, empty()).items;
  const calendar = { hiddenEventIds: [feed[0].id], overrides: [{ id: feed[1].id, title: 'Edited feed title', status: 'draft' }], events: [{ ...event(), status: 'draft' }] };
  assert.equal(buildCalendar(source, calendar).items.length, 34);
  const admin = buildCalendar(source, calendar, { includeDrafts: true }).items;
  assert.equal(admin.length, 36); assert.equal(admin.find(e => e.id === feed[1].id).title, 'Edited feed title'); assert.ok(admin.some(e => e.id === 'test-event'));
});

test('publishing installation token is restricted to website contents write, status default remains read', async () => {
  const calls = [];
  const auth = () => async options => { calls.push(options); return { token: 'synthetic-test-token' }; };
  const configuration = { appId: 5153326, installationId: 166969054, repository: 'website', privateKey: 'synthetic' };
  await createInstallationClient(configuration, auth, 'write');
  assert.deepEqual(calls[1], { type: 'installation', installationId: 166969054, repositoryNames: ['website'], permissions: { contents: 'write' } });
  calls.length = 0; await createInstallationClient(configuration, auth); assert.equal(calls[1].permissions.contents, 'read');
  await assert.rejects(createInstallationClient(configuration, auth, 'admin'));
});
const recurringFixture=()=>({...empty(),series:[{...event(),id:'fixture-series',start:'2027-01-01T19:00',end:'2027-01-01T20:00',recurrence:{frequency:'monthly',interval:1,ordinal:1,weekday:2,end:{type:'date',until:'2027-12-31'}}}],exceptions:[{seriesId:'fixture-series',occurrenceStart:'2027-02-02T19:00',cancelled:true}]});
test('recurrence publishes one stored rule and exceptions through the existing fixed Dev write path',async()=>{const data=recurringFixture();const f=fixture();const r=await f.handler(request('PUT',data));assert.equal(r.status,200);assert.equal(f.writes.length,1);const w=f.writes[0];assert.equal(w.branch,'Dev');assert.equal(w.path,'_content/calendar.json');assert.deepEqual(JSON.parse(Buffer.from(w.content,'base64')),data);assert.equal(data.events.length,0)});
test('recurrence requests retain authorization, fixed selectors and SHA conflict protections',async()=>{const data=recurringFixture();for(const principal of [null,'bad',{...identity,claims:identity.claims.map(c=>c.typ==='oid'?{...c,val:'other'}:c)}]){const f=fixture();assert.ok([401,403].includes((await f.handler(request('PUT',data,{principal,headers:{'x-admin-authorized':'true'}}))).status));assert.equal(f.writes.length,0)}for(const extra of [{branch:'main'},{path:'_content/contacts.json'},{repository:'other'},{owner:'other'}]){const f=fixture();assert.equal((await f.handler(request('PUT',data,{extra}))).status,400);assert.equal(f.writes.length,0)}const f=fixture();assert.equal((await f.handler(request('PUT',data,{body:{sha:'e'.repeat(40),sourceSha:SOURCE_SHA,calendar:data}}))).status,409);assert.equal(f.writes.length,0)});
test('malformed recurrence and foreign exceptions cannot request write credentials or commit',async()=>{for(const mutate of [d=>d.series[0].recurrence.interval=0,d=>d.exceptions[0].seriesId='other',d=>d.series.push(d.series[0]),d=>d.series[0].recurrence.end={type:'count',count:0},d=>d.series[0].title='<script>']){const d=recurringFixture();mutate(d);const f=fixture();assert.equal((await f.handler(request('PUT',d))).status,400);assert.equal(f.writes.length,0);assert.ok(!f.permissions.includes('write'))}});
