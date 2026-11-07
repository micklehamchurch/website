import { ADMIN_API_GITHUB_STATUS_URL } from './auth-config.mjs';

const SAFE_GITHUB_DIAGNOSTICS = new Set([
  'github-config-invalid',
  'github-private-key-invalid',
  'github-app-auth-failed',
  'github-installation-token-failed',
  'github-repository-unavailable',
  'github-branch-unavailable',
  'github-api-unavailable'
]);

async function safeFailureDiagnostic(response) {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string' && SAFE_GITHUB_DIAGNOSTICS.has(body.error)) return body.error;
  } catch {
    // Non-JSON or malformed errors are reduced to the HTTP status below.
  }
  return `http-${response.status}`;
}

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

  if (!response.ok) return { state: 'connection-failed', diagnostic: await safeFailureDiagnostic(response) };

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
