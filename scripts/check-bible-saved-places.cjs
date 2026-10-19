const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.BIBLE_TEST_URL||'http://127.0.0.1:4191/',out=process.env.BIBLE_SCREENSHOT_DIR;
const sizes=[[390,844],[844,390],[820,1180],[1180,820],[1024,768],[1360,900],[1440,900],[1920,1080]];
if(out)fs.mkdirSync(out,{recursive:true});
(async()=>{for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{for(const [width,height] of sizes.filter((_,i)=>engine==='chromium'||i<4)){
  if(process.env.BIBLE_TEST_WIDTH&&width!==Number(process.env.BIBLE_TEST_WIDTH))continue;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage(),requests=[];
  page.on('request',r=>requests.push(r.url()+' '+(r.postData()||'')));
  await page.goto(base);await page.locator('#header-bible-open').click();const f=page.frameLocator('iframe[title="Mickleham Church Bible reader"]');
  async function shot(kind){if(out)await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${kind}.png`),...(base.includes('127.0.0.1')?{}:{clip:await f.locator('#bible-drawer').boundingBox()})});}
  await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});await f.locator('body').evaluate(async()=>{await document.fonts.ready;});await page.waitForTimeout(200);
  const storage=()=>f.locator('body').evaluate(()=>JSON.parse(localStorage.getItem('mickleham:bible:saved-places:v2')).items);
  const last=()=>f.locator('body').evaluate(()=>localStorage.getItem('mickleham:bible:last:v1'));
  const offset=()=>f.locator('#bible-page-spread').getAttribute('data-reading-offset');
  const restored=()=>f.locator(`#bible-page-spread[data-reading-offset="${a.offset}"][aria-busy="false"]`).waitFor();
  const settle=async()=>{await f.locator('#bible-page-spread[aria-busy="false"]').waitFor();await page.waitForTimeout(180);};
  const menu=async()=>{if(!await f.locator('#bible-drawer').evaluate(el=>el.open))await f.locator('#bible-browse').tap();await f.locator('#bible-drawer[open]').waitFor();};
  const rows=()=>f.locator('.bible-place');
  await menu();assert(await f.locator('#bible-places-empty').isVisible());assert.equal(await rows().count(),0);
  await shot('empty');
  await f.locator('#bible-book').selectOption('JHN');await f.locator('#bible-chapter').selectOption('JHN.3');await f.locator('#bible-read').click();await f.getByRole('heading',{name:'John 3',exact:true}).waitFor();await settle();
  await f.locator('#bible-page-next').tap();await settle();const savedOffset=await offset(),lastBefore=await last();
  await f.locator('#bible-bookmark').tap();assert.equal(await last(),lastBefore);const a=(await storage())[0];assert.equal(a.offset,Number(savedOffset));assert(!('page'in a));
  await menu();await shot('one');await f.locator('#bible-drawer-close').click();
  await f.locator('#bible-page-next').tap();await settle();assert.equal(await f.locator('#bible-bookmark').getAttribute('aria-pressed'),'false');await f.locator('#bible-bookmark').tap();assert.equal((await storage()).length,2);
  await menu();await f.locator('#bible-translation').selectOption('nirv');await f.locator('#bible-read:not([disabled])').waitFor({state:'attached'});await f.locator('#bible-read').click();await f.locator('#bible-edition').filter({hasText:'Reader'}).waitFor();await settle();await f.locator('#bible-bookmark').tap();assert.equal((await storage()).length,3);
  await menu();const progress=await last();
  await rows().nth(2).getByRole('button',{name:/Rename saved place/}).click();await rows().nth(2).getByRole('textbox').fill('  Comfort & hope — a quiet place to return to  ');await rows().nth(2).getByRole('button',{name:'Save',exact:true}).click();assert.equal((await storage()).find(p=>p.id===a.id).name,'Comfort & hope — a quiet place to return to');assert.equal(await last(),progress);
  await rows().nth(1).getByRole('button',{name:/Rename saved place/}).click();await rows().nth(1).getByRole('textbox').fill('<img src=x onerror=alert(1)>');await rows().nth(1).getByRole('button',{name:'Save',exact:true}).click();assert.equal(await rows().nth(1).locator('img').count(),0);assert((await rows().nth(1).innerText()).includes('<img src=x onerror=alert(1)>'));
  await rows().nth(1).getByRole('button',{name:/Rename saved place/}).click();await rows().nth(1).getByRole('textbox').fill(' ');await rows().nth(1).getByRole('button',{name:'Save',exact:true}).click();assert.equal((await storage())[1].name,'');
  await shot('saved');
  const layout=await f.locator('#bible-drawer').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.getBoundingClientRect().height,viewport:innerHeight,scrollLeft:el.scrollLeft,overflow:[...el.querySelectorAll('*')].filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,id:n.id,class:n.className,c:n.clientWidth,s:n.scrollWidth,x:n.scrollLeft})),wide:[...el.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>el.getBoundingClientRect().right).map(n=>({tag:n.tagName,id:n.id,class:n.className,width:n.getBoundingClientRect().width}))}));assert(layout.scrollWidth<=layout.width+1,JSON.stringify(layout));assert(layout.height<=layout.viewport);
  await rows().nth(1).getByRole('button',{name:/Delete saved place/}).click();assert.equal((await storage()).length,2);assert.equal(await last(),progress);await f.locator('#bible-places-undo').click();assert.equal((await storage()).length,3);assert.equal(await last(),progress);
  await f.locator('#bible-drawer-close').click();await page.setViewportSize(width>=1000?{width:390,height:844}:{width:1180,height:820});await settle();await menu();await rows().filter({hasText:'Comfort & hope'}).getByRole('button',{name:/Open saved place/}).click();await restored();await settle();assert.equal(await offset(),String(a.offset));assert.equal(await f.locator('#bible-translation').inputValue(),'niv');assert.equal(await f.locator('#bible-bookmark').getAttribute('aria-pressed'),'true');assert(await f.locator('.bible-page-ribbon').count()>0);
  await page.reload();await page.locator('#header-bible-open').click();await restored();await settle();assert.equal((await storage()).length,3);assert.equal(await offset(),String(a.offset));await menu();
  const beforeDelete=await last();await rows().nth(1).getByRole('button',{name:/Delete saved place/}).click();assert.equal((await storage()).length,2);assert((await storage()).some(p=>p.id===a.id));assert.equal(await last(),beforeDelete);
  await rows().first().locator('.bible-place-open').scrollIntoViewIfNeeded();await shot('two-after-delete');
  await f.locator('#bible-continue').click();await settle();assert.equal(await offset(),String(a.offset));await f.locator('#bible-page-next').tap();await settle();assert.notEqual(JSON.parse(await last()).offset,a.offset);
  assert(!requests.some(r=>r.includes('Comfort')||r.includes('onerror')||r.includes('mickleham:bible:saved-places')),'personal saved metadata never leaves the browser');
  if(width===390&&engine==='chromium'){
   await page.setViewportSize({width,height});await settle();
   await f.locator('body').evaluate(()=>localStorage.setItem('mickleham:bible:saved-places:v2',JSON.stringify({v:2,items:Array.from({length:100},(_,n)=>({translation:'niv',book:'GEN',chapter:'GEN.1',offset:n*3,reference:'Genesis 1',name:('A long saved place name for a quiet reading and reflection '+n).padEnd(80,' '),createdAt:n+1}))})));
   await page.reload();await page.locator('#header-bible-open').click();await settle();const capLast=await last();await f.locator('#bible-bookmark').tap();assert.equal((await storage()).length,100);assert.equal(await last(),capLast);assert((await f.locator('#bible-save-status').innerText()).includes('100'));assert(await f.locator('#bible-drawer').evaluate(el=>el.open));assert(await f.locator('#bible-places-status').evaluate(el=>el===el.ownerDocument.activeElement));
   await menu();assert.equal(await rows().count(),100);await rows().last().getByRole('button',{name:/Rename saved place/}).click();await rows().last().getByRole('textbox').fill('Long name '.repeat(8));await shot('rename-many');await rows().last().getByRole('button',{name:'Cancel',exact:true}).click();
   assert(await f.locator('#bible-places-list').evaluate(el=>el.scrollHeight>el.clientHeight));assert(await f.locator('#bible-drawer').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await f.locator('body').evaluate((el,p)=>{localStorage.removeItem('mickleham:bible:saved-places:v2');localStorage.setItem('mickleham:bible:bookmark:v1',JSON.stringify({...p,v:1,page:0,reference:'John 3'}));},a);
   await page.reload();await page.locator('#header-bible-open').click();await settle();assert.equal((await storage()).length,1);assert.equal((await storage())[0].offset,a.offset);assert.equal(await f.locator('body').evaluate(()=>localStorage.getItem('mickleham:bible:bookmark:v1')),null);
   await page.reload();await page.locator('#header-bible-open').click();await settle();assert.equal((await storage()).length,1);
   await menu();await f.locator('#bible-book').selectOption('GEN');await f.locator('#bible-chapter').selectOption('GEN.1');await f.locator('#bible-read').click();await f.getByRole('heading',{name:'Genesis 1',exact:true}).waitFor();await settle();
   await page.route('**/chapters/JHN.3',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic test failure"}'}));await menu();await rows().first().getByRole('button',{name:/Open saved place/}).click();await f.locator('#bible-retry').waitFor({state:'visible'});assert.equal((await storage()).length,1);
   await page.unroute('**/chapters/JHN.3');await f.locator('#bible-retry').click();await f.getByRole('heading',{name:'John 3',exact:true}).waitFor();await settle();assert.equal(await offset(),String(a.offset));
   await f.locator('body').evaluate((el,p)=>localStorage.setItem('mickleham:bible:saved-places:v2',JSON.stringify({v:2,items:[{...p,translation:'nirv'}]})),a);
   await page.route('**/translations',route=>route.fulfill({contentType:'application/json',body:'{"data":[{"id":"3e2eb613d45e131e-01"}]}'}));
   await page.reload();await page.locator('#header-bible-open').click();await restored();await settle();const unavailableLast=await last();await menu();await rows().first().getByRole('button',{name:/Open saved place/}).click();assert((await f.locator('#bible-places-status').innerText()).includes('unavailable'));assert.equal((await storage())[0].translation,'nirv');assert.equal(await last(),unavailableLast);
   await f.locator('#bible-drawer-close').click();await f.locator('body').evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked for QA','QuotaExceededError');};});await f.locator('#bible-bookmark').click();assert(await f.locator('#bible-drawer').evaluate(el=>el.open));assert((await f.locator('#bible-places-status').innerText()).includes('could not save'));assert.equal((await storage()).length,1);assert.equal(await offset(),String(a.offset));
  }
  console.log(JSON.stringify({engine,width,height,saved:a.reference,offset:a.offset,multiple:true,rename:true,plainText:true,deleteOne:true,undo:true,translationRestored:true,repagination:true,reload:true,continueSeparate:true,noOverflow:true,localOnly:true}));await context.close();
 }}finally{await browser.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
