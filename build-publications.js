const fs = require('node:fs');
const path = require('node:path');
const model = require('./publications-model.js');
const records = model.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '_content/publications.json'), 'utf8')));
for (const record of records) {
  const target = path.join(__dirname, record.pdf);
  if (!fs.existsSync(target) || fs.readFileSync(target).subarray(0, 5).toString() !== '%PDF-') throw new Error(`A real PDF is required: ${record.pdf}`);
}
fs.writeFileSync(path.join(__dirname, 'publications-data.json'), JSON.stringify({ publications: model.ordered(records) }, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'admin/publications-data.json'), JSON.stringify({ publications: records }, null, 2) + '\n');
console.log(`Built ${records.filter(record => record.published).length} public PDF publication records; historical PDFs retained.`);
