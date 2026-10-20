/* Short-lived memory only. The proxy remains the authoritative durable cache. */
(function (root) {
  'use strict';
  function create(now = Date.now, schedule = setTimeout, entries = new Map()) {
    const pending = new Map();
    const ttl = 5 * 60 * 1000;
    function describe(path, value) {
      if (!value?.data || !Array.isArray(value.data) && typeof value.data !== 'object') return null;
      const scripture = /^(niv|nirv)\/chapters\/[A-Z0-9]{3}\.[1-9][0-9]{0,2}$/.test(path);
      if (!scripture && !/^(translations|(niv|nirv)\/books(?:\/[A-Z0-9]{3}\/chapters)?)$/.test(path)) return null;
      if (!scripture && (!Array.isArray(value.data) || !value.data.length || !value.data.every(x => typeof x.id === 'string'))) return null;
      const data = value.data;
      const verses = scripture ? (typeof data.content === 'string' ? data.content.match(/\[[0-9]+\]/g)?.length || 0 : 0) : 0;
      if (scripture && (!verses || verses >= 500 || !data.copyright || typeof value.meta?.fumsToken !== 'string' || !value.meta.fumsToken)) return null;
      const json = JSON.stringify(value), bytes = json.length * 2;
      return bytes > 1024 * 1024 ? null : { json, bytes, verses, scripture };
    }
    function prune() {
      for (const [key, entry] of entries) if (!Number.isFinite(entry?.until) || entry.until <= now()) entries.delete(key);
    }
    function expire(path, until) {
      // Timer closures retain keys/timestamps, never an evicted Scripture body.
      const timer = schedule(() => { if (entries.get(path)?.until === until) entries.delete(path); }, ttl);
      timer?.unref?.();
    }
    return Object.freeze({
      async get(path, load) {
        prune();
        const hit = entries.get(path);
        if (hit) {
          try {
            const value = JSON.parse(hit.json);
            if (describe(path, value)) return value;
          } catch {}
          entries.delete(path);
        }
        if (pending.has(path)) return JSON.parse(await pending.get(path));
        const request = (async () => {
          const value = await load();
          const entry = describe(path, value);
          if (entry) {
            entries.set(path, { ...entry, until: now() + ttl });
            expire(path, entries.get(path).until);
            const excessive = () => {
              const all = [...entries.values()];
              return all.length > 40 || all.filter(e => e.scripture).length > 4 || all.reduce((n,e) => n + e.verses, 0) >= 500 || all.reduce((n,e) => n + e.bytes, 0) > 1024 * 1024;
            };
            while (excessive()) entries.delete(entries.keys().next().value);
          }
          return JSON.stringify(value);
        })();
        pending.set(path, request);
        try { return JSON.parse(await request); } finally { pending.delete(path); }
      }
    });
  }
  if (typeof module === 'object' && module.exports) module.exports = create;
  else {
    // Same-origin owner outlives overlay iframe unloads; no persistent storage.
    let owner = root;
    try { if (root.parent !== root && root.parent.location.origin === root.location.origin) owner = root.parent; } catch {}
    const key = '__micklehamBibleSessionV1';
    // Share data only: async functions belonging to an unloaded iframe cannot
    // safely service a subsequent iframe's requests in every browser engine.
    const entries = owner[key] || (owner[key] = new Map());
    root.BibleSessionCache = create(Date.now, owner.setTimeout.bind(owner), entries);
  }
})(typeof window === 'object' ? window : globalThis);
