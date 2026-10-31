'use strict';
const {BlobServiceClient}=require('@azure/storage-blob');
const {ManagedIdentityCredential}=require('@azure/identity');
const model=require('./access-model');
const CONTAINER='church-website-access', BLOB='permissions-v1.json', MAX_BYTES=2*1024*1024;
function createAccessStore({env=process.env,service}={}) {
  let container;
  function client(){
    if(!container){
      if(!service){
        const options={retryOptions:{maxTries:2,tryTimeoutInMs:10000}};
        if(env.AzureWebJobsStorage) service=BlobServiceClient.fromConnectionString(env.AzureWebJobsStorage,options);
        else {
          const endpoint=env.AzureWebJobsStorage__blobServiceUri || (env.AzureWebJobsStorage__accountName ? `https://${env.AzureWebJobsStorage__accountName}.blob.core.windows.net` : '');
          if(!/^https:\/\/[a-z0-9]+\.blob\.core\.windows\.net\/?$/.test(endpoint)) throw Error('access-unavailable');
          service=new BlobServiceClient(endpoint,new ManagedIdentityCredential(env.AzureWebJobsStorage__clientId?{clientId:env.AzureWebJobsStorage__clientId}:{}),options);
        }
      }
      container=service.getContainerClient(CONTAINER);
    }
    return container;
  }
  async function privateContainer(){if((await client().getProperties()).blobPublicAccess) throw Error('access-storage-not-private');}
  async function read(){
    await privateContainer();
    const blob=client().getBlockBlobClient(BLOB), props=await blob.getProperties();
    if(!props.etag || props.contentLength>MAX_BYTES) throw Error('invalid-access-state');
    const bytes=await blob.downloadToBuffer(0,props.contentLength,{conditions:{ifMatch:props.etag}});
    return {state:model.validate(JSON.parse(bytes.toString('utf8'))),etag:props.etag};
  }
  async function write(state,etag){
    if(typeof etag!=='string'||!etag) throw Error('access-version-required');
    await privateContainer();model.validate(state);
    const value=JSON.stringify(state);if(Buffer.byteLength(value)>MAX_BYTES)throw Error('access-capacity');
    const saved=await client().getBlockBlobClient(BLOB).upload(value,Buffer.byteLength(value),{conditions:{ifMatch:etag},blobHTTPHeaders:{blobContentType:'application/json',blobCacheControl:'no-store'}});
    return saved.etag;
  }
  // Operator-only bootstrap; HTTP requests cannot create containers or initialize state.
  async function initialize(state){
    await privateContainer();model.validate(state);
    const value=JSON.stringify(state);if(Buffer.byteLength(value)>MAX_BYTES)throw Error('access-capacity');
    await client().getBlockBlobClient(BLOB).upload(value,Buffer.byteLength(value),{conditions:{ifNoneMatch:'*'},blobHTTPHeaders:{blobContentType:'application/json',blobCacheControl:'no-store'}});
    return read();
  }
  return {read,write,initialize};
}
module.exports={createAccessStore,CONTAINER,BLOB,MAX_BYTES};
