import test from 'node:test';
import assert from 'node:assert/strict';
import {AREAS,createShell,escapeHTML} from './cms-shell.mjs';
import {createAccessClient} from './access-client.mjs';
test('all capability combinations show only permitted task cards and owner is not a content checkbox',()=>{
 const previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={body:{dataset:{}}};globalThis.window={dispatchEvent(){}};
 try{
  for(const area of AREAS){const shell=createShell();shell.setSession({access:{role:'editor',status:'active',capabilities:[area[1]]}});const html=shell.dashboard();for(const candidate of AREAS)assert.equal(html.includes(`data-go="${candidate[0]}"`),candidate===area);assert.equal(shell.canView('users'),false);assert.equal(shell.canView('owner'),false);assert.equal(shell.canView('documents'),false);}
  const shell=createShell();shell.setSession({access:{role:'owner',status:'active',capabilities:[]}});assert(AREAS.every(a=>shell.canView(a[0])));assert(shell.navigation().includes('Owner'));assert(shell.canView('users'));
  shell.setSession({access:{role:'owner',status:'awaiting-approval',capabilities:[]}});assert.equal(shell.canView('users'),false);assert.equal(shell.can('news'),false);
  shell.setSession(null);assert.equal(shell.canView('dashboard'),false);
 }finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});
test('access client uses immutable server decision and conditional owner saves, without leaking token in result',async()=>{
 let sent;const call=createAccessClient({acquireTokenSilent:async()=>({accessToken:'test-token'})},()=>({}),{fetchImpl:async(url,options)=>{sent={url,options};return{ok:true,json:async()=>({ok:true,revision:2})};}});
 const result=await call('users',{method:'POST',etag:'v1',body:{action:'revoke',id:'test-user'}});assert.equal(sent.options.headers['If-Match'],'v1');assert.equal(sent.options.credentials,'omit');assert.equal(sent.options.cache,'no-store');assert.equal(result.revision,2);assert(!JSON.stringify(result).includes('test-token'));
 assert.equal((await createAccessClient({},()=>null)('session')).error,'authentication-required');
});
test('dynamic account text is escaped and no fabricated dates or counts appear on the dashboard',()=>{
 assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
 const source=AREAS.map(a=>a.slice(2).join(' ')).join(' ');assert(!/Last updated|new messages|2025/.test(source));
});
