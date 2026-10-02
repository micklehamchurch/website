const test = require('node:test');
const assert = require('node:assert/strict');
const { readIdentity, isAdministrator, requireAdministrator, identityDiagnostic, authorizationStatus } = require('../src/identity');
const tid = '11111111-1111-1111-1111-111111111111';
const oid = '22222222-2222-2222-2222-222222222222';
const claims = [{ typ: 'tid', val: tid }, { typ: 'oid', val: oid }, { typ: 'sub', val: 'subject-1' }, { typ: 'iss', val: 'https://login.microsoftonline.com/example/v2.0' }];
function request(values = claims, auth_typ = 'aad') {
  return { headers: new Headers({ 'x-ms-client-principal': Buffer.from(JSON.stringify({ auth_typ, claims: values })).toString('base64') }) };
}
const allowed = [{ provider: 'aad', kind: 'object', tenantId: tid, objectId: oid }];

test('missing/malformed identities deny access; body/email/standalone headers cannot authenticate', () => {
  for (const req of [undefined, {}, { body: { email: 'edward.popov@outlook.com', oid }, headers: new Headers({ 'x-ms-client-principal-id': oid, 'x-ms-client-principal-name': 'edward.popov@outlook.com' }) },
    { headers: new Headers({ 'x-ms-client-principal': 'not-base64' }) },
    { headers: new Headers({ 'x-ms-client-principal': Buffer.from('null').toString('base64') }) },
    { headers: new Headers({ 'x-ms-client-principal': 'a'.repeat(32769) }) },
    request([], 'aad'), request(claims, 'other'), request([{ typ: 'oid', val: 4 }]), request([{ typ: 'oid', val: 'invalid' }]),
    request([...claims, { typ: 'http://schemas.microsoft.com/identity/claims/objectidentifier', val: tid }])]) {
    assert.equal(readIdentity(req), null);
    assert.equal(requireAdministrator(req, allowed).status, 401);
    assert.equal(identityDiagnostic(req).status, 401);
  }
});

test('mapped claims normalize; unverified extra fields never affect authorization', () => {
  const req = request([
    { typ: 'http://schemas.microsoft.com/identity/claims/tenantid', val: tid },
    { typ: 'http://schemas.microsoft.com/identity/claims/objectidentifier', val: oid },
    { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier', val: 'subject-1' }
  ]);
  assert.deepEqual(readIdentity(req), { provider: 'aad', tenantId: tid, objectId: oid, subject: 'subject-1' });
  assert.equal(requireAdministrator(req, allowed), null);
  req.body = { oid: 'attacker', email: 'attacker@example.com' };
  assert.equal(requireAdministrator(req, allowed), null);
});

test('authorization is denied by default and requires exact immutable identity AND scope', () => {
  const identity = readIdentity(request());
  assert.equal(authorizationStatus(request()).status, 403);
  assert.equal(requireAdministrator(request(), []).status, 403);
  assert.equal(isAdministrator(identity, allowed), true);
  assert.equal(isAdministrator({ ...identity, tenantId: oid }, allowed), false);
  assert.equal(isAdministrator({ ...identity, objectId: tid }, allowed), false);
  assert.equal(isAdministrator({ ...identity, tenantId: undefined }, allowed), false);
  assert.equal(isAdministrator(identity, [{ email: 'edward.popov@outlook.com' }]), false);
  const subjectAllowed = [{ provider: 'aad', kind: 'subject', issuer: identity.issuer, subject: identity.subject }];
  assert.equal(isAdministrator(identity, subjectAllowed), true);
  assert.equal(isAdministrator({ ...identity, issuer: 'another-issuer' }, subjectAllowed), false);
  assert.equal(isAdministrator({ ...identity, subject: 'another-subject' }, subjectAllowed), false);
  assert.equal(isAdministrator({ ...identity, issuer: undefined }, subjectAllowed), false);
  assert.equal(isAdministrator(identity, null), false);
});

test('diagnostic discloses only caller identifiers, disables caching and does not log', () => {
  const req = request([...claims, { typ: 'email', val: 'private@example.com' }, { typ: 'token', val: 'secret-token' }]);
  const response = identityDiagnostic(req);
  assert.deepEqual(response.jsonBody, { ok: true, identity: readIdentity(request()), administrator: false });
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(response).includes('secret-token'), false);
  assert.equal(JSON.stringify(response).includes('private@example.com'), false);
});
