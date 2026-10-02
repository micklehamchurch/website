const fs = require('node:fs');
const path = require('node:path');
const { buildCalendar } = require('./azure-function/src/calendar-model');
const root = __dirname;
const sourcePath = path.join(root, '_content/calendar-source.ics');
const contentPath = path.join(root, '_content/calendar.json');
const calendar = buildCalendar(fs.readFileSync(sourcePath, 'utf8'), JSON.parse(fs.readFileSync(contentPath, 'utf8')));
fs.writeFileSync(path.join(root, 'events.json'), JSON.stringify(calendar, null, 2) + '\n');
console.log('Generated ' + calendar.items.length + ' published calendar events.');
