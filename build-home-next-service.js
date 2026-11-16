const fs = require('node:fs');
const { validateRegistry } = require('./azure-function/src/google-calendar-sync-model');
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
function build() {
  const output = 'home-next-service-data.json';
  const calendar = JSON.parse(fs.readFileSync('events.json', 'utf8'));
  const registry = JSON.parse(fs.readFileSync('_sync/google-calendar.json', 'utf8'));
  validateRegistry(registry);
  if (!Array.isArray(calendar.items) || !calendar.items.length ||
      !Array.isArray(registry.series) || !registry.series.some(series => series.uid === config.googleSeriesUid)) {
    throw new Error('Next Service requires the published Calendar and synced main-church Sunday series.');
  }

  // Calendar sync commits the accepted Google states and website IDs together.
  // A static build uses that snapshot rather than re-fetching unsynced events.
  const feed = {
    series: registry.series,
    rows: registry.entries.map(({ uid, key, google }) => ({ uid, key, state: google }))
  };
  const data = project(calendar, registry, feed);
  if (!data.items.length && fs.existsSync(output)) {
    const previous = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (!Array.isArray(previous.items) || previous.items.length) {
      throw new Error('Next Service projection is empty. Existing output was preserved. Check the Calendar sync and published event mappings.');
    }
  }

  fs.writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
  console.log(`Generated ${data.items.length} verified main-church Sunday occurrences.`);
}
if (require.main === module) {
  try { build(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { project };
