const fs = require('node:fs');
const path = require('node:path');

const siteRoot = __dirname;
const outputPath = path.join(siteRoot, 'search-index.json');

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot|rsquo|lsquo|rdquo|ldquo|mdash|ndash);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ({ amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–' })[entity.toLowerCase()];
  });
}

function visibleText(html) {
  return decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template|iframe|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+\bhidden(?:\s|=|\/|>)[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]+\baria-hidden\s*=\s*["']true["'][^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<img\b[^>]*\balt\s*=\s*(["'])(.*?)\1[^>]*>/gi, ' $2 ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html, name) {
  const meta = html.match(new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*["']${name}["'])[^>]*>`, 'i'))?.[0] || '';
  return decodeEntities(meta.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2] || '');
}

function fieldText(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i'));
  return match ? visibleText(match[1]) : '';
}

const eventDataPath = path.join(siteRoot, 'events.json');
const eventData = fs.existsSync(eventDataPath) ? JSON.parse(fs.readFileSync(eventDataPath, 'utf8')) : { searchPages: [], items: [] };
const eventContent = (eventData.items || []).map(event => [event.title, event.label, event.time, event.scheduleLabel, event.venueLabel].filter(Boolean).join(' — ')).join('. ');
const eventSearchPages = new Set(eventData.searchPages || []);
const pages = fs.readdirSync(siteRoot, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(entry => {
    const filename = entry.name;
    const html = fs.readFileSync(path.join(siteRoot, filename), 'utf8');
    if (metaContent(html, 'search-index').toLowerCase() === 'exclude') return null;
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1] || html;
    const title = fieldText(main, 'h1') || fieldText(html, 'title') || filename.replace(/\.html$/i, '');
    const documentTitle = fieldText(html, 'title');
    const description = metaContent(html, 'description');
    let content = visibleText(main);
    if (eventSearchPages.has(filename) && eventContent) content = `${content} ${eventContent}`.trim();
    return { url: filename, title, documentTitle, description, content };
  })
  .filter(Boolean);

fs.writeFileSync(outputPath, `${JSON.stringify(pages, null, 2)}\n`, 'utf8');
console.log(`Built ${path.basename(outputPath)} with ${pages.length} pages from current HTML content.`);
