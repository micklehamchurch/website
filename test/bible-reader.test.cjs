const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Small DOM adapter exercises asynchronous reader behavior with synthetic Scripture.
function reader({ missingToken = false, failChapter = false, remembered = false, initialRead = true, rawSaved, extended = false } = {}) {
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
  const documentEvents = {}, emitted = [];
  const document = { addEventListener: (name, fn) => { documentEvents[name] = fn; }, dispatchEvent: event => { emitted.push(event); documentEvents[event.type]?.(event); }, getElementById: get, createElement: () => new Element(), createTextNode: text => ({ textContent: text }), head: new Element() };
  let rejectChapter = failChapter;
  const window = { fums: (...args) => views.push(args) };
  window.localStorage = { getItem: () => rawSaved ?? (remembered ? JSON.stringify({v:1,translation:'niv',book:'JHN',chapter:'JHN.2',reference:'John 2',page:2,offset:70}) : null) }; window.BiblePagesModel = require('../bible-pages-model');
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const path = url.split('/api/bible/')[1];
    let data;
    if (path === 'translations') data = [{ id: '3e2eb613d45e131e-01' }, { id: 'de547c01da41e37c-01' }];
    else if (path.endsWith('/books')) data = extended ? ['GEN','EXO','MAT','MRK','LUK','JHN','ACT','REV'].map(id=>({id,name:id==='JHN'?'John':id})) : [{ id: 'JHN', name: 'John' }];
    else if (path.includes('/books/')) { const id=path.split('/books/')[1].split('/')[0], count=({GEN:50,EXO:40,MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,REV:22})[id];data=[{id:id+'.intro',number:'intro'},...Array.from({length:count},(_,i)=>({id:id+'.'+(i+1),number:String(i+1)}))]; }
    else {
      if (rejectChapter) return { ok: false, status: 503 };
      data = { content: '[1] Synthetic text <img src=x onerror=bad()>', copyright: 'Synthetic notice', reference: path.split('/').at(-1).replace('JHN.','John ').replace('.', ' '), next: { id: 'JHN.2' } };
    }
    return { ok: true, json: async () => ({ data, meta: missingToken ? {} : { fumsToken: 'synthetic-token' } }) };
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../bible-reader.js'), 'utf8'), { document, window, fetch, AbortSignal, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, DOMParser: class { parseFromString(text) { return { body: { textContent: text } }; } } });
  let chosen = false; const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); if (initialRead && !remembered && !chosen) { chosen = true; get('bible-controls').events.submit({preventDefault(){}}); for (let i=0;i<12;i++) await new Promise(resolve=>setImmediate(resolve)); } };
  return { documentEvents, emitted, get: name => get('bible-' + name), requests, views, settle, recover: () => { rejectChapter = false; } };
}

test('reader displays text safely, excludes introduction IDs, and reports each displayed cache hit', async () => {
  const r = reader(); await r.settle();
  assert.equal(r.get('reading').hidden, false);
  assert.equal(r.get('chapter').children.length, 21);
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
  r.documentEvents['bible-request-page-chapter']({detail:1}); await r.settle();
  assert.equal(r.get('reference').textContent, 'John 2');
  assert.equal(r.get('chapter').value, 'JHN.2');
  assert.equal(r.views.length, 2);
});

test('full translation names are displayed without changing licensed IDs',async()=>{
 const r=reader();await r.settle();
 assert.equal(r.get('translation').children[0].textContent,'New International Version (Anglicised)');
 assert.equal(r.get('translation').children[1].textContent,'New International Reader’s Version (Anglicised)');
 r.get('translation').value='nirv';r.get('translation').events.change();await r.settle();
 assert.equal(r.get('edition').textContent,'New International Reader’s Version (Anglicised)');
 assert.equal(r.get('translation-name').textContent,'New International Reader’s Version (Anglicised)');
 assert(r.requests.some(q=>q.url.endsWith('/nirv/chapters/JHN.1')));
});
test('saved location restores through the same reader and rejects unsupported selections',async()=>{
 const r=reader();await r.settle();
 r.documentEvents['bible-request-location']({detail:{translation:'niv',book:'JHN',chapter:'JHN.2'}});await r.settle();
 assert.equal(r.get('chapter').value,'JHN.2');assert.equal(r.get('reference').textContent,'John 2');
 const count=r.requests.length;
 for(const detail of [{translation:'other',book:'JHN',chapter:'JHN.1'},{translation:'niv',book:'XXX',chapter:'XXX.1'},{translation:'niv',book:'JHN',chapter:'JHN.999'}])r.documentEvents['bible-request-location']({detail});
 await r.settle();assert.equal(r.requests.length,count);
});

test('valid last reading automatically fetches only its saved chapter',async()=>{
 const r=reader({remembered:true});await r.settle();
 assert.equal(r.get('reading').hidden,false);assert.equal(r.views.length,1);
 assert.equal(r.get('reference').textContent,'John 2');
 assert.equal(r.emitted.find(e=>e.type==='bible-restoring-location').detail.offset,70);
 assert.equal(r.requests.filter(q=>q.url.includes('/chapters/')).length,1);
});
test('missing and corrupt saved positions show the normal choose-a-book state',async()=>{
 for(const rawSaved of [undefined,'{broken',JSON.stringify({v:99})]){
 const r=reader({initialRead:false,rawSaved});await r.settle();
 assert.equal(r.get('reading').hidden,true);assert.equal(r.views.length,0);
 assert.equal(r.get('read').disabled,false);assert.match(r.get('status').textContent,/Choose a book/);
 }
});

test('a valid-format saved chapter absent from the live catalogue falls back to choosing a reading',async()=>{
 const rawSaved=JSON.stringify({v:1,translation:'niv',book:'PSA',chapter:'PSA.117',reference:'Psalm 117',page:0,offset:0});
 const r=reader({initialRead:false,rawSaved});await r.settle();
 assert.equal(r.get('reading').hidden,true);assert.equal(r.views.length,0);assert.equal(r.get('read').disabled,false);
});

 test('continuous page boundary requests preserve translation, avoid duplicate calls and signal the landing edge',async()=>{
 const r=reader();await r.settle();let count=r.requests.length;
 r.documentEvents['bible-request-page-chapter']({detail:1});r.documentEvents['bible-request-page-chapter']({detail:1});await r.settle();
 assert.equal(r.requests.length,count+1);assert.equal(r.get('chapter').value,'JHN.2');assert.equal(r.views.length,2);
 assert.equal(r.emitted.filter(e=>e.type==='bible-chapter-ready').at(-1).detail.boundaryDirection,1);
 r.documentEvents['bible-request-page-chapter']({detail:-1});await r.settle();
 assert.equal(r.get('chapter').value,'JHN.1');assert.equal(r.emitted.filter(e=>e.type==='bible-chapter-ready').at(-1).detail.boundaryDirection,-1);
 assert.equal(r.get('translation').value,'niv');
 });
 test('canonical book crossings and absolute Genesis/Revelation boundaries use the existing catalogues',async()=>{
 const r=reader({extended:true});await r.settle();
 for(const [start,direction,end] of [['JHN.21',1,'ACT.1'],['ACT.1',-1,'JHN.21'],['MAT.28',1,'MRK.1'],['MRK.1',-1,'MAT.28']]){
 const book=start.split('.')[0];r.documentEvents['bible-request-location']({detail:{translation:'nirv',book,chapter:start}});await r.settle();
 const before=r.requests.length;r.documentEvents['bible-request-page-chapter']({detail:direction});await r.settle();
 assert.equal(r.get('chapter').value,end);assert.equal(r.get('translation').value,'nirv');
 assert.equal(r.requests.length,before+2);assert.equal(r.requests.at(-1).url.split('/').at(-1),end);
 }
 for(const [chapter,direction] of [['GEN.1',-1],['REV.22',1]]){
 r.documentEvents['bible-request-location']({detail:{translation:'niv',book:chapter.split('.')[0],chapter}});await r.settle();const before=r.requests.length;
 r.documentEvents['bible-request-page-chapter']({detail:direction});await r.settle();assert.equal(r.requests.length,before);
 const state=r.emitted.filter(e=>e.type==='bible-chapter-ready').at(-1).detail;assert.equal(direction<0?state.hasPreviousChapter:state.hasNextChapter,false);
 }
 });
