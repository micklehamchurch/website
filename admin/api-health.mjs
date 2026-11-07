import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';

export async function checkAdminApiHealth(accessToken, fetchImpl = globalThis.fetch) {
  if (!accessToken) return { state: 'authentication-required', diagnostic: 'missing-token' };

  let response;
  try {
    response = await fetchImpl(ADMIN_API_HEALTH_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    return { state: 'connection-failed', diagnostic: 'network' };
  }

  if (response.status === 401 || response.status === 403) {
    return { state: 'authentication-required', diagnostic: `http-${response.status}` };
  }
  if (!response.ok) return { state: 'connection-failed', diagnostic: `http-${response.status}` };

  try {
    const body = await response.json();
    if (body?.ok === true && body?.service === 'stmichael-church-admin-api') {
      return { state: 'connected', diagnostic: null };
    }
  } catch {
    // Treat invalid or empty JSON as an unsuccessful health response.
  }
  return { state: 'connection-failed', diagnostic: 'invalid-response' };
}
