import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';
const messages = Object.freeze({
  'authentication-required': 'Sign in and authorise the Admin API connection, then reload News & Magazine.',
  'administrator-required': 'This account does not have server-side administrator access.',
  'news-version-conflict': 'The shared version changed. Reload News & Magazine before publishing again. Your changes were not published.',
  'publication-already-exists': 'An edition for this date or month already exists. It has not been overwritten.',
  'invalid-news-request': 'Check the title, date, content and PDF details. Only valid PDFs and plain text are accepted.',
  'news-payload-too-large': 'The PDF must be no larger than 5 MB. Shorten oversized article content and try again.',
  'news-repository-unavailable': 'Shared content could not be loaded. Try reloading News & Magazine.',
  'news-publish-unavailable': 'Publication could not be confirmed. Reload the shared content before trying again.',
  'network-failure': 'The request could not be completed. Reload shared content to check whether it was published.',
  busy: 'Another request is in progress.',
  success: 'Published successfully. The Dev website is rebuilding.'
});
export const newsMessage = category => messages[category] || 'The request failed. Reload shared content and try again.';
export function createNewsApi({ getToken, fetchImpl = fetch }) {
  const busy = new Set();
  async function request(kind, method, payload) {
    if (!['news', 'publications'].includes(kind)) return { ok: false, category: 'invalid-news-request' };
    if (busy.has(kind)) return { ok: false, category: 'busy' };
    busy.add(kind); const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 90000);
    try {
      let token; try { token = await getToken(); } catch { return { ok: false, category: 'authentication-required' }; }
      if (!token) return { ok: false, category: 'authentication-required' };
      const result = await fetchImpl(new URL(kind, ADMIN_API_HEALTH_URL).href, { method, cache: 'no-store', credentials: 'omit', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}) });
      if (!result.ok) {
        let category = ({ 401: 'authentication-required', 403: 'administrator-required', 400: 'invalid-news-request', 409: 'news-version-conflict', 413: 'news-payload-too-large' })[result.status] || (method === 'GET' ? 'news-repository-unavailable' : 'news-publish-unavailable');
        try { const data = await result.json(); if (Object.hasOwn(messages, data?.error)) category = data.error; } catch {}
        return { ok: false, category };
      }
      const data = await result.json(), sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
      if (data.ok !== true || !sha(data.sha) || !sha(data.headSha) || (method === 'POST' && !sha(data.commitSha))) throw new Error();
      if (method === 'GET' && !Array.isArray(data[kind === 'news' ? 'articles' : 'publications'])) throw new Error();
      return { ok: true, sha: data.sha, headSha: data.headSha, ...(method === 'POST' ? { commitSha: data.commitSha } : { [kind === 'news' ? 'articles' : 'publications']: data[kind === 'news' ? 'articles' : 'publications'] }) };
    } catch { return { ok: false, category: 'network-failure' }; }
    finally { clearTimeout(timeout); busy.delete(kind); }
  }
  return Object.freeze({ loadNews: () => request('news', 'GET'), loadPublications: () => request('publications', 'GET'), publishNews: payload => request('news', 'POST', payload), publishPublication: payload => request('publications', 'POST', payload), message: newsMessage });
}
export function attachNewsApi(msal, getAccount, fetchImpl = fetch) {
  window.churchNewsApi = createNewsApi({ fetchImpl, getToken: async () => { const account = getAccount(); if (!account) throw new Error(); return acquireAdminApiToken(msal, account); } });
  if (getAccount()) window.dispatchEvent(new Event('admin-news-ready'));
}
