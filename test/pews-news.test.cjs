const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { build, text } = require('../build-pews-news');
const source = path.resolve(__dirname, '..');
test('edition retains authoritative Zoom details, notices, contacts and original artwork', () => {
  const html = fs.readFileSync(path.join(source, 'pews-news/2026-10-25.html'), 'utf8');
  const data = require('../_content/pews-news/2026-10-25.json');
  for (const section of data.sections) for (const notice of section.notices) {
    assert(html.includes(notice.title.replaceAll('&','&amp;')), notice.title);
    for (const paragraph of notice.paragraphs) assert(html.includes(text(paragraph)), `Full source paragraph retained: ${notice.title}`);
  }
  for (const value of ['812 6812 6840','221883','893 9609 9494','967011','0131 460 1196','0208 080 6591','0203 481 5237','0203 481 5240','0203 901 7895','aewadsworth@hotmail.com','admin@micklehamchurch.org.uk','01372 376443','07905 985928','07787 126966','07789 775354','adiamond714@gmail.com','St Michael’s Church, not the Village Hall','Sunday, 6 December','Long Life Fruit Juice']) assert(html.includes(value), value);
  for (const z of [data.zoom, data.sections[1].notices[1].zoom]) assert(html.includes(z.url.replaceAll('&','&amp;')));
  const images = require('../_content/pews-news-images.json')['2026-10-25'];
  for (const key of ['fall-back','macmillan','link-to-hope','coffee-cake','remembrance','poppy-qr','lights','snowman','soup','pumpkins','foodbank']) assert(html.includes(images[key].src), key);
  const size = Object.values(images).reduce((n, im) => n + fs.statSync(path.join(source, im.src)).size, 0);
  assert(size < 450000);
  assert.match(html, /href="assets\/documents\/news\/pews-news\/pews-news-2026-10-25.pdf" download/);
});
test('future editions share layout; publication status controls archive, output and removal', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'pews-build-'));
  try {
    fs.mkdirSync(path.join(root,'_content/pews-news'),{recursive:true});
    fs.cpSync(path.join(source,'assets/images/pews-news'),path.join(root,'assets/images/pews-news'),{recursive:true});
    const data = require('../_content/pews-news/2026-10-25.json');
    const images = require('../_content/pews-news-images.json')['2026-10-25'];
    const dates = ['2026-10-25','2027-01-03','2025-01-05'];
    const records = dates.map((date,i)=>({id:`pews-news-${date}`,type:'pews-news',date,title:'Pews News',published:i!==2,pdf:`assets/documents/news/pews-news/pews-news-${date}.pdf`}));
    for (const date of dates) fs.writeFileSync(path.join(root,'_content/pews-news',`${date}.json`),JSON.stringify({...data,date,subtitle:'Fixture <script>alert(1)</script>',...(date==='2027-01-03'?{clock:undefined,pumpkins:undefined,foodbank:undefined,sections:[{id:'january',layout:'grid',title:'January dates',notices:[{title:'A future parish gathering',when:'Sunday 3 January · 10am',dates:[date],paragraphs:['Future-edition test fixture only.']}]}]}:{})}));
    fs.writeFileSync(path.join(root,'_content/pews-news-images.json'),JSON.stringify(Object.fromEntries(dates.map(d=>[d,images]))));
    const save = () => fs.writeFileSync(path.join(root,'_content/publications.json'),JSON.stringify({publications:records}));
    save(); build(root);
    let html = fs.readFileSync(path.join(root,'pews-news.html'),'utf8');
    assert.match(html,/2027-01-03/); assert.match(html,/&lt;script&gt;/); assert(!html.includes('2025-01-05'));
    assert.match(html,/January dates/); assert(!html.includes('Clocks go back')); assert(!html.includes('November dates'));
    assert(!fs.existsSync(path.join(root,'pews-news/2025-01-05.html')));
    records[1].published = false; save(); build(root);
    assert(!fs.existsSync(path.join(root,'pews-news/2027-01-03.html')));
    assert.match(fs.readFileSync(path.join(root,'pews-news.html'),'utf8'),/2026-10-25/);
    records[0].published = false; save(); build(root);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'pews-news-data.json'))).editions,[]);
    assert(!fs.existsSync(path.join(root,'pews-news/2026-10-25.html')));
    assert(!fs.readFileSync(path.join(root,'pews-news.html'),'utf8').includes('221883'));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test('edition projects a compact timeline, event grid and selected side feature without dropping notices', () => {
  const html = fs.readFileSync(path.join(source,'pews-news/2026-10-25.html'),'utf8');
  assert.equal((html.match(/class="pews-notice pews-timeline-row"/g)||[]).length,4);
  assert.equal((html.match(/class="pews-notice pews-calendar-card/g)||[]).length,11);
  assert.equal((html.match(/class="pews-notice pews-feature-panel"/g)||[]).length,1);
  assert.equal((html.match(/class="pews-notice-details"/g)||[]).length,11);
  assert.equal((html.match(/id="join-online"/g)||[]).length,1);
  assert.match(html,/<aside class="pews-support"[\s\S]*Chapel Farm Macmillan Coffee Morning/);
  assert.match(html,/id="poppy-donations"/);
  assert.match(html,/id="edition-archive"/);
});
test('News hub includes only real recent editions and preserves the Harvest story', () => {
  const html = fs.readFileSync(path.join(source,'news.html'),'utf8');
  const hub = html.match(/<!-- pews-hub:start -->([\s\S]*?)<!-- pews-hub:end -->/)[1];
  const model = require('../publications-model');
  const records = model.ordered(model.parse(require('../_content/publications.json'))).filter(r=>r.type==='pews-news');
  for (const record of records.slice(0,5)) assert(hub.includes(record.date), record.date);
  assert.equal((hub.match(/<li>/g)||[]).length,Math.min(4,records.length-1));
  assert.match(hub,/View all Pews News/); assert.match(hub,/pews-news.html#edition-archive/);
  const cp = require('node:child_process');
  const old = cp.execFileSync('git',['show','d1c48494:news.html'],{cwd:source,encoding:'utf8'});
  const story = value => value.match(/<!-- news-stories:start -->[\s\S]*?<!-- news-stories:end -->/)[0].replace(/\r/g,'');
  assert.equal(story(html),story(old));
});
test('plain text is escaped and only contacts become actionable links', () => {
  assert.equal(text('<script>'), '&lt;script&gt;');
  assert.match(text('Email admin@micklehamchurch.org.uk, call 01372 376443.'), /href="mailto:admin@micklehamchurch.org.uk"/);
  assert.match(text('Call 01372 376443.'), /href="tel:01372376443"/);
});
test('18 October retains its own service, collect, notices, contacts, images and Food Bank requirements', () => {
  const data = require('../_content/pews-news/2026-10-18.json');
  const html = fs.readFileSync(path.join(source,'pews-news/2026-10-18.html'),'utf8');
  assert.equal(data.services.length,1); assert.equal(data.services[0].time,'10am');
  for (const value of [data.subtitle,data.collect,data.readings,data.foodbank.intro,data.foodbank.note,data.foodbank.donations]) assert(html.includes(text(value)),value);
  for (const section of data.sections) for (const n of section.notices) {
    assert(html.includes(text(n.title)),n.title);
    assert(html.includes(text(n.when)),n.when);
    for (const p of n.paragraphs) assert(html.includes(text(p)),n.title);
    if (n.zoom) assert(html.includes(n.zoom.url));
  }
  for (const value of ['siberrman@btinternet.com','aewadsworth@hotmail.com','admin@micklehamchurch.org.uk','adiamond714@gmail.com','01372 376443','07905 985928','07789 775354','07787 126966','Tinned Rice Pudding','Sunday 17 November']) assert(html.includes(value),value);
  for (const value of ['Last Sunday after Trinity','Snowman','Christingle','Take a little Harvest home','Clocks go back','1 Timothy']) assert(!html.includes(value),value);
  assert.equal((html.match(/class="pews-notice pews-timeline-row"/g)||[]).length,8);
  assert.equal((html.match(/class="pews-notice pews-calendar-card/g)||[]).length,9);
  const images = require('../_content/pews-news-images.json')['2026-10-18'];
  for (const key of ['link-to-hope','bible-study','bible','alpha','soup','mens-breakfast','macmillan','coffee-cake','remembrance','poppy-qr','lights','foodbank']) assert(html.includes(images[key].src),key);
  assert(Object.values(images).reduce((n,im)=>n+fs.statSync(path.join(source,im.src)).size,0)<350000);
  const pdf = fs.readFileSync(path.join(source,'assets/documents/news/pews-news/pews-news-2026-10-18.pdf'));
  assert.equal(require('node:crypto').createHash('sha256').update(pdf).digest('hex'),'c999695e51666802c0180494d4f53705b28cc8961dce7915a67c5c19e6a5df1f');
});
test('online archive has two real HTML editions and disjoint PDF-only archive on both pages', () => {
  for (const date of ['2026-10-25','2026-10-18']) {
    const html = fs.readFileSync(path.join(source,`pews-news/${date}.html`),'utf8');
    const online = html.match(/<section class="pews-archive-section pews-online-archive"[\s\S]*?<\/section>/)[0];
    const pdfs = html.match(/<section class="pews-archive-section pews-pdf-archive"[\s\S]*?<\/section>/)[0];
    assert.match(online,/2026 — 2 editions/);
    assert(online.indexOf('2026-10-25.html')<online.indexOf('2026-10-18.html'));
    assert.match(online,new RegExp(`href="pews-news/${date}.html" aria-current="page"`));
    assert(!online.includes('target=')); assert(!online.includes('.pdf'));
    assert(!pdfs.includes('2026-10-18')); assert(!pdfs.includes('2026-10-25'));
    for (const d of ['2026-10-10','2026-10-04','2026-09-27']) assert(pdfs.includes(`${d}.pdf`));
  }
  const landing = fs.readFileSync(path.join(source,'news.html'),'utf8');
  assert.match(landing,/href="pews-news\/2026-10-18.html"><time datetime="2026-10-18"/);
  assert.deepEqual(require('../pews-news-data.json').editions,['2026-10-25','2026-10-18']);
});
test('25 October edition content and design remain unchanged outside the requested archive', () => {
  const cp = require('node:child_process');
  const previous = file => cp.execFileSync('git',['show',`2a57cb7:${file}`],{cwd:source,encoding:'utf8'}).replace(/\r/g,'');
  assert.deepEqual(require('../_content/pews-news/2026-10-25.json'),JSON.parse(previous('_content/pews-news/2026-10-25.json')));
  assert.deepEqual(require('../_content/pews-news-images.json')['2026-10-25'],JSON.parse(previous('_content/pews-news-images.json'))['2026-10-25']);
  const stripArchive = value => value.replace(/<nav class="pews-archive"[\s\S]*?<\/nav>/,'ARCHIVE').replace(/pews-news.css\?v=editorial-20261024-\d/g,'pews-news.css?version');
  assert.equal(stripArchive(fs.readFileSync(path.join(source,'pews-news/2026-10-25.html'),'utf8').replace(/\r/g,'')),stripArchive(previous('pews-news/2026-10-25.html')));
});
