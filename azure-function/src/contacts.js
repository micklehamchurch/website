const { requireAdministrator } = require('./identity');
const { readGithubConfiguration, createInstallationClient, EXPECTED_TARGET } = require('./github-status');
const { validateContacts, MAX_CONTACTS_BYTES } = require('./contacts-model');
const photos = require('./contacts-photos');
const { isDeepStrictEqual } = require('node:util');

const CONTACTS_PATH = '_content/contacts.json';
const MAX_BODY_BYTES = photos.MAX_PHOTO_BODY;
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

async function readFile(client, path, maximum, headSha) {
  const result = await client.rest.repos.getContent({ owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository, ref: headSha || 'Dev', path });
  const file = result.data;
  if (file?.type !== 'file' || file.path !== path || !shaValid(file.sha) || file.encoding !== 'base64' || typeof file.content !== 'string' || file.content.length > maximum * 1.5) throw new Error('invalid-file');
  const content = Buffer.from(file.content, 'base64');
  if (content.length > maximum) throw new Error('invalid-file');
  return { sha: file.sha, text: new TextDecoder('utf-8', { fatal: true }).decode(content) };
}

function createContactsHandler({ env = process.env, readConfiguration = readGithubConfiguration,
  createClient = (configuration, permission) => createInstallationClient(configuration, undefined, permission) } = {}) {
  return async function contacts(request) {
    // Easy Auth is the deployment perimeter; the existing verified-claim policy
    // is the application gate. No request-supplied flags or selectors are used.
    const denied = requireAdministrator(request);
    if (denied) return denied;
    if (!['GET', 'PUT'].includes(request.method)) return failure(405, 'method-not-allowed');
    if (request.query && [...request.query.keys()].length) return failure(400, 'invalid-contacts-request');
    let body;
    if (request.method === 'PUT') {
      try {
        body = await readBoundedJson(request);
        if (!body || Object.keys(body).some(k => !['sha','contacts','headSha','uploads'].includes(k)) || !Object.hasOwn(body, 'sha') || !shaValid(body.sha) || !Object.hasOwn(body, 'contacts')) throw new SyntaxError();
        validateContacts(body.contacts);
        if (body.headSha !== undefined && (!shaValid(body.headSha) || !Array.isArray(body.uploads))) throw new SyntaxError();
        if (body.uploads !== undefined && body.headSha === undefined) throw new SyntaxError();
      } catch (error) { return failure(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'contacts-too-large' : 'invalid-contacts'); }
    }
    let configuration, current, directory, headSha;
    try {
      configuration = readConfiguration(env);
      const client = await createClient(configuration, 'read');
      headSha = (await client.rest.git.getRef({ owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository, ref: 'heads/Dev' })).data.object.sha; if (!shaValid(headSha)) throw Error();
      current = await readFile(client, CONTACTS_PATH, MAX_CONTACTS_BYTES, headSha);
      directory = JSON.parse(current.text);
      validateContacts(directory);
    } catch { return failure(502, 'contacts-repository-unavailable'); }
    if (request.method === 'GET') {
      return response(200, { ok: true, sha: current.sha, headSha, contacts: directory });
    }
    if (body.headSha === undefined && directory && [...directory.contacts,...directory.pccMembers].some(r => r.photo && ![...body.contacts.contacts,...body.contacts.pccMembers].some(n => n.id === r.id && isDeepStrictEqual(n.photo,r.photo)))) return failure(400,'invalid-contacts');
    if (body.sha !== current.sha || (body.headSha !== undefined && body.headSha !== headSha)) return failure(409, 'contacts-version-conflict');
    try { validateContacts(body.contacts); if (!isDeepStrictEqual(body.contacts.sections, directory.sections)) throw new Error('immutable-sections'); }
    catch { return failure(400, 'invalid-contacts'); }
    try { photos.unchangedPhotos(body.contacts, directory); } catch { return failure(400, 'invalid-contacts'); }
    if (isDeepStrictEqual(body.contacts, directory) && !body.uploads?.length) return response(200, { ok: true, sha: current.sha, unchanged: true });
    if (body.headSha !== undefined) {
      let mutation;
      try { mutation = await photos.preparePhotos(body, directory); } catch(e) { return failure(e.message === 'album-too-large' ? 413 : 400, ['album-too-large','album-unsupported-format','album-invalid-image'].includes(e.message) ? e.message : 'invalid-contacts'); }
      try { return response(200, { ok: true, ...await photos.publishPhotos(await createClient(configuration, 'write'), headSha, mutation) }); }
      catch(e) { return failure([409,422].includes(e.status) ? 409 : 502, [409,422].includes(e.status) ? 'contacts-version-conflict' : 'contacts-publish-unavailable'); }
    }
    try {
      // Legacy metadata-only operation. Inputs cannot choose its
      // owner, repository, branch or path. GitHub atomically checks the blob SHA.
      const client = await createClient(configuration, 'write');
      const result = await client.rest.repos.createOrUpdateFileContents({ owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository,
        branch: 'Dev', path: CONTACTS_PATH, sha: current.sha, message: 'Update parish contacts via Admin Dashboard',
        content: Buffer.from(`${JSON.stringify(body.contacts, null, 2)}\n`).toString('base64') });
      if (!shaValid(result.data?.content?.sha) || !shaValid(result.data?.commit?.sha)) return failure(502, 'contacts-publish-result-unavailable');
      return response(200, { ok: true, sha: result.data.content.sha, commitSha: result.data.commit.sha });
    } catch (error) {
      // Never include SDK exception messages, headers, credentials or bodies.
      return failure(error?.status === 409 || error?.status === 422 ? 409 : 502,
        error?.status === 409 || error?.status === 422 ? 'contacts-version-conflict' : error?.status === 403 ? 'contacts-publish-permission-denied' : 'contacts-publish-unavailable');
    }
  };
}
module.exports = { createContactsHandler, MAX_BODY_BYTES };
