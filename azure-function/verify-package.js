const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const Module = require('node:module');

function verifyEntrypoint(root) {
  root = path.resolve(root);
  const entry = path.join(root, require(path.join(root, 'package.json')).main);
  const originalLoad = Module._load;
  const registrations = [];
  try {
    Module._load = function (name, parent, isMain) {
      if (name === '@azure/functions') return { app: { http(name, options) { registrations.push({ name, options }); } } };
      return originalLoad.call(this, name, parent, isMain);
    };
    require(entry); // Also resolves production GitHub dependencies; never invokes GitHub handlers.
  } finally {
    Module._load = originalLoad;
  }
  assert.deepEqual(registrations.map(r => r.name).sort(), ['authorization-status', 'calendar', 'github-status', 'health', 'identity', 'news', 'publications']);
  for (const { name, options } of registrations) assert.deepEqual(options.methods, name === 'calendar' ? ['GET', 'PUT'] : ['news', 'publications'].includes(name) ? ['GET', 'POST'] : ['GET']);
  assert.equal(registrations.find(r => r.name === 'calendar').options.route, 'calendar');
  assert.equal(typeof require(path.join(root, 'src/calendar-model.js')).buildCalendar, 'function');
  assert.equal(require(path.join(root, 'host.json')).extensions.http.routePrefix, 'api');
}

function verifyPackage(root, expectedRevision) {
  root = path.resolve(root);
  const live = JSON.parse(`{
    "provider": "aad",
    "tenantId": "9188040d-6c67-4c5b-b112-36a304b66dad",
    "objectId": "00000000-0000-0000-f978-44e4d44cc925",
    "subject": "AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc",
    "issuer": "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0",
    "administrator": false
  }`);
  const api = require(path.join(root, 'src/identity.js'));
  const configured = JSON.parse(fs.readFileSync(path.join(root, 'src/admin-identities.json'), 'utf8'));
  for (const key of ['provider', 'tenantId', 'objectId', 'subject', 'issuer']) {
    assert.equal(configured[0][key], live[key], `allowlist mismatch: ${key}`);
  }
  const claims = Object.entries({ tid: live.tenantId, oid: live.objectId, sub: live.subject, iss: live.issuer })
    .map(([typ, val]) => ({ typ, val }));
  const request = { headers: new Headers({ 'x-ms-client-principal':
    Buffer.from(JSON.stringify({ auth_typ: 'aad', claims })).toString('base64') }) };
  assert.equal(api.isAdministrator(live), true);
  assert.equal(api.identityDiagnostic(request).jsonBody.administrator, true);
  assert.equal(api.authorizationStatus(request).status, 200);
  const build = api.authorizationBuild();
  assert.equal(build.revision, expectedRevision);
  assert.equal(build.allowlistSha256, createHash('sha256').update(JSON.stringify(configured)).digest('hex'));
  for (const key of ['tenantId', 'objectId', 'subject', 'issuer']) {
    assert.equal(api.isAdministrator({ ...live, [key]: `${live[key]}x` }), false);
  }
  return build;
}

if (require.main === module) {
  verifyEntrypoint(process.argv[2]);
  // Output public artifact fingerprints only, never request claims or settings.
  console.log(JSON.stringify(verifyPackage(process.argv[2], process.argv[3])));
}
module.exports = { verifyPackage, verifyEntrypoint };
