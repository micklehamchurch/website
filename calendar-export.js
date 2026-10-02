(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.churchCalendarExport = api;
})(globalThis, function () {
  const encoder = new TextEncoder();
  const escape = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function fold(line) {
    let result = '', segment = '', bytes = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (bytes + length > 75) { result += segment + '\r\n'; segment = ' '; bytes = 1; }
      segment += character; bytes += length;
    }
    return result + segment;
  }
  const utc = date => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  function instant(value, zone) {
    const target = value.length === 16 ? value + ':00' : value;
    const wall = Date.parse(target + 'Z');
    const formatter = new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    const clock = n => { const p = Object.fromEntries(formatter.formatToParts(new Date(n)).map(p=>[p.type,p.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`; };
    let candidate = wall;
    for (let i=0;i<4;i++) { const observed = clock(candidate); if(observed===target) return utc(new Date(candidate)); candidate += wall - Date.parse(observed+'Z'); }
    throw new Error('Event time cannot be represented in its time zone.');
  }
  async function uid(id) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256',encoder.encode('stmichael-church-calendar:v1:'+id));
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+'@stmichael-church-calendar';
  }
  function previousEvents(text) {
    const result = new Map();
    const unfolded = (text || '').replace(/\r\n[ \t]/g,'');
    for (const block of unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)\r\nEND:VEVENT/g)) {
      const lines = block[1].split('\r\n');
      const id = lines.find(l=>l.startsWith('UID:'))?.slice(4);
      if(id) result.set(id,{body:lines.filter(l=>!/^DTSTAMP:|^SEQUENCE:/.test(l)).join('\r\n'),stamp:lines.find(l=>l.startsWith('DTSTAMP:'))?.slice(8),sequence:Number(lines.find(l=>l.startsWith('SEQUENCE:'))?.slice(9)||0)});
    }
    return result;
  }
  async function calendar(events, { previous = '', now = new Date() } = {}) {
    const old = previousEvents(previous);
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//St Michael and All Angels Church//Public Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:St Michael & All Angels Church','X-WR-TIMEZONE:Europe/London'];
    const seen = new Set();
    for (const event of events) {
      if(event.status === 'draft' || event.cancelled) continue;
      const id = await uid(event.id);
      if(seen.has(id)) throw new Error('Duplicate calendar event.');
      seen.add(id);
      const body = ['UID:'+id,
        event.allDay ? 'DTSTART;VALUE=DATE:'+event.start.slice(0,10).replace(/-/g,'') : 'DTSTART:'+instant(event.start,event.timeZone),
        event.allDay ? 'DTEND;VALUE=DATE:'+event.end.slice(0,10).replace(/-/g,'') : 'DTEND:'+instant(event.end,event.timeZone),
        'SUMMARY:'+escape(event.title)];
      if(event.description) body.push('DESCRIPTION:'+escape(event.description));
      if(event.location) body.push('LOCATION:'+escape(event.address ? event.location+' · '+event.address : event.location));
      const prior = old.get(id), unchanged = prior?.body === body.join('\r\n');
      lines.push('BEGIN:VEVENT',...body,'DTSTAMP:'+(unchanged ? prior.stamp : utc(now)), 'SEQUENCE:'+(prior ? prior.sequence+(unchanged?0:1) : 0),'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n')+'\r\n';
  }
  function subscriptionURL(pageURL) { return new URL('calendar.ics',pageURL).href; }
  return { calendar, uid, instant, escape, fold, subscriptionURL };
});
