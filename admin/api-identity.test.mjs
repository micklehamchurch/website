import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAdministratorIdentity } from './api-identity.mjs';
import { ADMIN_API_SCOPE, ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';
import { checkAdminApiHealth } from './api-health.mjs';
import { checkGithubRepositoryStatus } from './api-github-status.mjs';

test('API token acquisition feeds health, GitHub and identity requests using only the API scope', async () => {
  const account = { homeAccountId: 'test-account' };
  const tokenRequests = [];
  const calls = [];
  const msal = { acquireTokenSilent: async request => { tokenRequests.push(request); return { accessToken: 'synthetic-api-token' }; } };
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const body = url.endsWith('health') ? { ok: true, service: 'stmichael-church-admin-api' }
      : url.endsWith('github/status') ? { ok: true, repository: 'micklehamchurch/website', branch: 'Dev' }
      : { ok: true, identity: { provider: 'aad' }, administrator: true, authorizationBuild: { revision: 'a'.repeat(40), allowlistSha256: 'b'.repeat(64), policySha256: 'c'.repeat(64) } };
    return { status: 200, ok: true, json: async () => body };
  };
  const token = await acquireAdminApiToken(msal, account);
  assert.equal((await checkAdminApiHealth(token, fetchImpl)).state, 'connected');
  assert.equal((await checkGithubRepositoryStatus(token, fetchImpl)).state, 'connected');
  const identity = await checkAdministratorIdentity(msal, account, { fetchImpl });
  assert.equal(identity.identity.administrator, true);
  assert.equal(identity.identity.authorizationBuild.revision, 'a'.repeat(40));
  assert.deepEqual(tokenRequests, Array(2).fill({ scopes: [ADMIN_API_SCOPE], account }));
  assert.equal(calls[2].url, ADMIN_API_HEALTH_URL.replace(/health$/, 'auth/identity'));
  for (const { options } of calls) {
    assert.equal(options.headers.Authorization, 'Bearer synthetic-api-token');
    assert.equal(options.cache, 'no-store');
  }
  assert.equal(JSON.stringify(identity).includes('synthetic-api-token'), false);
});

test('interactive identity token acquisition preserves separate API scope', async () => {
  let request;
  const account = { homeAccountId: 'test-account' };
  const msal = { acquireTokenPopup: async value => { request = value; return { accessToken: 'synthetic-api-token' }; } };
  await checkAdministratorIdentity(msal, account, { interactive: true, fetchImpl: async () => ({ ok: false, status: 401 }) });
  assert.deepEqual(request, { account, scopes: [ADMIN_API_SCOPE] });
});

test('identity failures distinguish token acquisition, transport, HTTP and invalid JSON without secrets', async () => {
  const msal = { acquireTokenSilent: async () => ({ accessToken: 'synthetic-api-token' }) };
  for (const status of [401, 403, 404, 500, 503]) {
    const result = await checkAdministratorIdentity(msal, {}, { fetchImpl: async () => ({ ok: false, status, json: async () => { throw new Error('must not read error body'); } }) });
    assert.deepEqual(result, { ok: false, diagnostic: `http-${status}` });
  }
  assert.deepEqual(await checkAdministratorIdentity({ acquireTokenSilent: async () => { throw new Error('sensitive-detail'); } }, {}), { ok: false, diagnostic: 'api-token-acquisition-failed' });
  assert.deepEqual(await checkAdministratorIdentity(msal, {}, { fetchImpl: async () => { throw new Error('sensitive-detail'); } }), { ok: false, diagnostic: 'network-or-cors' });
  assert.deepEqual(await checkAdministratorIdentity(msal, {}, { fetchImpl: async () => ({ ok: true, json: async () => { throw new Error('sensitive-detail'); } }) }), { ok: false, diagnostic: 'invalid-response' });
});

test('missing API token prevents requests; identity response strips arbitrary fields', async () => {
  const missing = await checkAdministratorIdentity({ acquireTokenSilent: async () => ({}) }, {}, { fetchImpl: async () => { throw new Error('must not call'); } });
  assert.equal(missing.diagnostic, 'missing-api-token');
  const result = await checkAdministratorIdentity({ acquireTokenSilent: async () => ({ accessToken: 'synthetic-api-token' }) }, {}, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, identity: { provider: 'aad', token: 'never-display' }, token: 'never-display', authorizationBuild: { revision: 'never-display', token: 'never-display' } }) })
  });
  assert.equal(JSON.stringify(result).includes('never-display'), false);
});

test('policy diagnostics stay boolean and field-only; strings cannot grant administrator access', async () => {
  const result = await checkAdministratorIdentity({ acquireTokenSilent: async () => ({ accessToken: 'synthetic-api-token' }) }, {}, {
    fetchImpl: async url => url.endsWith('/status') ? { status: 403, ok: false } : {
      ok: true, json: async () => ({ ok: true, identity: { provider: 'aad' }, administrator: 'true',
        authorizationPolicy: { allowlistIsArray: true, secret: 'never-display', entries: [{
          kindSupported: true, requiredFields: ['subject', 'never-display'],
          matches: { subject: false, token: 'never-display' }, failedFields: ['subject', 'never-display'], administrator: false
        }] }
      })
    }
  });
  assert.equal(result.identity.administrator, false);
  assert.equal(result.identity.serverAdministratorType, 'string');
  assert.equal(result.identity.authorizationStatus, 'http-403');
  assert.deepEqual(result.identity.authorizationPolicy.entries[0].failedFields, ['subject']);
  assert.equal(JSON.stringify(result).includes('never-display'), false);
});
