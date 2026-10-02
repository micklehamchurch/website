import recurrence from '../azure-function/src/calendar-recurrence.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function controls(series = null) {
 const r=series?.recurrence,weekday=series?.start?new Date(series.start.slice(0,10)+'T00:00:00Z').getUTCDay():0;
 const select=(label,name,values,value)=>`<div class="admin-field"><label for="rec-${name}">${label}</label><select id="rec-${name}" name="${name}">${values.map(([id,text])=>`<option value="${id}" ${String(value)===String(id)?'selected':''}>${text}</option>`).join('')}</select></div>`;
 return `<fieldset class="admin-recurrence-controls"><legend>Repeat</legend><div class="admin-form-grid">${select('Repeat','repeat',[['none','Does not repeat'],['daily','Daily'],['weekly','Weekly'],['fortnightly','Every 2 weeks'],['monthly','Monthly'],['custom','Custom']],r?'custom':'none')}
 <div data-repeat-settings class="admin-field full"><div class="admin-form-grid"><div data-repeat-custom class="admin-field full"><div class="admin-form-grid">${select('Repeat pattern','frequency',[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']],r?.frequency||'weekly')}<div class="admin-field"><label for="rec-interval">Every how many days / weeks / months?</label><input id="rec-interval" name="interval" type="number" min="1" max="52" value="${r?.interval||1}"></div></div><div data-repeat-weekdays><p>On these weekdays</p>${days.map((d,i)=>`<label class="admin-repeat-weekday"><input type="checkbox" name="weekday${i}" value="${i}" ${(r?.weekdays||[weekday]).includes(i)?'checked':''}> ${d}</label>`).join('')}</div><div data-repeat-monthly class="admin-form-grid">${select('Monthly pattern','monthMode',[['date','Day of month'],['ordinal','Ordinal weekday']],r?.ordinal?'ordinal':'date')}<div data-repeat-date class="admin-field"><label for="rec-day">Day of month</label><input id="rec-day" name="dayOfMonth" type="number" min="1" max="31" value="${r?.dayOfMonth||Number(series?.start?.slice(8,10))||1}"></div><div data-repeat-ordinal class="admin-form-grid">${select('Which week','ordinal',[[1,'First'],[2,'Second'],[3,'Third'],[4,'Fourth'],[-1,'Last']],r?.ordinal||1)}${select('Weekday','weekday',days.map((d,i)=>[i,d]),r?.weekday??weekday)}</div></div></div>
 ${select('Ends','ends',[['date','On date'],['count','After number of occurrences'],['never','Never']],r?.end.type||'date')}<div data-repeat-until class="admin-field"><label for="rec-until">Last date (inclusive)</label><input id="rec-until" name="until" type="date" value="${esc(r?.end.until||'')}"></div><div data-repeat-count class="admin-field"><label for="rec-count">Number of occurrences</label><input id="rec-count" name="count" type="number" min="1" max="2000" value="${r?.end.count||12}"></div></div><p>Never-ending rules are displayed within a bounded window. Dates such as the 31st skip months without that day. A time in the spring clock-change gap is skipped; the repeated autumn clock time appears once. Finite schedules must fit within ten years and 2,000 occurrences. This and future events is not available yet.</p></div></div><p id="admin-recurrence-summary" role="status"></p></fieldset>`;
}
function read(values) {
 if(!values.repeat||values.repeat==='none')return null;
 const frequency=values.repeat==='custom'?values.frequency:values.repeat==='fortnightly'?'weekly':values.repeat;
 const rule={frequency,interval:values.repeat==='custom'?Number(values.interval):values.repeat==='fortnightly'?2:1,end:values.ends==='count'?{type:'count',count:Number(values.count)}:values.ends==='never'?{type:'never'}:{type:'date',until:values.until}};
 if(frequency==='weekly')rule.weekdays=values.repeat==='custom'?days.flatMap((_,i)=>values['weekday'+i]!==undefined?[i]:[]):[new Date(values.date+'T00:00:00Z').getUTCDay()];
 if(frequency==='monthly'){
  if(values.repeat==='custom'&&values.monthMode==='ordinal'){rule.ordinal=Number(values.ordinal);rule.weekday=Number(values.weekday);}
  else rule.dayOfMonth=values.repeat==='custom'?Number(values.dayOfMonth):Number(values.date.slice(8,10));
 }
 return rule;
}
function eventValues(values) {
 const allDay=values.allDay==='true';
 return {start:`${values.date}T${allDay?'00:00':values.startTime}`,end:`${values.endDate||values.date}T${allDay?'00:00':values.endTime}`,timeZone:'Europe/London',...(allDay?{allDay:true}:{})};
}

function previewDetails(values) {
 const rule = read(values);
 if (!rule) return null;
 const series = {id:'preview-series', ...eventValues(values), recurrence:rule};
 recurrence.validateCollections([series], [], () => {});
 const dateLabel = value => new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T00:00:00Z'));
 let pattern;
 if (rule.frequency === 'daily') pattern = rule.interval === 1 ? 'Every day' : 'Every '+rule.interval+' days';
 else if (rule.frequency === 'weekly') pattern = rule.interval === 1 ? 'Every '+rule.weekdays.map(d=>days[d]).join(', ') : 'Every '+rule.interval+' weeks on '+rule.weekdays.map(d=>days[d]).join(', ');
 else {
  const months = rule.interval === 1 ? 'every month' : 'every '+rule.interval+' months';
  pattern = rule.dayOfMonth ? (rule.interval === 1 ? 'Every month' : 'Every '+rule.interval+' months')+' on day '+rule.dayOfMonth : ({1:'First',2:'Second',3:'Third',4:'Fourth','-1':'Last'}[rule.ordinal])+' '+days[rule.weekday]+' of '+months;
 }
 // Use the existing expansion engine in bounded, disjoint windows. This also
 // finds five dates for sparse rules without inventing another recurrence algorithm.
 let from = series.start.slice(0,10);
 const occurrences = [];
 while (from <= '2100-12-31' && occurrences.length < 5) {
  const to = Math.min(2100,Number(from.slice(0,4))+3)+'-12-31';
  occurrences.push(...recurrence.expandSeries(series,[],{range:{from,to},includeDrafts:true}).slice(0,5-occurrences.length));
  if (rule.end.type === 'date' && rule.end.until <= to) break;
  if (rule.end.type === 'count' && occurrences.length >= rule.end.count) break;
  if (to === '2100-12-31') break;
  from = (Number(to.slice(0,4))+1)+'-01-01';
 }
 return {pattern, time:series.allDay?'All day':series.start.slice(11,16)+'–'+series.end.slice(11,16),
  ending:rule.end.type==='date'?'Until '+dateLabel(rule.end.until):rule.end.type==='count'?'After '+rule.end.count+' occurrences':'No end date',
  dates:occurrences.map(e=>dateLabel(e.start))};
}

function wire(form) {
 const update=()=>{
  const values=Object.fromEntries(new FormData(form)),repeat=values.repeat!=='none',custom=values.repeat==='custom';
  const visible=(selector,show)=>form.querySelector(selector)?.toggleAttribute('hidden',!show);
  visible('[data-repeat-settings]',repeat);visible('[data-repeat-custom]',custom);visible('[data-repeat-weekdays]',values.frequency==='weekly');visible('[data-repeat-monthly]',values.frequency==='monthly');visible('[data-repeat-date]',values.monthMode==='date');visible('[data-repeat-ordinal]',values.monthMode==='ordinal');visible('[data-repeat-until]',values.ends==='date');visible('[data-repeat-count]',values.ends==='count');
  const allDay=values.allDay==='true';for(const name of ['startTime','endTime']){const input=form.querySelector(`[name="${name}"]`);if(input){input.required=!allDay;input.disabled=allDay;}}
  const target=form.querySelector('#admin-recurrence-summary');if(!target)return;
  if(!repeat){target.textContent='Does not repeat.';return;}
  try{const series={id:'preview-series',...eventValues(values),recurrence:read(values)};recurrence.validateRule(series);recurrence.validateCollections([series],[],()=>{});const todayParts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));const today=todayParts.year+'-'+todayParts.month+'-'+todayParts.day;const from=series.start.slice(0,10)>today?series.start.slice(0,10):today;const year=Number(from.slice(0,4));const next=recurrence.expandSeries(series,[],{range:{from,to:Math.min(2100,year+2)+'-12-31'}}).slice(0,5).map(e=>e.start.slice(0,10));target.textContent=recurrence.summary(series)+(next.length?' Next occurrences: '+next.join(', '):' No future dates in the preview window.');}
  catch{target.textContent='Choose a valid repeat pattern and ending to preview the next dates.';}
 };
 if(!form.querySelector('[name="until"]')?.value){const input=form.querySelector('[name="until"]'),date=form.querySelector('[name="date"]')?.value||new Date().toISOString().slice(0,10);if(input)input.value=Number(date.slice(0,4))+1+date.slice(4);}
 form.addEventListener('change',update);form.addEventListener('input',update);update();
}
export { controls,read,eventValues,previewDetails,wire };
export default {...recurrence,controls,read,eventValues,previewDetails,wire};
