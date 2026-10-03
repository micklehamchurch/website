const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseGoogleCalendar,fetchGoogleCalendar,MAX_BYTES,fingerprint}=require('../src/google-calendar-adapter');
const {reconcile}=require('../src/google-calendar-sync-model');
const root=path.resolve(__dirname,'../..');
const raw=fs.readFileSync(path.join(root,'_sync/fixtures/google-stage1.ics'),'utf8');
const initial=require('../../_sync/fixtures/website-before-stage1.json'),registry=require('../../_sync/fixtures/registry-before-stage1.json');
const {buildCalendar}=require('../src/calendar-model');
const feed=()=>parseGoogleCalendar(raw), baseline=()=>reconcile(initial,registry,feed());
test('representative Google fixture maps all 116 identities, two approved additions and exactly one time correction',()=>{
 const p=baseline();assert.equal(p.report.additions.length,2);assert.deepEqual(p.report.updates,[{title:'Compline in Church',date:'2026-11-24',fields:['end']}]);assert.equal(p.report.conflicts.length,0);assert.equal(p.report.unsupported.length,0);
 const items=buildCalendar(null,p.calendar).items;assert.equal(items.length,118);
 const at=(title,date)=>items.find(e=>e.title===title&&e.start.startsWith(date));
 assert.equal(at('Compline in Church','2026-11-24').end,'2026-11-24T20:00');assert.equal(at('Compline in Church','2026-11-24').id,initial.series[1].id+'@2026-11-17T19:00');assert(!at('Compline in Church','2026-11-17'));
 assert.equal(at('BCP Holy Communion at Westhumble Chapel','2026-10-11').start,'2026-10-11T08:00');assert.equal(at('BCP Holy Communion at Westhumble Chapel','2026-10-11').allDay,false);
 assert.equal(at('Parish Council meet in Ranmore Room','2027-03-10').end,'2027-03-10T20:30');assert.equal(at('7.30pm','2027-03-18').location,'');assert.equal(at('7.30pm','2027-03-18').category,undefined);
 assert(at('NO BCP service at Westhumble Chapel','2026-11-08'));assert(!at('BCP Holy Communion at Westhumble Chapel','2026-11-08'));
 assert.deepEqual(p.calendar.series,initial.series);assert.equal(items.filter(e=>e.title==='Compline in Church').length,30);
 assert.equal(at('Compline in Church','2026-10-06').end,'2026-10-06T20:00');assert.equal(at('Compline in Church','2026-10-20').end,'2026-10-20T19:30');assert(at('Holy Communion with Baptism','2026-11-22'));
 for(const old of buildCalendar(null,initial).items){const now=items.find(e=>e.id===old.id);assert(now);assert.equal(now.location,old.location);assert.equal(now.description,old.description);assert.equal(now.category,old.category);}
});
test('ICAL expansion preserves UTC/BST, exclusive all-day end, recurrence overrides and exclusions',()=>{
 const rows=feed().rows.map(e=>e.state);assert(rows.some(e=>e.title==='Wedding blessing in church'&&e.start==='2026-10-03T14:00'&&e.end==='2026-10-03T15:00'));
 assert(rows.some(e=>e.title==='Concert in church'&&e.allDay&&e.start==='2026-10-17T00:00'&&e.end==='2026-10-18T00:00'));
 assert(rows.some(e=>e.title==='Harvest Family Service'&&e.start==='2026-10-04T10:00'));assert(!rows.some(e=>e.title==='Compline in Church'&&e.start==='2026-11-17T19:00'));
 assert(rows.some(e=>e.title==='Compline in Church'&&e.start==='2027-06-01T19:00'));
});
test('ordering, DTSTAMP and update metadata do not create meaningful changes or a repeated reconciliation',()=>{
 const blocks=raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),header=raw.slice(0,raw.indexOf('BEGIN:VEVENT'));
 const reordered=header+blocks.reverse().join('\r\n')+'\r\nEND:VCALENDAR\r\n';assert.equal(parseGoogleCalendar(reordered).fingerprint,feed().fingerprint);
 assert.equal(parseGoogleCalendar(raw.replace(/DTSTAMP:[^\r\n]+/g,'DTSTAMP:20271001T000000Z')).fingerprint,feed().fingerprint);
 const p=baseline(),next=reconcile(p.calendar,p.registry,feed());assert.equal(next.calendarChanged,false);assert.equal(next.stateChanged,false);
});
test('local Admin changes and website-only events survive; conflicting same-field edits are held',()=>{
 const p=baseline(),calendar=structuredClone(p.calendar),f=feed();calendar.events[0].title='Local title';calendar.events.push({id:'local-only',title:'Admin event',start:'2026-12-02T10:00',end:'2026-12-02T11:00',timeZone:'Europe/London',location:'Church',status:'published'});
 let next=reconcile(calendar,p.registry,f);assert.equal(next.calendar.events[0].title,'Local title');assert(next.calendar.events.some(e=>e.id==='local-only'));
 const entry=p.registry.entries.find(e=>e.websiteId===calendar.events[0].id);f.rows.find(e=>e.key===entry.key).state.title='Google title';next=reconcile(calendar,p.registry,f);assert.equal(next.report.conflicts.length,1);assert.equal(next.calendar.events[0].title,'Local title');
 const localSaved=reconcile(calendar,p.registry,feed());const both=reconcile(localSaved.calendar,localSaved.registry,f);assert.equal(both.report.conflicts.length,1);assert.equal(both.calendar.events[0].title,'Local title');
});
test('Admin deletion becomes a durable tombstone and Google absence never removes local content',()=>{
 const p=baseline(),calendar=structuredClone(p.calendar);const deleted=calendar.events.shift();let next=reconcile(calendar,p.registry,feed());assert(next.registry.entries.find(e=>e.websiteId===deleted.id).suppressed);assert(!next.calendar.events.some(e=>e.id===deleted.id));next=reconcile(next.calendar,next.registry,feed());assert(!next.calendar.events.some(e=>e.id===deleted.id));
 const missing=feed();missing.rows=missing.rows.slice(20);next=reconcile(p.calendar,p.registry,missing);assert(next.report.missing.length>=20);assert(next.report.warnings.some(w=>w.includes('Large drop')));assert.deepEqual(next.calendar,p.calendar);
});
test('unexpected recurrence structure blocks application and unknown additions require approval',()=>{
 const p=baseline(),f=feed();f.series[0].rule+=';COUNT=5';const blocked=reconcile(p.calendar,p.registry,f);assert(blocked.blocked);assert.deepEqual(blocked.calendar,p.calendar);
 const fresh=feed();fresh.rows.push({key:'new-key',uid:'new@google.com',state:{title:'New event',start:'2027-01-01T10:00'}});assert.equal(reconcile(p.calendar,p.registry,fresh).report.unsupported.length,1);
});
test('malformed, empty, oversized, unbounded and unsupported feeds fail closed',async()=>{
 assert.throws(()=>parseGoogleCalendar(raw.replace(/BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE\r?\n/,'')), 'A prior request must not supply a missing timezone definition');
 for(const bad of ['','broken','BEGIN:VCALENDAR\r\nEND:VCALENDAR',raw.slice(0,-30),raw.replace('FREQ=MONTHLY','FREQ=YEARLY'),raw.replace('FREQ=MONTHLY','FREQ=MONTHLY;BYSETPOS=1'),raw.replace('Europe/London','America/New_York'),' '.repeat(MAX_BYTES+1)])assert.throws(()=>parseGoogleCalendar(bad));
 for(const fetchImpl of [async()=>{throw Error('private upstream error')},async()=>new Response('bad',{status:500}),async()=>new Response(raw,{headers:{'content-type':'text/calendar','content-length':String(MAX_BYTES+1)}}),async()=>new Response(' '.repeat(MAX_BYTES+1),{headers:{'content-type':'text/calendar'}})])await assert.rejects(fetchGoogleCalendar(fetchImpl));
});
