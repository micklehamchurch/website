(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else{root.HomeNextService=model;model.mount();}})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const zone='Europe/London';
 function localNow(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;}
 function validTime(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(s))return false;const d=new Date(s+'Z');return Number.isFinite(+d)&&d.toISOString().slice(0,16)===s.slice(0,16);}
 function choose(data,now=new Date()){
  const local=localNow(now);if(data?.version!==1||!Array.isArray(data.items))return null;
  const e=data.items.filter(e=>e&&typeof e.id==='string'&&e.id.length>0&&e.id.length<=500&&typeof e.title==='string'&&e.title.trim()&&e.title.length<=500&&validTime(e.start)&&validTime(e.end)&&e.end>e.start&&new Date(e.start.slice(0,10)+'T12:00Z').getUTCDay()===0&&(e.start.length===16?e.start+':00':e.start)>=local).sort((a,b)=>a.start.localeCompare(b.start))[0];
  if(!e)return null;const date=e.start.slice(0,10),today=local.slice(0,10),d=new Date(date+'T12:00Z'),t=new Date(today+'T12:00Z');const days=Math.round((d-t)/86400000),untilSunday=(7-t.getUTCDay())%7||7;
  const hour=Number(e.start.slice(11,13)),minute=e.start.slice(14,16);
  return {...e,location:typeof e.location==='string'&&e.location.trim()?e.location:'St Michael & All Angels, Mickleham',label:date===today?'TODAY':days===untilSunday&&days>0?'NEXT SUNDAY':'UPCOMING SERVICE',day:String(d.getUTCDate()),month:new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',month:'short'}).format(d).toUpperCase(),fullDate:new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d),time:`${hour%12||12}:${minute} ${hour<12?'am':'pm'}`,href:'calendar.html?event='+encodeURIComponent(e.id)};
 }
 function mount(){
  const card=document.querySelector('[data-home-next-service]');if(!card)return;let data=null,timer;
  try{data=JSON.parse(document.getElementById('home-service-initial')?.textContent||'null');}catch{/* The existing fetch/fallback remains available. */}
  const get=s=>card.querySelector(s);
  function render(){const service=choose(data);card.href=service?.href||'calendar.html';card.classList.toggle('has-service',!!service);get('.next-service-date').hidden=!service;get('.next-service-label').textContent=service?.label||'JOIN US FOR WORSHIP';get('.next-service-title').textContent=service?`${service.title} · ${service.time}`:'See our upcoming services';get('.next-service-location').textContent='St Michael & All Angels';if(service){get('.next-service-day').textContent=service.day;get('.next-service-month').textContent=service.month;get('.next-service-date').dateTime=service.start.slice(0,10);get('.next-service-date').setAttribute('aria-label',service.fullDate);}card.setAttribute('aria-label',service?`Next Sunday service at St Michael & All Angels, Mickleham: ${service.title}, ${service.fullDate}, ${service.time}`:'Next Sunday service at St Michael & All Angels, Mickleham: See our upcoming services');clearTimeout(timer);if(!document.hidden)timer=setTimeout(render,60000-Date.now()%60000+50);}
  async function load(){try{const r=await fetch('home-next-service-data.json',{credentials:'omit',cache:'no-cache',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();data=await r.json();}catch{data=null;}render();}
  document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden){render();void load();}});render();void load();
 }
 return {choose,localNow,mount};
});
