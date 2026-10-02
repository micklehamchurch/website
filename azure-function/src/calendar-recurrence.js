// Shared civil-date recurrence engine. UTC Date objects are date-arithmetic
// containers only; church wall times are never advanced as UTC instants.
const DAY = 86400000;
const LIMITS = Object.freeze({ series: 100, exceptions: 1000, occurrences: 10000, count: 2000, years: 10 });
const fail = () => { throw new Error('Invalid recurrence rule or exception.'); };
const object = v => v && typeof v === 'object' && !Array.isArray(v);
function keys(v, required, optional = []) {
  if (!object(v) || required.some(k => !Object.hasOwn(v,k)) || Object.keys(v).some(k => !required.includes(k) && !optional.includes(k))) fail();
}
function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail();
  const n = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10) !== value || value < '2000-01-01' || value > '2100-12-31') fail();
  return n;
}
function local(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) fail();
  const day = dateNumber(value.slice(0,10)), parts = value.slice(11).split(':').map(Number);
  if (parts[0] > 23 || parts[1] > 59 || (parts[2] || 0) > 59) fail();
  return day + ((parts[0]*60+parts[1])*60+(parts[2]||0))*1000;
}
const londonClock = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function wallTimeExists(value) {
  // Only 01:xx can fall in the UK spring clock-change gap. Autumn's repeated
  // wall time remains one occurrence, with its original civil-date identity.
  if(value.slice(11,13)!=='01')return true;
  const n=local(value),expected=value.length===16?value+':00':value;
  return [n-3600000,n,n+3600000].some(candidate=>{const p=Object.fromEntries(londonClock.formatToParts(new Date(candidate)).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second===expected});
}
const iso = n => new Date(n).toISOString().slice(0,10);
const occurrenceId = (id,start) => `${id}@${start}`;
function defaultRange(now = new Date()) {
  const year = now.getUTCFullYear();
  return { from: `${year-1}-01-01`, to: `${year+2}-12-31` };
}
function validateRule(series) {
  if (!object(series) || typeof series.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(series.id) || series.id.length > 120 || series.timeZone !== 'Europe/London') fail();
  const start = local(series.start), end = local(series.end);
  if (end <= start || end-start > 7*DAY || (series.allDay !== undefined && typeof series.allDay !== 'boolean')) fail();
  if (series.allDay && (!/T00:00(?::00)?$/.test(series.start) || !/T00:00(?::00)?$/.test(series.end))) fail();
  const r=series.recurrence;
  keys(r,['frequency','interval','end'],['weekdays','dayOfMonth','ordinal','weekday']);
  if (!['daily','weekly','monthly'].includes(r.frequency) || !Number.isInteger(r.interval) || r.interval < 1 || r.interval > 52) fail();
  if (r.frequency==='weekly') {
    if (!Array.isArray(r.weekdays) || !r.weekdays.length || r.weekdays.length>7 || new Set(r.weekdays).size!==r.weekdays.length || r.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6) || ['dayOfMonth','ordinal','weekday'].some(k=>Object.hasOwn(r,k))) fail();
  } else if (r.frequency==='monthly') {
    if (Object.hasOwn(r,'weekdays')) fail();
    if (Object.hasOwn(r,'dayOfMonth')) { if (!Number.isInteger(r.dayOfMonth)||r.dayOfMonth<1||r.dayOfMonth>31||Object.hasOwn(r,'ordinal')||Object.hasOwn(r,'weekday')) fail(); }
    else if (![1,2,3,4,-1].includes(r.ordinal)||!Number.isInteger(r.weekday)||r.weekday<0||r.weekday>6) fail();
  } else if (['weekdays','dayOfMonth','ordinal','weekday'].some(k=>Object.hasOwn(r,k))) fail();
  keys(r.end,['type'],['until','count']);
  if(r.end.type==='date') { if(Object.hasOwn(r.end,'count'))fail();const until=dateNumber(r.end.until);if(until<dateNumber(series.start.slice(0,10))||until-dateNumber(series.start.slice(0,10))>366*LIMITS.years*DAY)fail(); }
  else if(r.end.type==='count') { if(Object.hasOwn(r.end,'until')||!Number.isInteger(r.end.count)||r.end.count<1||r.end.count>LIMITS.count)fail(); }
  else if(r.end.type!=='never'||Object.keys(r.end).length!==1)fail();
}
function matches(series,n) {
  const anchor=dateNumber(series.start.slice(0,10)),r=series.recurrence,date=new Date(n),a=new Date(anchor),days=(n-anchor)/DAY;
  if(days<0)return false;
  if(r.frequency==='daily')return days%r.interval===0;
  if(r.frequency==='weekly') { const monday=anchor-((a.getUTCDay()+6)%7)*DAY;return Math.floor((n-monday)/(7*DAY))%r.interval===0&&r.weekdays.includes(date.getUTCDay()); }
  const months=(date.getUTCFullYear()-a.getUTCFullYear())*12+date.getUTCMonth()-a.getUTCMonth();
  if(months%r.interval!==0)return false;
  if(r.dayOfMonth)return date.getUTCDate()===r.dayOfMonth;
  if(date.getUTCDay()!==r.weekday)return false;
  return r.ordinal===-1 ? new Date(n+7*DAY).getUTCMonth()!==date.getUTCMonth() : Math.floor((date.getUTCDate()-1)/7)+1===r.ordinal;
}
function starts(series, to, { requireComplete = false, from = series.start.slice(0,10) } = {}) {
  validateRule(series);
  const r=series.recurrence,anchor=dateNumber(series.start.slice(0,10));
  const limit = r.end.type==='date'?Math.min(dateNumber(r.end.until),dateNumber(to)):dateNumber(to);
  const values=[];let count=0;
  for(let n=anchor;n<=limit;n+=DAY)if(matches(series,n)) {
    const start=iso(n)+series.start.slice(10),end=new Date(local(start)+local(series.end)-local(series.start)).toISOString().slice(0,series.end.length);
    if(!series.allDay&&(!wallTimeExists(start)||!wallTimeExists(end)))continue;
    count++; if(r.end.type==='count' && count>r.end.count)break;
    if(requireComplete && count>LIMITS.count)fail();
    if(iso(n)<from)continue;
    if(values.length>=LIMITS.occurrences)fail();
    values.push(iso(n)+series.start.slice(10));
  }
  if(requireComplete && !values.length)fail();
  if(requireComplete && r.end.type==='count' && count<r.end.count)fail();
  return values;
}
function targetExists(series,start) {
  local(start);if(start.slice(10)!==series.start.slice(10))return false;
  return starts(series,start.slice(0,10),{from:start.slice(0,10)}).includes(start);
}
function expandSeries(series,exceptions=[],{range=defaultRange(),includeDrafts=false}={}) {
  const from=dateNumber(range.from),to=dateNumber(range.to);if(to<from||to-from>366*4*DAY)fail();
  const byTarget=new Map(exceptions.filter(e=>e.seriesId===series.id).map(e=>[e.occurrenceStart,e]));
  const duration=local(series.end)-local(series.start),out=[];
  for(const start of starts(series,range.to,{from:range.from})) {
    const exception=byTarget.get(start);
    if(exception?.cancelled)continue;
    const n=local(start),end=new Date(n+duration).toISOString().slice(0,series.end.length);
    const {recurrence,...fields}=series;
    const event={...fields,id:occurrenceId(series.id,start),start,end,...exception?.changes,seriesId:series.id,occurrenceStart:start};
    // A moved exception is visible in its new date range; the original target remains stable.
    if(event.start.slice(0,10)<range.from||event.start.slice(0,10)>range.to||(!includeDrafts&&event.status==='draft'))continue;
    out.push(event);
  }
  // Exceptions moved into this range from later than its upper bound.
  for(const e of byTarget.values())if((e.occurrenceStart.slice(0,10)>range.to||e.occurrenceStart.slice(0,10)<range.from)&&!e.cancelled&&e.changes?.start&&e.changes.start.slice(0,10)>=range.from&&e.changes.start.slice(0,10)<=range.to){const {recurrence,...fields}=series;if(!includeDrafts&&(e.changes?.status||series.status)==='draft')continue;out.push({...fields,id:occurrenceId(series.id,e.occurrenceStart),start:e.occurrenceStart,end:new Date(local(e.occurrenceStart)+duration).toISOString().slice(0,series.end.length),...e.changes,seriesId:series.id,occurrenceStart:e.occurrenceStart})}
  return out;
}
function validateCollections(series,exceptions,validateEvent) {
  if(!Array.isArray(series)||series.length>LIMITS.series||!Array.isArray(exceptions)||exceptions.length>LIMITS.exceptions)fail();
  const ids=new Map();
  for(const s of series){if(ids.has(s.id))fail();ids.set(s.id,s);const {recurrence,...event}=s;validateEvent(event);validateRule(s);
    if(s.recurrence.end.type!=='never')starts(s,s.recurrence.end.type==='date'?s.recurrence.end.until:iso(Math.min(dateNumber('2100-12-31'),dateNumber(s.start.slice(0,10))+3652*DAY)),{requireComplete:true});
  }
  const targets=new Set();
  for(const e of exceptions){keys(e,['seriesId','occurrenceStart'],['cancelled','changes']);const s=ids.get(e.seriesId);if(!s||!targetExists(s,e.occurrenceStart))fail();const id=occurrenceId(e.seriesId,e.occurrenceStart);if(targets.has(id))fail();targets.add(id);
    if(e.cancelled===true){if(Object.hasOwn(e,'changes'))fail();}
    else{if(Object.hasOwn(e,'cancelled')||!object(e.changes)||!Object.keys(e.changes).length||['id','uid','seriesId','recurrence','timeZone','occurrenceStart'].some(k=>Object.hasOwn(e.changes,k)))fail();const {recurrence,...event}=s;const end=new Date(local(e.occurrenceStart)+local(s.end)-local(s.start)).toISOString().slice(0,s.end.length);const changed={...event,start:e.occurrenceStart,end,...e.changes};validateEvent(changed);if(!changed.allDay&&(!wallTimeExists(changed.start)||!wallTimeExists(changed.end)))fail();}
  }
}
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function summary(series) {
  const r=series.recurrence,unit=r.frequency==='daily'?'day':r.frequency==='weekly'?'week':'month';
  const interval=r.interval===1?`every ${unit}`:`every ${r.interval} ${unit}s`;
  let pattern=r.frequency==='weekly'?`${interval} on ${r.weekdays.map(d=>weekdays[d]).join(', ')}`:r.frequency==='monthly'?`${interval} on ${r.dayOfMonth?`day ${r.dayOfMonth}`:`the ${{1:'first',2:'second',3:'third',4:'fourth','-1':'last'}[r.ordinal]} ${weekdays[r.weekday]}`}`:interval;
  const ending=r.end.type==='date'?`Until ${r.end.until}`:r.end.type==='count'?`${r.end.count} occurrences`:'No end date; only a bounded calendar window is displayed';
  return `Repeats ${pattern}. ${series.allDay?'All day':series.start.slice(11,16)+'–'+series.end.slice(11,16)} (Europe/London). ${ending}.`;
}
module.exports={LIMITS,dateNumber,local,occurrenceId,defaultRange,validateRule,validateCollections,expandSeries,starts,targetExists,summary,wallTimeExists};
