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
      if (name === '@azure/functions') return { app: { http(name, options) { registrations.push({ name, options }); }, timer(name, options) { registrations.push({name,options,timer:true}); } } };
      return originalLoad.call(this, name, parent, isMain);
    };
    require(entry); // Also resolves production GitHub dependencies; never invokes GitHub handlers.
  } finally {
    Module._load = originalLoad;
  }
  assert.deepEqual(registrations.map(r => r.name).sort(), ['authorization-status', 'calendar', 'contacts', 'github-status', 'google-calendar-hourly', 'google-calendar-sync', 'google-calendar-sync-status', 'health', 'historical-archive', 'identity', 'news', 'publications']);
  for (const { name, options, timer } of registrations) if (!timer) assert.deepEqual(options.methods, ['calendar', 'contacts', 'historical-archive'].includes(name) ? ['GET', 'PUT'] : ['news', 'publications', 'google-calendar-sync'].includes(name) ? ['GET', 'POST'] : ['GET']);
  assert.deepEqual(registrations.find(r=>r.timer).options, {schedule:'0 */15 * * * *',runOnStartup:false,useMonitor:true,handler:registrations.find(r=>r.timer).options.handler});
  assert.equal(require(path.join(root,'host.json')).extensionBundle.version,'[4.0.0, 5.0.0)');
  assert.equal(registrations.find(r => r.name === 'calendar').options.route, 'calendar');
  assert.equal(typeof require(path.join(root, 'src/calendar-model.js')).buildCalendar, 'function');
  const recurrence = require(path.join(root, 'src/calendar-recurrence.js'));
  const series = {id:'package-fixture',start:'2027-01-01T19:00',end:'2027-01-01T20:00',timeZone:'Europe/London',recurrence:{frequency:'monthly',interval:1,ordinal:1,weekday:2,end:{type:'count',count:2}}};
  assert.deepEqual(recurrence.expandSeries(series,[],{range:{from:'2027-01-01',to:'2027-12-31'}}).map(e=>e.start),['2027-01-05T19:00','2027-02-02T19:00']);
  assert.equal(registrations.find(r => r.name === 'contacts').options.route, 'contacts');
  assert.equal(typeof require(path.join(root, 'src/contacts-model.js')).validateContacts, 'function');
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
