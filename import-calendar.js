const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { buildCalendar } = require('./azure-function/src/calendar-model');
const root = __dirname;
const sourcePath = path.join(root, '_content/calendar-source.ics');
const contentPath = path.join(root, '_content/calendar.json');
const calendar = buildCalendar(fs.readFileSync(sourcePath, 'utf8'), JSON.parse(fs.readFileSync(contentPath, 'utf8')));
fs.writeFileSync(path.join(root, 'events.json'), JSON.stringify(calendar, null, 2) + '\n');
// Public build metadata only; no draft content or administrator identity.
const version = createHash('sha256').update(JSON.stringify(calendar)).digest('hex');
const editorialSha = execFileSync('git', ['hash-object', '--path=_content/calendar.json', contentPath], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(root, 'calendar-version.json'), JSON.stringify({ version, editorialSha }) + '\n');
console.log('Generated ' + calendar.items.length + ' published calendar events.');
