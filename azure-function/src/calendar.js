const { requireAdministrator } = require('./identity');
const { readGithubConfiguration, createInstallationClient, EXPECTED_TARGET } = require('./github-status');
const { buildCalendar, validateEditorial } = require('./calendar-model');
const { isDeepStrictEqual } = require('node:util');

const CALENDAR_PATH = '_content/calendar.json';
// Feed fields are deprecated compatibility aliases; only the Calendar blob is read.
const MAX_BODY_BYTES = 256 * 1024;
const shaValid = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const response = (status, body) => ({ status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' }, jsonBody: body });
const failure = (status, error) => response(status, { ok: false, error });

async function readBoundedJson(request) {
  const length = Number(request.headers?.get?.('content-length'));
  if (length > MAX_BODY_BYTES) throw new RangeError();
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers?.get?.('content-type') || '')) throw new SyntaxError();
  // Read incrementally: an absent or false Content-Length must not bypass the limit.
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError(); }
      chunks.push(Buffer.from(chunk.value));
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
}

async function readFile(client, path, maximum) {
  const result = await client.rest.repos.getContent({ owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository, ref: 'Dev', path });
  const file = result.data;
  if (file?.type !== 'file' || file.path !== path || !shaValid(file.sha) || file.encoding !== 'base64' || typeof file.content !== 'string' || file.content.length > maximum * 1.5) throw new Error('invalid-file');
  const content = Buffer.from(file.content, 'base64');
  if (content.length > maximum) throw new Error('invalid-file');
  return { sha: file.sha, text: new TextDecoder('utf-8', { fatal: true }).decode(content) };
}

function createCalendarHandler({ env = process.env, readConfiguration = readGithubConfiguration,
  createClient = (configuration, permission) => createInstallationClient(configuration, undefined, permission) } = {}) {
  return async function calendar(request) {
    // Easy Auth is the deployment perimeter; the existing verified-claim policy
    // is the application gate. No request-supplied flags or selectors are used.
    const denied = requireAdministrator(request);
    if (denied) return denied;
    if (!['GET', 'PUT'].includes(request.method)) return failure(405, 'method-not-allowed');
    if (request.query && [...request.query.keys()].length) return failure(400, 'invalid-calendar-request');
    let body;
    if (request.method === 'PUT') {
      try {
        body = await readBoundedJson(request);
        if (!body || Object.keys(body).some(key => !['sha','sourceSha','calendar'].includes(key)) || !shaValid(body.sha) || (Object.hasOwn(body,'sourceSha') && !shaValid(body.sourceSha)) || !Object.hasOwn(body, 'calendar')) throw new SyntaxError();
        validateEditorial(body.calendar);
      } catch (error) { return failure(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'calendar-too-large' : 'invalid-calendar'); }
    }
    let configuration, current, editorial;
    try {
      configuration = readConfiguration(env);
      const client = await createClient(configuration, 'read');
      current = await readFile(client, CALENDAR_PATH, MAX_BODY_BYTES);
      editorial = JSON.parse(current.text);
      buildCalendar(null, editorial, { includeDrafts: true });
    } catch { return failure(502, 'calendar-repository-unavailable'); }
    if (request.method === 'GET') {
      return response(200, { ok: true, sha: current.sha, sourceSha: current.sha, calendar: editorial,
        feedItems: [] });
    }
    if (body.sha !== current.sha || (Object.hasOwn(body,'sourceSha') && body.sourceSha !== current.sha)) return failure(409, 'calendar-version-conflict');
    try { buildCalendar(null, body.calendar, { includeDrafts: true }); }
    catch { return failure(400, 'invalid-calendar'); }
    if (isDeepStrictEqual(body.calendar, editorial)) return response(200, { ok: true, sha: current.sha, unchanged: true });
    try {
      // This is the only application write operation. Inputs cannot choose its
      // owner, repository, branch or path. GitHub atomically checks the blob SHA.
      const client = await createClient(configuration, 'write');
      const result = await client.rest.repos.createOrUpdateFileContents({ owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository,
        branch: 'Dev', path: CALENDAR_PATH, sha: current.sha, message: 'Update calendar via Admin Dashboard',
        content: Buffer.from(`${JSON.stringify(body.calendar, null, 2)}\n`).toString('base64') });
      if (!shaValid(result.data?.content?.sha) || !shaValid(result.data?.commit?.sha)) return failure(502, 'calendar-publish-result-unavailable');
      return response(200, { ok: true, sha: result.data.content.sha, commitSha: result.data.commit.sha });
    } catch (error) {
      // Never include SDK exception messages, headers, credentials or bodies.
      return failure(error?.status === 409 || error?.status === 422 ? 409 : 502,
        error?.status === 409 || error?.status === 422 ? 'calendar-version-conflict' : error?.status === 403 ? 'calendar-publish-permission-denied' : 'calendar-publish-unavailable');
    }
  };
}
module.exports = { createCalendarHandler, MAX_BODY_BYTES };
