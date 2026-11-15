const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,request,principal,add,raw}=require('../testing/google-sync-fixture.cjs');
const {createGoogleSyncHandler,createGoogleSyncStatusHandler}=require('../src/google-calendar-sync');
const {parseGoogleCalendar,fetchGoogleCalendar,MAX_BYTES}=require('../src/google-calendar-adapter');
const {buildCalendar}=require('../src/calendar-model');
const items=f=>buildCalendar(null,f.state.calendar).items;
test('clean reconciled 118-event automatic checks persist status without a GitHub write or deployment',async()=>{
 const f=fixture();await f.service.automatic();assert.equal(items(f).length,118);assert.equal(f.state.writes.length,0);assert.equal(f.state.saved,1);assert.equal(f.state.runtime.lastAutomatic.unchanged,118);assert.equal(f.state.runtime.lastAutomatic.result,'up-to-date');assert.equal(f.state.runtime.lastAutomatic.headBefore,f.state.runtime.lastAutomatic.headAfter);
 f.state.at='2026-10-03T09:00:00Z';await f.service.automatic();assert.equal(f.state.writes.length,0);assert.equal(f.state.runtime.lastSuccessfulAutomatic,f.state.at);
});
test('unambiguous standalone additions auto-apply without guessing title/time/category or cancellation',async()=>{
 const f=fixture();add(f.state,{title:'NO parish meeting'});await f.service.automatic();const event=items(f).find(e=>e.title==='NO parish meeting');assert(event);assert.equal(event.location,'');assert.equal(event.category,undefined);assert.equal(f.state.writes.length,1);assert.equal(f.state.runtime.lastAutomatic.added,1);await f.service.automatic();assert.equal(f.state.writes.length,1);
});
test('an untitled event is reviewable by date while valid events continue, and a corrected title restores normal sync',async()=>{
 const f=fixture(), id='missing-title@example.test';
 const feed=(summary='')=>parseGoogleCalendar(raw.replace('END:VCALENDAR',[
   'BEGIN:VEVENT', 'UID:'+id, 'DTSTART;VALUE=DATE:20261231', 'DTEND;VALUE=DATE:20270101',
   ...(summary ? ['SUMMARY:'+summary] : []), 'END:VEVENT', 'END:VCALENDAR'
 ].join('\r\n')));
 f.state.feed=feed();
 assert.equal(f.state.feed.rows.length,118);
 assert.equal(f.state.feed.untitled.length,1);
 const check=await createGoogleSyncHandler(f.dependencies)(request());
 assert.deepEqual(check.jsonBody.report.unsupported,[{date:'2026-12-31',reason:'Title missing in Google Calendar. Add a title there before this event can sync.'}]);
 assert.equal(check.jsonBody.canApply,false);
 assert.equal(f.state.writes.length,0);
 add(f.state);
 await f.service.automatic();
 assert(items(f).some(e=>e.title==='Parish meeting'));
 assert(!f.state.registry.entries.some(e=>e.uid===id));
 assert.equal(f.state.runtime.lastAutomatic.needsReview.length,1);
 f.state.feed=feed('Corrected event');
 add(f.state);
 await f.service.automatic();
 assert(items(f).some(e=>e.title==='Corrected event' && e.start==='2026-12-31T00:00'));
 assert.deepEqual(f.state.runtime.lastAutomatic.needsReview,[]);
});
test('an untitled published Google event stays intact and clears missing evidence, then syncs its corrected title',async()=>{
 const f=fixture(), id='google-077f148d76d2421ec53b4324e19f0af5';
 const entry=f.state.registry.entries.find(e=>e.websiteId===id);
 const block=raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g).find(value=>value.includes('UID:'+entry.uid));
 const noTitle=block.replace(/SUMMARY:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*/,'SUMMARY:   ');
 assert.notEqual(noTitle,block);
 const before=structuredClone(items(f).find(e=>e.id===id));
 f.state.feed.rows=f.state.feed.rows.filter(row=>row.key!==entry.key);
 await f.service.automatic();
 assert.equal(f.state.runtime.observations[entry.key].count,1);
 f.state.feed=parseGoogleCalendar(raw.replace(block,noTitle));
 for(let hour=9;hour<=11;hour++){
   f.state.at=`2026-10-03T${hour.toString().padStart(2,'0')}:00:00Z`;
   await f.service.automatic();
   assert.deepEqual(items(f).find(e=>e.id===id),before);
   assert.equal(f.state.runtime.observations[entry.key],undefined);
   assert.deepEqual(f.state.runtime.lastAutomatic.needsReview,[{
     date:before.start.slice(0,10),reason:'Title missing in Google Calendar. The website event was kept. Add a title in Google Calendar.'
   }]);
 }
 assert.equal(f.state.writes.length,0);
 f.state.feed=parseGoogleCalendar(raw.replace(block,noTitle.replace('SUMMARY:   ','SUMMARY:Corrected published title')));
 await f.service.automatic();
 assert.deepEqual(items(f).find(e=>e.id===id),{...before,title:'Corrected published title'});
 assert.equal(f.state.writes.length,1);
});
test('untitled events still require a safe identity, dates and recurrence',()=>{
 const event=['BEGIN:VEVENT','UID:missing-title@example.test','DTSTART;VALUE=DATE:20261231','DTEND;VALUE=DATE:20270101','END:VEVENT'];
 for(const block of [
   event.filter(line=>!line.startsWith('UID')),
   event.filter(line=>!line.startsWith('DTEND')),
   event.map(line=>line.replace('20270101','20261230')),
   event.map(line=>line.replace('20261231','20261232')),
   [...event.slice(0,-1),'RRULE:FREQ=YEARLY','END:VEVENT'],
   [...event,...event]
 ]) assert.throws(()=>parseGoogleCalendar(raw.replace('END:VCALENDAR',block.join('\r\n')+'\r\nEND:VCALENDAR')));
});
test('an untitled moved recurring exception is excluded without changing the master or other occurrences',()=>{
 const block=[
   'BEGIN:VEVENT','UID:new-weekly@example.test','DTSTART:20261001T100000Z','DTEND:20261001T110000Z',
   'SUMMARY:Weekly meeting','RRULE:FREQ=WEEKLY;COUNT=2','END:VEVENT',
   'BEGIN:VEVENT','UID:new-weekly@example.test','RECURRENCE-ID:20261001T100000Z',
   'DTSTART:20260930T100000Z','DTEND:20260930T110000Z','END:VEVENT','END:VCALENDAR'
 ].join('\r\n');
 const feed=parseGoogleCalendar(raw.replace('END:VCALENDAR',block));
 assert.deepEqual(feed.rows.filter(row=>row.uid==='new-weekly@example.test').map(row=>row.state.start),['2026-10-08T11:00']);
 const key=JSON.stringify(['new-weekly@example.test','2026-10-01T11:00']);
 assert.deepEqual(feed.untitled,[{key,date:'2026-09-30',outside:true}]);
 assert(feed.outsideKeys.includes(key));
 assert.deepEqual(feed.series.find(row=>row.uid==='new-weekly@example.test'),{uid:'new-weekly@example.test',rule:'FREQ=WEEKLY;COUNT=2'});
});
test('new supported recurring UID imports bounded logical occurrences through the same adapter/engine',async()=>{
 const f=fixture();const block='BEGIN:VEVENT\r\nUID:new-series@google.com\r\nDTSTART;TZID=Europe/London:20261202T100000\r\nDTEND;TZID=Europe/London:20261202T110000\r\nSUMMARY:New weekly meeting\r\nRRULE:FREQ=WEEKLY;COUNT=2\r\nEND:VEVENT\r\n';f.state.feed=parseGoogleCalendar(raw.replace('END:VCALENDAR',block+'END:VCALENDAR'));await f.service.automatic();assert.equal(items(f).filter(e=>e.title==='New weekly meeting').length,2);assert(f.state.registry.series.some(s=>s.uid==='new-series@google.com'));assert.equal(f.state.writes.length,1);
});
test('safe Google-owned changes update; same-field conflicts are retained while unrelated safe additions apply',async()=>{
 const f=fixture();const event=f.state.calendar.events.find(e=>e.id==='google-077f148d76d2421ec53b4324e19f0af5'),entry=f.state.registry.entries.find(e=>e.websiteId===event.id);const row=f.state.feed.rows.find(r=>r.key===entry.key);row.state.title='Updated Google meeting';await f.service.automatic();assert.equal(items(f).find(e=>e.id===event.id).title,'Updated Google meeting');assert.equal(f.state.runtime.lastAutomatic.updated,1);
 f.state.calendar.events.find(e=>e.id===event.id).title='Local title';row.state.title='Competing Google title';add(f.state);f.state.at='2026-10-03T09:00:00Z';await f.service.automatic();assert.equal(items(f).find(e=>e.id===event.id).title,'Local title');assert(items(f).some(e=>e.title==='Parish meeting'));assert.equal(f.state.runtime.lastAutomatic.conflicts.length,1);assert.equal(f.state.runtime.lastAutomatic.result,'needs-review');
});
test('local Admin events, field overrides and blank-source enrichment survive without state-only Git commits',async()=>{
 const f=fixture();f.state.calendar.events[0].title='Local title';f.state.calendar.events.push({id:'admin-only',title:'Local event',start:'2026-12-30T10:00',end:'2026-12-30T11:00',location:'Church',timeZone:'Europe/London',status:'published'});await f.service.automatic();assert.equal(f.state.writes.length,0);assert(items(f).some(e=>e.id==='admin-only'));assert.equal(f.state.calendar.events[0].title,'Local title');const before=f.state.calendar.events[0].description;add(f.state);await f.service.automatic();assert.equal(f.state.calendar.events[0].description,before);assert.equal(f.state.calendar.events[0].title,'Local title');
});
test('local deletion stays suppressed across repeated runs and unrelated publication',async()=>{
 const f=fixture(),id=f.state.calendar.events[0].id;f.state.calendar.events.shift();await f.service.automatic();assert.equal(f.state.writes.length,0);add(f.state);await f.service.automatic();assert(!items(f).some(e=>e.id===id));assert(f.state.registry.entries.find(e=>e.websiteId===id).suppressed);await f.service.automatic();assert(!items(f).some(e=>e.id===id));
});
test('one and two hourly absences retain the import; third consecutive successful slot removes only a clean Google-owned import',async()=>{
 const f=fixture(),id='google-077f148d76d2421ec53b4324e19f0af5',entry=f.state.registry.entries.find(e=>e.websiteId===id);f.state.feed.rows=f.state.feed.rows.filter(r=>r.key!==entry.key);
 for(let hour=8;hour<=10;hour++){f.state.at=`2026-10-03T${hour.toString().padStart(2,'0')}:00:00Z`;await f.service.automatic();assert.equal(items(f).some(e=>e.id===id),hour<10);assert.equal(f.state.writes.length,hour<10?0:1);}
 assert.equal(f.state.runtime.lastAutomatic.removed,1);assert(f.state.registry.entries.find(e=>e.websiteId===id).suppressed);
});
test('repeated calls in one hour cannot accelerate missing confirmation; gaps and failures reset consecutive evidence',async()=>{
 const f=fixture(),entry=f.state.registry.entries.find(e=>e.websiteId==='google-077f148d76d2421ec53b4324e19f0af5');f.state.feed.rows=f.state.feed.rows.filter(r=>r.key!==entry.key);await f.service.automatic();await f.service.automatic();assert.equal(f.state.runtime.observations[entry.key].count,1);f.state.at='2026-10-03T10:00:00Z';await f.service.automatic();assert.equal(f.state.runtime.observations[entry.key].count,1);f.state.failure=Error('private fixture detail');await f.service.automatic();assert.deepEqual(f.state.runtime.observations,{});f.state.failure=null;f.state.at='2026-10-03T11:00:00Z';await f.service.automatic();assert.equal(f.state.runtime.observations[entry.key].count,1);assert.equal(f.state.writes.length,0);
});
test('confirmed absence of an older mapped website record or locally edited import requires review',async()=>{
 for(const local of [false,true]){const f=fixture(),event=local?f.state.calendar.events.find(e=>e.id.startsWith('google-')):f.state.calendar.events[0],entry=f.state.registry.entries.find(e=>e.websiteId===event.id);if(local)event.category='Local enrichment';f.state.feed.rows=f.state.feed.rows.filter(r=>r.key!==entry.key);for(let h=8;h<=10;h++){f.state.at=`2026-10-03T${h.toString().padStart(2,'0')}:00:00Z`;await f.service.automatic();}assert(items(f).some(e=>e.id===event.id));assert.equal(f.state.writes.length,0);assert.match(f.state.runtime.lastAutomatic.needsReview[0].reason,/require review/);}
});
test('mass absence, source count collapse, whole recurring-series disappearance and changed recurrence block all automatic writes',async()=>{
 for(const mode of ['mass','collapse','series','rule']){const f=fixture();add(f.state);if(mode==='mass')f.state.feed.rows=f.state.feed.rows.slice(10);if(mode==='collapse')f.state.runtime.lastValidatedCount=500;if(mode==='series'){const uid=f.state.registry.series[0].uid;f.state.feed.rows=f.state.feed.rows.filter(r=>r.uid!==uid);f.state.feed.series=f.state.feed.series.filter(s=>s.uid!==uid);}if(mode==='rule')f.state.feed.series[0].rule+=';COUNT=1';const before=structuredClone(f.state.calendar);await f.service.automatic();assert.equal(f.state.writes.length,0);assert.deepEqual(f.state.calendar,before);assert.equal(f.state.runtime.lastAutomatic.result,'needs-review');assert.deepEqual(f.state.runtime.observations,{});}
});
test('new occurrence in an already mapped UID or duplicate website representation is held for review',async()=>{
 for(const duplicate of [false,true]){const f=fixture();const r=f.state.feed.rows[0];add(f.state,duplicate?{title:r.state.title,start:r.state.start,end:r.state.end}:{uid:r.uid,recurrenceId:'2027-12-25T10:00'});await f.service.automatic();assert.equal(f.state.writes.length,0);assert.equal(f.state.runtime.lastAutomatic.needsReview.length,1);}
});
test('empty, transport, timeout, malformed, oversized and critical unsupported feeds retain the published Calendar and record safe failure',async()=>{
 for(const kind of ['empty','HTTP failure','timeout','malformed','oversized','unsupported']){const f=fixture(),before=structuredClone(f.state.calendar);if(kind==='empty')f.state.feed.rows=[];else f.state.failure=Object.assign(Error('private upstream fixture detail'),{name:kind==='timeout'?'AbortError':'Error'});await f.service.automatic();assert.equal(f.state.writes.length,0);assert.deepEqual(f.state.calendar,before);assert.equal(f.state.runtime.lastAutomatic.result,'failed');assert(!JSON.stringify(f.state.runtime).includes('private upstream'));}
 assert.throws(()=>parseGoogleCalendar(raw.replace('FREQ=MONTHLY','FREQ=YEARLY')));assert.throws(()=>parseGoogleCalendar('broken'));await assert.rejects(fetchGoogleCalendar(async()=>new Response('',{status:503})));await assert.rejects(fetchGoogleCalendar(async()=>{throw Object.assign(Error('fixture'),{name:'AbortError'})}));await assert.rejects(fetchGoogleCalendar(async()=>new Response(' '.repeat(MAX_BYTES+1),{headers:{'content-type':'text/calendar'}})));
});
test('reordered and timestamp-only Google source changes create no automatic commit',async()=>{
 const f=fixture();const blocks=raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),header=raw.slice(0,raw.indexOf('BEGIN:VEVENT'));f.state.feed=parseGoogleCalendar(header+blocks.reverse().join('\r\n')+'\r\nEND:VCALENDAR\r\n');await f.service.automatic();f.state.feed=parseGoogleCalendar(raw.replace(/DTSTAMP:[^\r\n]+/g,'DTSTAMP:20271001T000000Z'));await f.service.automatic();assert.equal(f.state.writes.length,0);assert.equal(f.state.runtime.lastAutomatic.unchanged,118);
});
test('concurrent Dev editor at either ref check aborts publication; busy or lost storage lease prevents publication',async()=>{
 for(const option of [{race:true},{earlyRace:true},{lostLease:true},{busy:true}]){const f=fixture(option);add(f.state);const before=structuredClone(f.state.calendar);await f.service.automatic();assert.equal(f.state.writes.length,0);assert.deepEqual(f.state.calendar,before);if(option.race||option.earlyRace)assert.equal(f.state.runtime.lastAutomatic.result,'concurrent-change');}
});
test('status storage failure after a successful publication does not falsely persist a failed or unchanged Calendar result',async()=>{
 const f=fixture({failSaveAfterPublication:true});add(f.state);await assert.rejects(f.service.automatic());assert.equal(f.state.writes.length,1);assert.equal(items(f).length,119);assert.equal(f.state.saved,0);assert.equal(f.state.runtime.lastAutomatic,null);assert.equal(f.state.registry.audit.mode,'automatic');
});
test('all five approved special mappings and bounded Compline identities survive automatic no-op',async()=>{
 const f=fixture(),before=items(f);await f.service.automatic();assert.deepEqual(items(f),before);const at=(date,title)=>items(f).find(e=>e.start.startsWith(date)&&e.title===title);assert.equal(at('2026-10-11','BCP Holy Communion at Westhumble Chapel').start,'2026-10-11T08:00');assert(at('2026-11-08','NO BCP service at Westhumble Chapel'));assert(!at('2026-11-08','BCP Holy Communion at Westhumble Chapel'));assert.equal(at('2026-11-24','Compline in Church').end,'2026-11-24T20:00');assert(!at('2026-11-17','Compline in Church'));assert.equal(at('2027-03-10','Parish Council meet in Ranmore Room').start,'2027-03-10T19:30');assert.equal(at('2027-03-18','7.30pm').end,'2027-03-18T20:30');assert(items(f).filter(e=>e.title==='Compline in Church').every(e=>e.start.slice(0,10)<='2027-12-31'));
});
test('a Google import moved beyond the publication horizon is retained for review rather than deleted',async()=>{
 const f=fixture(),id='google-077f148d76d2421ec53b4324e19f0af5',entry=f.state.registry.entries.find(e=>e.websiteId===id);
 f.state.feed.rows=f.state.feed.rows.filter(r=>r.key!==entry.key);f.state.feed.outsideKeys=[entry.key];
 for(let h=8;h<=10;h++){f.state.at=`2026-10-03T${h.toString().padStart(2,'0')}:00:00Z`;await f.service.automatic();}
 assert(items(f).some(e=>e.id===id));assert.equal(f.state.writes.length,0);assert.match(f.state.runtime.lastAutomatic.needsReview[0].reason,/horizon/);
});
test('the deployed timer invokes the shared synchronization service and never logs exception details',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');const code=fs.readFileSync(require.resolve('../src/functions/google-calendar-timer'),'utf8');
 const registrations=[],logs=[];let called=0,fail=false;
 vm.runInNewContext(code,{require:name=>name==='@azure/functions'?{app:{timer:(name,options)=>registrations.push({name,options}),http:()=>{}}}:name==='../google-sync-service'?{SCHEDULE:'0 */15 * * * *',createGoogleSyncService:()=>({automatic:async()=>{called++;if(fail)throw Error('private fixture credential');return{lastAutomatic:{result:'up-to-date'}};}})}:{createGoogleSyncStatusHandler:()=>()=>{}}});
 const timer=registrations[0];assert.equal(timer.options.schedule,'0 */15 * * * *');await timer.options.handler({}, {log:(...x)=>logs.push(x),error:(...x)=>logs.push(x)});assert.equal(called,1);fail=true;await timer.options.handler({}, {log:(...x)=>logs.push(x),error:(...x)=>logs.push(x)});assert.equal(called,2);assert(!JSON.stringify(logs).includes('private fixture'));
});
test('administrator-only status performs no Google request; manual dry-run and confirmed apply share automatic reconciliation',async()=>{
 const f=fixture();await f.service.automatic();const status=createGoogleSyncStatusHandler(f.dependencies);assert.equal((await status(request())).jsonBody.lastAutomatic.unchanged,118);assert.equal((await status(request('GET',null,null))).status,401);const wrong=structuredClone(principal);wrong.claims.find(c=>c.typ==='sub').val+='x';assert.equal((await status(request('GET',null,wrong))).status,403);
 add(f.state);const handler=createGoogleSyncHandler(f.dependencies);const check=await handler(request());assert.equal(check.jsonBody.report.additions.length,1);assert.equal(f.state.writes.length,0);const r=check.jsonBody;assert.equal((await handler(request('POST',{headSha:r.headSha,calendarSha:r.calendarSha,registrySha:r.registrySha,reviewDigest:r.reviewDigest,confirm:true}))).status,200);assert.equal(f.state.writes.length,1);
});

test('quarter-hour checks remain no-ops and cannot accelerate hourly deletion evidence',async()=>{
 const unchanged=fixture();
 for(const minute of ['00','15','30','45']){unchanged.state.at=`2026-10-03T08:${minute}:00Z`;await unchanged.service.automatic();}
 assert.equal(unchanged.state.writes.length,0);
 assert.equal(unchanged.state.runtime.lastAutomatic.calendarChanged,false);
 const missing=fixture(),entry=missing.state.registry.entries.find(e=>e.websiteId==='google-077f148d76d2421ec53b4324e19f0af5');
 missing.state.feed.rows=missing.state.feed.rows.filter(r=>r.key!==entry.key);
 for(const minute of ['00','15','30','45']){missing.state.at=`2026-10-03T08:${minute}:00Z`;await missing.service.automatic();assert.equal(missing.state.runtime.observations[entry.key].count,1);}
 assert.equal(missing.state.writes.length,0);
});
