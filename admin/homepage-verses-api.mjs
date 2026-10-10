import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';

export const HOMEPAGE_VERSES_URL = new URL('homepage-verses', ADMIN_API_HEALTH_URL).href;
export const homepageVersesMessages = Object.freeze({
  'authentication-required': 'Sign in and authorise the Admin API connection, then reload Bible Verses.',
  'administrator-required': 'This Microsoft account does not have server-side administrator access.',
  'invalid-homepage-verses': 'Bible verse validation failed. Check the quotation, reference, translation and weekly schedule before publishing.',
  'homepage-verses-too-large': 'The schedule is too large to publish. Reduce the content and try again.',
  'homepage-verses-version-conflict': 'The shared Bible verses changed. Reload it before editing and publishing again; your staged changes have not been published.',
  'homepage-verses-repository-unavailable': 'The shared Bible verses could not be loaded from GitHub. Try reloading.',
  'homepage-verses-publish-unavailable': 'GitHub could not publish the Bible verses. Reload to check the shared version before trying again.',
  'homepage-verses-publish-permission-denied': 'GitHub denied permission to publish the Bible verses. No change was confirmed; contact the website administrator.',
  'homepage-verses-publish-result-unavailable': 'The publish result could not be confirmed. Reload Bible Verses to check the shared version.',
  'network-failure': 'The request could not be completed. Reload Bible Verses to check the shared version before trying again.',
  busy: 'A Bible verse request is already in progress.',
  success: 'Bible verses published to Dev. The website is rebuilding.',
  unchanged: 'The shared Bible verse schedule is already up to date.'
});
export function homepageVersesMessage(category) { return homepageVersesMessages[category] || 'The Bible verse request failed. Reload and try again.'; }

export function createHomepageVersesApi({ getToken, fetchImpl = fetch }) {
  let busy = false;
  async function request(method, payload) {
    if (busy) return { ok: false, category: 'busy' };
    busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      let token;
      try { token = await getToken(); } catch { return { ok: false, category: 'authentication-required' }; }
      if (!token) return { ok: false, category: 'authentication-required' };
      const result = await fetchImpl(HOMEPAGE_VERSES_URL, { method, cache: 'no-store', credentials: 'omit', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'PUT' ? { body: JSON.stringify({ sha: payload.sha, homepageVerses: payload.homepageVerses }) } : {}) });
      if (!result.ok) {
        let category = ({ 401: 'authentication-required', 403: 'administrator-required', 400: 'invalid-homepage-verses', 409: 'homepage-verses-version-conflict', 413: 'homepage-verses-too-large' })[result.status] || (method === 'GET' ? 'homepage-verses-repository-unavailable' : 'homepage-verses-publish-unavailable');
        if (result.status === 502 && method === 'PUT') {
          try { const safe = await result.json(); if (['homepage-verses-publish-permission-denied', 'homepage-verses-publish-result-unavailable'].includes(safe?.error)) category = safe.error; } catch { /* Ignore all upstream body text. */ }
        }
        return { ok: false, category };
      }
      const data = await result.json();
      const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
      if (data.ok !== true || !sha(data.sha)) throw new Error('invalid-response');
      if (method === 'GET') {
        if (!data.homepageVerses || data.homepageVerses.schemaVersion !== 1 || !Array.isArray(data.homepageVerses.verses)) throw new Error('invalid-response');
        return { ok: true, sha: data.sha, homepageVerses: data.homepageVerses };
      }
      if (data.unchanged !== true && !sha(data.commitSha)) return { ok: false, category: 'homepage-verses-publish-result-unavailable' };
      return { ok: true, sha: data.sha, commitSha: data.commitSha, unchanged: data.unchanged === true };
    } catch { return { ok: false, category: 'network-failure' }; }
    finally { clearTimeout(timeout); busy = false; }
  }
  return Object.freeze({ load: () => request('GET'), publish: payload => request('PUT', payload), message: homepageVersesMessage });
}
export function attachHomepageVersesApi(msal, getAccount, fetchImpl = fetch) {
  // Only scoped operations are exposed to the classic editor; tokens stay in
  // the MSAL module closure and never become properties of the window.
  window.churchHomepageVersesApi = createHomepageVersesApi({ fetchImpl, getToken: async () => {
    const account = getAccount();
    if (!account) throw new Error('account-required');
    return acquireAdminApiToken(msal, account);
  } });
  if (getAccount()) window.dispatchEvent(new Event('admin-homepage-verses-ready'));
}
