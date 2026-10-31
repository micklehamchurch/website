// Online editions share the existing publication identity, status and original PDF.
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
  return `<a class="btn btn-green" href="${esc(data.url)}">${esc(label)}</a><p class="pews-codes"><span>Meeting ID <strong>${esc(data.meeting)}</strong></span><span>Passcode <strong>${esc(data.passcode)}</strong></span></p>`;
}
function dateBadge(dates = []) {
  if (!dates.length) return '';
  const date = new Date(dates[0]+'T12:00:00Z');
  const format = options => new Intl.DateTimeFormat('en-GB',{...options,timeZone:'UTC'}).format(date);
  return `<div class="pews-date-badge${dates.length > 1 ? ' pews-date-multiple' : ''}" aria-hidden="true"><span>${dates.length > 1 ? format({month:'short'}) : format({weekday:'short'})}</span><strong>${dates.map(d=>Number(d.slice(8))).join(' &amp; ')}</strong><span>${dates.length > 1 ? 'DATES' : format({month:'short'})}</span></div>`;
}
function build(siteRoot = root) {
  const root = siteRoot;
  const allRecords = model.ordered(model.parse(JSON.parse(fs.readFileSync(path.join(root,'_content/publications.json')))));
  const records = allRecords.filter(r => r.type === 'pews-news');
  const imageCatalogue = JSON.parse(fs.readFileSync(path.join(root,'_content/pews-news-images.json')));
  const editions = new Map();
  for (const record of records) {
    const file = path.join(root,'_content/pews-news',`${record.date}.json`);
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file));
    if (data.date !== record.date || !Array.isArray(data.sections) || !data.sections.length || !Array.isArray(data.services) || !data.services.length) throw Error('Invalid Pews News edition');
    const ids = new Set(['main-content','pews-title','edition-title','edition-archive','this-sunday','sunday-heading','join-online','online-heading','poppy-donations','harvest','harvest-heading','foodbank','foodbank-heading']);
    for (const section of data.sections) {
      if (!/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id) || !Array.isArray(section.notices)) throw Error('Invalid section identity');
      if (section.layout && !['timeline','grid'].includes(section.layout)) throw Error('Invalid section layout');
      ids.add(section.id);
      ids.add(`${section.id}-heading`);
      section.notices.forEach((notice,index) => {
        if (notice.dates && (!Array.isArray(notice.dates) || !notice.dates.length || !notice.dates.every(model.dateValid))) throw Error('Invalid notice dates');
        if (notice.placement && notice.placement !== 'sidebar') throw Error('Invalid notice placement');
        notice.anchor = `notice-${section.id}-${index}`;
      });
    }
    for (const feature of data.features || []) {
      if (!/^[a-z][a-z0-9-]*$/.test(feature.id) || ids.has(feature.id) || !feature.title || !Array.isArray(feature.paragraphs) || !feature.paragraphs.length) throw Error('Invalid edition feature');
      ids.add(feature.id); ids.add(`${feature.id}-heading`);
      for (const link of feature.links || []) {
        const url = new URL(link.url);
        if (url.protocol !== 'https:' || url.username || url.password || !link.label) throw Error('Invalid feature link');
      }
    }
    editions.set(record.date,data);
  }
  const alt = {'fall-back':'Fall back: set your clocks back an hour','bible':'An open Bible','bible-study':'Reading the Bible','alpha':'The Alpha Course: explore the meaning of life','macmillan':'Macmillan Cancer Support: World’s Biggest Coffee Morning','link-to-hope':'Link to Hope: it begins with an ordinary shoebox','coffee-cake':'A cup of coffee and a slice of cake','remembrance':'A soldier among remembrance poppies','poppy-qr':'Scan to donate to the local Royal British Legion collection','pcc':'People gathered around a meeting table','lights':'Hands holding a lighted candle','snowman':'The Snowman by Raymond Briggs','soup':'A bowl of autumn soup','pumpkins':'Harvest pumpkin with autumn leaves','foodbank-bag':'A bag of Food Bank donations','foodbank':'Original Food Bank artwork showing donated groceries','zoom':'People joining a service online'};
  function render(record,data,nested) {
    const images = imageCatalogue[record.date] || {};
    const currentPath = nested ? `pews-news/${record.date}.html` : 'pews-news.html';
    const headingArt = data.editionArt || data.clock;
    const anchor = id => `${currentPath}#${id}`;
    // The complete optimized artwork set is about 410 KB. Eager loading also
    // lets native printing include illustrations beyond the current viewport.
    function img(key, className = '', eager = true) {
      const entry = images[key];
      if (!entry || !Number.isInteger(entry.width) || entry.width < 1 || !Number.isInteger(entry.height) || entry.height < 1) throw Error(`Invalid image dimensions: ${key}`);
      if (!/^assets\/images\/pews-news\/[\w/.-]+\.(webp|png|svg)$/.test(entry.src) || entry.src.includes('..') || !fs.existsSync(path.join(root,entry.src))) throw Error(`Missing image: ${key}`);
      return `<img class="${className}" src="${esc(entry.src)}" alt="${esc(entry.alt || alt[key] || '')}" width="${entry.width}" height="${entry.height}" loading="${eager?'eager':'lazy'}" decoding="async">`;
    }
    const download = `<a class="pews-download" href="${esc(record.pdf)}" download><span aria-hidden="true">↓</span> Download original PDF</a>`;
    const qr = n => n.extraImage ? `<a class="pews-qr" href="${esc(images[n.extraImage]?.href || images[n.extraImage]?.src)}">${img(n.extraImage)}<span>${images[n.extraImage]?.href ? 'Donate to the Royal British Legion' : 'View donation QR code'}</span></a>` : '';
    const body = (n, paragraphs = n.paragraphs) => paragraphs.map(p=>`<p>${text(p)}</p>`).join('') + (n.zoom ? zoom(n.zoom,'Join the celebration on Zoom') : '');
    const warning = n => n.emphasis ? `<p class="pews-important"><strong>${text(n.emphasis)}</strong></p>` : '';
    const allNotices = data.sections.flatMap(s=>s.notices);
    const sideNotices = allNotices.filter(n=>n.placement==='sidebar');
    const poppies = allNotices.find(n=>n.poppyFeature);
    const magazine = allRecords.find(r=>r.type==='parish-magazine');
    function archiveGroup(items, title, className, online) {
      if (!items.length) return '';
      const years = [...new Set(items.map(r=>r.date.slice(0,4)))];
      return `<section class="pews-archive-section ${className}" aria-label="${title}"><h3>${title}</h3>${years.map(year=>{
        const group = items.filter(r=>r.date.startsWith(year));
        return `<details class="pews-year" ${record.date.startsWith(year)?'open':''}><summary aria-label="${year} — ${group.length} ${group.length===1?'edition':'editions'}">${year}<span>${group.length} ${group.length===1?'edition':'editions'}</span></summary><ul>${group.map(r=>`<li><a href="${online?`pews-news/${r.date}.html`:esc(r.pdf)}" ${r.date===record.date?'aria-current="page"':''}>${esc(model.dateLabel(r).replace(/^[^,]+, /,''))}${online?'':' <small>PDF</small>'}</a></li>`).join('')}</ul></details>`;
      }).join('')}</section>`;
    }
    const archive = archiveGroup(records.filter(r=>editions.has(r.date)), 'Online Editions', 'pews-online-archive', true)
      + archiveGroup(records.filter(r=>!editions.has(r.date)), 'Past PDF Editions', 'pews-pdf-archive', false);
    const timeline = section => `<section class="pews-timeline" id="${section.id}" aria-labelledby="${section.id}-heading"><h2 id="${section.id}-heading">${esc(section.title)}</h2><div>${section.notices.filter(n=>n.placement!=='sidebar').map(n=>`<article class="pews-notice pews-timeline-row" id="${n.anchor}">${dateBadge(n.dates)}<div><h3>${esc(n.title)}</h3><p class="pews-when">${esc(n.when)}</p>${body(n)}${warning(n)}${qr(n)}</div>${n.image?img(n.image,'pews-timeline-image'):''}</article>`).join('')}</div></section>`;
    const calendar = section => `<section class="pews-calendar" id="${section.id}" aria-labelledby="${section.id}-heading"><div class="pews-section-title"><div><p class="eyebrow">At a glance</p><h2 id="${section.id}-heading">${esc(section.title)}</h2></div><p>Dates for your diary.<br>Open a notice for full details.</p></div><div class="pews-calendar-grid">${section.notices.filter(n=>n.placement!=='sidebar').map(n=>`<article class="pews-notice pews-calendar-card${n.featured?' pews-feature-card':''}" id="${n.anchor}"><div class="pews-card-top">${dateBadge(n.dates)}${n.image?img(n.image,'pews-card-image'):''}</div><p class="pews-when">${esc(n.when)}</p><h3>${esc(n.title)}</h3>${warning(n)}<details class="pews-notice-details"><summary aria-label="Full details: ${esc(n.title)}">Full details <span aria-hidden="true">+</span></summary><div>${body(n,n.poppyFeature?n.paragraphs.slice(0,1):n.paragraphs)}${n.poppyFeature?`<p><a href="${anchor('poppy-donations')}">Poppies &amp; donation information →</a></p>`:qr(n)}</div></details></article>`).join('')}</div></section>`;
    const timelineSections = data.sections.filter(s=>(s.layout||'timeline')==='timeline').map(timeline).join('');
    const calendarSections = data.sections.filter(s=>s.layout==='grid').map(calendar).join('');
    const support = `<aside class="pews-support" aria-label="Featured parish information">${sideNotices.map(n=>`<article class="pews-notice pews-feature-panel${n.featured?' pews-feature-panel-lead':''}" id="${n.anchor}">${n.image?`<div class="pews-feature-picture">${img(n.image,'',true)}</div>`:''}<div class="pews-feature-copy"><p class="eyebrow">In our community</p><h2>${esc(n.title)}</h2><p class="pews-when">${esc(n.when)}</p>${body(n)}${warning(n)}${qr(n)}</div></article>`).join('')}${poppies?`<section class="pews-poppy-panel" id="poppy-donations">${poppies.image?img(poppies.image,'pews-poppy-image'):''}<p class="eyebrow">Remembrance</p><h2>Poppies &amp; remembering</h2>${body(poppies,poppies.paragraphs.slice(1))}<details><summary>Donate by QR code</summary>${qr(poppies)}</details><a class="pews-text-link" href="${anchor(poppies.anchor)}">Remembrance Sunday service →</a></section>`:''}<nav class="pews-quick-links" aria-label="Quick links"><h2>Quick links</h2>${data.sections.map(s=>`<a href="${anchor(s.id)}">${esc(s.title)} <span aria-hidden="true">→</span></a>`).join('')}${magazine?`<a href="${esc(magazine.pdf)}">${esc(new Intl.DateTimeFormat('en-GB',{month:'long',timeZone:'UTC'}).format(new Date(magazine.date)))} Parish Magazine <span aria-hidden="true">↗</span></a>`:''}${data.foodbank?`<a href="${anchor('foodbank')}">Food Bank this week <span aria-hidden="true">→</span></a>`:''}${download}</nav></aside>`;
    const features = (data.features || []).map(feature => `<section class="pews-community pews-edition-feature" id="${esc(feature.id)}" aria-labelledby="${esc(feature.id)}-heading">${feature.image?img(feature.image,'pews-pumpkin'):''}<div><h2 id="${esc(feature.id)}-heading">${esc(feature.title)}</h2>${feature.paragraphs.map(p=>`<p>${text(p)}</p>`).join('')}<div class="pews-feature-links">${(feature.links || []).map(link=>`<p>${esc(link.label)}: <a href="${esc(link.url)}">${esc(link.url)}</a></p>`).join('')}</div></div></section>`).join('');
    const hero = data.heroImage || 'assets/images/about/church-hero.webp';
    if (!/^assets\/images\/[a-zA-Z0-9/_-]+\.(?:webp|jpg)$/.test(hero) || hero.includes('..')) throw Error('Invalid hero asset');
    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${nested?'<base href="../">':''}
<meta name="generated-pews-edition" content="true">${nested?'':'<meta name="search-index" content="exclude">'}
<title>Pews News · ${esc(model.dateLabel(record))} | St Michael &amp; All Angels</title>
<meta name="description" content="${esc(data.subtitle)}. Services, parish notices and dates from Pews News, ${esc(model.dateLabel(record))}.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="v1-accessibility.css"><link rel="stylesheet" href="pews-news.css?v=edition-20261031-1">
<link rel="icon" href="favicon.ico"><script src="site.js" defer></script><script src="pews-news.js?v=editorial-20261024-2" defer></script></head>
<body><a class="skip-link" href="${currentPath}#main-content">Skip to main content</a><header class="site-header" data-site-header></header>
<main id="main-content" tabindex="-1" class="pews-page">
<section class="pews-hero" aria-labelledby="pews-title"><img class="pews-hero-photo" src="${esc(hero)}"${hero==='assets/images/about/church-hero.webp'?' srcset="assets/images/about/church-card.webp 720w, assets/images/about/church-hero.webp 1600w" sizes="(min-width:1600px) 1600px, 100vw"':''} alt="" decoding="async" width="1600" height="899" fetchpriority="high"><div class="pews-hero-inner"><div class="pews-hero-title"><p class="pews-label">News</p><h1 id="pews-title">Pews News</h1><p>Weekly news, services and events</p></div></div></section>
<nav class="pews-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><a href="news.html">News</a><span aria-hidden="true">›</span><a href="pews-news.html">Pews News</a><span aria-hidden="true">›</span><span>${esc(model.dateLabel(record).replace(/^[^,]+, /,''))}</span></nav>
<div class="pews-layout"><nav class="pews-archive" id="edition-archive" aria-label="Pews News archive"><details class="pews-archive-toggle" open><summary>Browse editions</summary><div class="pews-archive-body"><h2>Pews News</h2><p>Read the latest edition or browse our archive.</p>${archive}<a class="pews-all-news" href="news.html">News &amp; Parish Magazine →</a></div></details></nav>
<article class="pews-edition" aria-labelledby="edition-title">
<header class="pews-edition-heading"><div><p class="eyebrow"><time datetime="${record.date}">${esc(model.dateLabel(record))}</time></p><h2 id="edition-title">Pews News</h2><p class="pews-subtitle">${esc(data.subtitle)}</p></div>${headingArt?`<figure class="pews-clock">${img(headingArt.image,'',true)}${headingArt.text?`<figcaption>${esc(headingArt.text)}</figcaption>`:''}</figure>`:''}</header>
<section class="pews-sunday" id="this-sunday" aria-labelledby="sunday-heading"><h2 id="sunday-heading">This Sunday</h2><div class="pews-services">${data.services.map(s=>`<div><span class="pews-service-symbol" aria-hidden="true">◷</span><div><p class="pews-service-time">${esc(s.time)}</p><h3>${esc(s.title)}</h3><p>${esc(s.place)}</p></div></div>`).join('')}</div><div class="pews-liturgy"><section><span aria-hidden="true">▤</span><div><h3>Today’s readings</h3><p>${esc(data.readings)}</p></div></section><section class="pews-collect"><span aria-hidden="true">✝</span><div><h3>The Collect for today</h3><p>${esc(data.collect)}</p></div></section></div></section>
<section class="pews-online" id="join-online" aria-labelledby="online-heading"><div class="pews-online-intro"><span class="pews-online-symbol" aria-hidden="true">▹</span><div><h2 id="online-heading">Join the service on Zoom</h2><p>If you are zooming, please try and join at least five minutes before the service is due to start.</p></div></div><div class="pews-online-action">${zoom(data.zoom,'Join Sunday’s service')}</div><details class="pews-telephone" open><summary>Join by telephone</summary><p>Call any of these numbers to listen to the service. There will be a recorded message and you will be asked to enter the Meeting ID and then the Passcode.</p><ul>${data.zoom.phones.map(p=>`<li>${text(p)}</li>`).join('')}</ul></details></section>
${timelineSections}
${support}
${calendarSections}
${data.pumpkins?`<section class="pews-community" id="harvest" aria-labelledby="harvest-heading">${img(data.pumpkinImage,'pews-pumpkin')}<div><p class="eyebrow">A little colour for your home</p><h2 id="harvest-heading">Take a little Harvest home</h2><p>${text(data.pumpkins)}</p></div></section>`:''}
${data.foodbank?`<section class="pews-foodbank" id="foodbank" aria-labelledby="foodbank-heading"><header><p class="eyebrow">Caring for our neighbours</p><h2 id="foodbank-heading">News from the Food Bank</h2></header><div class="pews-foodbank-body"><figure>${img(data.foodbank.image)}<figcaption>Original artwork from this week’s Pews News</figcaption></figure><div><p>${text(data.foodbank.intro)}</p><ul>${data.foodbank.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>${data.foodbank.note?`<p>${text(data.foodbank.note)}</p>`:''}<p>${text(data.foodbank.donations)}</p></div></div></section>`:''}${features}
<footer class="pews-edition-footer"><div><h2>Prefer a paper copy?</h2><p>Keep the original Pews News to read or print.</p></div>${download}</footer>
</article></div></main><footer class="footer" data-site-footer></footer></body></html>\n`;
  }
  fs.mkdirSync(path.join(root,'pews-news'),{recursive:true});
  for (const record of records.filter(r=>editions.has(r.date))) fs.writeFileSync(path.join(root,'pews-news',`${record.date}.html`),render(record,editions.get(record.date),true));
  const latest = records.find(r=>editions.has(r.date));
  if (latest) fs.writeFileSync(path.join(root,'pews-news.html'),render(latest,editions.get(latest.date),false));
  else fs.writeFileSync(path.join(root,'pews-news.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pews News | St Michael &amp; All Angels</title><link rel="stylesheet" href="styles.css"><script src="site.js" defer></script></head><body><a class="skip-link" href="#main-content">Skip to main content</a><header class="site-header" data-site-header></header><main id="main-content" class="section container" tabindex="-1"><h1>Pews News</h1><p>Online editions will appear here when available.</p><a class="btn btn-green" href="news.html">Browse Pews News PDFs and Parish Magazine</a></main><footer class="footer" data-site-footer></footer></body></html>\n`);
  for (const file of fs.readdirSync(path.join(root,'pews-news'))) if (/^\d{4}-\d{2}-\d{2}\.html$/.test(file) && !editions.has(file.slice(0,10))) fs.unlinkSync(path.join(root,'pews-news',file));
  fs.writeFileSync(path.join(root,'pews-news-data.json'),JSON.stringify({editions:[...editions.keys()]},null,2)+'\n');
  // Keep a readable, published-only landing projection, including with JavaScript off.
  const landingPath = path.join(root, 'news.html');
  if (fs.existsSync(landingPath)) {
    const latestRecord = records[0];
    const readPath = r => editions.has(r.date) ? 'pews-news/' + r.date + '.html' : esc(r.pdf);
    const landing = latestRecord ? '<p class="eyebrow">Weekly parish life</p><h2>Pews News</h2><h3>' + esc(model.dateLabel(latestRecord)) + '</h3><p>' + esc(latestRecord.description) + '</p><div class="publication-actions"><a class="btn btn-green" href="' + readPath(latestRecord) + '">Read Pews News</a><a class="btn btn-outline-green" href="' + esc(latestRecord.pdf) + '" download>Download PDF</a></div>' + (records.length>1 ? '<h3 class="pews-recent-heading">Recent editions</h3><ul class="pews-recent-editions">' + records.slice(1,5).map(r=>'<li><a href="' + readPath(r) + '"><time datetime="' + r.date + '">' + esc(model.dateLabel(r).replace(/^[^,]+, /,'')) + '</time><span>' + (editions.has(r.date)?'Online →':'PDF ↗') + '</span></a></li>').join('') + '</ul>' : '') + '<a class="pews-view-all" href="pews-news.html#edition-archive">View all Pews News →</a>' : '<h2>Pews News</h2><p>The next edition will appear here when available.</p>';
    const html = fs.readFileSync(landingPath,'utf8').replace(/(<!-- pews-hub:start -->)[\s\S]*?(<!-- pews-hub:end -->)/, '$1' + landing + '$2');
    fs.writeFileSync(landingPath,html);
  }

  console.log(`Built ${editions.size} online Pews News editions.`);
}
if (require.main === module) build();
module.exports = { build, text };
