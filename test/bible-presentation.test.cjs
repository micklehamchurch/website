const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function presentation(mobileInitially = false, paginated = false, overlay = false) {
  let document; const rootEvents={},messages=[];
  class Element {
    constructor(id) { this.id = id; this.events = {}; this.children = []; this.open = false; }
    append(child) { if (child.parent) child.parent.children = child.parent.children.filter(c => c !== child); this.children.push(child); child.parent = this; }
    contains(child) { return this.children.includes(child); }
    addEventListener(name, fn) { this.events[name] = fn; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.events.close?.(); }
  }
  const elements = new Map();
  const get = id => { if (id === 'bible-page-spread' && !paginated) return null; if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
  document = { getElementById: get, activeElement: null, body: { classList: { add() {}, contains: () => paginated } }, addEventListener(k,fn) {rootEvents[k]=fn}, querySelector:s=>s==='.bible-toolbar'?get('bible-toolbar'):[...elements.values()].find(e=>e.open)||null };
  const mobile = { matches: mobileInitially, addEventListener(name, fn) { this.change = fn; } };
  const window = { matchMedia: () => mobile }; window.parent = overlay ? {postMessage:(...m)=>messages.push(m)} : window;
  get('bible-controls-home').append(get('bible-controls'));
  vm.runInNewContext(fs.readFileSync(require.resolve('../bible-presentation.js'), 'utf8'), { document, window, URLSearchParams, location:{search:'?book=overlay',origin:'https://example.test'} });
  return {rootEvents,messages, get: name => get('bible-' + name), mobile, document };
}

test('mobile drawer reuses the live controls, closes on reading, and returns focus', () => {
  const p = presentation(true);
  assert(p.get('drawer-content').contains(p.get('controls')));
  assert.equal(p.get('controls-home').children.length, 0);
  p.get('browse').events.click(); assert(p.get('drawer').open);
  p.get('controls').events.submit(); assert.equal(p.get('drawer').open, false);
  assert.equal(p.document.activeElement, p.get('browse'));
});

test('resizing an open drawer restores the same controls to the desktop page', () => {
  const p = presentation(true);
  p.get('browse').events.click();
  p.mobile.matches = false; p.mobile.change();
  assert.equal(p.get('drawer').open, false);
  assert(p.get('controls-home').contains(p.get('controls')));
  assert.equal(p.get('drawer-content').children.length, 0);
});

test('shared header overlay unloads on close and accepts close messages only from its reader', () => {
  const events = {}, nodes = [];
  let focused;
  class Element {
    constructor(tag) { this.tag = tag; this.events = {}; this.attrs = {}; this.contentWindow = {}; }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k] || null; }
    removeAttribute(k) { delete this.attrs[k]; }
    set src(v) { this.attrs.src = v; }
    append(...children) { this.children = children; }
    addEventListener(k, fn) { this.events[k] = fn; }
    closest() { return null; }
    getClientRects() { return [1]; }
    getBoundingClientRect() { return {left:20,top:20,right:400,bottom:400}; }
    showModal() { this.open = true; }
    close() { this.open = false; this.events.close(); }
    focus() { focused = this; }
  }
  const trigger = new Element('a'), classes = new Set();
  const document = { getElementById: () => trigger, createElement: tag => { const e = new Element(tag); nodes.push(e); return e; }, body: { append() {} }, documentElement: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } } };
  const window = { addEventListener: (k, fn) => { events[k] = fn; } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../home-bible.js'), 'utf8'), { document, window, HTMLDialogElement: class {}, location: { origin: 'https://example.test' } });
  const panel = nodes.find(e => e.tag === 'div');
  const dialog = nodes.find(e => e.tag === 'dialog'), frame = nodes.find(e => e.tag === 'iframe'), close = nodes.find(e => e.tag === 'button');
  trigger.events.click({ preventDefault() {} });
  assert(dialog.open); assert.match(frame.getAttribute('src'), /v=20261019-tap-turn/); assert(classes.has('bible-modal-open'));
  assert.equal(close.hidden,false);
  events.message({origin:'https://other.test',source:frame.contentWindow,data:'mickleham-bible-toolbar-ready'});assert.equal(close.hidden,false);
  events.message({origin:'https://example.test',source:frame.contentWindow,data:'mickleham-bible-toolbar-ready'});assert.equal(close.hidden,true);
  events.message({ origin: 'https://other.test', source: frame.contentWindow, data: 'mickleham-close-bible' });
  assert(dialog.open);
  events.message({ origin: 'https://example.test', source: {}, data: 'mickleham-close-bible' });
  assert(dialog.open);
  const pointer=(target,x,y)=>({target,clientX:x,clientY:y,button:0,isPrimary:true});
  dialog.events.pointerdown(pointer(frame,100,100));dialog.events.click(pointer(frame,100,100));assert(dialog.open);
  dialog.events.pointerdown(pointer(panel,100,100));dialog.events.click(pointer(panel,100,100));assert(dialog.open);
  dialog.events.pointerdown(pointer(frame,100,100));dialog.events.click(pointer(dialog,5,5));assert(dialog.open);
  dialog.events.pointerdown({...pointer(dialog,5,5),button:2});dialog.events.click(pointer(dialog,5,5));assert(dialog.open);
  dialog.events.pointerdown(pointer(dialog,5,5));dialog.events.pointercancel();dialog.events.click(pointer(dialog,5,5));assert(dialog.open);
  // Rounded-corner backdrop is within the old rectangular bounds.
  dialog.events.pointerdown(pointer(dialog,21,21));dialog.events.click(pointer(dialog,21,21));assert.equal(dialog.open,false);assert.equal(focused,trigger);
  trigger.events.click({preventDefault(){}});
  events.message({ origin: 'https://example.test', source: frame.contentWindow, data: 'mickleham-close-bible' });
  assert.equal(dialog.open, false); assert.equal(frame.getAttribute('src'), null);assert.equal(close.hidden,false);
  assert.equal(classes.size, 0); assert.equal(focused, trigger);
  trigger.events.click({ preventDefault() {} }); assert(frame.getAttribute('src'));
});

test('paginated reader keeps the same book controls in a drawer at every width',()=>{
 const p=presentation(false,true);
 assert(p.get('drawer-content').contains(p.get('controls')));
 p.mobile.matches=true;p.mobile.change();p.mobile.matches=false;p.mobile.change();
 assert(p.get('drawer-content').contains(p.get('controls')));
 assert.equal(p.get('controls-home').children.length,0);
});

test('hover sequence holds a readable closed cover before opening and disables motion when requested',()=>{
 const css=fs.readFileSync('header-navigation.css','utf8');
 assert.match(css,/transform \.4s cubic-bezier\([^;]+\) \.45s/);
 assert.match(css,/\.nav-bible:hover \.bible-icon-cover\{transition:transform \.8s ease 1s,opacity \.8s ease 1s\}/);
 assert.match(css,/@media\(hover:hover\) and \(pointer:fine\) and \(min-width:1360px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]+transition:none!important/);
 const pages=fs.readFileSync('bible-reader.css','utf8');
 assert.match(pages,/@media\(max-width:480px\)\{\.bible-toolbar #bible-browse\{flex-basis:100%/);
 assert.match(pages,/#bible-save-status\{position:absolute;width:1px;height:1px/);
 assert.match(pages,/\.bible-page-ribbon\{position:absolute/);
});

test('Escape dismisses only the active inner dialog before closing the reader and restores information focus',()=>{
 const p=presentation(false,true,true);p.get('browse').events.click();p.rootEvents.keydown({key:'Escape'});assert.equal(p.messages.filter(m=>m[0]==='mickleham-close-bible').length,0);
 p.get('drawer').close();p.get('about').events.click();assert(p.get('information').open);p.rootEvents.keydown({key:'Escape'});assert.equal(p.messages.filter(m=>m[0]==='mickleham-close-bible').length,0);
 p.get('information-close').events.click();assert.equal(p.document.activeElement,p.get('about'));p.rootEvents.keydown({key:'Escape'});assert.equal(p.messages.at(-1)[0],'mickleham-close-bible');
});
