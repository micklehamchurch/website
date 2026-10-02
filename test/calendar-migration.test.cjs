const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const fixture = require('./fixtures/calendar-migration.json');
const calendar = require('../_content/calendar.json');
const { buildCalendar } = require('../azure-function/src/calendar-model');
const source = fs.readFileSync(path.join(root, 'test/fixtures/legacy-calendar.ics'), 'utf8');
const items = buildCalendar(null, calendar, { range: { from: '2026-09-01', to: '2028-12-31' } }).items;
const key = e => [e.start.slice(0,10), e.allDay ? 'all-day' : e.start.slice(11,16)+'–'+e.end.slice(11,16), e.title].join('|');

test('approved migration exactly reproduces the authoritative schedule without duplicates', () => {
  assert.equal(items.length, 116);
  assert.deepEqual(items.map(key).sort(), fixture.expectedKeys);
  assert.equal(new Set(items.map(key)).size, items.length);
  assert.deepEqual(calendar.series.slice(2), fixture.series);
  assert.deepEqual(calendar.events, fixture.oneoffs);
  assert.equal(calendar.events.length, 20);
});
test('existing Compline objects and moved occurrence are preserved', () => {
  assert.deepEqual(calendar.series.slice(0,2), fixture.baselineCompline.series);
  assert.deepEqual(calendar.exceptions.slice(0,1), fixture.baselineCompline.exceptions);
  const compline = items.filter(e => e.title === 'Compline in Church');
  assert.equal(compline.length, 30);
  assert(compline.some(e => e.start === '2026-11-24T19:00'));
  assert(!compline.some(e => e.start === '2026-11-17T19:00'));
});
test('legacy IDs, cancelled BCP and unidentified March event are absent', () => {
  assert.equal(fixture.hiddenIds.length, 36);
  assert.deepEqual(calendar.hiddenEventIds, []);
  assert(items.every(e => !fixture.hiddenIds.includes(e.id)));
  assert(!items.some(e => e.title.includes('BCP') && (e.start.startsWith('2026-11-08') || e.start.startsWith('2027-02'))));
  assert(!items.some(e => e.title.startsWith('NO BCP') || e.start.startsWith('2027-03-18')));
  assert(items.some(e => e.start === '2026-11-22T10:00' && e.title === 'Holy Communion with Baptism'));
  assert(items.some(e => e.start === '2027-03-10T19:30' && e.end === '2027-03-10T20:30'));
  assert(items.every(e => e.start < '2028'));
  assert.equal(calendar.exceptions.length, 3);
});
test('all-day boundaries and generated public Calendar/search retain approved content', () => {
  const allDay = items.filter(e => e.allDay);
  assert.deepEqual(allDay.map(e => e.start.slice(0,10)).sort(), ['2026-10-17','2027-07-03','2027-09-04']);
  for (const e of allDay) assert.equal(Date.parse(e.end+'Z')-Date.parse(e.start+'Z'), 86400000);
  const generated = require('../events.json').items;
  assert.deepEqual(generated.map(key).sort(), fixture.expectedKeys);
  const search = JSON.stringify(require('../search-index.json'));
  for (const e of items) assert(search.includes(e.title));
  assert(!search.includes('NO BCP service') && !search.includes('All age Worship') && !search.includes('Chapel - Book of Common Prayer Holy Communion'));
});
