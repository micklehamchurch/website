const test=require('node:test'),assert=require('node:assert/strict');
const {createBlobSyncStore,emptyState,CONTAINER,BLOB}=require('../src/google-sync-store');
function fixture({busy=false,invalid=false}={}){
 let content=null,held=false,released=false;const uploads=[];
 const lease={leaseId:'fixture-lease',acquireLease:async seconds=>{assert.equal(seconds,60);if(busy)throw Object.assign(Error('fixture'),{statusCode:409});held=true;},renewLease:async()=>{assert(held);},releaseLease:async()=>{held=false;released=true;}};
 const blob={getProperties:async()=>{if(content===null)throw Object.assign(Error('fixture'),{statusCode:404});return{contentLength:Buffer.byteLength(content)};},downloadToBuffer:async()=>Buffer.from(invalid?'malformed':content),getBlobLeaseClient:()=>lease,upload:async(value,size,options)=>{assert.equal(size,Buffer.byteLength(value));if(options.conditions.ifNoneMatch){assert.equal(options.conditions.ifNoneMatch,'*');if(content!==null)throw Object.assign(Error('fixture'),{statusCode:412});}else{assert(held);assert.equal(options.conditions.leaseId,lease.leaseId);assert.equal(options.blobHTTPHeaders.blobCacheControl,'no-store');}content=value;uploads.push(options);}};
 const service={getContainerClient:name=>{assert.equal(name,CONTAINER);return{createIfNotExists:async(...args)=>{assert.equal(args.length,0);},getBlockBlobClient:name=>{assert.equal(name,BLOB);return blob;}};}};
 return{store:createBlobSyncStore({service}),uploads,released:()=>released};
}
test('missing status reads are read-only; private store initializes and writes under an expiring renewed lease',async()=>{
 const f=fixture();assert.deepEqual(await f.store.read(),emptyState());assert.equal(f.uploads.length,0);
 await f.store.locked(async({state,save,guard})=>{await guard();state.lastSuccessfulAutomatic='2026-10-03T08:00:00Z';await save(state);});assert(f.released());assert.equal((await f.store.read()).lastSuccessfulAutomatic,'2026-10-03T08:00:00Z');assert.equal(f.uploads.length,2);
});
test('busy lease runs no action; malformed status fails closed and releases lease',async()=>{
 const busy=fixture({busy:true});assert.deepEqual(await busy.store.locked(()=>{throw Error('must not run');}),{busy:true});
 const bad=fixture({invalid:true});await assert.rejects(bad.store.locked(()=>{throw Error('must not run');}));assert(bad.released());
});
test('missing host storage does not silently fall back to volatile memory or arbitrary endpoints',async()=>{
 for(const env of [{},{AzureWebJobsStorage__blobServiceUri:'http://example.org'},{AzureWebJobsStorage__blobServiceUri:'https://example.org'}])await assert.rejects(createBlobSyncStore({env}).read());
});
