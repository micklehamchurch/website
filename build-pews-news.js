// Web editions share publication identity/status/PDFs with the existing admin catalogue.
const fs = require('node:fs');
const path = require('node:path');
const model = require('./publications-model');
const root = __dirname;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function text(value) {
  return String(value).split(/([\w.+-]+@[\w.-]+\.[a-z]{2,}|www\.micklehamchoral\.org\.uk|\b0(?:\d{3} \d{3} \d{4}|\d{4} \d{6})\b)/gi).map(part => {
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(part)) return `<a href="mailto:${esc(part)}">${esc(part)}</a>`;
    if (part === 'www.micklehamchoral.org.uk') return `<a href="https://${part}">${part}</a>`;
    if (/^0(?:\d{3} \d{3} \d{4}|\d{4} \d{6})$/.test(part)) return `<a href="tel:${part.replace(/ /g,'')}">${esc(part)}</a>`;
    return esc(part);
  }).join('');
}
function zoom(data, label) {
  const url = new URL(data.url);
  if (url.protocol !== 'https:' || url.hostname !== 'us02web.zoom.us') throw Error('Invalid Zoom link');
  return `<a class="btn btn-green" href="${esc(data.url)}">${esc(label)}</a><p class="pews-codes">Meeting ID: <strong>${esc(data.meeting)}</strong><br>Passcode: <strong>${esc(data.passcode)}</strong></p>`;
}
function build(siteRoot = root) {
  const root = siteRoot;
  const records = model.ordered(model.parse(JSON.parse(fs.readFileSync(path.join(root,'_content/publications.json'))))).filter(r => r.type === 'pews-news');
  const imageCatalogue = JSON.parse(fs.readFileSync(path.join(root,'_content/pews-news-images.json')));
  const editions = new Map();
  for (const record of records) {
    const file = path.join(root,'_content/pews-news',`${record.date}.json`);
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file));
    if (data.date !== record.date || !Array.isArray(data.sections) || !data.sections.length || !Array.isArray(data.services) || !data.services.length) throw Error('Invalid Pews News edition');
    const ids = new Set(['main-content', 'this-sunday', 'sunday-heading', 'harvest', 'harvest-heading', 'foodbank', 'foodbank-heading']);
    for (const section of data.sections) {
      if (!/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id) || !Array.isArray(section.notices)) throw Error('Invalid section identity');
      ids.add(section.id);
    }
    editions.set(record.date, data);
  }
  const alt = {'fall-back':'Fall back: set your clocks back an hour','bible':'An open Bible','bible-study':'Reading the Bible','alpha':'The Alpha Course: explore the meaning of life','macmillan':'Macmillan Cancer Support: World’s Biggest Coffee Morning','link-to-hope':'Link to Hope: it begins with an ordinary shoebox','coffee-cake':'A cup of coffee and a slice of cake','remembrance':'A soldier among remembrance poppies','poppy-qr':'Scan to donate to the local Royal British Legion collection','pcc':'People gathered around a meeting table','lights':'Hands holding a lighted candle','snowman':'The Snowman by Raymond Briggs','soup':'A bowl of autumn soup','pumpkins':'Harvest pumpkin with autumn leaves','foodbank-bag':'A bag of Food Bank donations','foodbank':'Original Food Bank artwork showing donated groceries','zoom':'People joining a service online'};
  let images;
  function img(key, className = '') {
    const entry = images[key];
    if (entry && (!Number.isInteger(entry.width) || entry.width < 1 || !Number.isInteger(entry.height) || entry.height < 1)) throw Error(`Invalid image dimensions: ${key}`);
    if (!entry || !/^assets\/images\/pews-news\/[\w/.-]+\.(webp|png)$/.test(entry.src) || entry.src.includes('..') || !fs.existsSync(path.join(root,entry.src))) throw Error(`Missing image: ${key}`);
    return `<img class="${className}" src="${esc(entry.src)}" alt="${esc(entry.alt || alt[key] || '')}" width="${entry.width}" height="${entry.height}" loading="lazy" decoding="async">`;
  }
  const archive = current => [...new Set(records.map(r=>r.date.slice(0,4)))].map(year => `<details class="pews-year" ${current.startsWith(year)?'open':''}><summary>${year} <span>${records.filter(r=>r.date.startsWith(year)).length} editions</span></summary><ul>${records.filter(r=>r.date.startsWith(year)).map(r=>`<li><a href="${editions.has(r.date)?`pews-news/${r.date}.html`:r.pdf}" ${r.date===current?'aria-current="page"':''}>${esc(model.dateLabel(r).replace(/^Sunday,? /,''))}${editions.has(r.date)?'':' <small>PDF</small>'}</a></li>`).join('')}</ul></details>`).join('');
  function render(record,data, nested) {
    images = imageCatalogue[record.date] || {};
    const online = `<section class="pews-online"><p class="eyebrow">Worship together</p><h2>Join us online</h2><p>If you are zooming, please try and join at least five minutes before the service is due to start.</p>${zoom(data.zoom,'Join Sunday’s service')}<details><summary>Join by telephone</summary><p>Call any of these numbers to listen to the service. There will be a recorded message and you will be asked to enter the Meeting ID and then the Passcode.</p><ul>${data.zoom.phones.map(p=>`<li>${text(p)}</li>`).join('')}</ul></details></section>${data.clock ? `<section class="pews-clock">${img(data.clock.image)}<h2>${esc(data.clock.title)}</h2><p>${esc(data.clock.text)}</p></section>` : ''}`;
    const download = `<a class="btn btn-outline-green" href="${esc(record.pdf)}" download>Download original PDF</a>`;
    const sections = data.sections.map(section => `<section id="${section.id}" class="pews-notices" aria-labelledby="${section.id}-heading"><h2 id="${section.id}-heading">${esc(section.title)}</h2>${section.notices.map(n=>`<article class="pews-notice">${n.image?img(n.image,'pews-notice-image'):''}<div><p class="pews-when">${esc(n.when)}</p><h3>${esc(n.title)}</h3>${n.paragraphs.map(p=>`<p>${text(p)}</p>`).join('')}${n.emphasis?`<p class="pews-important"><strong>${text(n.emphasis)}</strong></p>`:''}${n.zoom?zoom(n.zoom,'Join the celebration on Zoom'):''}${n.extraImage?`<a class="pews-qr" href="${images[n.extraImage].src}">${img(n.extraImage)}<span>View donation QR code</span></a>`:''}</div></article>`).join('')}</section>`).join('');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${nested?'<base href="../">':''}
<meta name="generated-pews-edition" content="true">${nested?'':'<meta name="search-index" content="exclude">'}<title>Pews News · ${esc(model.dateLabel(record))} | St Michael &amp; All Angels</title>
<meta name="description" content="${esc(data.subtitle)}. Services, parish notices and dates from Pews News, ${esc(model.dateLabel(record))}.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="v1-accessibility.css"><link rel="stylesheet" href="pews-news.css"><link rel="icon" href="favicon.ico"><script src="site.js" defer></script><script src="pews-news.js" defer></script></head>
<body><a class="skip-link" href="${nested?`pews-news/${record.date}.html`: 'pews-news.html'}#main-content">Skip to main content</a><header class="site-header" data-site-header></header>
<main id="main-content" tabindex="-1" class="pews-page"><section class="page-hero pews-hero"><div class="container"><a class="pews-back" href="news.html">← News from St Michael’s</a><p class="eyebrow">St Michael &amp; All Angels · Mickleham</p><h1>Pews News</h1><p class="lead">Our weekly news, worship and parish life.</p></div></section>
<div class="pews-layout container"><nav class="pews-archive" aria-label="Pews News archive"><details class="pews-archive-toggle" open><summary>Browse Pews News archive</summary><div class="pews-archive-body"><h2>Past editions</h2><p>Weekly news from our parish</p>${archive(record.date)}<a class="pews-all-news" href="news.html">News &amp; Parish Magazine →</a></div></details></nav>
<article class="pews-edition"><header class="pews-edition-heading"><p class="eyebrow">Weekly edition</p><h2><time datetime="${record.date}">${esc(model.dateLabel(record))}</time></h2><p class="pews-subtitle">${esc(data.subtitle)}</p>${download}</header>
<section class="pews-sunday" id="this-sunday" aria-labelledby="sunday-heading"><h2 id="sunday-heading">This Sunday</h2><div class="pews-services">${data.services.map(s=>`<div><p class="pews-service-time">${esc(s.time)}</p><h3>${esc(s.title)}</h3><p>${esc(s.place)}</p></div>`).join('')}</div><h3>Today’s readings</h3><p>${esc(data.readings)}</p><div class="pews-collect"><h3>The Collect for today</h3><p>${esc(data.collect)}</p></div></section>
<div class="pews-mobile-support">${online}</div>
${sections}${data.pumpkins ? `<section class="pews-community" id="harvest" aria-labelledby="harvest-heading">${img(data.pumpkinImage,'pews-pumpkin')}<h2 id="harvest-heading">Take a little Harvest home</h2><p>${text(data.pumpkins)}</p></section>` : ''}
${data.foodbank ? `<section class="pews-foodbank" id="foodbank" aria-labelledby="foodbank-heading"><p class="eyebrow">Caring for our neighbours</p><h2 id="foodbank-heading">News from the Food Bank</h2><figure>${img(data.foodbank.image)}<figcaption>From this week’s Pews News</figcaption></figure><p>${text(data.foodbank.intro)}</p><ul>${data.foodbank.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul><p>${text(data.foodbank.donations)}</p></section>` : ''}
<footer class="pews-edition-footer"><h2>Keep a copy of this edition</h2><p>The original four-page Pews News is also available to download.</p>${download}<p><a href="pews-news.html">Latest online edition →</a></p></footer></article>
<aside class="pews-support" aria-label="Service online and edition contents">${online}<nav class="pews-on-page" aria-label="In this edition"><h2>In this edition</h2><a href="${nested?`pews-news/${record.date}.html`:'pews-news.html'}#this-sunday">This Sunday</a>${data.sections.map(s=>`<a href="${nested?`pews-news/${record.date}.html`:'pews-news.html'}#${s.id}">${esc(s.title)}</a>`).join('')}${data.pumpkins ? `<a href="${nested?`pews-news/${record.date}.html`:'pews-news.html'}#harvest">Harvest pumpkins</a>` : ''}${data.foodbank ? `<a href="${nested?`pews-news/${record.date}.html`:'pews-news.html'}#foodbank">Food Bank</a>` : ''}</nav></aside></div></main><footer class="footer" data-site-footer></footer></body></html>\n`;
  }
  fs.mkdirSync(path.join(root,'pews-news'),{recursive:true});
  for (const record of records.filter(r=>editions.has(r.date))) fs.writeFileSync(path.join(root,'pews-news',`${record.date}.html`),render(record,editions.get(record.date),true));
  const latest = records.find(r=>editions.has(r.date));
  if (latest) fs.writeFileSync(path.join(root,'pews-news.html'),render(latest,editions.get(latest.date),false));
  else fs.writeFileSync(path.join(root,'pews-news.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pews News | St Michael &amp; All Angels</title><link rel="stylesheet" href="styles.css"><script src="site.js" defer></script></head><body><a class="skip-link" href="#main-content">Skip to main content</a><header class="site-header" data-site-header></header><main id="main-content" class="section container" tabindex="-1"><h1>Pews News</h1><p>Online editions will appear here when available.</p><a class="btn btn-green" href="news.html">Browse Pews News PDFs and Parish Magazine</a></main><footer class="footer" data-site-footer></footer></body></html>\n`);
  // Remove generated pages when an edition is withdrawn from the shared catalogue.
  for (const file of fs.readdirSync(path.join(root,'pews-news'))) if (/^\d{4}-\d{2}-\d{2}\.html$/.test(file) && !editions.has(file.slice(0,10))) fs.unlinkSync(path.join(root,'pews-news',file));
  fs.writeFileSync(path.join(root,'pews-news-data.json'),JSON.stringify({editions:[...editions.keys()]},null,2)+'\n');
  console.log(`Built ${editions.size} online Pews News editions.`);
}
if (require.main === module) build();
module.exports = { build, text };
