const { requireAdministrator } = require('./identity');
const { readGithubConfiguration, createInstallationClient, EXPECTED_TARGET } = require('./github-status');
const { fetchGoogleCalendar, fingerprint } = require('./google-calendar-adapter');
const { reconcile, validateRegistry } = require('./google-calendar-sync-model');
const PATHS = Object.freeze({ calendar:'_content/calendar.json', registry:'_sync/google-calendar.json' });
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const response = (status,body) => ({status,headers:{'Cache-Control':'no-store',Pragma:'no-cache'},jsonBody:body});
const failure = (status,error) => response(status,{ok:false,error});
function createGoogleSyncHandler({env=process.env,readConfiguration=readGithubConfiguration,createClient=(c,p)=>createInstallationClient(c,undefined,p),fetchFeed=fetchGoogleCalendar,now=()=>new Date().toISOString()}={}) {
  return async request => {
    const denied=requireAdministrator(request); if (denied) return denied;
    if (!['GET','POST'].includes(request.method)) return failure(405,'method-not-allowed');
    if (request.query && [...request.query.keys()].length) return failure(400,'invalid-sync-request');
    let body;
    if (request.method==='POST') {
      try {
        if (!/^application\/json\b/i.test(request.headers.get('content-type')||'') || Number(request.headers.get('content-length'))>8192) throw Error();
        const reader=request.body.getReader(),chunks=[];let bytes=0;
        try {for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>8192){await reader.cancel();throw Error()}chunks.push(Buffer.from(part.value));}} finally{reader.releaseLock();}
        body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
        if (!body || Object.keys(body).sort().join(',')!=='calendarSha,confirm,headSha,registrySha,reviewDigest' || body.confirm!==true || ![body.calendarSha,body.registrySha,body.headSha].every(sha) || !/^[a-f0-9]{64}$/.test(body.reviewDigest)) throw Error();
      } catch {return failure(400,'invalid-sync-request');}
    }
    let config,client,headSha,calendar,registry,calendarSha,registrySha;
    const target={owner:EXPECTED_TARGET.owner,repo:EXPECTED_TARGET.repository};
    try {
      config=readConfiguration(env);client=await createClient(config,'read');
      headSha=(await client.rest.git.getRef({...target,ref:'heads/Dev'})).data.object.sha;if(!sha(headSha))throw Error();
      async function read(path,max) {
        const file=(await client.rest.repos.getContent({...target,path,ref:headSha})).data;
        if(file.type!=='file'||file.path!==path||file.encoding!=='base64'||!sha(file.sha)||typeof file.content!=='string'||file.content.length>max*1.5)throw Error();
        const bytes=Buffer.from(file.content,'base64');if(bytes.length>max)throw Error();
        return {sha:file.sha,value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
      }
      const c=await read(PATHS.calendar,256*1024),r=await read(PATHS.registry,1024*1024);
      calendar=c.value;calendarSha=c.sha;registry=r.value;registrySha=r.sha;validateRegistry(registry);
    } catch {return failure(502,'sync-repository-unavailable');}
    if(body && (body.headSha!==headSha||body.calendarSha!==calendarSha||body.registrySha!==registrySha))return failure(409,'sync-version-conflict');
    let feed,plan;
    try {feed=await fetchFeed();plan=reconcile(calendar,registry,feed);} catch{return failure(502,'google-feed-unavailable');}
    const reviewDigest=fingerprint({feed:feed.fingerprint,report:plan.report,calendarSha,registrySha});
    const result={ok:true,headSha,calendarSha,registrySha,reviewDigest,report:plan.report,calendarChanged:plan.calendarChanged,blocked:plan.blocked,lastSuccessfulSync:registry.lastSuccessfulSync||null,checkedAt:now(),canApply:!plan.blocked&&(plan.calendarChanged||plan.stateChanged)};
    if(request.method==='GET')return response(200,result);
    if(body.reviewDigest!==reviewDigest)return failure(409,'google-review-changed');
    if(plan.blocked)return failure(409,'google-review-required');
    if(!plan.calendarChanged&&!plan.stateChanged)return response(200,{...result,unchanged:true});
    try {
      plan.registry.lastSuccessfulSync=now();
      plan.registry.audit={at:now(),additions:plan.report.additions.length,updates:plan.report.updates.length,missing:plan.report.missing.length,conflicts:plan.report.conflicts.length,suppressed:plan.report.suppressed.length};
      const writer=await createClient(config,'write');
      const parent=(await writer.rest.git.getCommit({...target,commit_sha:headSha})).data;
      if(!sha(parent.tree?.sha))throw Error();
      const tree=[];let nextCalendarSha=calendarSha;
      for(const [path,value] of [[PATHS.calendar,plan.calendar],[PATHS.registry,plan.registry]]) {
        if(path===PATHS.calendar&&!plan.calendarChanged)continue;
        const blob=(await writer.rest.git.createBlob({...target,content:Buffer.from(JSON.stringify(value,null,2)+'\n').toString('base64'),encoding:'base64'})).data;
        if(!sha(blob.sha))throw Error();tree.push({path,mode:'100644',type:'blob',sha:blob.sha});if(path===PATHS.calendar)nextCalendarSha=blob.sha;
      }
      const nextTree=(await writer.rest.git.createTree({...target,base_tree:parent.tree.sha,tree})).data;if(!sha(nextTree.sha))throw Error();
      const commit=(await writer.rest.git.createCommit({...target,tree:nextTree.sha,parents:[headSha],message:'Apply reviewed Google Calendar updates (Dev)'})).data;if(!sha(commit.sha))throw Error();
      await writer.rest.git.updateRef({...target,ref:'heads/Dev',sha:commit.sha,force:false});
      return response(200,{...result,calendarSha:nextCalendarSha,commitSha:commit.sha,headSha:commit.sha,lastSuccessfulSync:plan.registry.lastSuccessfulSync});
    }catch(error){return failure([409,422].includes(error?.status)?409:502,[409,422].includes(error?.status)?'sync-version-conflict':'sync-publish-unconfirmed');}
  };
}
module.exports={createGoogleSyncHandler,PATHS};
