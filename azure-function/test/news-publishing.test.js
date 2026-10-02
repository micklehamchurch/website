const test = require('node:test');
const assert = require('node:assert/strict');
const { createNewsPublishingHandler, MAX_BODY_BYTES } = require('../src/news-publishing');
const { MAX_PDF_BYTES, publication } = require('../src/news-model');
const SHA = 'a'.repeat(40), HEAD = 'b'.repeat(40), NEXT = 'c'.repeat(40), COMMIT = 'd'.repeat(40);
const principal = { auth_typ: 'aad', claims: Object.entries({ tid: '9188040d-6c67-4c5b-b112-36a304b66dad', oid: '00000000-0000-0000-f978-44e4d44cc925', sub: 'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc', iss: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0' }).map(([typ, val]) => ({ typ, val })) };
function pdf() { const prefix = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'; return Buffer.from(prefix + `xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\nstartxref\n${prefix.length}\n%%EOF\n`); }
const upload = type => ({ sha: SHA, headSha: HEAD, type: type || 'pews-news', date: type === 'parish-magazine' ? '2026-10-01' : '2026-09-27', title: 'Test fixture only', description: '', fileName: 'fixture.pdf', mimeType: 'application/pdf', pdfBase64: pdf().toString('base64') });
const article = () => ({ slug: 'test-story', title: 'Fixture only', date: '2026-09-27', excerpt: 'Test summary', paragraphs: ['Plain text fixture'], category: 'Parish news', status: 'published' });
const news = () => ({ sha: SHA, headSha: HEAD, originalSlug: null, article: article() });
function request(method, body, identity = principal, options = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json', ...(options.headers || {}) });
  if (identity) headers.set('x-ms-client-principal', typeof identity === 'string' ? identity : Buffer.from(JSON.stringify(identity)).toString('base64'));
  return { method, headers, query: new URLSearchParams(options.query || ''), body: new Blob([typeof body === 'string' ? body : JSON.stringify(body)]).stream() };
}
function fixture(kind = 'publications', options = {}) {
  const operations = [], permissions = []; let blob = 0;
  const current = options.current || (kind === 'publications' ? { publications: [] } : { articles: [] });
  const call = (name, fn) => async params => { operations.push({ name, params }); return fn(params); };
  const client = { rest: { repos: { getContent: call('read', params => {
    if (params.path.startsWith('assets/')) { if (options.pdfExists || params.path.endsWith('.jpg')) return { data: { type: 'file', path: params.path } }; throw Object.assign(new Error('not found'), { status: 404 }); }
    return { data: { type: 'file', path: params.path, encoding: 'base64', content: Buffer.from(JSON.stringify(current)).toString('base64'), sha: SHA } };
  }) }, git: {
    getRef: call('ref', () => ({ data: { object: { sha: HEAD } } })),
    getCommit: call('parent', () => ({ data: { tree: { sha: SHA } } })),
    createBlob: call('blob', () => ({ data: { sha: ++blob === 1 && kind === 'publications' ? HEAD : NEXT } })),
    createTree: call('tree', () => { if (options.treeError) throw new Error('must not expose SDK error'); return { data: { sha: NEXT } }; }),
    createCommit: call('commit', () => ({ data: { sha: COMMIT } })),
    updateRef: call('advance', () => { if (options.race) throw Object.assign(new Error('must not expose SDK error'), { status: 422 }); return { data: {} }; })
  } } };
  const handler = createNewsPublishingHandler(kind, { readConfiguration: () => ({}), createClient: async (_, permission) => { permissions.push(permission); return client; } });
  return { handler, operations, permissions };
}
test('new publication/news reads return exact shared version and retain existing metadata', async () => {
  for (const kind of ['publications', 'news']) { const f = fixture(kind); const result = await f.handler(request('GET', {})); assert.equal(result.status, 200); assert.equal(result.jsonBody.sha, SHA); assert.equal(result.jsonBody.headSha, HEAD); assert.deepEqual(f.permissions, ['read']); }
});
test('all write flows reject missing/malformed Easy Auth, non-admin and spoofed browser identity before GitHub', async () => {
  const wrong = structuredClone(principal); wrong.claims.find(claim => claim.typ === 'sub').val += 'x';
  for (const kind of ['publications', 'news']) for (const [identity, status] of [[null, 401], ['bad', 401], [wrong, 403]]) {
    const f = fixture(kind), result = await f.handler(request('POST', kind === 'news' ? news() : upload(), identity, { headers: { 'x-admin-email': 'edward.popov@outlook.com', 'x-admin-authorized': 'true' } }));
    assert.equal(result.status, status); assert.equal(f.operations.length, 0);
  }
});
test('every immutable Stage 2C binding remains necessary for both new write flows', async () => {
  for (const typ of ['tid', 'oid', 'sub', 'iss']) for (const kind of ['news', 'publications']) {
    const wrong = structuredClone(principal); wrong.claims.find(claim => claim.typ === typ).val += 'x'; const f = fixture(kind);
    assert.ok([401, 403].includes((await f.handler(request('POST', kind === 'news' ? news() : upload(), wrong))).status)); assert.equal(f.operations.length, 0);
  }
});
test('Ed publishes PDF+metadata in one commit, only fixed Dev paths; older editions remain', async () => {
  for (const type of ['pews-news', 'parish-magazine']) {
    const old = publication({ ...upload(type), date: type === 'pews-news' ? '2025-09-27' : '2025-10-01' }).record;
    const f = fixture('publications', { current: { publications: [old] } }); const result = await f.handler(request('POST', upload(type)));
    assert.equal(result.status, 200); assert.deepEqual(Object.keys(result.jsonBody).sort(), ['commitSha', 'headSha', 'ok', 'sha']);
    const tree = f.operations.find(op => op.name === 'tree').params;
    assert.deepEqual(tree.tree.map(item => item.path), [`assets/documents/news/${type}/${type}-${type === 'pews-news' ? '2026-09-27' : '2026-10'}.pdf`, '_content/publications.json']);
    const metadata = JSON.parse(Buffer.from(f.operations.filter(op => op.name === 'blob').at(-1).params.content, 'base64'));
    assert.equal(metadata.publications.length, 2); assert.deepEqual(metadata.publications[0], old);
    const advance = f.operations.find(op => op.name === 'advance').params; assert.equal(advance.ref, 'heads/Dev'); assert.equal(advance.force, false);
    assert.deepEqual(f.permissions, ['read', 'write']);
    for (const op of f.operations) assert.deepEqual({ owner: op.params.owner, repo: op.params.repo }, { owner: 'micklehamchurch', repo: 'website' });
  }
});
test('browser cannot select repository, main, source path, workflow path or PDF path', async () => {
  for (const kind of ['news', 'publications']) for (const [key, value] of Object.entries({ owner: 'evil', repo: 'evil', branch: 'main', path: '.github/workflows/evil.yml', pdfPath: 'index.html', userId: 'ed', administrator: true })) {
    const f = fixture(kind); assert.equal((await f.handler(request('POST', { ...(kind === 'news' ? news() : upload()), [key]: value }))).status, 400); assert.equal(f.operations.length, 0);
  }
  const f = fixture(); assert.equal((await f.handler(request('POST', upload(), principal, { query: 'branch=main' }))).status, 400);
});
test('PDF MIME, filename, base64 and structural signatures are required', async () => {
  for (const mutation of [{ mimeType: 'text/plain' }, { fileName: 'test.html' }, { fileName: '../test.pdf' }, { fileName: 'x\\test.pdf' }, { pdfBase64: 'not-base64' }, { pdfBase64: Buffer.from('%PDF-1.7\nNot a PDF').toString('base64') }, { date: '2026-02-30' }, { title: '<script>' }]) {
    const f = fixture(); assert.equal((await f.handler(request('POST', { ...upload(), ...mutation }))).status, 400); assert.equal(f.operations.length, 0);
  }
  const f = fixture(); assert.equal((await f.handler(request('POST', { ...upload('parish-magazine'), date: '2026-10-02' }))).status, 400);
});
test('PDF and body limits apply even without Content-Length', async () => {
  const f = fixture(); const result = await f.handler(request('POST', { ...upload(), pdfBase64: Buffer.alloc(MAX_PDF_BYTES + 1).toString('base64') })); assert.equal(result.status, 413); assert.equal(f.operations.length, 0);
  const g = fixture(); assert.equal((await g.handler(request('POST', 'x'.repeat(MAX_BODY_BYTES + 1)))).status, 413); assert.equal(g.operations.length, 0);
});
test('both publication types accept valid PDFs above the former limit and exactly at 15 MiB', () => {
  assert.equal(MAX_PDF_BYTES, 15 * 1024 * 1024);
  const prefix = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');
  for (const size of [5 * 1024 * 1024 + 1, 15 * 1024 * 1024]) {
    const footer = offset => Buffer.from(`xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`);
    let offset = size - 120;
    for (let i = 0; i < 3; i++) offset = size - footer(offset).length;
    const file = Buffer.concat([prefix, Buffer.alloc(offset - prefix.length, 32), footer(offset)]);
    assert.equal(file.length, size);
    for (const type of ['pews-news', 'parish-magazine']) assert.equal(publication({ ...upload(type), pdfBase64: file.toString('base64') }).pdf.length, size);
  }
});
test('duplicate metadata date/ID and existing PDF produce conflict without writing', async () => {
  for (const options of [{ current: { publications: [publication(upload()).record] } }, { pdfExists: true }]) { const f = fixture('publications', options); assert.equal((await f.handler(request('POST', upload()))).status, 409); assert.deepEqual(f.permissions, ['read']); }
});
test('stale blob or head version never writes; tree failures never advance; branch races return 409', async () => {
  for (const key of ['sha', 'headSha']) { const f = fixture(); assert.equal((await f.handler(request('POST', { ...upload(), [key]: NEXT }))).status, 409); assert.deepEqual(f.permissions, ['read']); }
  const race = fixture('publications', { race: true }); const r = await race.handler(request('POST', upload())); assert.equal(r.status, 409); assert.equal(r.jsonBody.error, 'news-version-conflict');
  const broken = fixture('publications', { treeError: true }); assert.equal((await broken.handler(request('POST', upload()))).status, 502); assert.equal(broken.operations.some(op => op.name === 'advance'), false);
});
test('Website News creates and edits only news metadata; draft state and old stories retained', async () => {
  for (const editing of [false, true]) {
    const old = { ...article(), slug: editing ? 'test-story' : 'old-story', dateLabel: 'Old date' };
    const f = fixture('news', { current: { articles: [old] } }); const body = news(); body.article.status = 'draft'; body.originalSlug = editing ? 'test-story' : null;
    const result = await f.handler(request('POST', body)); assert.equal(result.status, 200);
    assert.deepEqual(f.operations.find(op => op.name === 'tree').params.tree.map(item => item.path), ['_content/news.json']);
    const data = JSON.parse(Buffer.from(f.operations.find(op => op.name === 'blob').params.content, 'base64')); assert.equal(data.articles.length, editing ? 1 : 2); assert.equal(data.articles.at(-1).status, 'draft');
  }
});
test('duplicate/renamed slugs, malformed schema and executable story content are rejected', async () => {
  const duplicate = fixture('news', { current: { articles: [article()] } }); assert.equal((await duplicate.handler(request('POST', news()))).status, 409);
  for (const change of [{ slug: '../evil' }, { title: '' }, { paragraphs: ['<script>alert(1)</script>'] }, { excerpt: '<img onerror=x>' }, { paragraphs: 'wrong' }, { status: 'other' }, { image: '../secret.png' }, { unexpected: true }, { date: '2026-02-30' }]) {
    const f = fixture('news'); const body = news(); body.article = { ...body.article, ...change }; assert.equal((await f.handler(request('POST', body))).status, 400); assert.equal(f.operations.length, 0);
  }
});
module.exports = { pdf };
