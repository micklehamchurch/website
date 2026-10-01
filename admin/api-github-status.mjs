import { ADMIN_API_GITHUB_STATUS_URL } from './auth-config.mjs';

export async function checkGithubRepositoryStatus(accessToken, fetchImpl = globalThis.fetch) {
  if (!accessToken) return { state: 'connection-failed', diagnostic: 'missing-api-token' };

  let response;
  try {
    response = await fetchImpl(ADMIN_API_GITHUB_STATUS_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    return { state: 'connection-failed', diagnostic: 'network' };
  }

  if (!response.ok) return { state: 'connection-failed', diagnostic: `http-${response.status}` };

  try {
    const body = await response.json();
    if (body?.ok === true && body?.repository === 'micklehamchurch/website' && body?.branch === 'Dev') {
      return { state: 'connected', diagnostic: null };
    }
  } catch {
    // Invalid or empty responses stay a safe connection failure.
  }
  return { state: 'connection-failed', diagnostic: 'invalid-response' };
}
