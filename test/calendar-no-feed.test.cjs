const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildCalendar } = require('../azure-function/src/calendar-model');
const calendar = require('../_content/calendar.json');
const before = require('./fixtures/calendar-before-retirement.json');
const empty = { hiddenEventIds: [], overrides: [], events: [] };
test('explicit no-feed mode preserves the complete approved Calendar and Admin objects', () => {
  assert.deepEqual(buildCalendar(null, calendar).items, before.items);
  for (const key of ['events','series','exceptions']) assert.deepEqual(calendar[key], before[key]);
  assert.deepEqual(calendar.hiddenEventIds, []);
  assert.deepEqual(calendar.overrides, []);
  assert.equal(fs.existsSync(require('node:path').join(__dirname,'../_content/calendar-source.ics')), false);
  const search = require('../search-index.json');
  // Public UI wording can change; the authoritative event fields remain indexed.
  const text = JSON.stringify(search);
  for (const event of before.items) assert(text.includes(event.title) && text.includes(event.start));
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
