const { requireAdministrator } = require('./identity');
const { createGoogleSyncService, PATHS, sha, publicStatus } = require('./google-sync-service');
const response = (status,body) => ({status,headers:{'Cache-Control':'no-store',Pragma:'no-cache'},jsonBody:body});
const failure = (status,error) => response(status,{ok:false,error});
function createGoogleSyncHandler(options = {}) {
  const service = createGoogleSyncService(options);
  return async request => {
    const denied = requireAdministrator(request); if (denied) return denied;
    if (!['GET','POST'].includes(request.method)) return failure(405,'method-not-allowed');
    if (request.query && [...request.query.keys()].length) return failure(400,'invalid-sync-request');
    let body;
    if (request.method === 'POST') {
      try {
        if (!/^application\/json\b/i.test(request.headers.get('content-type')||'') || Number(request.headers.get('content-length'))>8192) throw Error();
        const reader=request.body.getReader(),chunks=[];let bytes=0;
        try {for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>8192){await reader.cancel();throw Error()}chunks.push(Buffer.from(part.value));}} finally{reader.releaseLock();}
        body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
        if (!body || Object.keys(body).sort().join(',')!=='calendarSha,confirm,headSha,registrySha,reviewDigest' || body.confirm!==true || ![body.calendarSha,body.registrySha,body.headSha].every(sha) || !/^[a-f0-9]{64}$/.test(body.reviewDigest)) throw Error();
      } catch {return failure(400,'invalid-sync-request');}
    }
    try {
      if (!body) {
        const current = await service.snapshot(), state = await service.store.read();
        return response(200,service.review(current,await service.prepare(current,state)));
      }
      const result = await service.store.locked(async ({state,save,guard}) => {
        const current = await service.snapshot();
        if (body.headSha!==current.headSha || body.calendarSha!==current.calendarSha || body.registrySha!==current.registrySha) return failure(409,'sync-version-conflict');
        const prepared = await service.prepare(current,state);
        if (body.reviewDigest!==prepared.reviewDigest) return failure(409,'google-review-changed');
        const applied = await service.publish(current,prepared,guard);
        if (applied.calendarChanged) { state.lastCalendarUpdate=service.now(); await save(state); }
        return response(200,applied);
      });
      return result?.busy ? failure(409,'sync-version-conflict') : result;
    } catch (e) {return failure(e.status||502,['sync-repository-unavailable','google-feed-unavailable','sync-version-conflict','google-review-required','sync-publish-unconfirmed'].includes(e.code)?e.code:'sync-status-unavailable');}
  };
}
function createGoogleSyncStatusHandler(options = {}) {
  const service = createGoogleSyncService(options);
  return async request => {
    const denied = requireAdministrator(request); if (denied) return denied;
    if (request.method!=='GET' || (request.query && [...request.query.keys()].length)) return failure(400,'invalid-sync-request');
    try {return response(200,{ok:true,...publicStatus(await service.store.read())});}
    catch {return failure(502,'sync-status-unavailable');}
  };
}
module.exports = { createGoogleSyncHandler, createGoogleSyncStatusHandler, PATHS };
