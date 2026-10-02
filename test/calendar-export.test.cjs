const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const ICAL = require('ical.js'), exporter = require('../calendar-export');
const items = require('../events.json').items;
const parse = text => new ICAL.Component(ICAL.parse(text));
const now = new Date('2026-10-02T12:00:00Z');
test('subscription parses independently and contains exactly the effective public event set', async () => {
  const text = await exporter.calendar(items,{now});
  const component = parse(text), events = component.getAllSubcomponents('vevent');
  assert.equal(component.name,'vcalendar'); assert.equal(events.length,116);
  assert.equal(new Set(events.map(e=>e.getFirstPropertyValue('uid'))).size,116);
  for(let i=0;i<items.length;i++) {
    const e=events[i], original=items[i];
    assert.equal(e.getFirstPropertyValue('summary'),original.title);
    assert.equal(e.getFirstPropertyValue('uid'),await exporter.uid(original.id));
    if(original.allDay) { assert(e.getFirstPropertyValue('dtstart').isDate); assert.equal(e.getFirstPropertyValue('dtend').toString(),original.end.slice(0,10)); }
    else assert.equal(e.getFirstPropertyValue('dtstart').toString(),exporter.instant(original.start,original.timeZone).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z'));
  }
  assert(!text.includes('NO BCP') && !text.includes('7.30pm'));
  assert(!items.some(e=>e.title.includes('BCP')&&(e.start.startsWith('2026-11-08')||e.start.startsWith('2027-02'))));
  assert(items.some(e=>e.start==='2026-11-22T10:00'&&e.title==='Holy Communion with Baptism'));
  assert(items.some(e=>e.start==='2026-11-24T19:00'));
});
test('unchanged rebuilds are byte-identical; updates retain UID and advance revision metadata', async () => {
  const a=await exporter.calendar(items,{now});
  assert.equal(await exporter.calendar(items,{previous:a,now:new Date('2026-10-03Z')}),a);
  const altered=[{...items[0],title:'Changed title'},...items.slice(1)];
  const b=parse(await exporter.calendar(altered,{previous:a,now:new Date('2026-10-03T12:00Z')}));
  assert.equal(b.getAllSubcomponents('vevent')[0].getFirstPropertyValue('sequence'),1);
  assert.equal(b.getAllSubcomponents('vevent')[0].getFirstPropertyValue('uid'),await exporter.uid(items[0].id));
});
test('single-event exports correctly escape Unicode text and fold CRLF lines by UTF-8 octets', async () => {
  const e={...items[0],title:'é'.repeat(90),description:'Comma, semi; back\\slash\nnew line',location:'Room, A; B\\C'};
  const text=await exporter.calendar([e],{now}),event=parse(text).getAllSubcomponents('vevent')[0];
  assert.equal(event.getFirstPropertyValue('description'),e.description);
  assert.equal(event.getFirstPropertyValue('location'),e.location);
  assert.equal(event.getFirstPropertyValue('summary'),e.title);
  assert(text.includes('\r\n ')); assert(!/(?<!\r)\n/.test(text));
  for(const line of text.split('\r\n')) assert(Buffer.byteLength(line)<=75);
  assert.equal(parse(text).getAllSubcomponents('vevent').length,1);
});
test('London daylight saving and GMT are exported as the correct UTC instants', () => {
  assert.equal(exporter.instant('2026-10-06T19:00','Europe/London'),'20261006T180000Z');
  assert.equal(exporter.instant('2026-11-03T19:00','Europe/London'),'20261103T190000Z');
  assert.equal(exporter.instant('2027-03-28T10:00','Europe/London'),'20270328T090000Z');
  assert.equal(exporter.instant('2027-10-31T10:00','Europe/London'),'20271031T100000Z');
  assert.throws(()=>exporter.instant('2027-03-28T01:30','Europe/London'));
});
test('subscription links preserve project paths and custom-domain deployment', () => {
  assert.equal(exporter.subscriptionURL('https://micklehamchurch.github.io/website/calendar.html?event=x'),'https://micklehamchurch.github.io/website/calendar.ics');
  assert.equal(exporter.subscriptionURL('https://www.micklehamchurch.org.uk/calendar.html'),'https://www.micklehamchurch.org.uk/calendar.ics');
});
test('generated feed excludes drafts and is valid CRLF output', async () => {
  assert.equal(parse(await exporter.calendar([{...items[0],status:'draft'}],{now})).getAllSubcomponents('vevent').length,0);
  assert.equal(parse(fs.readFileSync('calendar.ics','utf8')).getAllSubcomponents('vevent').length,116);
});
