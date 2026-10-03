import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script = fs.readFileSync(new URL('../events.js', import.meta.url), 'utf8').replace("await import(`./calendar-updates.mjs?v=2&attempt=${Date.now()}`)", 'updates');
const event = { id: 'one', title: 'First event', start: '2026-12-01T10:00', end: '2026-12-01T11:00', location: 'Church', timeZone: 'Europe/London' };
async function renderFixture(items = [event], clock = Date) {
  const nodes = new Map(); let refresh;
  const buttons = node => [ ...(node.tag === 'button' ? [node] : []), ...node.children.flatMap(buttons) ];
  function node(tag = 'div') {
    return { tag, attributes: {}, children: [], dataset: {}, listeners: {}, textContent: '', open: false, classList: { add() {} },
      append(child) { this.children.push(child); }, replaceChildren() { this.children = []; }, setAttribute(key,value) { this.attributes[key] = value; }, getAttribute(key) { return this.attributes[key]; }, focus() {}, querySelector() { return node('button'); },
      showModal() { this.open = true; }, close() { this.open = false; }, addEventListener(name, fn) { this.listeners[name] = fn; }, querySelectorAll() { return buttons(this); },
      set innerHTML(html) { this.html = html; const id = html.match(/data-event-id="([^"]+)"/); this.firstElementChild = node('button'); if (id) this.firstElementChild.dataset.eventId = id[1]; }, get innerHTML() { return this.html; } };
  }
  const select = key => { if (key === '[data-event-preview]') return null; if (!nodes.has(key)) nodes.set(key, node()); return nodes.get(key); };
  const context = { updates: { watchCalendar: options => { refresh = options.onData; }, calendarVersion: async () => 'initial' }, document: { querySelector: select, createElement: node, querySelectorAll: () => [], activeElement: null },
    fetch: async () => ({ ok: true, json: async () => ({ timeZone: 'Europe/London', items }) }), console, URL, URLSearchParams, Intl, Date: clock,
    location: { search: '' }, sessionStorage: { getItem: () => null, removeItem() {} } };
  vm.runInNewContext(script, context);
  for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve));
  return { select, refresh, buttons, eventButton: context.eventButton };
}

test('individual calendar wording recognizes Apple platforms without claiming native handoff', () => {
  const context = { document: { addEventListener() {} }, console };
  vm.runInNewContext(script.replace(/initializeEvents\(\);?\s*$/, ''), context);
  for (const info of [{platform:'iPhone'}, {platform:'iPad'}, {platform:'MacIntel',maxTouchPoints:5}, {platform:'MacIntel'}, {userAgent:'iPhone Safari'}]) assert.equal(context.individualCalendarLabel(info),'Apple Calendar');
  for (const info of [{platform:'Win32',userAgent:'AppleWebKit Chrome'}, {platform:'Linux'}, {}]) assert.equal(context.individualCalendarLabel(info),'Apple / Outlook');
});
test('actual public renderer preserves the displayed month and replaces rather than appends event buttons', async () => {
  const h = await renderFixture(); assert.equal(h.select('#calendar-month-label').textContent, 'December 2026');
  h.select('#calendar-previous').listeners.click(); const month = h.select('#calendar-month-label').textContent;
  assert.equal(month, 'November 2026');
  const latest = { timeZone: 'Europe/London', items: [{ ...event, start: '2026-11-01T10:00', end: '2026-11-01T11:00' }, { ...event, id: 'two' }] };
  h.refresh(latest); assert.equal(h.select('#calendar-month-label').textContent, month); assert.equal(h.buttons(h.select('#calendar-grid')).length, 1);
  h.refresh(latest); assert.equal(h.buttons(h.select('#calendar-grid')).length, 1); assert.equal(h.buttons(h.select('#calendar-agenda')).length, 1);
});
test('open event details update with edited data and close when the event is removed', async () => {
  const h = await renderFixture(); h.select('#calendar-grid').listeners.click({ target: { closest: () => ({ dataset: { eventId: 'one' } }) } });
  assert.equal(h.select('#event-detail-dialog').open, true);
  h.refresh({ timeZone: 'Europe/London', items: [{ ...event, title: 'Updated title' }] }); assert.equal(h.select('#event-detail-title').textContent, 'Updated title');
  h.refresh({ timeZone: 'Europe/London', items: [] }); assert.equal(h.select('#event-detail-dialog').open, false);
});
test('existing Calendar renders empty event data without an invalid initial month', async () => {
  const h = await renderFixture([]); assert.match(h.select('#calendar-month-label').textContent, /\w+ \d{4}/); assert.equal(h.buttons(h.select('#calendar-grid')).length, 0);
});
test('generated recurring all-day events show All day and export date-only Google dates',async()=>{const item={...event,id:'series@2026-12-01T00:00',seriesId:'series',occurrenceStart:'2026-12-01T00:00',start:'2026-12-01T00:00',end:'2026-12-02T00:00',allDay:true};const h=await renderFixture([item]);assert.match(h.eventButton(item),/All day/);h.select('#calendar-grid').listeners.click({target:{closest:()=>({dataset:{eventId:item.id}})}});assert.match(h.select('#event-detail-content').innerHTML,/All day/);assert.match(h.select('#event-detail-content').innerHTML,/dates=20261201%2F20261202/)});

test('Today uses visitor local date after backward/forward navigation, with date semantics and no reload', async () => {
  class VisitorDate extends Date { constructor(...args) { super(...(args.length ? args : ['2027-05-12T12:00:00Z'])); } getFullYear() { return 2027; } getMonth() { return 4; } getDate() { return 12; } }
  const h = await renderFixture([{...event,start:'2027-01-01T10:00',end:'2027-01-01T11:00'},{...event,id:'last',start:'2027-12-01T10:00',end:'2027-12-01T11:00'}],VisitorDate);
  h.select('#calendar-previous').listeners.click(); h.select('#calendar-previous').listeners.click(); h.select('#calendar-next').listeners.click();
  assert.equal(h.select('#calendar-month-label').textContent,'April 2027');
  h.select('#calendar-today').listeners.click(); assert.equal(h.select('#calendar-month-label').textContent,'May 2027');
  const today=h.select('#calendar-grid').children.find(n=>n.className?.includes('is-today'));
  assert.equal(today.children[0].dateTime,'2027-05-12'); assert.equal(today.children[0].attributes['aria-current'],'date'); assert.match(today.attributes['aria-label'],/today/);
  for(let i=0;i<9;i++)h.select('#calendar-next').listeners.click(); h.select('#calendar-today').listeners.click(); assert.equal(h.select('#calendar-month-label').textContent,'May 2027');
  for(let i=0;i<9;i++)h.select('#calendar-previous').listeners.click(); h.select('#calendar-today').listeners.click(); assert.equal(h.select('#calendar-month-label').textContent,'May 2027');
});