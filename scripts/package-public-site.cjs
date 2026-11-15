'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const allowlistFile = path.join(__dirname, 'public-site-files.txt');
const allowedRoots = new Set(['admin', 'assets', 'news', 'pews-news']);
// Preserve the existing public download URL for this edition.
const novemberMagazine = 'assets/documents/news/parish-magazine/MPM Nov 2026 online.pdf';
const approvedNotices = new Set([
  'assets/fonts/home/DM-Sans-OFL.txt',
  'assets/fonts/home/Playfair-Display-OFL.txt'
]);
const credentialPatterns = [
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  /\b(?:AIza[A-Za-z0-9_-]{35}|GOCSPX-[A-Za-z0-9_-]{20,})\b/,
  /\bAccountKey=[a-z0-9+/]{35,}={0,2}(?=[;"'\s]|$)/i,
  /[?&](?:amp;)?sig=[a-z0-9%+/_=-]{25,}/i
];
const restrictedKey = /^(?:privateNotes?|internalNotes?|homeAddress|clientSecret|refreshToken|accessToken|apiKey|privateKey|password)$/i;
const unpublished = /^(?:draft|unpublished|private|hidden|archived|withdrawn)$/i;
const textFile = /\.(?:html|css|js|mjs|json|xml|ics|svg|txt)$/i;

function fail(message, file) {
  throw new Error(message + (file ? ': ' + file : ''));
}

function allowedPath(file) {
  const parts = file.split('/');
  return (file === novemberMagazine || /^[\w.-]+(?:\/[\w.-]+)*$/.test(file))
    && !parts.some(part => part.startsWith('.') || part.startsWith('_'))
    && (parts.length === 1 || allowedRoots.has(parts[0]))
    && !/(?:^|\/)(?:test|tests|fixtures|internal|originals|source|sources)(?:\/|$)|(?:^|\/)(?:package(?:-lock)?\.json|local\.settings\.json|admin-identities\.json|[^/]+\.test\.[^/]+|build-[^/]+|preview\.js)$/i.test(file)
    && (/\.(?:html|css|js|mjs|json|xml|ics|svg|ico|jpe?g|png|webp|avif|woff2?|ttf|pdf|docx|mp4)$/i.test(file) || approvedNotices.has(file));
}

function requireFile(directory, file) {
  let current = directory;
  const parts = file.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let info;
    try { info = fs.lstatSync(current); } catch { fail('Missing file', file); }
    const correctType = i === parts.length - 1 ? info.isFile() : info.isDirectory();
    if (info.isSymbolicLink() || !correctType) fail('Invalid file type', file);
  }
  return current;
}

function validateJSON(data, file) {
  if (Array.isArray(data)) {
    for (const item of data) validateJSON(item, file);
    return;
  }
  if (!data || typeof data !== 'object') return;
  for (const [key, value] of Object.entries(data)) {
    if (restrictedKey.test(key) || (key === 'status' && unpublished.test(value)) || (key === 'published' && value === false)) {
      fail('Restricted data in JSON', file);
    }
    validateJSON(value, file);
  }
}

function restrictedStrings() {
  const values = new Set();
  function walk(value, privateRecord = false) {
    if (!value || typeof value !== 'object') return;
    const hidden = privateRecord || unpublished.test(value.status) || value.published === false;
    for (const [key, field] of Object.entries(value)) {
      if (typeof field === 'string' && (restrictedKey.test(key) || (hidden && /^(?:slug|description|excerpt|privateNotes?)$/i.test(key))) && field.trim().length >= 12) {
        values.add(field.trim());
      } else if (field && typeof field === 'object') {
        walk(field, hidden);
      }
    }
  }
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && file.endsWith('.json')) walk(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  }
  visit(path.join(root, '_content'));
  const identityFile = path.join(root, 'azure-function', 'src', 'admin-identities.json');
  if (fs.existsSync(identityFile)) {
    for (const binding of JSON.parse(fs.readFileSync(identityFile, 'utf8'))) {
      for (const key of ['objectId', 'subject']) if (binding[key]) values.add(binding[key]);
    }
  }
  return [...values].flatMap(value => [
    value,
    JSON.stringify(value).slice(1, -1),
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  ]);
}

function dependency(value, file, files, basePath, origin, resolutionBase) {
  if (!value || /^(?:#|\?|data:|mailto:|tel:|javascript:|blob:)/i.test(value)) return;
  let url;
  try { url = new URL(value.replaceAll('&amp;', '&'), resolutionBase); } catch { fail('Invalid dependency URL', file); }
  if (url.origin !== origin) return;
  if (!url.pathname.startsWith(basePath)) fail('Dependency escapes site base path', file);
  let relative;
  try { relative = decodeURIComponent(url.pathname.slice(basePath.length)); } catch { fail('Invalid encoded dependency', file); }
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  if (!files.has(relative)) fail('Missing allowed dependency ' + relative, file);
}

function validateReferences(body, file, files, basePath, origin) {
  let resolutionBase = origin + basePath + file;
  const check = value => dependency(value, file, files, basePath, origin, resolutionBase);
  if (file.endsWith('.html')) {
    const markup = body.replace(/<!--[\s\S]*?-->/g, '').replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
    const base = markup.match(/<base\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/i);
    if (base) {
      resolutionBase = new URL(base[2], resolutionBase).href;
      if (!resolutionBase.startsWith(origin + basePath)) fail('HTML base escapes the artifact', file);
    }
    for (const tag of markup.matchAll(/<(?:a|img|source|script|link|iframe|audio|video|input)\b[^>]*>/gi)) {
      for (const attr of tag[0].matchAll(/\b(?:href|src|poster|srcset)\s*=\s*(["'])(.*?)\1/gi)) {
        if (/^srcset/i.test(attr[0])) {
          for (const variant of attr[2].split(',')) check(variant.trim().split(/\s+/)[0]);
        } else check(attr[2]);
      }
    }
  }
  if (file.endsWith('.css')) {
    for (const ref of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/g)) check(ref[2].trim());
  }
  if (/\.(?:js|mjs)$/.test(file) && !file.endsWith('.bundle.js')) {
    for (const ref of body.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) check(ref[1]);
  }
  if (file === 'sitemap.xml') {
    for (const ref of body.matchAll(/<loc>([^<]+)<\/loc>/g)) check(ref[1]);
  }
}

function validateDataReferences(data, file, files, basePath, origin) {
  if (!data || typeof data !== 'object') return;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && /^(?:src|photo|pdf|image|path|archiveImages)$/.test(key)
        && /^(?:\.\/)?assets\//.test(value)) {
      dependency(value, file, files, basePath, origin, origin + basePath);
    } else if (value && typeof value === 'object') {
      validateDataReferences(value, file, files, basePath, origin);
    }
  }
}

function managedPageIndex(body, files) {
  const { pages } = JSON.parse(body);
  const slugs = new Set();
  for (const { slug } of pages) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !files.has(slug + '.html') || slugs.has(slug)) {
      fail('Invalid public page in managed page index', 'content-pages.json');
    }
    slugs.add(slug);
  }
  return JSON.stringify({ pages: [...slugs].map(slug => ({ slug })) }) + '\n';
}

const uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
const clergyDerivative = new RegExp('^assets/images/clergy/uploads/' + uuid + '-(?:360|1600)\\.jpg$');
const contactDerivative = new RegExp('^assets/images/contacts/profiles/photo-' + uuid + '-(?:400|800)\\.webp$');
const newsPhoto = /^assets\/images\/(?:news|news-artwork)\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/;
const publicationPDF = /^assets\/documents\/news\/(?:parish-magazine|pews-news)\/[a-z0-9-]+\.pdf$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function publishedFiles(files) {
  const read = file => JSON.parse(fs.readFileSync(requireFile(root, file), 'utf8'));
  const include = (all, published, getPaths, rule, managed = rule) => {
    const allowed = new Set(published.flatMap(getPaths).filter(file => rule.test(file)));
    for (const file of files) if (managed.test(file) && !allowed.has(file)) files.delete(file);
    for (const record of all) {
      for (const file of getPaths(record)) if (rule.test(file) && !allowed.has(file)) files.delete(file);
    }
    for (const file of allowed) files.add(file);
  };
  if (files.has('news-data.json')) {
    for (const file of files) if (/^news\/[a-z0-9-]+\.html$/.test(file)) files.delete(file);
    const source = read('_content/news.json').articles;
    const approved = new Map(source.filter(article => (article.status || 'published') === 'published' && article.demo !== true)
      .map(article => [article.slug, article]));
    const rendered = read('news-data.json').articles;
    for (const article of rendered) {
      if (!slugPattern.test(article.slug) || !approved.has(article.slug) ||
          article.image !== approved.get(article.slug).image) fail('News projection does not match publication approval', 'news-data.json');
    }
    const renderedSlugs = new Set(rendered.map(article => article.slug));
    for (const article of source) {
      if (!slugPattern.test(article.slug)) fail('Invalid managed news route', 'news-data.json');
      const page = 'news/' + article.slug + '.html';
      if (renderedSlugs.has(article.slug)) files.add(page);
      else files.delete(page);
    }
    for (const slug of approved.keys()) if (!renderedSlugs.has(slug)) fail('Published news is missing from projection', 'news-data.json');
    include(source, rendered, article => article.image ? [article.image] : [], newsPhoto, /^assets\/images\/news\//);
  }
  let publicPublications;
  if (files.has('publications-data.json') || files.has('admin/publications-data.json')) {
    for (const file of files) {
      if (publicationPDF.test(file) || /^pews-news\/\d{4}-\d{2}-\d{2}\.html$/.test(file)) files.delete(file);
    }
    const source = read('_content/publications.json').publications;
    const approved = source.filter(record => record.published === true);
    const approvedPDFs = new Set(approved.map(record => record.pdf));
    for (const record of approved) {
      if (!publicationPDF.test(record.pdf)) fail('Invalid approved publication path', 'publications-data.json');
      if (record.type !== 'pews-news') continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) fail('Invalid Pews News date', 'publications-data.json');
      const edition = '_content/pews-news/' + record.date + '.json';
      if (fs.existsSync(path.join(root, edition))) {
        requireFile(root, edition);
        files.add('pews-news/' + record.date + '.html');
      }
    }
    include(source, approved, record => [record.pdf], publicationPDF);
    if (files.has('parish-magazine.html')) {
      // Keep the curated archive's existing downloads alongside the general publications feed.
      for (const { pdf } of read('_content/parish-magazine.json').editions) {
        if (typeof pdf !== 'string' || !pdf.startsWith('assets/documents/news/parish-magazine/') ||
            !(publicationPDF.test(pdf) || pdf === novemberMagazine)) fail('Invalid public Magazine PDF path', 'parish-magazine.html');
        files.add(pdf);
      }
    }
    publicPublications = body => {
      const { publications } = JSON.parse(body);
      return JSON.stringify({ publications: publications.filter(record => record.published === true && approvedPDFs.has(record.pdf)) }, null, 2) + '\n';
    };
  }
  if (files.has('clergy-data.json')) {
    const records = read('_content/clergy.json').records;
    include(records, records.filter(record => record.published === true),
      record => [record.primaryImage, ...record.archiveImages].filter(Boolean).flatMap(image => [image.src, image.thumbnail]),
      clergyDerivative);
  }
  if (files.has('admin/contacts-data.json')) {
    const { contacts, pccMembers } = read('_content/contacts.json');
    const records = [...contacts, ...pccMembers];
    include(records, records.filter(record => record.status === 'published'),
      record => (record.photo?.variants || []).map(variant => variant.src), contactDerivative);
  }
  return publicPublications;
}

function buildInventory(origin, basePath) {
  const list = fs.readFileSync(allowlistFile, 'utf8').trim().split(/\r?\n/);
  const files = new Set(list);
  if (files.size !== list.length || new Set(list.map(file => file.toLowerCase())).size !== list.length) fail('Duplicate allowlist path');
  if (!files.has('index.html') || !files.has('404.html')) fail('Required page missing');
  const publicPublications = publishedFiles(files);
  let publicAlbums;
  if (files.has('parish-albums.json')) {
    const { albums } = JSON.parse(fs.readFileSync(requireFile(root, 'parish-albums.json'), 'utf8'));
    const published = albums.filter(album => (album.status || 'published') === 'published');
    const variants = album => album.photos.flatMap(photo => photo.variants.map(variant => variant.src));
    const publishedPaths = new Set(published.flatMap(variants));
    for (const album of albums) {
      if (published.includes(album)) continue;
      for (const file of variants(album)) if (!publishedPaths.has(file)) files.delete(file);
    }
    const uploadedDerivative = /^assets\/images\/albums\/[a-z0-9-]+\/photo-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}-(?:480|960|1600)\.webp$/;
    for (const file of files) if (uploadedDerivative.test(file) && !publishedPaths.has(file)) files.delete(file);
    for (const file of publishedPaths) if (uploadedDerivative.test(file)) files.add(file);
    publicAlbums = JSON.stringify({ albums: published }, null, 2) + '\n';
  }
  if (new Set([...files].map(file => file.toLowerCase())).size !== files.size) fail('Conflicting public paths');
  const restricted = restrictedStrings();
  return [...files].sort().map(file => {
    if (!allowedPath(file)) fail('Forbidden allowlist path', file);
    const source = file === '404.html' ? 'scripts/public-site-404.html.txt' : file;
    let bytes = fs.readFileSync(requireFile(root, source));
    if (textFile.test(file)) {
      let body = bytes.toString('utf8');
      if (file !== 'calendar.ics') body = body.replace(/\r\n/g, '\n');
      if (file === 'content-pages.json') body = managedPageIndex(body, files);
      if (file === 'parish-albums.json') body = publicAlbums;
      if (publicPublications && ['publications-data.json', 'admin/publications-data.json'].includes(file)) body = publicPublications(body);
      if (file === 'sitemap.xml' || file.endsWith('.html')) {
        body = body.replace(/https:\/\/micklehamchurch\.github\.io\/website\//g, origin + basePath);
      }
      if (file === '404.html') {
        body = body.replace('href="index.html"', 'href="' + basePath + '"');
      }
      bytes = Buffer.from(body);
      if (credentialPatterns.some(pattern => pattern.test(body)) || restricted.some(value => body.includes(value))) fail('Restricted text detected', file);
      if (file.endsWith('.json')) {
        const data = JSON.parse(body);
        validateJSON(data, file);
        validateDataReferences(data, file, files, basePath, origin);
      }
      validateReferences(body, file, files, basePath, origin);
    }
    return { file, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
}

function checkArtifact(directory, entries) {
  if (!fs.lstatSync(directory).isDirectory()) fail('Artifact root must be a real directory');
  const expected = new Map(entries.map(entry => [entry.file, entry.sha256]));
  function visit(parent = '') {
    for (const dirent of fs.readdirSync(path.join(directory, parent), { withFileTypes: true })) {
      const file = parent + dirent.name;
      if (dirent.isDirectory() && [...expected.keys()].some(key => key.startsWith(file + '/'))) visit(file + '/');
      else {
        if (!dirent.isFile() || !expected.has(file)) fail('Unexpected artifact path', file);
        const sha = createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex');
        if (sha !== expected.get(file)) fail('Artifact digest mismatch', file);
        expected.delete(file);
      }
    }
  }
  visit();
  if (expected.size) fail('Missing artifact path', expected.keys().next().value);
}

function main() {
  const [mode, output, siteOrigin, basePath, ...rest] = process.argv.slice(2);
  if (!['build', 'verify'].includes(mode) || !output || !siteOrigin || !basePath || rest.length) {
    fail('Usage: node scripts/package-public-site.cjs build|verify OUTPUT ORIGIN BASE_PATH');
  }
  const origin = new URL(siteOrigin);
  if (origin.origin !== siteOrigin || !['http:', 'https:'].includes(origin.protocol) || !/^\/(?:[\w-]+\/)*$/.test(basePath)) fail('Invalid site origin or base path');
  const directory = path.resolve(output);
  if (directory === root || root.startsWith(directory + path.sep)) fail('Output must be separate from repository source');
  const entries = buildInventory(siteOrigin, basePath);
  if (mode === 'build') {
    fs.mkdirSync(directory);
    for (const entry of entries) {
      const target = path.join(directory, entry.file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.bytes, { flag: 'wx' });
    }
  }
  checkArtifact(directory, entries);
  process.stdout.write(JSON.stringify({
    origin: siteOrigin,
    basePath,
    files: entries.map(entry => ({ path: entry.file, bytes: entry.bytes.length, sha256: entry.sha256 }))
  }, null, 2) + '\n');
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
