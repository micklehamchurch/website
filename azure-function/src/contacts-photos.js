const {isDeepStrictEqual}=require('node:util');
const gallery=require('./photo-albums-model');
const {validateContacts}=require('./contacts-model');
const {EXPECTED_TARGET}=require('./github-status');
const target={owner:EXPECTED_TARGET.owner,repo:EXPECTED_TARGET.repository};
const PATH='_content/contacts.json';
const MAX_PHOTO_BODY=gallery.MAX_BODY;
const records=data=>[...data.contacts,...data.pccMembers];
function unchangedPhotos(next,current) {
  const old=new Map(records(current).map(r=>[r.id,r.photo]));
  for(const r of records(next)) {
    if(!r.photo)continue;
    const prior=old.get(r.id);
    // Only the framing position can change; variants must come from this person's current metadata.
    if(!isDeepStrictEqual(typeof r.photo==='object'?r.photo.variants:r.photo,typeof prior==='object'&&prior?prior.variants:prior))throw Error('invalid-contacts');
  }
}
async function preparePhotos(body,current) {
  unchangedPhotos(body.contacts,current);
  const uploads=body.uploads;
  if(!Array.isArray(uploads)||uploads.length>gallery.MAX_UPLOADS)throw Error('invalid-contacts');
  const ids=new Set(),values=[];
  for(const u of uploads) {
    if(!u||Object.keys(u).sort().join(',')!=='base64,contactId,fileName,mimeType,position'||ids.has(u.contactId)||!records(body.contacts).some(r=>r.id===u.contactId)||!['top','center','bottom'].includes(u.position))throw Error('invalid-contacts');
    ids.add(u.contactId);
    values.push({id:'upload:'+require('node:crypto').randomUUID(),fileName:u.fileName,mimeType:u.mimeType,base64:u.base64});
  }
  // Reuse the deployed gallery's full request validation before invoking its decoder.
  gallery.validateRequest({sha:body.sha,headSha:body.headSha,action:'save',id:null,consentConfirmed:false,album:{title:'Profile photographs',context:'',status:'draft',cover:values[0]?.id||'',photos:values.map(u=>({id:u.id,alt:'Photograph',caption:''}))},uploads:values});
  const processed=await gallery.processUploads(values,null,true),next=structuredClone(body.contacts);
  uploads.forEach((u,i)=>{records(next).find(r=>r.id===u.contactId).photo={variants:processed.photos.get(values[i].id).variants,position:u.position};});
  validateContacts(next);
  const retained=new Set(records(next).flatMap(r=>typeof r.photo==='object'&&r.photo?r.photo.variants.map(v=>v.src):[]));
  const deleted=records(current).flatMap(r=>typeof r.photo==='object'&&r.photo?r.photo.variants.map(v=>v.src):[]).filter(p=>!retained.has(p));
  return {next,files:processed.files,deleted};
}
async function publishPhotos(client,headSha,mutation) {
  const parent=(await client.rest.git.getCommit({...target,commit_sha:headSha})).data;
  if(!gallery.shaValid(parent.tree?.sha))throw Error();
  const tree=[];
  for(const file of mutation.files) {
    const blob=(await client.rest.git.createBlob({...target,content:file.bytes.toString('base64'),encoding:'base64'})).data;
    if(!gallery.shaValid(blob.sha))throw Error();
    tree.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});
  }
  for(const path of new Set(mutation.deleted))tree.push({path,mode:'100644',type:'blob',sha:null});
  const metadata=(await client.rest.git.createBlob({...target,content:Buffer.from(JSON.stringify(mutation.next,null,2)+'\n').toString('base64'),encoding:'base64'})).data;
  if(!gallery.shaValid(metadata.sha))throw Error();tree.push({path:PATH,mode:'100644',type:'blob',sha:metadata.sha});
  const nextTree=(await client.rest.git.createTree({...target,base_tree:parent.tree.sha,tree})).data;
  if(!gallery.shaValid(nextTree.sha))throw Error();
  const commit=(await client.rest.git.createCommit({...target,message:'Update parish contacts and profile photographs via Admin Dashboard',tree:nextTree.sha,parents:[headSha]})).data;
  if(!gallery.shaValid(commit.sha))throw Error();
  await client.rest.git.updateRef({...target,ref:'heads/Dev',sha:commit.sha,force:false});
  return {sha:metadata.sha,headSha:commit.sha,commitSha:commit.sha,contacts:mutation.next};
}
module.exports={MAX_PHOTO_BODY,unchangedPhotos,preparePhotos,publishPhotos};
