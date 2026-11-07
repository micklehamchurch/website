// Unreferenced Git blobs are prepared without a tree, commit or branch update.
// Only a signed, short-lived receipt can attach them during explicit publication.
const {createHmac, timingSafeEqual} = require('node:crypto');
const model = require('./clergy-model');
const target = Object.freeze({owner:'micklehamchurch',repo:'website'});
const TTL = 24 * 60 * 60 * 1000;
function signature(payload, configuration) {
  return createHmac('sha256', configuration.privateKey).update('clergy-upload-v1\0' + payload).digest('base64url');
}
function receiptFor(value, configuration) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return payload + '.' + signature(payload, configuration);
}
function readReceipt(value, configuration, now=Date.now()) {
  if(typeof value.receipt !== 'string' || value.receipt.length > 8192) throw Error('invalid-upload-receipt');
  const parts=value.receipt.split('.');
  if(parts.length!==2) throw Error('invalid-upload-receipt');
  const expected=Buffer.from(signature(parts[0], configuration)),actual=Buffer.from(parts[1]);
  if(actual.length!==expected.length || !timingSafeEqual(actual,expected)) throw Error('invalid-upload-receipt');
  let data; try {data=JSON.parse(Buffer.from(parts[0],'base64url'));} catch {throw Error('invalid-upload-receipt');}
  if(data.version!==1 || data.id!==value.id || !Number.isFinite(data.expires) || data.expires<=now || data.expires>now+TTL || !Number.isInteger(data.originalBytes) || data.originalBytes<1 || data.originalBytes>model.MAX_IMAGE) throw Error('invalid-upload-receipt');
  if(!Array.isArray(data.files)||data.files.length!==3||data.files.some(f=>!model.shaValid(f.sha))) throw Error('invalid-upload-receipt');
  return data;
}
async function prepareUpload(request, configuration, writer, now=Date.now()) {
  const id=request.query.get('id'),fileName=request.query.get('fileName');
  if([...request.query.keys()].length!==2 || !id || !fileName) throw Error('invalid-upload-id');
  if(Number(request.headers.get('content-length'))>model.MAX_IMAGE) throw new model.ArchiveSizeError();
  const reader=request.body?.getReader();if(!reader)throw Error('invalid-image');
  let size=0;const chunks=[];
  try {for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>model.MAX_IMAGE){await reader.cancel();throw new model.ArchiveSizeError();}chunks.push(Buffer.from(next.value));}} finally {reader.releaseLock();}
  const prepared=(await model.uploads([{id,fileName,mimeType:request.headers.get('content-type'),base64:Buffer.concat(chunks).toString('base64')}])).get(id);
  const files=[];
  for(const file of prepared.files){const blob=(await writer.rest.git.createBlob({...target,encoding:'base64',content:file.bytes.toString('base64')})).data;if(!model.shaValid(blob.sha))throw Error('upload-storage-unavailable');files.push({path:file.path,sha:blob.sha});}
  const data={version:1,id,expires:now+TTL,originalBytes:size,src:prepared.src,thumbnail:prepared.thumbnail,originalFilename:fileName,files};
  return {id,receipt:receiptFor(data,configuration),expires:data.expires};
}
module.exports={prepareUpload,readReceipt,receiptFor,TTL};
