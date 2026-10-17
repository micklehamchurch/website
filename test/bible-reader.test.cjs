const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Small DOM adapter exercises asynchronous reader behavior with synthetic Scripture.
function reader({ missingToken = false, failChapter = false } = {}) {
  class Element {
    constructor() { this.children = []; this.events = {}; this.value = ''; this.textContent = ''; this.hidden = true; }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    addEventListener(name, action) { this.events[name] = action; }
    setAttribute() {}
    focus() {}
    get selectedOptions() { return this.children.filter(c => c.value === this.value); }
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const requests = [], views = [];
  const document = { getElementById: get, createElement: () => new Element(), createTextNode: text => ({ textContent: text }), head: new Element() };
  let rejectChapter = failChapter;
  const window = { fums: (...args) => views.push(args) };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const path = url.split('/api/bible/')[1];
    let data;
    if (path === 'translations') data = [{ id: '3e2eb613d45e131e-01' }, { id: 'de547c01da41e37c-01' }];
    else if (path.endsWith('/books')) data = [{ id: 'JHN', name: 'John' }];
    else if (path.includes('/books/')) data = [{ id: 'JHN.intro', number: 'intro' }, { id: 'JHN.1', number: '1' }, { id: 'JHN.2', number: '2' }];
    else {
      if (rejectChapter) return { ok: false, status: 503 };
      data = { content: '[1] Synthetic text <img src=x onerror=bad()>', copyright: 'Synthetic notice', reference: path.endsWith('.2') ? 'John 2' : 'John 1', next: { id: 'JHN.2' } };
    }
    return { ok: true, json: async () => ({ data, meta: missingToken ? {} : { fumsToken: 'synthetic-token' } }) };
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../bible-reader.js'), 'utf8'), { document, window, fetch, AbortSignal, DOMParser: class { parseFromString(text) { return { body: { textContent: text } }; } } });
  const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
  return { get: name => get('bible-' + name), requests, views, settle, recover: () => { rejectChapter = false; } };
}

test('reader displays text safely, excludes introduction IDs, and reports each displayed cache hit', async () => {
  const r = reader(); await r.settle();
  assert.equal(r.get('reading').hidden, false);
  assert.equal(r.get('chapter').children.length, 2);
  const paragraph = r.get('content').children[0];
  assert(paragraph.children.some(c => c.textContent.includes('<img src=x onerror=bad()>')));
  assert.equal(r.views.length, 1);
  r.get('controls').events.submit({ preventDefault() {} }); await r.settle();
  assert.equal(r.views.length, 2);
  assert(r.requests.every(r => r.options.credentials === 'omit' && r.options.cache === 'no-store'));
  assert.equal(r.get('copyright').textContent, 'Synthetic notice');
});
test('reader refuses to display Scripture without its provider tracking token', async () => {
  const r = reader({ missingToken: true }); await r.settle();
  assert.equal(r.get('reading').hidden, true);
  assert.equal(r.views.length, 0);
  assert.equal(r.get('retry').hidden, false);
});
test('reader can recover from a failed chapter request and navigate to the next chapter', async () => {
  const r = reader({ failChapter: true }); await r.settle();
  assert.equal(r.get('reading').hidden, true);
  r.recover(); r.get('retry').events.click(); await r.settle();
  assert.equal(r.get('reading').hidden, false);
  r.get('next').events.click(); await r.settle();
  assert.equal(r.get('reference').textContent, 'John 2');
  assert.equal(r.get('chapter').value, 'JHN.2');
  assert.equal(r.views.length, 2);
});
