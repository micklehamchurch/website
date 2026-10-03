const { buildCalendar } = require('./calendar-model');
const { SOURCE, HORIZON, fingerprint } = require('./google-calendar-adapter');
const FIELDS = ['title','start','end','allDay','location','description'];
const state = event => Object.fromEntries(FIELDS.map(field => [field, event[field] ?? (field === 'allDay' ? false : '')]));
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function validateRegistry(registry) {
  if (!registry || registry.version !== 1 || registry.source !== SOURCE || !equal(registry.horizon,HORIZON) || !Array.isArray(registry.entries) || registry.entries.length > 1000) throw new Error('invalid-sync-registry');
  const keys = new Set(), ids = new Set();
  for (const e of registry.entries) {
    if (typeof e.key !== 'string' || !e.uid || e.key !== JSON.stringify([e.uid,e.recurrenceId || '']) || keys.has(e.key) || typeof e.websiteId !== 'string' || ids.has(e.websiteId) || !e.google || !e.localOverrides || !Array.isArray(e.conflicts) || typeof e.suppressed !== 'boolean') throw new Error('invalid-sync-registry');
    keys.add(e.key); ids.add(e.websiteId);
    if (!/^[a-f0-9]{64}$/.test(e.fingerprint) || FIELDS.some(f=>typeof e.google[f] !== (f==='allDay'?'boolean':'string')) || (e.website && FIELDS.some(f=>typeof e.website[f] !== (f==='allDay'?'boolean':'string')))) throw new Error('invalid-sync-registry');
    if (Object.keys(e.localOverrides).some(f=>!FIELDS.includes(f))) throw new Error('invalid-sync-registry');
  }
}
function put(calendar, target, changes) {
  const oneoff = calendar.events.find(e=>e.id===target.id);
  if (oneoff) { Object.assign(oneoff, changes); return; }
  if (!target.seriesId || !target.occurrenceStart) throw new Error('invalid-mapped-target');
  calendar.exceptions ||= [];
  let exception = calendar.exceptions.find(e=>e.seriesId===target.seriesId&&e.occurrenceStart===target.occurrenceStart);
  if (!exception) { exception = {seriesId:target.seriesId,occurrenceStart:target.occurrenceStart,changes:{}}; calendar.exceptions.push(exception); }
  if (exception.cancelled) throw new Error('suppressed-target');
  Object.assign(exception.changes,changes);
}
function reconcile(calendar, registry, feed, { stage2 = false, observations = {}, previousCount = null } = {}) {
  validateRegistry(registry);
  const next = structuredClone(calendar), nextRegistry = structuredClone(registry);
  const targets = new Map(buildCalendar(null,calendar,{includeDrafts:true,range:HORIZON}).items.map(e=>[e.id,e]));
  const source = new Map(feed.rows.map(e=>[e.key,e]));
  const report = { additions:[], updates:[], removals:[], missing:[], conflicts:[], unchanged:[], suppressed:[], unsupported:[], warnings:[] };
  for (const entry of nextRegistry.entries) {
    const row = source.get(entry.key), target = targets.get(entry.websiteId);
    const label = { title: target?.title || row?.state.title || entry.google.title, date: target?.start.slice(0,10) || entry.google.start.slice(0,10) };
    if (entry.suppressed || (!target && !entry.approvedAddition)) {
      entry.suppressed = true; report.suppressed.push(label); continue;
    }
    if (!row) {
      const count = stage2 ? observations[entry.key]?.count || 0 : (entry.missingChecks || 0) + 1;
      if (!stage2) entry.missingChecks = count;
      // Only clean, wholly Google-owned imports have a provably safe deletion.
      // Existing bounded website series/one-offs and local enrichment need review.
      const current = target && state(target);
      const outsideHorizon = feed.outsideKeys?.includes(entry.key);
      const fullyGoogleOwned = !outsideHorizon && /^google-[a-f0-9]{32}$/.test(entry.websiteId) && !target?.seriesId && !Object.keys(entry.localOverrides).length && equal(current, entry.website) && Object.keys(target || {}).every(k => ['id', ...FIELDS, 'timeZone', 'status'].includes(k)) && target.status === 'published';
      if (stage2 && count >= 3 && fullyGoogleOwned) {
        next.events = next.events.filter(e => e.id !== entry.websiteId);
        entry.suppressed = true; entry.removalSource = 'confirmed-google-absence';
        report.removals.push(label);
      } else report.missing.push({ ...label, ...(stage2 ? { checks: count, reason: outsideHorizon ? 'Google moved this event outside the approved publication horizon — review required.' : count >= 3 ? 'Confirmed missing — existing website representation or local edits require review.' : 'Awaiting three consecutive successful hourly checks; retained.' } : {}) });
      continue;
    }
    entry.missingChecks=0;
    if (!target) {
      const id = 'google-' + fingerprint(entry.key).slice(0,32);
      if (!entry.approvedAddition || entry.websiteId !== id) throw new Error('invalid-approved-addition');
      const event = {id,...row.state,timeZone:'Europe/London',status:'published'};
      next.events.push(event); entry.website=state(event); entry.google=structuredClone(row.state); entry.fingerprint=row.fingerprint; entry.approvedAddition=false;
      report.additions.push(label); continue;
    }
    const current = state(target), changes = {}; entry.conflicts=[];
    for (const field of FIELDS) {
      const incoming = row.state[field], previous = entry.google[field];
      const localChanged = !equal(current[field],entry.website[field]);
      const googleChanged = !equal(incoming,previous);
      if (Object.hasOwn(entry.localOverrides,field)) { if (googleChanged && !equal(current[field],incoming)) entry.conflicts.push(field); else entry.localOverrides[field]=current[field]; continue; }
      if (['location','description'].includes(field) && !incoming && current[field]) continue;
      if (googleChanged && localChanged && !equal(current[field],incoming)) { entry.conflicts.push(field); continue; }
      if (googleChanged && !equal(current[field],incoming)) changes[field]=incoming;
      else if (localChanged && !googleChanged) entry.localOverrides[field]=current[field];
    }
    if (entry.initialUpdate) {
      for (const [field,value] of Object.entries(entry.initialUpdate)) {
        if (!equal(current[field],entry.website[field]) || !equal(row.state[field],value)) entry.conflicts.push(field);
        else changes[field]=value;
      }
      if (!entry.conflicts.length) delete entry.initialUpdate;
    }
    // A conflicting record is never partially rewritten.
    if (entry.conflicts.length) { report.conflicts.push({...label,fields:entry.conflicts}); continue; }
    if (Object.keys(changes).length) { put(next,target,changes); report.updates.push({...label,fields:Object.keys(changes)}); }
    else report.unchanged.push(label);
    entry.google=structuredClone(row.state); entry.website={...current,...changes}; entry.fingerprint=row.fingerprint;
  }
  const mapped = new Set(registry.entries.map(e=>e.key));
  const knownUids = new Set(registry.entries.map(e => e.uid));
  for (const row of feed.rows) if (!mapped.has(row.key)) {
    const label = { title:row.state.title,date:row.state.start.slice(0,10) };
    const ambiguous = knownUids.has(row.uid) || [...targets.values()].some(e => e.title === row.state.title && e.start === row.state.start && e.end === row.state.end && !!e.allDay === row.state.allDay);
    if (!stage2 || ambiguous) { report.unsupported.push({...label,reason:ambiguous?'Changed mapped recurrence or duplicate representation requires review.':'New Google event requires approval before import.'}); continue; }
    const id = 'google-' + fingerprint(row.key).slice(0,32);
    if (targets.has(id) || nextRegistry.entries.some(e=>e.websiteId===id)) throw Error('ambiguous-google-addition');
    const event = {id,...row.state,timeZone:'Europe/London',status:'published'};
    next.events.push(event);
    nextRegistry.entries.push({key:row.key,uid:row.uid,recurrenceId:row.recurrenceId || '',websiteId:id,google:structuredClone(row.state),website:state(event),fingerprint:row.fingerprint,localOverrides:{},conflicts:[],suppressed:false,missingChecks:0});
    report.additions.push(label);
  }
  const absent = report.missing.length + report.removals.length;
  if (report.missing.length) report.warnings.push(stage2?'Missing Google records are retained until the conservative threshold and ownership checks pass.':'Google records are missing. No removals will be applied in Stage 1.');
  const largeDrop = absent > 3 || absent > registry.entries.length * .05 || (previousCount != null && feed.rows.length < previousCount * .8);
  if (largeDrop) report.warnings.push('Large drop in mapped Google events: review the source before applying updates.');
  const mappedUids=new Set(registry.entries.map(e=>e.uid)), currentSeries=feed.series.filter(s=>mappedUids.has(s.uid));
  if (registry.series && !equal(registry.series,currentSeries)) report.warnings.push('Google recurrence structure changed. Review is required; no updates will be applied.');
  const structuralChange = !!registry.series && !equal(registry.series,currentSeries);
  if (structuralChange || (stage2 && largeDrop)) return {calendar,registry,report,calendarChanged:false,stateChanged:false,blocked:true};
  if (stage2) {
    const allUids = new Set(nextRegistry.entries.map(e=>e.uid));
    nextRegistry.series = feed.series.filter(s=>allUids.has(s.uid));
    validateRegistry(nextRegistry);
  }
  buildCalendar(null,next,{includeDrafts:true,range:HORIZON});
  const calendarChanged=!equal(next,calendar), stateChanged=!equal(nextRegistry,registry);
  return {calendar:next,registry:nextRegistry,report,calendarChanged,stateChanged,blocked:false};
}
module.exports={ FIELDS,state,validateRegistry,reconcile };
