const { requireAdministrator } = require('./identity');
const { readGithubConfiguration, createInstallationClient, EXPECTED_TARGET } = require('./github-status');
const { readJson } = require('./news-publishing');
const model = require('./clergy-model');
const metadataPath = '_content/clergy.json';
const target = Object.freeze({owner:EXPECTED_TARGET.owner,repo:EXPECTED_TARGET.repository});
const response = (status,jsonBody) => ({status,headers:{'Cache-Control':'no-store',Pragma:'no-cache'},jsonBody});
const validationError = e => ({'missing-name':'archive-name-required','invalid-year':'archive-invalid-years','invalid-periods':'archive-invalid-years','invalid-image-format':'archive-invalid-image','invalid-image':'archive-invalid-image','invalid-filename':'archive-invalid-image','invalid-image-path':'archive-unsafe-image','unknown-image':'archive-unsafe-image','unknown-upload':'archive-unsafe-image','invalid-text':'archive-unsafe-text','invalid-id':'archive-invalid-id','use-unpublish':'archive-record-removal','invalid-removal':'archive-invalid-removal'})[e?.message] || 'invalid-archive-request';
const failure = (status,error) => response(status,{ok:false,error});
function createClergyHandler({env=process.env,readConfiguration=readGithubConfiguration,createClient=(c,p)=>createInstallationClient(c,undefined,p)}={}) {
  return async request => {
    const denied = requireAdministrator(request); if (denied) return denied;
    if (!['GET','PUT'].includes(request.method)) return failure(405,'method-not-allowed');
    if (request.query && [...request.query.keys()].length) return failure(400,'invalid-archive-request');
    let body;
    if (request.method === 'PUT') try {
      body = await readJson(request,model.MAX_BODY); model.keys(body,['sha','headSha','archive','uploads','removedRecordIds'],['sha','headSha','archive','uploads']);
      if (!model.shaValid(body.sha) || !model.shaValid(body.headSha)) throw new Error();
      model.validateArchive(body.archive,true);
    } catch(e) { return failure(e instanceof RangeError ? 413 : 400,e instanceof RangeError ? 'archive-payload-too-large' : validationError(e)); }
    let configuration,reader,head,current,sha;
    try {
      configuration=readConfiguration(env); reader=await createClient(configuration,'read');
      head=(await reader.rest.git.getRef({...target,ref:'heads/Dev'})).data.object.sha;
      if (!model.shaValid(head)) throw new Error();
      const file=(await reader.rest.repos.getContent({...target,path:metadataPath,ref:head})).data;
      if(file.type !== 'file' || file.path !== metadataPath || file.encoding !== 'base64' || !model.shaValid(file.sha) || typeof file.content !== 'string' || file.content.length > model.MAX_METADATA*1.5) throw new Error();
      current=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(file.content,'base64'))); model.validateArchive(current); sha=file.sha;
    } catch {return failure(502,'archive-repository-unavailable');}
    if (request.method === 'GET') return response(200,{ok:true,sha,headSha:head,archive:current});
    if(body.sha !== sha || body.headSha !== head) return failure(409,'archive-version-conflict');
    let files;
    try {files=model.resolveImages(body.archive,current,await model.uploads(body.uploads),body.removedRecordIds);}
    catch(e){return failure(e instanceof RangeError ? 413 : 400,e instanceof RangeError ? 'archive-payload-too-large' : validationError(e));}
    body.archive.updatedAt=new Date().toISOString();
    try {model.validateArchive(body.archive);} catch {return failure(413,'archive-payload-too-large');}
    files.push({path:metadataPath,bytes:Buffer.from(JSON.stringify(body.archive,null,2)+'\n')});
    try {
      const writer=await createClient(configuration,'write');
      const parent=(await writer.rest.git.getCommit({...target,commit_sha:head})).data;
      if(!model.shaValid(parent.tree?.sha)) throw new Error();
      const tree=[];let metadataSha;
      for(const file of files){const blob=(await writer.rest.git.createBlob({...target,content:file.bytes.toString('base64'),encoding:'base64'})).data;if(!model.shaValid(blob.sha))throw new Error();tree.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});if(file.path===metadataPath)metadataSha=blob.sha;}
      const next=(await writer.rest.git.createTree({...target,base_tree:parent.tree.sha,tree})).data;if(!model.shaValid(next.sha))throw new Error();
      const commit=(await writer.rest.git.createCommit({...target,message:'Update historical archive through authorised Admin',tree:next.sha,parents:[head]})).data;if(!model.shaValid(commit.sha))throw new Error();
      await writer.rest.git.updateRef({...target,ref:'heads/Dev',sha:commit.sha,force:false});
      return response(200,{ok:true,sha:metadataSha,headSha:commit.sha,commitSha:commit.sha,archive:body.archive});
    }catch(e){return failure([409,422].includes(e?.status)?409:502,[409,422].includes(e?.status)?'archive-version-conflict':'archive-publish-unavailable');}
  };
}
module.exports={createClergyHandler,metadataPath};
