const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_METADATA_BYTES = 512 * 1024;
const shaValid = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
function keys(value, required, optional = []) {
  if (!plain(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) throw new Error('invalid-schema');
}
function text(value, maximum, empty = false) {
  if (typeof value !== 'string' || value.length > maximum || (!empty && !value.trim()) || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('invalid-text');
  return value.trim();
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('invalid-date');
  return value;
}
function slug(value) { if (typeof value !== 'string' || value.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error('invalid-slug'); return value; }
function publication(body) {
  keys(body, ['sha', 'headSha', 'type', 'date', 'title', 'description', 'fileName', 'mimeType', 'pdfBase64']);
  if (!shaValid(body.sha) || !shaValid(body.headSha) || !['pews-news', 'parish-magazine'].includes(body.type)) throw new Error('invalid-publication');
  date(body.date); text(body.title, 180); text(body.description, 500, true);
  if (body.type === 'parish-magazine' && !body.date.endsWith('-01')) throw new Error('invalid-magazine-month');
  if (body.mimeType !== 'application/pdf' || typeof body.fileName !== 'string' || body.fileName.length > 180 || !/^[a-zA-Z0-9][a-zA-Z0-9 _().-]*\.pdf$/i.test(body.fileName) || body.fileName.includes('..')) throw new Error('invalid-pdf-name');
  // Linear scan avoids regex stack overflow on large valid uploads. The
  // round-trip below still enforces exact canonical alphabet/padding/pad bits.
  if (typeof body.pdfBase64 !== 'string' || body.pdfBase64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(body.pdfBase64)) throw new Error('invalid-pdf');
  if (body.pdfBase64.length > Math.ceil(MAX_PDF_BYTES / 3) * 4) throw new RangeError('pdf-too-large');
  const pdf = Buffer.from(body.pdfBase64, 'base64');
  if (pdf.toString('base64') !== body.pdfBase64) throw new Error('invalid-pdf');
  if (pdf.length > MAX_PDF_BYTES) throw new RangeError('pdf-too-large');
  const bytes = pdf.toString('latin1'), tail = bytes.slice(-2048);
  const ending = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail);
  if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(bytes) || !/\d+\s+\d+\s+obj\b/.test(bytes) || !ending) throw new Error('invalid-pdf');
  const offset = Number(ending[1]);
  if (offset < 9 || offset >= pdf.length || !/^(?:xref\b|\d+\s+\d+\s+obj\b)/.test(bytes.slice(offset))) throw new Error('invalid-pdf');
  const stamp = body.type === 'parish-magazine' ? body.date.slice(0, 7) : body.date;
  const id = `${body.type}-${stamp}`;
  const record = { id, type: body.type, title: body.title.trim(), date: body.date, description: body.description.trim(), pdf: `assets/documents/news/${body.type}/${id}.pdf`, published: true };
  return { record, pdf };
}
function story(value) {
  keys(value, ['slug', 'title', 'date', 'excerpt', 'paragraphs', 'category', 'status'], ['expires', 'image', 'imageAlt', 'featured']);
  slug(value.slug); date(value.date); text(value.title, 180); text(value.excerpt, 1000); text(value.category, 80);
  if (!['draft', 'published'].includes(value.status) || !Array.isArray(value.paragraphs) || !value.paragraphs.length || value.paragraphs.length > 100) throw new Error('invalid-story');
  value.paragraphs.forEach(paragraph => text(paragraph, 10000));
  if (value.paragraphs.join('\n').length > 100000) throw new RangeError();
  if (value.expires && date(value.expires) < value.date) throw new Error('invalid-expiry');
  if (value.featured !== undefined && typeof value.featured !== 'boolean') throw new Error('invalid-featured');
  if (value.image !== undefined && (typeof value.image !== 'string' || !/^assets\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/.test(value.image))) throw new Error('invalid-image');
  if (value.imageAlt !== undefined) text(value.imageAlt, 300, true);
  return { ...value, dateLabel: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value.date)) };
}
function validateExisting(data, kind) {
  const array = kind === 'publications' ? 'publications' : 'articles';
  keys(data, [array]); if (!Array.isArray(data[array])) throw new Error('invalid-metadata');
  const seen = new Set();
  for (const item of data[array]) {
    const id = kind === 'publications' ? item?.id : item?.slug;
    slug(id); if (seen.has(id)) throw new Error('duplicate-metadata'); seen.add(id);
    if (kind === 'publications') {
      if (!['pews-news', 'parish-magazine'].includes(item.type) || typeof item.published !== 'boolean') throw new Error('invalid-metadata');
      date(item.date); text(item.title, 180);
      if (typeof item.pdf !== 'string' || !new RegExp(`^assets/documents/news/${item.type}/[a-z0-9-]+\\.pdf$`).test(item.pdf)) throw new Error('invalid-path');
    }
  }
  if (Buffer.byteLength(JSON.stringify(data)) > MAX_METADATA_BYTES) throw new RangeError();
  return data;
}
module.exports = { MAX_PDF_BYTES, MAX_METADATA_BYTES, shaValid, keys, publication, story, validateExisting };
