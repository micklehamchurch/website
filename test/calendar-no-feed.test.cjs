const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildCalendar } = require('../azure-function/src/calendar-model');
const calendar = require('../_content/calendar.json');
const {before} = require('./fixtures/calendar-stage1-expected.cjs');
const empty = { hiddenEventIds: [], overrides: [], events: [] };
test('explicit no-feed mode preserves isolated historical Calendar and Admin objects', () => {
  const historical = Object.fromEntries(['hiddenEventIds','overrides','events','series','exceptions'].map(key => [key, structuredClone(before[key] || [])]));
  const original = structuredClone(historical);
  assert.deepEqual(buildCalendar(null, historical).items, before.items);
  assert.deepEqual(historical, original);
});

test('generated public Calendar and search correspond to current authoritative content', () => {
  const items = buildCalendar(null, calendar).items;
  assert.deepEqual(require('../events.json').items, items);
  assert.deepEqual(calendar.hiddenEventIds, []);
  assert.deepEqual(calendar.overrides, []);
  assert.equal(fs.existsSync(require('node:path').join(__dirname,'../_content/calendar-source.ics')), false);
  const text = JSON.stringify(require('../search-index.json'));
  for (const event of items) assert(text.includes(event.title) && text.includes(event.start));
});

test('no-feed mode supports empty, draft, one-off and recurring Calendars', () => {
  assert.deepEqual(buildCalendar(null, empty).items, []);
  const event = calendar.events[0];
  assert.equal(buildCalendar(null, {...empty, events:[event]}).items.length,1);
  assert.equal(buildCalendar(null, {...empty, events:[{...event,status:'draft'}]}).items.length,0);
  assert.equal(buildCalendar(null, {...empty, series:[calendar.series[0]],exceptions:[]}).items.length,15);
});
test('configured malformed feeds still fail; no-feed cannot reference hidden or overridden feed IDs', () => {
  for (const source of ['', 'broken', 'BEGIN:VCALENDAR\nEND:VCALENDAR', undefined, {}]) assert.throws(()=>buildCalendar(source,empty));
  assert.throws(()=>buildCalendar(null,{...empty,hiddenEventIds:['obsolete']}));
  assert.throws(()=>buildCalendar(null,{...empty,overrides:[{id:'obsolete'}]}));
});

test('removed Test iPhone is absent from authoritative Calendar and every public output', () => {
  const id = 'event-94fb2473-d3a7-46f9-83c9-929ef18e1a8a';
  for (const file of ['_content/calendar.json', 'events.json', 'calendar.ics', 'search-index.json']) {
    const text = fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8');
    assert(!text.includes(id)); assert(!text.includes('Test iPhone'));
  }
});
