const test=require('node:test'),assert=require('node:assert/strict');
const {activate}=require('../scripts/activate-access.cjs'),model=require('../src/access-model');
const live=require('./fixtures/ed-live-identity.json');
const state=model.bootstrap({...live,provider:'aad'},'owner@example.test');
function fixture(overrides={}){
 let mode=null,changes=0,reads=0;
 const options={revision:'a'.repeat(40),expectedBundle:'bundle',expectedPage:'page',attempts:1,wait:async()=>{},fetchImpl:async url=>({ok:true,text:async()=>url.includes('msal-auth')?'bundle':'page'}),createStore:()=>({read:async()=>{reads++;return{state:structuredClone(state),etag:'v1'};}}),run:args=>{if(args.includes('set')){changes++;mode='capabilities';return[];}return[{name:'AzureWebJobsStorage',value:'AccountName=rgstmichaelchurchad85df;AccountKey=fixture;'},...(mode?[{name:'ADMIN_ACCESS_MODE',value:mode}]:[])].filter(x=>args.at(-1).includes('AzureWebJobsStorage')||x.name==='ADMIN_ACCESS_MODE');},...overrides};
 return {options,stats:()=>({changes,reads})};
}
test('enforcement transition requires live frontend and actual private owner read-back before changing mode',async()=>{
 const f=fixture();const receipt=await activate(f.options);assert.equal(receipt.existingOwnerVerified,true);assert.equal(receipt.frontendVerified,true);assert.equal(receipt.permissionDataChanged,false);assert.equal(f.stats().changes,1);assert.equal(f.stats().reads,3);
});
test('unavailable private store, unverified owner or stale Pages never activates enforcement',async()=>{
 for(const override of [
  {createStore:()=>({read:async()=>{throw Error('unavailable');}})},
  {createStore:()=>({read:async()=>({state:{...state,users:[]}})})},
  {fetchImpl:async()=>({ok:true,text:async()=> 'old frontend'})}
 ]){const f=fixture(override);await assert.rejects(activate(f.options));assert.equal(f.stats().changes,0);}
});
