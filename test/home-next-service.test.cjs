const test=require('node:test'),assert=require('node:assert/strict'),M=require('../home-next-service'),{project}=require('../build-home-next-service'),config=require('../home-next-service-config.json');
const event=(start='2026-10-25T10:00',title='Holy Communion')=>({id:'event-1',title,start,end:start.slice(0,11)+(String(Number(start.slice(11,13))+1).padStart(2,'0'))+':00',location:'St Michael & All Angels, Mickleham'});
const data=e=>({version:1,items:Array.isArray(e)?e:[e]});
test('UK dates/status/time use actual occurrences, including DST and Sunday rollover',()=>{assert.equal(M.choose(data(event()),new Date('2026-10-23T12:00Z')).label,'NEXT SUNDAY');assert.equal(M.choose(data(event()),new Date('2026-10-25T09:00Z')).label,'TODAY');assert.equal(M.choose(data(event('2026-11-08T10:00')),new Date('2026-10-23T12:00Z')).label,'UPCOMING SERVICE');assert.equal(M.choose(data(event('2026-10-25T10:00')),new Date('2026-10-25T10:00:01Z')),null);assert.equal(M.choose(data(event('2027-06-06T10:00')),new Date('2027-06-05T23:30Z')).label,'TODAY');assert.equal(M.choose(data(event('2026-11-01T10:00')),new Date('2026-10-25T12:00Z')).label,'NEXT SUNDAY');});
test('actual titles, time, date and stable event links are preserved; invalid/past data fails safely',()=>{const e=event('2026-12-06T11:00','Christingle service'),r=M.choose(data(e),new Date('2026-12-01T09:00Z'));assert.equal(r.time,'11:00 am');assert.equal(r.day,'6');assert.equal(r.month,'DEC');assert.equal(r.title,'Christingle service');assert.equal(r.href,'calendar.html?event=event-1');for(const bad of [null,{},data({...e,start:'2026-12-40T11:00'}),data({...e,title:''}),data(event('2026-10-24T10:00'))])assert.equal(M.choose(bad,new Date('2026-12-01')),null);assert(M.choose(data({...e,title:'A very long actual service title '.repeat(8),location:''}),new Date('2026-12-01')));});
test('projection uses only configured Google series identity and published matching occurrence IDs',()=>{const e={...event(),status:'published'},row={uid:'selected',key:'key',state:{...e,allDay:false}},feed={series:[{uid:'selected'}],rows:[row]},registry={entries:[{uid:'selected',key:'key',websiteId:e.id,conflicts:[],suppressed:false}]},settings={googleSeriesUid:'selected',location:e.location};const make=(c={items:[e]},r=registry,f=feed)=>project(c,r,f,settings);assert.equal(make().items.length,1);assert.equal(make(undefined,undefined,{...feed,series:[]}).items.length,0);assert.equal(make(undefined,undefined,{...feed,rows:[{...row,uid:'other'}]}).items.length,0);for(const change of [{suppressed:true},{missingChecks:1},{conflicts:['start']}])assert.equal(make(undefined,{entries:[{...registry.entries[0],...change}]}).items.length,0);for(const change of [{status:'draft'},{title:'pending sync'},{start:'2026-10-25T11:00'}])assert.equal(make({items:[{...e,...change}]}).items.length,0);const renamed={...e,title:'Completely different title',category:'Concert'};assert.equal(make({items:[renamed]},undefined,{...feed,rows:[{...row,state:{...renamed,allDay:false}}]}).items[0].title,renamed.title);});
test('real configured series projection includes ordinary 10am and 6 December 11am exception without BCP/concerts',()=>{const calendar=require('../events.json'),registry=require('../_sync/google-calendar.json'),feed={series:registry.series,rows:registry.entries.map(e=>({uid:e.uid,key:e.key,state:e.google}))},d=project(calendar,registry,feed);assert(config.googleSeriesUid);const normal=M.choose(d,new Date('2026-10-23T12:00Z'));assert.equal(normal.title,'Holy Communion');assert.equal(normal.time,'10:00 am');assert.equal(normal.start,'2026-10-25T10:00');const special=M.choose(d,new Date('2026-11-30T09:00Z'));assert.equal(special.title,'Christingle service');assert.equal(special.time,'11:00 am');assert.equal(special.start,'2026-12-06T11:00');assert(d.items.every(x=>!x.title.includes('BCP')&&!x.title.includes('Concert')));});

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function localBuild(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'home-next-service-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, 'home-next-service-data.json');
  const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value) + '\n');
  fs.mkdirSync(path.join(root, '_sync'));
  write('events.json', require('../events.json'));
  write('_sync/google-calendar.json', require('../_sync/google-calendar.json'));
  const run = () => spawnSync(process.execPath, [require.resolve('../build-home-next-service')], {
    cwd: root,
    encoding: 'utf8'
  });
  return { root, output, write, run };
}

test('the build reproduces the accepted service projection from the local Calendar sync snapshot', t => {
  const { output, run } = localBuild(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.ok(actual.items.length > 0);
  assert.deepEqual(actual, require('../home-next-service-data.json'));
});

test('an empty projection or missing sync input fails without changing the populated service file', t => {
  const { root, output, write, run } = localBuild(t);
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const existing = fs.readFileSync(output);
  write('events.json', {
    items: require('../events.json').items.map(event => ({ ...event, status: 'draft' }))
  });
  const empty = run();
  assert.notEqual(empty.status, 0);
  assert.match(empty.stderr, /projection is empty.*Existing output was preserved/);
  assert.deepEqual(fs.readFileSync(output), existing);

  fs.unlinkSync(path.join(root, '_sync/google-calendar.json'));
  const missing = run();
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /_sync.google-calendar\.json/);
  assert.deepEqual(fs.readFileSync(output), existing);
});
