'use strict';
// Explicit Dev release transition. No bootstrap, permission mutation or recovery
// fallback occurs here. Secrets stay in process memory, never logs/artifacts.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {createAccessStore}=require('../src/access-store');
const {resolve,allowed}=require('../src/access-model');
const legacy=require('../src/admin-identities.json');
const APP='stmichael-church-admin-api',RG='rg-stmichael-church-admin';
function az(args){return JSON.parse(execFileSync('az',[...args,'--only-show-errors','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}
function verifyOwner(snapshot){
 if(legacy.length!==1)throw Error('owner-policy-not-verified');
 const identity=Object.fromEntries(['provider','tenantId','objectId','issuer','subject'].filter(k=>legacy[0][k]).map(k=>[k,legacy[0][k]]));
 if(!allowed(resolve(snapshot.state,identity),'owner'))throw Error('existing-owner-not-verified');
 return snapshot.state.revision;
}
async function activate({run=az,fetchImpl=fetch,createStore=createAccessStore,expectedBundle,expectedPage,expectedAssets={},revision,wait=ms=>new Promise(r=>setTimeout(r,ms)),attempts=40}={}){
 if(!/^[a-f0-9]{40}$/.test(revision||'')||!expectedBundle||!expectedPage)throw Error('invalid-release');
 const settings=run(['functionapp','config','appsettings','list','--name',APP,'--resource-group',RG,'--query',"[?name=='ADMIN_ACCESS_MODE'||name=='AzureWebJobsStorage'].{name:name,value:value}"]);
 const mode=settings.find(x=>x.name==='ADMIN_ACCESS_MODE')?.value;
 if(mode&& !['legacy','capabilities'].includes(mode))throw Error('unknown-enforcement-mode');
 const connection=settings.find(x=>x.name==='AzureWebJobsStorage')?.value;
 if(typeof connection!=='string'||!/(?:^|;)AccountName=rgstmichaelchurchad85df(?:;|$)/.test(connection))throw Error('unverified-storage-account');
 const store=createStore({env:{AzureWebJobsStorage:connection}});
 verifyOwner(await store.read());
 const normalize=s=>s.replace(/\r\n/g,'\n');
 let frontendReady=false;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const expected={'msal-auth.bundle.js':expectedBundle,'':expectedPage,...expectedAssets};
   const actual=await Promise.all(Object.entries(expected).map(async([file,content])=>{const response=await fetchImpl(`https://micklehamchurch.github.io/website/admin/${file}?access-release=${revision}-${attempt}`,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});return response.ok&&normalize(await response.text())===normalize(content);}));
   if(actual.every(Boolean)){frontendReady=true;break;}
  }catch{}
  if(attempt+1<attempts)await wait(10000);
 }
 if(!frontendReady)throw Error('new-frontend-not-live');
 const ownerRevision=verifyOwner(await store.read());
 if(mode!=='capabilities')run(['functionapp','config','appsettings','set','--name',APP,'--resource-group',RG,'--settings','ADMIN_ACCESS_MODE=capabilities','--query',"[?name=='ADMIN_ACCESS_MODE'].{name:name,value:value}"]);
 const saved=run(['functionapp','config','appsettings','list','--name',APP,'--resource-group',RG,'--query',"[?name=='ADMIN_ACCESS_MODE'].{name:name,value:value}"]);
 if(saved.length!==1||saved[0].value!=='capabilities')throw Error('enforcement-not-confirmed');
 verifyOwner(await store.read());
 return {ok:true,existingOwnerVerified:true,ownerRevision,frontendVerified:true,enforcement:'capabilities',permissionDataChanged:false};
}
async function main(){
 if(process.env.GITHUB_REF!=='refs/heads/Dev'||process.env.GITHUB_EVENT_NAME!=='push')throw Error('dev-release-required');
 const root=path.resolve(__dirname,'../..');
 return activate({revision:process.env.GITHUB_SHA,expectedBundle:fs.readFileSync(path.join(root,'admin/msal-auth.bundle.js'),'utf8'),expectedPage:fs.readFileSync(path.join(root,'admin/index.html'),'utf8'),expectedAssets:Object.fromEntries(['admin.js','cms.css'].map(file=>[file,fs.readFileSync(path.join(root,'admin',file),'utf8')]))});
}
if(require.main===module)main().then(receipt=>console.log(JSON.stringify(receipt))).catch(()=>{console.error('Admin access transition could not be verified. Inspect current enforcement before retrying; no credentials displayed.');process.exitCode=1;});
module.exports={activate,verifyOwner};
