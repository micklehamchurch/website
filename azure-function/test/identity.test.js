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
// Independent fixture from Ed's live Easy Auth diagnostic, not the allowlist file.
const ed = {
  tenantId: '9188040d-6c67-4c5b-b112-36a304b66dad',
  objectId: '00000000-0000-0000-f978-44e4d44cc925',
  subject: 'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB9318aduYc',
  issuer: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0'
};
function edRequest(overrides = {}) {
  const value = { ...ed, ...overrides };
  return request(Object.entries({ tid: value.tenantId, oid: value.objectId, sub: value.subject, iss: value.issuer })
    .filter(([, val]) => val !== undefined).map(([typ, val]) => ({ typ, val })));
}

test('Ed exact verified identity is authorized by production allowlist and both endpoints', () => {
  const req = edRequest();
  assert.equal(requireAdministrator(req), null);
  assert.equal(isAdministrator(readIdentity(req)), true);
  assert.deepEqual(authorizationStatus(req).jsonBody, { ok: true, administrator: true });
  assert.equal(authorizationStatus(req).status, 200);
  assert.deepEqual(identityDiagnostic(req).jsonBody, { ok: true, identity: { provider: 'aad', ...ed }, administrator: true });
});

test('Ed identifiers with a different tenant or issuer are denied', () => {
  for (const overrides of [{ tenantId: tid }, { issuer: 'https://login.microsoftonline.com/another/v2.0' }]) {
    assert.equal(authorizationStatus(edRequest(overrides)).status, 403);
    assert.equal(identityDiagnostic(edRequest(overrides)).jsonBody.administrator, false);
  }
});

test('same tenant with different subject or object ID is denied', () => {
  for (const overrides of [{ subject: 'another-subject' }, { objectId: oid }]) {
    assert.equal(authorizationStatus(edRequest(overrides)).status, 403);
  }
});

test('near matches and missing claim bindings cannot authorize Ed', () => {
  for (const overrides of [
    { tenantId: ed.tenantId.slice(0, -1) + 'e' }, { objectId: ed.objectId.slice(0, -1) + '6' },
    { subject: ed.subject + 'x' }, { subject: ed.subject.toLowerCase() }, { issuer: ed.issuer + '/' },
    ...Object.keys(ed).map(key => ({ [key]: undefined }))
  ]) {
    const response = authorizationStatus(edRequest(overrides));
    assert.ok([401, 403].includes(response.status));
    assert.notEqual(response.jsonBody.administrator, true);
  }
});

test('missing and malformed Easy Auth identity never authorize the configured administrator', () => {
  for (const req of [{}, request([{ typ: 'tid', val: ed.tenantId }, { typ: 'oid', val: 4 }]),
    request([...claims, { typ: 'oid', val: ed.objectId }]),
    { headers: new Headers({ 'x-ms-client-principal': Buffer.from('{broken').toString('base64') }) }]) {
    assert.equal(authorizationStatus(req).status, 401);
  }
});

test('browser email, display name, body, query and standalone ID headers cannot grant Ed access', () => {
  const req = edRequest({ subject: 'another-subject' });
  req.body = { ...ed, email: 'edward.popov@outlook.com', displayName: 'Eduard Popov' };
  req.query = new URLSearchParams({ ...ed, administrator: 'true' });
  req.headers.set('x-ms-client-principal-id', ed.objectId);
  req.headers.set('x-ms-client-principal-name', 'edward.popov@outlook.com');
  req.headers.set('email', 'edward.popov@outlook.com');
  req.headers.set('display-name', 'Eduard Popov');
  assert.equal(authorizationStatus(req).status, 403);
  req.headers.delete('x-ms-client-principal');
  assert.equal(authorizationStatus(req).status, 401);
});

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
