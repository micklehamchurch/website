import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';

export async function checkAdministratorIdentity(msal, account, { interactive = false, fetchImpl = globalThis.fetch } = {}) {
  let token;
  try {
    token = await acquireAdminApiToken(msal, account, { interactive });
  } catch {
    return { ok: false, diagnostic: 'api-token-acquisition-failed' };
  }
  if (!token) return { ok: false, diagnostic: 'missing-api-token' };
  let response;
  try {
    response = await fetchImpl(ADMIN_API_HEALTH_URL.replace(/health$/, 'auth/identity'), {
      method: 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    return { ok: false, diagnostic: 'network-or-cors' };
  }
  if (!response.ok) return { ok: false, diagnostic: `http-${response.status}` };
  try {
    const body = await response.json();
    const identity = body?.identity;
    if (body?.ok !== true || identity?.provider !== 'aad') throw new Error('invalid-response');
    const build = body.authorizationBuild;
    return { ok: true, diagnostic: null, identity: {
      provider: identity.provider, tenantId: identity.tenantId, objectId: identity.objectId,
      subject: identity.subject, issuer: identity.issuer, administrator: body.administrator === true,
      authorizationBuild: {
        revision: /^[0-9a-f]{40}$/.test(build?.revision) ? build.revision : 'unversioned',
        allowlistSha256: /^[0-9a-f]{64}$/.test(build?.allowlistSha256) ? build.allowlistSha256 : 'unavailable',
        policySha256: /^[0-9a-f]{64}$/.test(build?.policySha256) ? build.policySha256 : 'unavailable'
      }
    } };
  } catch {
    return { ok: false, diagnostic: 'invalid-response' };
  }
}
