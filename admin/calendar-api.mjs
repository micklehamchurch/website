import { ADMIN_API_HEALTH_URL } from './auth-config.mjs';
import { acquireAdminApiToken } from './auth-tokens.mjs';

export const CALENDAR_URL = new URL('calendar', ADMIN_API_HEALTH_URL).href;
export const calendarMessages = Object.freeze({
  'authentication-required': 'Sign in and authorise the Admin API connection, then reload Calendar.',
  'administrator-required': 'This Microsoft account does not have server-side administrator access.',
  'invalid-calendar': 'Calendar validation failed. Check event details, dates, times and links before publishing.',
  'calendar-too-large': 'The Calendar is too large to publish. Reduce the content and try again.',
  'calendar-version-conflict': 'The shared Calendar changed. Reload it before editing and publishing again; your staged changes have not been published.',
  'calendar-repository-unavailable': 'The shared Calendar could not be loaded from GitHub. Try reloading.',
  'calendar-publish-unavailable': 'GitHub could not publish the Calendar. Reload to check the shared version before trying again.',
  'calendar-publish-permission-denied': 'GitHub denied permission to publish the Calendar. No change was confirmed; contact the website administrator.',
  'calendar-publish-result-unavailable': 'The publish result could not be confirmed. Reload Calendar to check the shared version.',
  'network-failure': 'The request could not be completed. Reload Calendar to check the shared version before trying again.',
  busy: 'A Calendar request is already in progress.',
  success: 'Calendar published successfully to the Dev website. The website is rebuilding and may take a minute or two to update.',
  unchanged: 'The shared Calendar is already up to date.'
});
export function calendarMessage(category) { return calendarMessages[category] || 'The Calendar request failed. Reload and try again.'; }

export function createCalendarApi({ getToken, fetchImpl = fetch }) {
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
      const result = await fetchImpl(CALENDAR_URL, { method, cache: 'no-store', credentials: 'omit', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'PUT' ? { body: JSON.stringify({ sha: payload.sha, sourceSha: payload.sourceSha, calendar: payload.calendar }) } : {}) });
      if (!result.ok) {
        let category = ({ 401: 'authentication-required', 403: 'administrator-required', 400: 'invalid-calendar', 409: 'calendar-version-conflict', 413: 'calendar-too-large' })[result.status] || (method === 'GET' ? 'calendar-repository-unavailable' : 'calendar-publish-unavailable');
        if (result.status === 502 && method === 'PUT') {
          try { const safe = await result.json(); if (['calendar-publish-permission-denied', 'calendar-publish-result-unavailable'].includes(safe?.error)) category = safe.error; } catch { /* Ignore all upstream body text. */ }
        }
        return { ok: false, category };
      }
      const data = await result.json();
      const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
      if (data.ok !== true || !sha(data.sha)) throw new Error('invalid-response');
      if (method === 'GET') {
        if (!sha(data.sourceSha) || !Array.isArray(data.feedItems) || !data.calendar || !['hiddenEventIds', 'overrides', 'events'].every(key => Array.isArray(data.calendar[key]))) throw new Error('invalid-response');
        return { ok: true, sha: data.sha, sourceSha: data.sourceSha, calendar: data.calendar, feedItems: data.feedItems };
      }
      if (data.unchanged !== true && !sha(data.commitSha)) return { ok: false, category: 'calendar-publish-result-unavailable' };
      return { ok: true, sha: data.sha, commitSha: data.commitSha, unchanged: data.unchanged === true };
    } catch { return { ok: false, category: 'network-failure' }; }
    finally { clearTimeout(timeout); busy = false; }
  }
  return Object.freeze({ load: () => request('GET'), publish: payload => request('PUT', payload), message: calendarMessage });
}
export function attachCalendarApi(msal, getAccount, fetchImpl = fetch) {
  // Only scoped operations are exposed to the classic editor; tokens stay in
  // the MSAL module closure and never become properties of the window.
  window.churchCalendarApi = createCalendarApi({ fetchImpl, getToken: async () => {
    const account = getAccount();
    if (!account) throw new Error('account-required');
    return acquireAdminApiToken(msal, account);
  } });
}
