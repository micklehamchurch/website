const fs = require('node:fs');
const path = require('node:path');
const {archive, archiveContent} = require('./parish-magazine-render.cjs');

const file = path.join(__dirname, archive);
const source = fs.readFileSync(file, 'utf8');
const archiveMarkers = /<!-- magazine-archive:start -->[\s\S]*?<!-- magazine-archive:end -->/;
if (!archiveMarkers.test(source)) throw Error('Missing magazine archive markers');
fs.writeFileSync(file, source.replace(archiveMarkers, () =>
  '<!-- magazine-archive:start -->\n  ' + archiveContent() + '\n  <!-- magazine-archive:end -->'));
