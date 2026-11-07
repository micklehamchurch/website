const approvedNavigationSnapshot=require('./helpers/approved-navigation.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('./helpers/header-information-snapshot.cjs').fs;
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
test('News hub preserves real online editions, PDF resources and the Harvest destination',()=>{
 const html=fs.readFileSync(path.join(source,'news.html'),'utf8');
 for(const date of ['2026-10-25','2026-10-18'])assert(html.includes(`pews-news/${date}.html`));
 for(const date of ['2026-10-10','2026-10-04','2026-09-27'])assert(html.includes(`pews-news-${date}.pdf`));
 assert(html.includes('pews-news.html#edition-archive'));
 assert(html.includes('news/a-harvest-of-thankfulness.html'));
 assert(html.includes('Open red church doors frame autumn flowers'));
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
test('online archive has three real HTML editions and disjoint PDF-only archive on every page', () => {
  for (const date of ['2026-11-01','2026-10-25','2026-10-18']) {
    const html = fs.readFileSync(path.join(source,`pews-news/${date}.html`),'utf8');
    const online = html.match(/<section class="pews-archive-section pews-online-archive"[\s\S]*?<\/section>/)[0];
    const pdfs = html.match(/<section class="pews-archive-section pews-pdf-archive"[\s\S]*?<\/section>/)[0];
    assert.match(online,/2026 — 3 editions/);
    assert(online.indexOf('2026-11-01.html')<online.indexOf('2026-10-25.html')); assert(online.indexOf('2026-10-25.html')<online.indexOf('2026-10-18.html'));
    assert.match(online,new RegExp(`href="pews-news/${date}.html" aria-current="page"`));
    assert(!online.includes('target=')); assert(!online.includes('.pdf'));
    assert(!pdfs.includes('2026-11-01')); assert(!pdfs.includes('2026-10-18')); assert(!pdfs.includes('2026-10-25'));
    for (const d of ['2026-10-10','2026-10-04','2026-09-27']) assert(pdfs.includes(`${d}.pdf`));
  }
  const landing = fs.readFileSync(path.join(source,'news.html'),'utf8');
  assert.match(landing,/href="pews-news\/2026-10-18.html"/); assert.match(landing,/datetime="2026-10-18"/);
  assert.deepEqual(require('../pews-news-data.json').editions,['2026-11-01','2026-10-25','2026-10-18']);
});
test('25 October retains its editorial data, photographs and published calendar block', () => {
  const cp = require('node:child_process');
  const previous = (ref, file) => cp.execFileSync('git', ['show', ref + ':' + file], { cwd: source, encoding: 'utf8' });
  const date = '2026-10-25';
  const sourceFile = '_content/pews-news/' + date + '.json';
  assert.deepEqual(require('../' + sourceFile), JSON.parse(previous('2a57cb7', sourceFile)));
  const withoutQR = images => Object.fromEntries(Object.entries(images).filter(([key]) => key !== 'poppy-qr'));
  const imagesFile = '_content/pews-news-images.json';
  assert.deepEqual(withoutQR(require('../' + imagesFile)[date]), withoutQR(JSON.parse(previous('2a57cb7', imagesFile))[date]));
  const file = 'pews-news/' + date + '.html';
  const calendarBlock = html => html.match(/<section class="pews-calendar"[\s\S]*?<\/section>/)?.[0];
  const published = calendarBlock(previous('011c794', file));
  assert(published);
  assert.equal(calendarBlock(fs.readFileSync(path.join(source, file), 'utf8')), published);
});

test('published editions share a date-independent masthead and retain the approved donation change', () => {
  const cp = require('node:child_process');
  let masthead;
  for (const file of ['pews-news/2026-10-18.html', 'pews-news/2026-10-25.html']) {
    const html = fs.readFileSync(path.join(source, file), 'utf8');
    const hero = html.match(/<section class="pews-hero"[\s\S]*?<\/section>/)[0];
    assert(!hero.includes('2026-10'));
    for (const marker of ['Weekly news, services and events', 'church-card.webp 720w', 'church-hero.webp 1600w', 'alt=""']) assert(hero.includes(marker));
    assert.equal((hero.match(/<h1\b/g) || []).length, 1);
    if (masthead) assert.equal(hero, masthead);
    masthead = hero;
  }
  const file = 'pews-news/2026-10-18.html';
  const supportBlock = html => html.match(/<aside class="pews-support"[\s\S]*?<\/aside>/)?.[0];
  const approved = supportBlock(cp.execFileSync('git', ['show', '220af6e:' + file], { cwd: source, encoding: 'utf8' }));
  assert(approved);
  assert.equal(supportBlock(fs.readFileSync(path.join(source, file), 'utf8')), approved);
});

test('every RBL collection QR uses the shared scalable asset and exact verified donation destination',()=>{
 const url='https://www.mygivinghub.com/go?id=jZ7arYjOPa';
 const catalogue=require('../_content/pews-news-images.json');
 for(const images of Object.values(catalogue))if(images['poppy-qr'])assert.equal(images['poppy-qr'].href,url);
 for(const file of ['pews-news.html','pews-news/2026-10-18.html','pews-news/2026-10-25.html']){
 const html=fs.readFileSync(path.join(source,file),'utf8');
 const qr=html.match(/<a class="pews-qr"[\s\S]*?<\/a>/g);assert.equal(qr.length,1);
 assert(qr[0].includes('href="'+url+'"'));assert(qr[0].includes('rbl-mickleham-westhumble-qr.svg'));
 assert(qr[0].includes('alt="QR code for the Mickleham and Westhumble Royal British Legion collection"'));
 assert(!html.includes('/poppy-qr.png'));assert(qr[0].includes('Donate to the Royal British Legion'));
 }
});

test('1 November contains its exact collect, updated notices, Food Bank needs and source-backed Wintershall feature',()=>{
 const data=require('../_content/pews-news/2026-11-01.json'),html=fs.readFileSync(path.join(source,'pews-news/2026-11-01.html'),'utf8');
 assert.equal(data.subtitle,'All Saints’ Day'); assert.equal(data.services.length,1); assert.equal(data.services[0].time,'10am');
 for(const value of [data.readings,data.collect,data.foodbank.intro,data.foodbank.donations])assert(html.includes(text(value)),value);
 for(const section of data.sections)for(const notice of section.notices){for(const p of notice.paragraphs)assert(html.includes(text(p)),notice.title);assert(html.includes(text(notice.when)));if(notice.zoom)assert(html.includes(notice.zoom.url));}
 for(const feature of data.features){assert(html.includes(feature.title));for(const p of feature.paragraphs)assert(html.includes(text(p)));for(const link of feature.links)assert(html.includes(`href="${link.url.replaceAll('&','&amp;')}"`));}
 assert.deepEqual(data.foodbank.items,['Long Life Milk','Long Life Fruit Juice','Meat Meals for 1 (Frays pies, tinned spaghetti bolognese, beans and sausage etc)','Muesli/Cereal Bars','Toothbrushes (adults)','Squash']);
 for(const value of ['Tinned Rice Pudding','Shaving Foam','Chapel Farm Macmillan','Take a little Harvest home','Twentieth Sunday after Trinity'])assert(!html.includes(value),value);
 assert(html.indexOf('id="wintershall-nativity"')>html.indexOf('id="foodbank"'));
 assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(source,'assets/documents/news/pews-news/pews-news-2026-11-01.pdf'))).digest('hex'),'13a9d61e65c1a2dc7a51afe7c68c5e91966c0d90118c22f278a00a7ad25f679e');
 const images=require('../_content/pews-news-images.json')['2026-11-01'];for(const k of ['autumn-leaves','bible','bible-study','alpha','remembrance','poppy-qr','lights','snowman','soup','christingle','foodbank','nativity'])assert(html.includes(images[k].src),k);
 assert.equal(images.alpha.src,require('../_content/pews-news-images.json')['2026-10-25'].alpha.src);
});
test('all generated editions share one masthead and latest alias promotes the newest published source',()=>{
 let hero;
 for(const file of ['pews-news.html',...require('../pews-news-data.json').editions.map(date=>`pews-news/${date}.html`)]){
  const html=fs.readFileSync(path.join(source,file),'utf8'),current=html.match(/<section class="pews-hero"[\s\S]*?<\/section>/)[0];
  if(hero)assert.equal(current,hero);hero=current;
  assert(!current.includes('2026-11-01'));assert(!current.includes('2026-10-25'));
 }
 const alias=fs.readFileSync(path.join(source,'pews-news.html'),'utf8');assert(alias.includes('datetime="2026-11-01"'));assert(alias.includes('All Saints’ Day'));
 for(const date of ['2026-10-18','2026-10-25'])assert.deepEqual(require(`../_content/pews-news/${date}.json`),JSON.parse(approvedNavigationSnapshot(require('node:child_process').execFileSync('git',['show',`75794f2:_content/pews-news/${date}.json`],{cwd:source,encoding:'utf8'}))));
});
