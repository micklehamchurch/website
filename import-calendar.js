const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { buildCalendar } = require('./azure-function/src/calendar-model');
const root = __dirname;
const contentPath = path.join(root, '_content/calendar.json');
const calendar = buildCalendar(null, JSON.parse(fs.readFileSync(contentPath, 'utf8')));
fs.writeFileSync(path.join(root, 'events.json'), JSON.stringify(calendar, null, 2) + '\n');
// Public build metadata only; no draft content or administrator identity.
const version = createHash('sha256').update(JSON.stringify(calendar)).digest('hex');
const editorialSha = execFileSync('git', ['hash-object', '--path=_content/calendar.json', contentPath], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(root, 'calendar-version.json'), JSON.stringify({ version, editorialSha }) + '\n');
console.log('Generated ' + calendar.items.length + ' published calendar events.');

// ICS is public output only; never read as a website Calendar source.
const feedPath = path.join(root, 'calendar.ics');
require('./calendar-export').calendar(calendar.items, { previous: fs.existsSync(feedPath) ? fs.readFileSync(feedPath, 'utf8') : '' }).then(feed => fs.writeFileSync(feedPath, feed)).catch(error => { console.error(error.message); process.exitCode = 1; });
