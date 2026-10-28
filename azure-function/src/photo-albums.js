const {requireAdministrator} = require('./identity');
const {readGithubConfiguration,createInstallationClient,EXPECTED_TARGET} = require('./github-status');
const {readJson} = require('./news-publishing');
const model = require('./photo-albums-model');
const PATH = 'parish-albums.json';
const target = Object.freeze({owner:EXPECTED_TARGET.owner,repo:EXPECTED_TARGET.repository});
const response = (status,jsonBody)=>({status,headers:{'Cache-Control':'no-store',Pragma:'no-cache'},jsonBody});
const failure = (status,error)=>response(status,{ok:false,error});
function createPhotoAlbumsHandler({env=process.env,readConfiguration=readGithubConfiguration,createClient=(c,p)=>createInstallationClient(c,undefined,p)}={}) {
  return async request=>{
    const denied=requireAdministrator(request); if(denied)return denied;
    if(!['GET','POST'].includes(request.method))return failure(405,'method-not-allowed');
    if(request.query && [...request.query.keys()].length)return failure(400,'invalid-album-request');
    let body;
    if(request.method==='POST')try{body=await readJson(request,model.MAX_BODY);model.validateRequest(body);}catch(e){return failure(e instanceof RangeError || e.message==='album-too-large'?413:400,['album-too-large','album-unsupported-format','album-invalid-image','album-consent-required'].includes(e.message)?e.message:'invalid-album-request');}
    let configuration,reader,headSha,current;
    try {
      configuration=readConfiguration(env);reader=await createClient(configuration,'read');
      headSha=(await reader.rest.git.getRef({...target,ref:'heads/Dev'})).data.object.sha;
      if(!model.shaValid(headSha))throw Error();
      const file=(await reader.rest.repos.getContent({...target,path:PATH,ref:headSha})).data;
      if(file.type!=='file'||file.path!==PATH||!model.shaValid(file.sha)||file.encoding!=='base64'||typeof file.content!=='string'||file.content.length>model.MAX_METADATA*1.5)throw Error();
      const bytes=Buffer.from(file.content,'base64');if(bytes.length>model.MAX_METADATA)throw Error();
      current={sha:file.sha,data:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};model.validateExisting(current.data);
    }catch{return failure(502,'album-repository-unavailable');}
    if(request.method==='GET')return response(200,{ok:true,uploadMode:'serial-receipt-v1',sha:current.sha,headSha,albums:current.data.albums});
    // Content builds advance Dev without changing albums. Use their latest tree;
    // the metadata SHA still prevents overwriting another editor's album changes.
    if(body.sha!==current.sha)return failure(409,'album-version-conflict');
    let mutation;
    try {mutation=await model.applyMutation(current.data,body);}catch(e){return failure(e.message==='album-version-conflict'?409:e.message==='album-too-large'?413:400,['album-version-conflict','album-too-large','album-delete-confirmation-required','album-unsupported-format','album-invalid-image'].includes(e.message)?e.message:'invalid-album-request');}
    try {
      const writer=await createClient(configuration,'write'), parent=(await writer.rest.git.getCommit({...target,commit_sha:headSha})).data;
      if(!model.shaValid(parent.tree?.sha))throw Error();
      const tree=[];
      for(const file of mutation.files){const blob=(await writer.rest.git.createBlob({...target,content:file.bytes.toString('base64'),encoding:'base64'})).data;if(!model.shaValid(blob.sha))throw Error();tree.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});}
      // Deletion paths come exclusively from validated current metadata, never from the browser.
      const retained=new Set(mutation.next.albums.flatMap(a=>a.photos.flatMap(p=>p.variants.map(v=>v.src))));
      // Legacy derivatives can be shared by the frozen homepage. Retain those assets.
      for(const path of new Set(mutation.deleted))if(!retained.has(path)&&/\/photo-[a-f0-9-]{36}-(?:480|960|1600)\.webp$/.test(path))tree.push({path,mode:'100644',type:'blob',sha:null});
      const metadata=(await writer.rest.git.createBlob({...target,content:Buffer.from(JSON.stringify(mutation.next,null,2)+'\n').toString('base64'),encoding:'base64'})).data;
      if(!model.shaValid(metadata.sha))throw Error();tree.push({path:PATH,mode:'100644',type:'blob',sha:metadata.sha});
      const nextTree=(await writer.rest.git.createTree({...target,base_tree:parent.tree.sha,tree})).data;if(!model.shaValid(nextTree.sha))throw Error();
      const commit=(await writer.rest.git.createCommit({...target,message:body.action==='delete'?'Delete parish photo album via Admin Dashboard':`${body.album.status==='draft'?'Save draft':'Publish'} parish photo album via Admin Dashboard`,tree:nextTree.sha,parents:[headSha]})).data;if(!model.shaValid(commit.sha))throw Error();
      // A competing ref update makes this a sibling commit, rejected by force:false.
      // Failed processing/commits never attach blobs or metadata to the Dev branch.
      await writer.rest.git.updateRef({...target,ref:'heads/Dev',sha:commit.sha,force:false});
      return response(200,{ok:true,uploadMode:'serial-receipt-v1',sha:metadata.sha,headSha:commit.sha,commitSha:commit.sha,albumId:mutation.albumId||null,albums:mutation.next.albums});
    }catch(e){return failure([409,422].includes(e.status)?409:502,[409,422].includes(e.status)?'album-version-conflict':'album-save-unavailable');}
  };
}
module.exports={createPhotoAlbumsHandler,PATH};
