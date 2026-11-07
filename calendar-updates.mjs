export const CALENDAR_CHECK_MS = 20000;
export const CALENDAR_READ_HEADERS = Object.freeze({ 'Cache-Control': 'no-cache, max-age=0', Pragma: 'no-cache' });
export async function calendarVersion(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Static Pages data only: no authenticated API calls or credentials.
export function watchCalendar({ baseUrl = new URL('.', location.href), initialVersion = null,
  targetEditorialSha = null, onData = () => {}, onLive = () => {}, onTimeout = () => {}, onState = () => {},
  fetchImpl = fetch, documentImpl = document, setTimer = setTimeout, clearTimer = clearTimeout,
  now = Date.now, maxWaitMs = Infinity } = {}) {
  let version = initialVersion, timer = null, busy = false, stopped = false;
  const started = now();
  const schedule = () => {
    if (!stopped && !documentImpl.hidden) timer = setTimer(check, CALENDAR_CHECK_MS);
  };
  const stop = () => { stopped = true; clearTimer(timer); documentImpl.removeEventListener('visibilitychange', visible); };
  async function check() {
    clearTimer(timer);
    if (stopped || busy || documentImpl.hidden) return;
    if (now() - started >= maxWaitMs) { stop(); onTimeout(); return; }
    busy = true;
    onState('checking');
    const controller = new AbortController();
    const deadline = setTimer(() => controller.abort(), 10000);
    try {
      const url = new URL('calendar-version.json', baseUrl);
      url.searchParams.set('check', String(now()));
      // no-store governs browser storage; explicit request directives ask the
      // HTTP caches in front of Pages to revalidate too. Neither changes site settings.
      const options = { cache: 'no-store', credentials: 'omit', headers: CALENDAR_READ_HEADERS, signal: controller.signal };
      const response = await fetchImpl(url.href, options);
      if (!response.ok) { onState('version-unavailable'); return; }
      const manifest = await response.json();
      if (!/^[a-f0-9]{64}$/.test(manifest?.version) || !/^[a-f0-9]{40}$/.test(manifest?.editorialSha)) { onState('invalid-version'); return; }
      if (targetEditorialSha && manifest.editorialSha !== targetEditorialSha) { onState('awaiting-deployment'); return; }
      if (!targetEditorialSha && manifest.version === version) { onState('unchanged'); return; }
      const dataUrl = new URL('events.json', baseUrl);
      dataUrl.searchParams.set('version', manifest.version);
      dataUrl.searchParams.set('check', String(now()));
      const dataResponse = await fetchImpl(dataUrl.href, options);
      if (!dataResponse.ok) { onState('data-unavailable'); return; }
      const data = await dataResponse.json();
      if (typeof data.timeZone !== 'string' || !Array.isArray(data.items) || data.items.some(item => !item || item.status === 'draft' || ['id', 'title', 'start', 'end', 'location'].some(key => typeof item[key] !== 'string') || !/^\d{4}-\d{2}-\d{2}T/.test(item.start) || !/^\d{4}-\d{2}-\d{2}T/.test(item.end)) || new Set(data.items.map(item => item.id)).size !== data.items.length) return;
      new Intl.DateTimeFormat('en', { timeZone: data.timeZone });
      // Deployment/CDN files can briefly disagree. Keep the previous Calendar
      // until the fetched data really matches the advertised version.
      if (await calendarVersion(data) !== manifest.version) { onState('version-data-mismatch'); return; }
      if (stopped || documentImpl.hidden) return;
      if (manifest.version !== version) { await onData(data); version = manifest.version; }
      onState('current');
      if (targetEditorialSha) { stop(); onLive(); }
    } catch { onState('retrying'); /* Keep the current Calendar through transient background failures. */ }
    finally { clearTimer(deadline); busy = false; schedule(); }
  }
  function visible() { clearTimer(timer); if (!documentImpl.hidden) void check(); else onState('paused'); }
  documentImpl.addEventListener('visibilitychange', visible);
  void check();
  return { stop, check };
}
