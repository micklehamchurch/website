const sharp = require('sharp');
const { randomUUID } = require('node:crypto');
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_TOTAL = 20 * 1024 * 1024;
const MAX_METADATA = 1024 * 1024;
const MAX_BODY = Math.ceil(MAX_TOTAL / 3) * 4 + MAX_METADATA;
const shaValid = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
function keys(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(value, k))) throw new Error('invalid-fields');
}
function text(value, max = 10000, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || value.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new Error('invalid-text');
}
const imageKeys = ['src','thumbnail','alt','caption','date','source','credit','copyrightPermission','originalFilename','derivativeCreated'];
function image(value, pending = false) {
  keys(value, imageKeys);
  const path = v => typeof v === 'string' && (/^assets\/images\/clergy\/(?:[a-z0-9-]+\.jpg|uploads\/[a-f0-9-]{36}-(?:360|1600)\.jpg)$/.test(v) || (pending && /^upload:[a-f0-9-]{36}$/.test(v)));
  if (!path(value.src) || !path(value.thumbnail) || value.derivativeCreated !== true) throw new Error('invalid-image-path');
  for (const key of ['alt','caption','source','originalFilename']) text(value[key], 1000);
  for (const key of ['date','credit','copyrightPermission']) text(value[key], 1000, true);
}
function validateArchive(value, pending = false) {
  keys(value, ['schemaVersion','records','unassignedSources','updatedAt'], ['schemaVersion','records','unassignedSources']);
  if (value.schemaVersion !== 1 || !Array.isArray(value.records) || value.records.length > 250 || !Array.isArray(value.unassignedSources)) throw new Error('invalid-archive');
  if (value.updatedAt !== undefined && !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(value.updatedAt)) throw new Error('invalid-audit');
  const ids = new Set();
  for (const record of value.records) {
    keys(record, ['id','displayName','role','servicePeriods','primaryImage','archiveImages','biography','parishContext','didYouKnow','published','internalNotes','sources'], ['id','displayName','published']);
    for(const [key,defaultValue] of Object.entries({role:'',servicePeriods:[],primaryImage:null,archiveImages:[],biography:[],parishContext:[],didYouKnow:[],internalNotes:'',sources:[]}))if(!Object.hasOwn(record,key))record[key]=structuredClone(defaultValue);
    if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || record.id.length > 100 || ids.has(record.id)) throw new Error('invalid-id');
    ids.add(record.id); text(record.displayName, 200); text(record.role, 150);
    if(!record.displayName.trim())throw new Error('missing-name');
    if(typeof record.published !== 'boolean')throw new Error('invalid-record');
    if (!Array.isArray(record.servicePeriods) || record.servicePeriods.length > 20) throw new Error('invalid-periods');
    for (const period of record.servicePeriods) {
      keys(period, ['start','end'], []);
      if(!Object.hasOwn(period,'start'))period.start=null;
      if(!Object.hasOwn(period,'end'))period.end=null;
      if (!(period.start === null || (Number.isInteger(period.start) && period.start >= 1 && period.start <= 9999)) || !(period.end === null || (Number.isInteger(period.end) && period.end >= 1 && period.end <= 9999 && (period.start === null || period.end >= period.start)))) throw new Error('invalid-year');
    }
    if (record.primaryImage !== null) image(record.primaryImage, pending);
    if (!Array.isArray(record.archiveImages) || record.archiveImages.length > 100) throw new Error('invalid-gallery');
    record.archiveImages.forEach(i => image(i, pending));
    for (const field of ['biography','parishContext','didYouKnow','sources']) {
      if (!Array.isArray(record[field]) || record[field].length > 100) throw new Error('invalid-paragraphs');
      record[field].forEach(p => text(p));
    }
    text(record.internalNotes, 20000);
  }
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_METADATA) throw new RangeError();
  return value;
}
async function uploads(values) {
  if (!Array.isArray(values) || values.length > 6) throw new Error('invalid-uploads');
  let total = 0; const result = new Map();
  for (const value of values) {
    keys(value, ['id','fileName','mimeType','base64']);
    if (typeof value.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.id) || result.has(value.id)) throw new Error('invalid-upload-id');
    if (typeof value.fileName !== 'string' || value.fileName.length > 200 || !/^[^/\\<>\x00-\x1f]+\.(?:jpe?g|png|webp)$/i.test(value.fileName)) throw new Error('invalid-filename');
    if (typeof value.base64 !== 'string' || value.base64.length > Math.ceil(MAX_IMAGE / 3) * 4) throw new RangeError();
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64)) throw new Error('invalid-base64');
    const original = Buffer.from(value.base64, 'base64'); total += original.length;
    if (!original.length || original.length > MAX_IMAGE || total > MAX_TOTAL) throw new RangeError();
    const jpeg = original[0] === 255 && original[1] === 216 && original[2] === 255;
    const png = original.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = original.toString('ascii',0,4) === 'RIFF' && original.toString('ascii',8,12) === 'WEBP';
    const format = jpeg ? 'jpeg' : png ? 'png' : webp ? 'webp' : null;
    if (!format || value.mimeType !== `image/${format}` || !(format === 'jpeg' ? /\.jpe?g$/i : new RegExp(`\\.${format}$`,'i')).test(value.fileName)) throw new Error('invalid-image-format');
    const decoder = sharp(original, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await decoder.metadata().catch(()=>{throw new Error('invalid-image');});
    if (metadata.format !== format || (metadata.pages || 1) !== 1 || !metadata.width || !metadata.height) throw new Error('invalid-image');
    const id = randomUUID();
    const src = `assets/images/clergy/uploads/${id}-1600.jpg`, thumbnail = `assets/images/clergy/uploads/${id}-360.jpg`;
    // Originals stay byte-for-byte intact; derivatives auto-orient and strip device metadata.
    const large = await decoder.clone().rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:86}).toBuffer();
    const small = await decoder.clone().rotate().resize({width:360,height:360,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();
    result.set(value.id, { src, thumbnail, originalFilename:value.fileName, files:[{path:`_archive-sources/clergy/uploads/${id}.${format === 'jpeg' ? 'jpg' : format}`,bytes:original},{path:src,bytes:large},{path:thumbnail,bytes:small}] });
  }
  return result;
}
function resolveImages(next, current, uploaded) {
  if (JSON.stringify(next.unassignedSources) !== JSON.stringify(current.unassignedSources) || current.records.some(r => !next.records.some(n => n.id === r.id))) throw new Error('use-unpublish');
  const known = new Map(current.records.flatMap(r => [r.primaryImage,...r.archiveImages].filter(Boolean)).map(i => [`${i.src}|${i.thumbnail}`,i]));
  const used = new Set();
  for (const record of next.records) for (const item of [record.primaryImage,...record.archiveImages].filter(Boolean)) {
    if (item.src.startsWith('upload:')) {
      const id = item.src.slice(7), upload = uploaded.get(id);
      if (!upload || item.thumbnail !== item.src) throw new Error('unknown-upload');
      Object.assign(item,{src:upload.src,thumbnail:upload.thumbnail,originalFilename:upload.originalFilename,derivativeCreated:true}); used.add(id);
    } else {
      const old = known.get(`${item.src}|${item.thumbnail}`);
      if (!old || item.originalFilename !== old.originalFilename) throw new Error('unknown-image');
    }
  }
  if (used.size !== uploaded.size) throw new Error('unused-upload');
  validateArchive(next);
  return [...uploaded.values()].flatMap(u => u.files);
}
module.exports = { validateArchive, uploads, resolveImages, keys, shaValid, MAX_BODY, MAX_METADATA, MAX_IMAGE, MAX_TOTAL };
