const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const sourcePath = path.join(root, 'calendar-source.ics');
const outputPath = path.join(root, 'events.json');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r?\n[ \t]/g, '');

function unescapeText(value) {
  return value.replace(/\\([nN,;\\])/g, (_, character) => ({ n: '\n', N: '\n', ',': ',', ';': ';', '\\': '\\' })[character]);
}

function parseProperties(block) {
  const properties = new Map();
  for (const line of block.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const [name, ...parameters] = line.slice(0, separator).split(';');
    properties.set(name.toUpperCase(), { value: line.slice(separator + 1).replace(/\r$/, ''), parameters });
  }
  return properties;
}

function get(properties, name) {
  return properties.get(name)?.value ?? '';
}

function dateProperty(properties, name, fallbackZone) {
  const property = properties.get(name);
  if (!property) return null;
  const zone = property.parameters.map(parameter => parameter.split('=')).find(([key]) => key.toUpperCase() === 'TZID')?.[1] || fallbackZone;
  const match = property.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) throw new Error(`Unsupported ${name} value in calendar source: ${property.value}`);
  return { value: `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`, timeZone: zone };
}

const sourceTimeZone = source.match(/^X-WR-TIMEZONE:(.+)$/m)?.[1]?.trim() || 'Europe/London';
const blocks = [...source.matchAll(/BEGIN:VEVENT\s*\n([\s\S]*?)\nEND:VEVENT/g)].map(match => match[1]);
if (!blocks.length) throw new Error('The calendar source contains no VEVENT entries.');

const items = blocks.map(block => {
  const properties = parseProperties(block);
  const start = dateProperty(properties, 'DTSTART', sourceTimeZone);
  const end = dateProperty(properties, 'DTEND', start?.timeZone || sourceTimeZone);
  const title = unescapeText(get(properties, 'SUMMARY'));
  const location = unescapeText(get(properties, 'LOCATION'));
  const uid = get(properties, 'UID');
  if (!title || !start || !end || !location || !uid) throw new Error(`Calendar event is missing a required source field: ${uid || title || '(unknown)'}`);
  const geo = get(properties, 'GEO').match(/^(-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?)$/);
  const item = {
    id: `${uid}-${start.value.replace(/[-:]/g, '')}`,
    uid,
    title,
    start: start.value,
    end: end.value,
    timeZone: start.timeZone,
    location,
    description: unescapeText(get(properties, 'DESCRIPTION')),
    sourceUrl: get(properties, 'URL')
  };
  if (geo) item.geo = { longitude: Number(geo[1]), latitude: Number(geo[2]) };
  if (location === 'Mickleham: St Michael and All Angels') {
    item.address = "St Michael's & All Angels Church, Old London Road, Mickleham, Dorking, Surrey RH5 6DU, England";
  }
  return item;
});

const ids = new Set(items.map(item => item.id));
if (ids.size !== items.length) throw new Error('The calendar source contains duplicate event IDs.');

const calendar = {
  sourceFile: 'calendar-source.ics',
  timeZone: items[0].timeZone || sourceTimeZone,
  sourceTimeZone,
  searchPages: ['index.html', 'calendar.html', 'whats-on.html'],
  items
};
fs.writeFileSync(outputPath, `${JSON.stringify(calendar, null, 2)}\n`, 'utf8');
console.log(`Imported ${items.length} events from ${path.basename(sourcePath)} (${items[0].start.slice(0, 10)} through ${items.at(-1).start.slice(0, 10)}).`);
