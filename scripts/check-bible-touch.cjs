/* Real browser touchscreen input. Run with PLAYWRIGHT_MODULE if not installed locally.
   BIBLE_TEST_URL defaults to the synthetic local preview. Never captures Scripture. */
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.BIBLE_TEST_URL||'http://127.0.0.1:4191/';
const sizes=[[390,844],[844,390],[820,1180],[1180,820]].filter(([width])=>!process.env.BIBLE_TEST_WIDTH||width===Number(process.env.BIBLE_TEST_WIDTH));
(async()=>{
 for(const [engine,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});
  try{for(const [width,height] of sizes){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   await context.addInitScript(()=>{window.__tapTargets=[];window.__gestureEvents=[];for(const name of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(name,e=>{window.__gestureEvents.push({name,x:e.clientX,y:e.clientY,target:e.target.className});},true);document.addEventListener('pointerdown',e=>{if(e.target.closest('.bible-page-text'))window.__tapTargets.push({type:e.pointerType,child:true});},true);});
   const page=await context.newPage();
   if(process.env.BIBLE_GESTURE_SOURCE)await page.route('**/bible-pages.js?*',route=>route.fulfill({contentType:'text/javascript',body:require('node:fs').readFileSync(process.env.BIBLE_GESTURE_SOURCE,'utf8')}));
   await page.goto(base);await page.locator('#header-bible-open').click();
   const f=page.frameLocator('iframe[title="Mickleham Church Bible reader"]');
   await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});
   await f.locator('body').evaluate(async()=>{await document.fonts.ready;});
   await page.waitForTimeout(200);
   await f.locator('#bible-browse').click();await f.locator('#bible-book').selectOption('JHN');
   await f.locator('#bible-chapter').selectOption('JHN.3');await f.locator('#bible-read').click();
   await f.getByRole('heading',{name:'John 3',exact:true}).waitFor();
   await page.locator('.home-bible-close[hidden]').waitFor({state:'attached'});
   const settled=()=>f.locator('#bible-page-spread[aria-busy="false"]').waitFor();
   await settled();await page.waitForTimeout(400);await settled();
   const state=async()=>({status:await f.locator('#bible-page-status').innerText(),offset:await f.locator('#bible-page-spread').getAttribute('data-reading-offset')});
   const index=s=>Number(s.status.match(/\d+/)[0]);
   const mode=await f.locator('#bible-page-spread').getAttribute('data-page-mode');
   assert.equal(mode,width===1180?'facing':'single');
   async function point(side){await f.locator('#bible-reference').scrollIntoViewIfNeeded();const leaves=f.locator('.bible-paper-page');const p=leaves.nth(mode==='facing'&&side>0?1:0);const box=await p.boundingBox();const t=await p.locator('.bible-page-text').boundingBox();return {x:box.x+box.width*(mode==='facing'?.5:side>0?.8:.2),y:t.y+35};}
   const tap=async(side)=>{const p=await point(side);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(100);return p;};
   const before=await state(),right=await tap(1),next=await state();assert.equal(index(next),index(before)+(mode==='facing'?2:1));
   const left=await tap(-1),back=await state();assert.equal(back.offset,before.offset);
   assert(await f.locator('body').evaluate(()=>window.__tapTargets.some(t=>t.type==='touch'&&t.child)),'actual touchscreen target inside Scripture');
   const b=await f.locator('#bible-page-spread').boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+60);assert.equal((await state()).offset,before.offset,'centre/spine');
   // Desktop mouse text clicks must not acquire tablet touch semantics.
   if(mode==='facing'){const p=await point(1);await page.mouse.click(p.x,p.y);assert.equal((await state()).offset,before.offset);}
   for(const id of ['bible-bookmark','bible-bookmark']){await f.locator('#'+id).tap();assert.equal((await state()).offset,before.offset);}
   await f.locator('#bible-browse').tap();assert.equal((await state()).offset,before.offset);await f.locator('#bible-drawer-close').tap();
   await f.locator('#bible-about').tap();assert.equal((await state()).offset,before.offset);await f.locator('#bible-information-close').tap();
   const result={engine,width,height,mode,before,next,back,right,left,controls:true,scriptureChildTouch:true};
   if(engine==='chromium'){
    const cdp=await context.newCDPSession(page),p=await point(1),end={x:p.x-100,y:p.y};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
    for(let n=1;n<=5;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-20*n,y:p.y}]});await page.waitForTimeout(25);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
    assert.equal(index(await state()),index(before)+(mode==='facing'?2:1),'one swipe turn '+JSON.stringify(await f.locator('body').evaluate(()=>({events:window.__gestureEvents.slice(-10),selected:!!window.getSelection().toString()}))));
    await page.waitForTimeout(150);assert.equal(index(await state()),index(before)+(mode==='facing'?2:1),'no release/ghost turn');
    await tap(-1);assert.equal((await state()).offset,before.offset,'fresh post-swipe tap');
    const hold=await point(1);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[hold]});await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await state()).offset,before.offset,'long press');
    // Clear only the test selection, never production state.
    await f.locator('body').evaluate(()=>window.getSelection().removeAllRanges());
    result.touchSwipeOnce=true;result.longPressSafe=true;
   }
   await point(1);const text=await f.locator('.bible-page-text').first().locator('p').first().boundingBox();
   await page.mouse.move(text.x+12,text.y+10);await page.mouse.down();await page.mouse.move(text.x+Math.min(160,text.width-12),text.y+10,{steps:8});await page.mouse.up();
   assert.equal((await state()).offset,before.offset,'text drag does not navigate');
   assert(await f.locator('body').evaluate(()=>!!window.getSelection().toString()),'Scripture remains selectable');
   await f.locator('body').evaluate(()=>window.getSelection().removeAllRanges());result.textSelectionSafe=true;
   if(mode==='facing'){
    // Recreate the reported John 1 middle-spread state, not only a first spread.
    await f.locator('#bible-browse').tap();await f.locator('#bible-chapter').selectOption('JHN.1');await f.locator('#bible-read').tap();await f.getByRole('heading',{name:'John 1',exact:true}).waitFor();await settled();await page.waitForTimeout(200);
    for(let n=0;n<3;n++){await f.locator('#bible-page-next').tap();await page.waitForTimeout(50);}
    assert.equal(index(await state()),7);await tap(-1);assert.equal(index(await state()),5);await tap(1);assert.equal(index(await state()),7);result.john1MiddleSpread=true;
    async function choose(book,chapter){await f.locator('#bible-browse').tap();await f.locator('#bible-book').selectOption(book);await f.locator('#bible-chapter').selectOption(chapter);await f.locator('#bible-read').tap();await f.locator('#bible-reference').filter({hasText:chapter==='GEN.50'?'Genesis 50':'Genesis 1'}).waitFor();await settled();await page.waitForTimeout(200);}
    await choose('GEN','GEN.50');let total=Number((await state()).status.match(/\d+/g).at(-1));
    while(index(await state())+1<total){await f.locator('#bible-page-next').tap();await page.waitForTimeout(50);}
    await tap(1);await f.getByRole('heading',{name:'Exodus 1',exact:true}).waitFor();await settled();await page.waitForTimeout(200);await tap(-1);await f.getByRole('heading',{name:'Genesis 50',exact:true}).waitFor();result.bookBoundary=true;
    await choose('GEN','GEN.1');total=Number((await state()).status.match(/\d+/g).at(-1));
    while(index(await state())+1<total){await f.locator('#bible-page-next').tap();await page.waitForTimeout(50);}
    await tap(1);await f.getByRole('heading',{name:'Genesis 2',exact:true}).waitFor();await settled();await page.waitForTimeout(200);await tap(-1);await f.getByRole('heading',{name:'Genesis 1',exact:true}).waitFor();result.chapterBoundary=true;
   }
   console.log(JSON.stringify(result));await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
