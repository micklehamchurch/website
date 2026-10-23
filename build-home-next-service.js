const fs = require('node:fs');
const { fetchGoogleCalendar } = require('./azure-function/src/google-calendar-adapter');
const config = require('./home-next-service-config.json');
// A projection, not another calendar. Eligibility comes only from the configured Google UID.
function project(calendar, registry, feed, settings = config) {
  if (!feed?.series?.some(s => s.uid === settings.googleSeriesUid) || !Array.isArray(calendar?.items) || !Array.isArray(registry?.entries)) return { version: 1, items: [] };
  const published = new Map(calendar.items.map(e => [e.id,e]));
  const mappings = new Map(registry.entries.filter(e => e.uid === settings.googleSeriesUid && !e.suppressed && !e.missingChecks && !e.conflicts?.length).map(e => [e.key,e]));
  const items = [];
  for (const row of feed.rows || []) {
    if (row.uid !== settings.googleSeriesUid) continue;
    const mapping = mappings.get(row.key), event = mapping && published.get(mapping.websiteId), source = row.state;
    // Fail closed while sync is pending/conflicted. Equality is consistency validation, never title classification.
    if (!event || event.status !== 'published' || source.allDay || ['title','start','end'].some(k => event[k] !== source[k]) || new Date(source.start.slice(0,10)+'T12:00Z').getUTCDay() !== 0) continue;
    items.push({id:event.id,title:source.title,start:source.start,end:source.end,location:settings.location});
  }
  return {version:1,items:items.sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id))};
}
async function build() {
  let data = {version:1,items:[]};
  try { data = project(JSON.parse(fs.readFileSync('events.json')),JSON.parse(fs.readFileSync('_sync/google-calendar.json')),await fetchGoogleCalendar()); }
  catch { console.warn('Sunday series could not be verified; publishing the neutral service-card fallback.'); }
  fs.writeFileSync('home-next-service-data.json',JSON.stringify(data,null,2)+'\n');
  console.log(`Generated ${data.items.length} verified main-church Sunday occurrences.`);
}
if (require.main === module) build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={project};
