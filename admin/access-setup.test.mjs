import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPrivateOwner} from './access-setup.mjs';
const msal={acquireTokenPopup:async()=>({accessToken:'test-token'})};
test('owner setup verification is read-only, no-store, and contains no token in its result',async()=>{
  let request;
  const result=await verifyPrivateOwner(msal,{},{fetchImpl:async(url,options)=>{request={url,options};return{ok:true,json:async()=>({ok:true,ownerVerified:true,environment:'preview',revision:1,enforcement:'legacy'})};}});
  assert.equal(result.ok,true);assert.equal(result.enforcement,'legacy');
  assert.match(request.url,/\/access\/verify$/);assert.equal(request.options.method,'GET');assert.equal(request.options.credentials,'omit');assert.equal(request.options.cache,'no-store');
  assert.equal(JSON.stringify(result).includes('test-token'),false);
});
test('failed owner read-back never reports success or changes enforcement',async()=>{
  assert.equal((await verifyPrivateOwner(msal,{},{fetchImpl:async()=>({ok:false,status:503})})).ok,false);
  assert.equal((await verifyPrivateOwner(msal,{},{fetchImpl:async()=>({ok:true,json:async()=>({ok:true,ownerVerified:false})})})).ok,false);
});
