const sharp = require('sharp');
const { randomUUID } = require('node:crypto');
const MAX_IMAGE = 10 * 1024 * 1024, MAX_TOTAL = 20 * 1024 * 1024, MAX_METADATA = 1024 * 1024;
const MAX_BODY = Math.ceil(MAX_TOTAL / 3) * 4 + MAX_METADATA;
const MAX_UPLOADS = 6, MAX_PHOTOS = 200, MAX_ALBUMS = 100;
const shaValid = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
const idValid = v => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 100;
const pendingValid = v => typeof v === 'string' && /^upload:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
function keys(v, allowed, required = allowed) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(v,k))) throw Error('invalid-album-request');
}
function text(v, max, required = false) {
  if (typeof v !== 'string' || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v) || (required && !v.trim())) throw Error('invalid-album-request');
  return v.trim();
}
function validateExisting(data) {
  keys(data,['albums']);
  if (!Array.isArray(data.albums) || data.albums.length > MAX_ALBUMS) throw Error('invalid-album-data');
  const ids = new Set();
  for (const a of data.albums) {
    keys(a,['id','title','context','cover','photos','status'],['id','title','context','photos']);
    if (!idValid(a.id) || ids.has(a.id) || (a.status !== undefined && !['draft','published'].includes(a.status))) throw Error('invalid-album-data');
    ids.add(a.id); text(a.title,150,true); text(a.context,500);
    if (!Array.isArray(a.photos) || a.photos.length > MAX_PHOTOS || ((a.status || 'published') === 'published' && !a.photos.length)) throw Error('invalid-album-data');
    const photos = new Set();
    for (const p of a.photos) {
      keys(p,['id','source','alt','featured','variants','caption'],['id','alt','variants']);
      if (!idValid(p.id) || photos.has(p.id)) throw Error('invalid-album-data'); photos.add(p.id);
      text(p.alt,300,true); if (p.caption !== undefined) text(p.caption,300);
      if (p.source !== undefined) text(p.source,1000);
      if (p.featured !== undefined && typeof p.featured !== 'boolean') throw Error('invalid-album-data');
      if (!Array.isArray(p.variants) || !p.variants.length || p.variants.length > 3) throw Error('invalid-album-data');
      let previous = 0;
      for (const v of p.variants) {
        keys(v,['src','width','height','bytes']);
        const prefix = `assets/images/albums/${a.id}/`;
        if (typeof v.src !== 'string' || !v.src.startsWith(prefix) || !/^[a-z0-9-]+\.(?:jpg|webp)$/.test(v.src.slice(prefix.length)) || !Number.isInteger(v.width) || !Number.isInteger(v.height) || v.width <= previous || v.height < 1 || v.width > 3000 || v.height > 3000 || !Number.isInteger(v.bytes) || v.bytes < 1 || v.bytes > MAX_IMAGE) throw Error('invalid-album-data');
        previous = v.width;
      }
    }
    if (a.cover !== undefined && !photos.has(a.cover) && (a.photos.length || a.cover !== '')) throw Error('invalid-album-data');
  }
  if (Buffer.byteLength(JSON.stringify(data)) > MAX_METADATA) throw Error('album-too-large');
  return data;
}
function validateRequest(body) {
  keys(body,['sha','headSha','action','id','album','uploads','consentConfirmed','confirmTitle'],['sha','headSha','action','id']);
  if (!shaValid(body.sha) || !shaValid(body.headSha) || !(body.id === null || idValid(body.id))) throw Error('invalid-album-request');
  if (body.action === 'delete') {
    keys(body,['sha','headSha','action','id','confirmTitle']);
    if (!body.id) throw Error('invalid-album-request'); text(body.confirmTitle,150,true); return;
  }
  if (body.action !== 'save') throw Error('invalid-album-request');
  keys(body,['sha','headSha','action','id','album','uploads','consentConfirmed']);
  if (typeof body.consentConfirmed !== 'boolean' || !Array.isArray(body.uploads) || body.uploads.length > MAX_UPLOADS) throw Error('invalid-album-request');
  const a = body.album;
  keys(a,['title','context','status','cover','photos']); text(a.title,150,true); text(a.context,500);
  if (!['draft','published'].includes(a.status) || !Array.isArray(a.photos) || a.photos.length > MAX_PHOTOS) throw Error('invalid-album-request');
  if (a.status === 'published' && (!body.consentConfirmed || !a.photos.length)) throw Error('album-consent-required');
  const ids = new Set();
  for (const p of a.photos) {
    keys(p,['id','alt','caption']);
    if ((!idValid(p.id) && !pendingValid(p.id)) || ids.has(p.id)) throw Error('invalid-album-request');
    ids.add(p.id); text(p.alt,300,true); text(p.caption,300);
  }
  if ((a.photos.length && !ids.has(a.cover)) || (!a.photos.length && a.cover !== '')) throw Error('invalid-album-request');
  const uploadIds = new Set(); let total = 0;
  for (const u of body.uploads) {
    keys(u,['id','fileName','mimeType','base64']);
    if (!pendingValid(u.id) || uploadIds.has(u.id) || !ids.has(u.id)) throw Error('invalid-album-request'); uploadIds.add(u.id);
    if (typeof u.fileName !== 'string' || u.fileName.length > 200 || !/^[^/\\<>\x00-\x1f]+\.(?:jpe?g|png|webp)$/i.test(u.fileName) || u.fileName.includes('..')) throw Error('album-unsupported-format');
    if (typeof u.base64 !== 'string' || u.base64.length > Math.ceil(MAX_IMAGE / 3) * 4) throw Error('album-too-large');
    // Linear validation avoids regular-expression stack exhaustion on large photographs.
    if (u.base64.length % 4 || /[^A-Za-z0-9+/=]/.test(u.base64)) throw Error('album-invalid-image');
    const decoded = Buffer.from(u.base64,'base64');
    if (decoded.toString('base64') !== u.base64) throw Error('album-invalid-image');
    total += decoded.length;
    if (!decoded.length || decoded.length > MAX_IMAGE || total > MAX_TOTAL) throw Error('album-too-large');
  }
  if (a.photos.some(p=>pendingValid(p.id) && !uploadIds.has(p.id))) throw Error('invalid-album-request');
}
// Reject trailing payloads and malformed container framing before decoding.
function formatOf(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    let i = 2, entropy = false, ended = false;
    while (i < bytes.length) {
      if (entropy && bytes[i] !== 255) { i++; continue; }
      if (bytes[i++] !== 255) throw Error('album-invalid-image');
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (entropy && (marker === 0 || (marker >= 208 && marker <= 215))) continue;
      if (marker === 217) { ended = i === bytes.length; break; }
      if (marker === 216 || marker === undefined || marker === 0) throw Error('album-invalid-image');
      const size = bytes.readUInt16BE(i); if (size < 2 || i + size > bytes.length) throw Error('album-invalid-image');
      i += size; entropy = marker === 218;
    }
    if (!ended) throw Error('album-invalid-image'); return 'jpeg';
  }
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    let i = 8, ended = false;
    while (i + 12 <= bytes.length) {
      const size = bytes.readUInt32BE(i), type = bytes.toString('ascii',i+4,i+8);
      if (!/^[A-Za-z]{4}$/.test(type) || i + 12 + size > bytes.length || ['acTL','fcTL','fdAT'].includes(type)) throw Error('album-invalid-image');
      i += 12 + size;
      if (type === 'IEND') { ended = size === 0 && i === bytes.length; break; }
    }
    if (!ended) throw Error('album-invalid-image'); return 'png';
  }
  if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') {
    if (bytes.length < 20 || bytes.readUInt32LE(4) + 8 !== bytes.length) throw Error('album-invalid-image');
    return 'webp';
  }
  throw Error('album-unsupported-format');
}
async function processUploads(values, albumId, profile = false) {
  const photos = new Map(), files = [];
  for (const u of values) {
    const bytes = Buffer.from(u.base64,'base64');
    if (!bytes.length || bytes.length > MAX_IMAGE) throw Error('album-too-large');
    try {
      const format = formatOf(bytes);
      if (u.mimeType !== `image/${format}` || !(format === 'jpeg' ? /\.jpe?g$/i : new RegExp(`\\.${format}$`,'i')).test(u.fileName)) throw Error('album-unsupported-format');
      // Common executable/polyglot payloads are never accepted as image metadata.
      if (/<\?(?:php|=)|<script\b|<html\b/i.test(bytes.toString('latin1')) || bytes.includes(Buffer.from('504b0304','hex'))) throw Error('album-invalid-image');
      const decoder = sharp(bytes,{limitInputPixels:40000000,failOn:'warning'}), m = await decoder.metadata();
      if (m.format !== format || (m.pages || 1) !== 1 || !m.width || !m.height) throw Error('album-invalid-image');
      const id = `photo-${randomUUID()}`, variants = []; let lastWidth = 0;
      for (const [size,quality] of (profile ? [[400,80],[800,84]] : [[480,78],[960,82],[1600,84]])) {
        const output = await decoder.clone().rotate().resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality,effort:4}).toBuffer({resolveWithObject:true});
        if (output.info.width === lastWidth) continue; // Small originals need only one derivative.
        lastWidth = output.info.width;
        const src = profile ? `assets/images/contacts/profiles/${id}-${size}.webp` : `assets/images/albums/${albumId}/${id}-${size}.webp`;
        variants.push({src,width:output.info.width,height:output.info.height,bytes:output.data.length});
        files.push({path:src,bytes:output.data});
      }
      photos.set(u.id,{id,alt:'Photograph',variants});
    } catch (e) { if (['album-too-large','album-unsupported-format'].includes(e.message)) throw e; throw Error('album-invalid-image'); }
  }
  return {photos,files};
}
async function applyMutation(current, body) {
  const next = structuredClone(current), index = next.albums.findIndex(a=>a.id===body.id), old = next.albums[index];
  if (body.id !== null && !old) throw Error('album-version-conflict');
  if (body.action === 'delete') {
    if (body.confirmTitle !== old.title) throw Error('album-delete-confirmation-required');
    next.albums.splice(index,1); return {next,files:[],deleted:old.photos.flatMap(p=>p.variants.map(v=>v.src))};
  }
  const id = old?.id || `album-${randomUUID()}`, existing = new Map((old?.photos || []).map(p=>[p.id,p]));
  if (body.album.photos.some(p=>!pendingValid(p.id) && !existing.has(p.id))) throw Error('invalid-album-request');
  const processed = await processUploads(body.uploads,id), mapping = new Map();
  const photos = body.album.photos.map(p=>{
    const source = existing.get(p.id) || processed.photos.get(p.id); mapping.set(p.id,source.id);
    return {...source,alt:text(p.alt,300,true),caption:text(p.caption,300)};
  });
  const album = {...old,id,title:text(body.album.title,150,true),context:text(body.album.context,500),status:body.album.status,cover:mapping.get(body.album.cover) || '',photos};
  if (old) next.albums[index] = album; else next.albums.push(album);
  validateExisting(next);
  const retained = new Set(photos.flatMap(p=>p.variants.map(v=>v.src)));
  return {next,albumId:id,files:processed.files,deleted:(old?.photos || []).flatMap(p=>p.variants.map(v=>v.src)).filter(p=>!retained.has(p))};
}
module.exports = { MAX_BODY,MAX_METADATA,MAX_IMAGE,MAX_TOTAL,MAX_UPLOADS,shaValid,validateExisting,validateRequest,formatOf,processUploads,applyMutation };
