import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleSyncApi } from './google-calendar-sync-api.mjs';
const review={ok:true,headSha:'a'.repeat(40),calendarSha:'b'.repeat(40),registrySha:'c'.repeat(40),reviewDigest:'d'.repeat(64),canApply:true,report:{additions:[],updates:[]}};
test('Google check and explicit apply use scoped Admin API bearer requests and review binding only',async()=>{
 const calls=[],api=createGoogleSyncApi({getToken:async()=> 'fixture-token',fetchImpl:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>review};}});
 assert.equal((await api.check()).ok,true);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.body,undefined);assert.match(calls[0].url,/\/api\/google-calendar-sync$/);
 assert.equal((await api.apply(review)).ok,true);assert.equal(calls[1].options.method,'POST');assert.equal(calls[1].options.headers.Authorization,'Bearer fixture-token');assert.deepEqual(JSON.parse(calls[1].options.body),{headSha:review.headSha,calendarSha:review.calendarSha,registrySha:review.registrySha,reviewDigest:review.reviewDigest,confirm:true});
 assert.equal(calls[1].options.credentials,'omit');assert.equal(calls[1].options.cache,'no-store');
});
test('missing API token does not send requests; unauthorized, conflicts and transport failures use safe categories',async()=>{
 const missing=createGoogleSyncApi({getToken:async()=>{throw Error('fixture-only');},fetchImpl:async()=>{throw Error('must not fetch');}});assert.equal((await missing.check()).error,'authentication-required');
 for(const [status,error] of [[401,'authentication-required'],[403,'administrator-required'],[409,'review-again'],[502,'sync-unavailable']]){const api=createGoogleSyncApi({getToken:async()=> 'fixture-token',fetchImpl:async()=>({ok:false,status})});assert.equal((await api.check()).error,error);}
});
