const administrators = require('./admin-identities.json');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const revisionPath = path.join(__dirname, 'deployment.json');
const revision = fs.existsSync(revisionPath) ? require('./deployment.json').revision : 'unversioned';

const claimTypes = {
  tenantId: ['tid', 'http://schemas.microsoft.com/identity/claims/tenantid'],
  objectId: ['oid', 'http://schemas.microsoft.com/identity/claims/objectidentifier'],
  subject: ['sub', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
  issuer: ['iss']
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Trust these headers ONLY behind required Azure Easy Auth. Azure strips external
// copies and injects verified claims. Never use a body, email, or standalone ID header.
function readIdentity(request) {
  try {
    const encoded = request?.headers?.get('x-ms-client-principal');
    if (typeof encoded !== 'string' || encoded.length > 32768 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null;
    const principal = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (principal?.auth_typ !== 'aad' || !Array.isArray(principal.claims) ||
        !principal.claims.every(c => c && typeof c.typ === 'string' && typeof c.val === 'string')) return null;
    const identity = { provider: 'aad' };
    for (const [key, aliases] of Object.entries(claimTypes)) {
      const values = [...new Set(principal.claims.filter(c => aliases.includes(c.typ)).map(c => c.val))];
      if (values.length > 1) return null;
      if (values.length) {
        if (!values[0] || values[0].length > 512 || /\s/.test(values[0])) return null;
        identity[key] = values[0];
      }
    }
    for (const key of ['tenantId', 'objectId']) {
      if (identity[key] && !uuid.test(identity[key])) return null;
      if (identity[key]) identity[key] = identity[key].toLowerCase();
    }
    if (!identity.objectId && !identity.subject) return null;
    return Object.freeze(identity);
  } catch {
    return null;
  }
}

function isAdministrator(identity, allowlist = administrators) {
  if (!identity || identity.provider !== 'aad' || !Array.isArray(allowlist)) return false;
  return allowlist.some(entry => {
    if (!entry || entry.provider !== 'aad') return false;
    // An entry can additionally pin tenant/object IDs. All configured bindings
    // must match; absent claims cannot fall back to the subject/issuer pair.
    for (const key of ['tenantId', 'objectId']) {
      if (Object.hasOwn(entry, key) && (!entry[key] || entry[key] !== identity[key])) return false;
    }
    // Object IDs are tenant-scoped; subjects are issuer/application-scoped.
    if (entry.kind === 'object') return Boolean(identity.tenantId && identity.objectId &&
      entry.tenantId === identity.tenantId && entry.objectId === identity.objectId);
    if (entry.kind === 'subject') return Boolean(identity.issuer && identity.subject &&
      entry.issuer === identity.issuer && entry.subject === identity.subject);
    return false;
  });
}

function response(status, jsonBody) {
  return { status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' }, jsonBody };
}

function authorizationBuild() {
  // Fingerprint the actual in-memory allowlist and comparator used by this worker.
  // These are public source artifacts, not identities from the request or settings.
  return {
    revision,
    allowlistSha256: createHash('sha256').update(JSON.stringify(administrators)).digest('hex'),
    policySha256: createHash('sha256').update(isAdministrator.toString().replace(/\r/g, '')).digest('hex')
  };
}

function requireAdministrator(request, allowlist = administrators) {
  const identity = readIdentity(request);
  if (!identity) return response(401, { ok: false, error: 'authentication-required' });
  if (!isAdministrator(identity, allowlist)) return response(403, { ok: false, error: 'administrator-required' });
  return null;
}

// Temporary self-only diagnostic: no full claims, names, emails, tokens or settings.
function identityDiagnostic(request) {
  const identity = readIdentity(request);
  if (!identity) return response(401, { ok: false, error: 'authentication-required' });
  return response(200, { ok: true, identity, administrator: isAdministrator(identity), authorizationBuild: authorizationBuild() });
}

function authorizationStatus(request) {
  return requireAdministrator(request) || response(200, { ok: true, administrator: true });
}

module.exports = { readIdentity, isAdministrator, requireAdministrator, identityDiagnostic, authorizationStatus, authorizationBuild };
