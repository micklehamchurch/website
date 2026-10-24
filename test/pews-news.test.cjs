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
  for (const section of data.sections) for (const notice of section.notices) assert(html.includes(notice.title.replaceAll('’', '’').replaceAll('&','&amp;')), notice.title);
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
    for (const date of dates) fs.writeFileSync(path.join(root,'_content/pews-news',`${date}.json`),JSON.stringify({...data,date,subtitle:'Fixture <script>alert(1)</script>'}));
    fs.writeFileSync(path.join(root,'_content/pews-news-images.json'),JSON.stringify(Object.fromEntries(dates.map(d=>[d,images]))));
    const save = () => fs.writeFileSync(path.join(root,'_content/publications.json'),JSON.stringify({publications:records}));
    save(); build(root);
    let html = fs.readFileSync(path.join(root,'pews-news.html'),'utf8');
    assert.match(html,/2027-01-03/); assert.match(html,/&lt;script&gt;/); assert(!html.includes('2025-01-05'));
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
test('plain text is escaped and only contacts become actionable links', () => {
  assert.equal(text('<script>'), '&lt;script&gt;');
  assert.match(text('Email admin@micklehamchurch.org.uk, call 01372 376443.'), /href="mailto:admin@micklehamchurch.org.uk"/);
  assert.match(text('Call 01372 376443.'), /href="tel:01372376443"/);
});
