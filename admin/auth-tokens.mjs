import { ADMIN_API_SCOPE, GRAPH_USER_SCOPE } from './auth-config.mjs';

export async function acquireGraphUserToken(msal, account) {
  return msal.acquireTokenSilent({ scopes: [GRAPH_USER_SCOPE], account });
}

export async function acquireAdminApiToken(msal, account, { interactive = false } = {}) {
  const request = { scopes: [ADMIN_API_SCOPE], account };
  const result = interactive
    ? await msal.acquireTokenPopup(request)
    : await msal.acquireTokenSilent(request);
  return result.accessToken;
}
