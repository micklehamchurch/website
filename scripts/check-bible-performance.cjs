// Synthetic failures in isolated contexts; never persists or prints Scripture.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.BIBLE_TEST_URL||'http://127.0.0.1:4191/';
(async()=>{for(const [engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch();try{for(const failure of ['slow','http','network','timeout','translation']){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 if(failure==='timeout')await context.addInitScript(()=>{const timeout=AbortSignal.timeout.bind(AbortSignal);AbortSignal.timeout=()=>timeout(100);});
 let fail=true,chapterCalls=0;const page=await context.newPage();
 await page.route('**/qa-api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(failure==='translation'&&path.endsWith('/translations')&&fail)return route.fulfill({json:{data:[]}});
  if(!/\/chapters\/[A-Z0-9]+\./.test(path))return route.continue();
  chapterCalls++;
  if(fail){if(failure==='network')return route.abort('failed');if(failure==='http')return route.fulfill({status:503,json:{error:'unavailable'}});if(['slow','timeout'].includes(failure))await new Promise(resolve=>setTimeout(resolve,failure==='slow'?600:250));}
  try{await route.continue();}catch{} // A closed iframe can cancel its pending request.
 });
 await page.goto(base);await page.locator('#header-bible-open').click();const f=page.frameLocator('iframe[title="Mickleham Church Bible reader"]');
 if(failure==='translation'){
  await f.locator('#bible-retry:not([hidden])').waitFor();fail=false;await f.locator('#bible-retry').click();
 }
 await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});await f.locator('#bible-browse').click();await f.locator('#bible-read').click();
 if(['http','network','timeout'].includes(failure)){
  await f.locator('#bible-retry:not([hidden])').waitFor();assert(await f.locator('#bible-reading').isHidden());
  fail=false;await f.locator('#bible-retry').click();
 }
 await f.locator('#bible-reading:not([hidden])[aria-busy="false"]').waitFor();assert.equal(await f.locator('#bible-reference').textContent(),'John 1');
 // Start uncached John 2, then check blocked controls and close during fetch.
 fail=true;await f.locator('#bible-browse').click();await f.locator('#bible-chapter').selectOption('JHN.2');
 if(failure==='slow'){
  assert(await f.locator('#bible-translation').isDisabled());assert(await f.locator('#bible-chapter').isDisabled());
  await f.locator('#bible-drawer-close').click();await f.locator('#bible-close').click();
  fail=false;await page.locator('#header-bible-open').click();
  await f.locator('#bible-reading:not([hidden])[aria-busy="false"]').waitFor();assert.equal(await f.locator('#bible-reference').textContent(),'John 1');
 }
 assert(chapterCalls>=1);console.log(`${engine} ${failure}: PASS (retry, stale-text guard, controls/close safety)`);await context.close();
 }}finally{await browser.close();}
}})().catch(error=>{console.error(error);process.exitCode=1;});
