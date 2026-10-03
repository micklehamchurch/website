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
 vm.runInNewContext(code,{require:name=>name==='@azure/functions'?{app:{timer:(name,options)=>registrations.push({name,options}),http:()=>{}}}:name==='../google-sync-service'?{SCHEDULE:'0 0 * * * *',createGoogleSyncService:()=>({automatic:async()=>{called++;if(fail)throw Error('private fixture credential');return{lastAutomatic:{result:'up-to-date'}};}})}:{createGoogleSyncStatusHandler:()=>()=>{}}});
 const timer=registrations[0];assert.equal(timer.options.schedule,'0 0 * * * *');await timer.options.handler({}, {log:(...x)=>logs.push(x),error:(...x)=>logs.push(x)});assert.equal(called,1);fail=true;await timer.options.handler({}, {log:(...x)=>logs.push(x),error:(...x)=>logs.push(x)});assert.equal(called,2);assert(!JSON.stringify(logs).includes('private fixture'));
});
test('administrator-only status performs no Google request; manual dry-run and confirmed apply share automatic reconciliation',async()=>{
 const f=fixture();await f.service.automatic();const status=createGoogleSyncStatusHandler(f.dependencies);assert.equal((await status(request())).jsonBody.lastAutomatic.unchanged,118);assert.equal((await status(request('GET',null,null))).status,401);const wrong=structuredClone(principal);wrong.claims.find(c=>c.typ==='sub').val+='x';assert.equal((await status(request('GET',null,wrong))).status,403);
 add(f.state);const handler=createGoogleSyncHandler(f.dependencies);const check=await handler(request());assert.equal(check.jsonBody.report.additions.length,1);assert.equal(f.state.writes.length,0);const r=check.jsonBody;assert.equal((await handler(request('POST',{headSha:r.headSha,calendarSha:r.calendarSha,registrySha:r.registrySha,reviewDigest:r.reviewDigest,confirm:true}))).status,200);assert.equal(f.state.writes.length,1);
});
