import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_API_HEALTH_URL, ADMIN_API_SCOPE, GRAPH_USER_SCOPE } from './auth-config.mjs';
import { checkAdminApiHealth } from './api-health.mjs';
import { acquireAdminApiToken, acquireGraphUserToken } from './auth-tokens.mjs';

test('Church Admin API has its own scope, separate from Microsoft Graph', () => {
  assert.equal(GRAPH_USER_SCOPE, 'User.Read');
  assert.equal(ADMIN_API_SCOPE, 'api://3262101f-94ec-494a-8aa2-42b3e43c43fe/user_impersonation');
  assert.notEqual(ADMIN_API_SCOPE, GRAPH_USER_SCOPE);
  assert.equal(ADMIN_API_HEALTH_URL, 'https://stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net/api/health');
});

test('Graph and Church API token requests remain separate and use their own scopes', async () => {
  const calls = [];
  const account = { homeAccountId: 'account-1' };
  const msal = {
    acquireTokenSilent: async request => { calls.push(request); return { accessToken: 'test-token' }; }
  };

  await acquireGraphUserToken(msal, account);
  assert.equal(await acquireAdminApiToken(msal, account), 'test-token');
  assert.deepEqual(calls, [
    { scopes: [GRAPH_USER_SCOPE], account },
    { scopes: [ADMIN_API_SCOPE], account }
  ]);
  assert.notDeepEqual(calls[0].scopes, calls[1].scopes);
});

test('interactive API token request is available only as a separate API-scope request', async () => {
  const calls = [];
  const account = { homeAccountId: 'account-1' };
  const msal = {
    acquireTokenPopup: async request => { calls.push(request); return { accessToken: 'test-api-token' }; }
  };

  await acquireAdminApiToken(msal, account, { interactive: true });
  assert.deepEqual(calls, [{ scopes: [ADMIN_API_SCOPE], account }]);
});

test('health request uses the API token as a Bearer token and recognizes success', async () => {
  let requestedUrl;
  let requestedOptions;
  const result = await checkAdminApiHealth('test-api-token', async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return { ok: true, status: 200, json: async () => ({ ok: true, service: 'stmichael-church-admin-api' }) };
  });

  assert.equal(requestedUrl, ADMIN_API_HEALTH_URL);
  assert.equal(requestedOptions.headers.Authorization, 'Bearer test-api-token');
  assert.deepEqual(result, { state: 'connected', diagnostic: null });
  assert.equal(JSON.stringify(result).includes('test-api-token'), false);
});

test('401 and 403 require authentication without exposing response data', async () => {
  for (const status of [401, 403]) {
    const result = await checkAdminApiHealth('test-api-token', async () => ({ ok: false, status, text: async () => 'private response details' }));
    assert.deepEqual(result, { state: 'authentication-required', diagnostic: `http-${status}` });
    assert.equal(JSON.stringify(result).includes('private response details'), false);
  }
});

test('network and server failures become safe connection-failed results', async () => {
  const networkResult = await checkAdminApiHealth('test-api-token', async () => { throw new Error('sensitive network details'); });
  const serverResult = await checkAdminApiHealth('test-api-token', async () => ({ ok: false, status: 503 }));

  assert.deepEqual(networkResult, { state: 'connection-failed', diagnostic: 'network' });
  assert.deepEqual(serverResult, { state: 'connection-failed', diagnostic: 'http-503' });
  assert.equal(JSON.stringify(networkResult).includes('sensitive network details'), false);
});
