const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const live = require('./fixtures/ed-live-identity.json');
const allowlist = require('../src/admin-identities.json');
const { readIdentity, identityDiagnostic, authorizationStatus } = require('../src/identity');

function liveRequest(overrides = {}, mapped = false) {
  const identity = { ...live, ...overrides };
  const aliases = mapped ? {
    tenantId: 'http://schemas.microsoft.com/identity/claims/tenantid',
    objectId: 'http://schemas.microsoft.com/identity/claims/objectidentifier',
    subject: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier', issuer: 'iss'
  } : { tenantId: 'tid', objectId: 'oid', subject: 'sub', issuer: 'iss' };
  const claims = Object.entries(aliases).filter(([field]) => identity[field] !== undefined)
    .map(([field, typ]) => ({ typ, val: identity[field] }));
  return { headers: new Headers({ 'x-ms-client-principal': Buffer.from(JSON.stringify({ auth_typ: identity.provider, claims })).toString('base64') }) };
}

test('exact complete pasted live fixture authorizes through raw and mapped Easy Auth parsing', () => {
  // Subject corrected from the final live diagnostic: lowercase l after 93.
  // The false result and build fingerprints describe the pre-correction snapshot.
  assert.equal(live.administrator, false);
  for (const field of ['provider', 'tenantId', 'objectId', 'subject', 'issuer']) assert.equal(live[field], allowlist[0][field]);
  for (const mapped of [false, true]) {
    const req = liveRequest({}, mapped);
    const response = identityDiagnostic(req);
    assert.equal(response.jsonBody.administrator, true);
    assert.equal(authorizationStatus(req).status, 200);
    assert.notEqual(response.jsonBody.authorizationBuild.allowlistSha256, live.authorizationBuild.allowlistSha256);
    assert.equal(response.jsonBody.authorizationBuild.policySha256, live.authorizationBuild.policySha256);
    assert.deepEqual(response.jsonBody.authorizationPolicy.entries[0].failedFields, []);
    assert.equal(response.jsonBody.authorizationPolicy.entries[0].administrator, true);
    assert.deepEqual(response.jsonBody.identity, readIdentity(req));
  }
});

test('old subject transcription with digit 1 remains unauthorized', () => {
  const req = liveRequest({ subject: 'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB9318aduYc' });
  const response = identityDiagnostic(req);
  assert.equal(response.jsonBody.administrator, false);
  assert.equal(authorizationStatus(req).status, 403);
  assert.deepEqual(response.jsonBody.authorizationPolicy.entries[0].failedFields, ['subject']);
  assert.deepEqual(response.jsonBody.authorizationPolicy.entries[0].matches, {
    provider: true, tenantId: true, issuer: true, objectId: true, subject: false
  });
});

test('safe diagnostics name every failed binding while authorization stays denied', () => {
  for (const field of ['tenantId', 'issuer', 'objectId', 'subject']) {
    const wrong = field === 'tenantId' || field === 'objectId' ? '11111111-1111-1111-1111-111111111111' : live[field] + 'x';
    const req = liveRequest({ [field]: wrong });
    const body = identityDiagnostic(req).jsonBody;
    assert.equal(body.administrator, false);
    assert.equal(body.authorizationPolicy.entries[0].matches[field], false);
    assert.deepEqual(body.authorizationPolicy.entries[0].failedFields, [field]);
    assert.equal(authorizationStatus(req).status, 403);
    const missing = liveRequest({ [field]: undefined });
    assert.equal(authorizationStatus(missing).status, 403);
  }
  assert.equal(authorizationStatus(liveRequest({ provider: 'other' })).status, 401);
});

test('registered live handler JSON round-trip and actual dashboard helper preserve administrator true', async () => {
  const registrations = new Map();
  const originalLoad = Module._load;
  const target = require.resolve('../src/functions/identity');
  try {
    Module._load = function (name, parent, isMain) {
      if (name === '@azure/functions') return { app: { http(name, options) { registrations.set(name, options); } } };
      return originalLoad.call(this, name, parent, isMain);
    };
    delete require.cache[target];
    require(target);
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
  const { checkAdministratorIdentity } = await import('../../admin/api-identity.mjs');
  const req = liveRequest();
  const result = await checkAdministratorIdentity({ acquireTokenSilent: async () => ({ accessToken: 'synthetic-test-token' }) }, {}, {
    fetchImpl: async url => {
      const options = registrations.get(url.endsWith('/identity') ? 'identity' : 'authorization-status');
      const response = await options.handler(req);
      return new Response(JSON.stringify(response.jsonBody), { status: response.status });
    }
  });
  assert.equal(result.identity.administrator, true);
  assert.equal(result.identity.serverAdministratorType, 'boolean');
  assert.equal(result.identity.authorizationStatus, 'http-200');
  assert.deepEqual(result.identity.authorizationPolicy.entries[0].failedFields, []);
  assert.equal(JSON.stringify(result).includes('synthetic-test-token'), false);
});
