const {BlobServiceClient}=require('@azure/storage-blob');
const {ManagedIdentityCredential}=require('@azure/identity');
const CONTAINER='church-website-feedback',BLOB='discussion-state-v1.json',MAX_BYTES=8*1024*1024;
const empty=()=>({version:1,mode:'off',code:null,epoch:0,sessions:[],topics:[],limits:{}});
function createFeedbackStore({env=process.env,service}={}){
 let container;
 function client(){if(!container){if(!service){const options={retryOptions:{maxTries:2,tryTimeoutInMs:10000}};if(env.AzureWebJobsStorage)service=BlobServiceClient.fromConnectionString(env.AzureWebJobsStorage,options);else{const endpoint=env.AzureWebJobsStorage__blobServiceUri||(env.AzureWebJobsStorage__accountName?'https://'+env.AzureWebJobsStorage__accountName+'.blob.core.windows.net':null);if(!endpoint||!/^https:\/\/[a-z0-9]+\.blob\.core\.windows\.net\/?$/.test(endpoint))throw Error('feedback-storage-unavailable');service=new BlobServiceClient(endpoint,new ManagedIdentityCredential(env.AzureWebJobsStorage__clientId?{clientId:env.AzureWebJobsStorage__clientId}:{}),options);}}container=service.getContainerClient(CONTAINER);}return container;}
 async function read(blob=client().getBlockBlobClient(BLOB)) {try{if((await client().getProperties()).blobPublicAccess)throw Error('feedback-storage-not-private');const p=await blob.getProperties();if(p.contentLength>MAX_BYTES)throw Error('feedback-capacity');const state=JSON.parse((await blob.downloadToBuffer(0,p.contentLength)).toString('utf8'));if(state.version!==1||!Array.isArray(state.topics)||!Array.isArray(state.sessions))throw Error('feedback-storage-invalid');return state;}catch(e){if(e.statusCode===404)return empty();throw e;}}
 async function locked(action){const c=client();await c.createIfNotExists();if((await c.getProperties()).blobPublicAccess)throw Error('feedback-storage-not-private');const blob=c.getBlockBlobClient(BLOB);try{const v=JSON.stringify(empty());await blob.upload(v,Buffer.byteLength(v),{conditions:{ifNoneMatch:'*'}});}catch(e){if(![409,412].includes(e.statusCode))throw e;}
 const lease=blob.getBlobLeaseClient();try{await lease.acquireLease(60);}catch(e){if(e.statusCode===409)throw Error('feedback-busy');throw e;}
 try{return await action(await read(blob),async state=>{const content=JSON.stringify(state);if(Buffer.byteLength(content)>MAX_BYTES)throw Error('feedback-capacity');await lease.renewLease();await blob.upload(content,Buffer.byteLength(content),{conditions:{leaseId:lease.leaseId},blobHTTPHeaders:{blobContentType:'application/json',blobCacheControl:'no-store'}});});}finally{await lease.releaseLease().catch(()=>{});}}
 return {read,locked};
}
module.exports={createFeedbackStore,empty,CONTAINER,BLOB,MAX_BYTES};
