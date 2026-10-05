const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const data = JSON.parse(fs.readFileSync(path.join(root,'_content/clergy.json')));
test('working succession excludes disputed brass and George Lock, preserves returning clergy and open dates',()=>{
  const originalIds=['thomas-roger-ffowke','gerrard-andrewes','alfred-burmester','william-henry-harke','william-richard-lloyd','arthur-bedford','langdale-smith','aw-douglas','john-cornell','peter-ince','john-harkin','barbara-steadman-allen','david-ireland','malcolm-raby','sandra-faccini'];
  assert.equal(originalIds.length,15);
  for(const id of originalIds)assert.equal(data.records.filter(r=>r.id===id).length,1,`Original historical record ${id} must be preserved exactly once`);
  const originals=data.records.flatMap(r=>[r.primaryImage,...r.archiveImages].filter(Boolean).map(i=>i.originalFilename));
  assert(!originals.includes('1.jpeg')); assert(!originals.includes('3.jpeg'));
  const harkin=data.records.filter(r=>r.id==='john-harkin');assert.equal(harkin.length,1);assert.deepEqual(harkin[0].servicePeriods,[{start:1993,end:1998},{start:2018,end:2020}]);
  assert.equal(data.records.find(r=>r.id==='sandra-faccini').servicePeriods[0].end,null);
  assert.equal(data.records.find(r=>r.id==='thomas-roger-ffowke').primaryImage,null);
});
test('public generated records expose only intended image metadata, with valid local images',()=>{
 const publicData=JSON.parse(fs.readFileSync(path.join(root,'clergy-data.json')));
 for(const record of publicData){ assert.deepEqual(Object.keys(record).sort(),['archiveImages','id']);for(const image of record.archiveImages){assert.deepEqual(Object.keys(image).sort(),['alt','caption','src']);assert(fs.existsSync(path.join(root,image.src)));}}
 const source=fs.readFileSync(path.join(root,'those-who-have-served.html'),'utf8');assert(!source.includes('internalNotes'));assert(!source.includes('copyrightPermission'));
});
test('archive is discoverable by requested names through existing search',()=>{
 const page=JSON.parse(fs.readFileSync(path.join(root,'search-index.json'))).find(p=>p.url==='those-who-have-served.html');assert(page);
 for(const name of ['Burmester','Harkin','Cornell','Faccini'])assert(page.content.includes(name));
 assert(!page.content.includes('internalNotes'));assert(!page.content.includes('George Lock'));
});
