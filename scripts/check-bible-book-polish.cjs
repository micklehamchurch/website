/* Browser geometry, accessibility and native dismissal checks. Screenshots use
   synthetic local content; live captures are restricted to the book header. */
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BIBLE_TEST_URL||'http://127.0.0.1:4191/';
const out=process.env.BIBLE_SCREENSHOT_DIR;
const sizes=[[320,740],[390,844],[430,932],[844,390],[820,1180],[1180,820],[1024,768],[1360,900],[1440,900],[1920,1080],[720,450]];
if(out)fs.mkdirSync(out,{recursive:true});
(async()=>{for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{for(const [width,height] of sizes.filter((s,i)=>engine==='chromium'||[1,3,4,5].includes(i))){
  if(process.env.BIBLE_TEST_WIDTH&&width!==Number(process.env.BIBLE_TEST_WIDTH))continue;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  if(process.env.BIBLE_BASELINE_DIR)await page.route('**/*',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1),file=path.join(process.env.BIBLE_BASELINE_DIR,name);return ['bible.html','bible-physical.css','bible-pages.js'].includes(name)?route.fulfill({path:file,contentType:name.endsWith('html')?'text/html':name.endsWith('css')?'text/css':'text/javascript'}):route.continue();});
  await page.goto(base);await page.locator('#header-bible-open').click();const f=page.frameLocator('iframe[title="Mickleham Church Bible reader"]');
  await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});await f.locator('body').evaluate(async()=>{await document.fonts.ready;});await page.waitForTimeout(200);
  await f.locator('#bible-browse').click();await f.locator('#bible-book').selectOption('JHN');await f.locator('#bible-chapter').selectOption('JHN.3');await f.locator('#bible-read').click();await f.getByRole('heading',{name:'John 3',exact:true}).waitFor();
  await page.locator('.home-bible-close[hidden]').waitFor({state:'attached'});await page.waitForTimeout(250);await f.locator('#bible-page-spread[aria-busy="false"]').waitFor();
  if(process.env.BIBLE_LARGE_TEXT){await page.frames().find(frame=>frame.url().includes('/bible.html')).addStyleTag({content:'.bible-page-text,.bible-page-measure,.bible-font-probe{font-size:38px!important}'});await page.waitForTimeout(300);await f.locator('#bible-page-spread[aria-busy="false"]').waitFor();}
  const metrics=await f.locator('body').evaluate(el=>{const q=s=>el.querySelector(s),rect=s=>q(s).getBoundingClientRect().toJSON();return {book:rect('.bible-reader'),toolbar:rect('.bible-toolbar'),heading:rect('.bible-reading-heading'),text:rect('.bible-page-text'),mode:q('#bible-page-spread').getAttribute('data-page-mode'),overflow:el.ownerDocument.documentElement.scrollWidth>el.ownerDocument.documentElement.clientWidth+1,internal:!!q('.bible-reader .bible-toolbar'),controls:[...q('.bible-toolbar').querySelectorAll('button')].filter(b=>!b.hidden).map(b=>({id:b.id,label:b.getAttribute('aria-label'),text:b.textContent.trim(),rect:b.getBoundingClientRect().toJSON()}))};});
  if(process.env.BIBLE_BASELINE_DIR){console.log(JSON.stringify({engine,width,height,...metrics}));await context.close();continue;}
  assert(metrics.internal);assert(!metrics.overflow);
  for(const c of metrics.controls){assert(c.label);assert.equal(c.text,'');assert(c.rect.width>=44&&c.rect.height>=44);assert(c.rect.top>=metrics.book.top&&c.rect.bottom<=metrics.heading.top+1);assert(c.rect.left>=metrics.book.left&&c.rect.right<=metrics.book.right);}
  assert(metrics.heading.bottom<=metrics.text.top+1);assert(metrics.book.top<30);
  if(out){const file=path.join(out,`${engine}-${width}x${height}${process.env.BIBLE_LARGE_TEXT?'-large-text':''}.png`);if(base.includes('127.0.0.1'))await page.screenshot({path:file});else{const box=await f.locator('.bible-reader').boundingBox();await page.screenshot({path:file,clip:{x:box.x,y:box.y,width:box.width,height:Math.min(metrics.text.top-metrics.book.top-2,150)}});}}
  const offset=()=>f.locator('#bible-page-spread').getAttribute('data-reading-offset');const before=await offset();
  await f.locator('#bible-browse').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.notEqual(await f.locator('#bible-browse').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.keyboard.press('Tab');assert.equal(await f.locator('#bible-bookmark').evaluate(el=>el===el.ownerDocument.activeElement),true);
  await page.keyboard.press('Tab');assert.equal(await f.locator('#bible-close').evaluate(el=>el===el.ownerDocument.activeElement),true);
  await f.locator('#bible-browse').tap();assert.equal(await offset(),before);assert(await f.locator('#bible-drawer').evaluate(el=>el.open));
  await f.locator('#bible-drawer-close').press('Escape');assert.equal(await f.locator('#bible-drawer').evaluate(el=>el.open),false);assert.equal(await f.locator('#bible-browse').evaluate(el=>el===el.ownerDocument.activeElement),true);
  for(let i=0;i<2;i++){await f.locator('#bible-bookmark').tap();assert.equal(await offset(),before);assert.equal(await f.locator('#bible-bookmark').getAttribute('aria-pressed'),i===0?'true':'false');}
  await f.locator('#bible-close').tap();await page.locator('.home-bible-dialog').waitFor({state:'hidden'});await page.locator('#header-bible-open:focus, .menu-toggle:focus').waitFor({state:'attached'});
  async function reopen(){await page.locator('#header-bible-open').click();await page.locator('.home-bible-close[hidden]').waitFor({state:'attached'});await f.locator('#bible-page-spread[aria-busy="false"]').waitFor();await page.waitForTimeout(200);}
  await reopen();assert.equal(await offset(),before);
  await f.locator('#bible-browse').focus();await page.keyboard.press('Escape');await page.locator('.home-bible-dialog').waitFor({state:'hidden'});await page.locator('#header-bible-open:focus, .menu-toggle:focus').waitFor({state:'attached'});
  await reopen();const frame=await page.locator('.home-bible-dialog iframe').boundingBox(),book=await f.locator('.bible-reader').boundingBox();
  await page.touchscreen.tap(book.x+2,book.y+Math.min(140,book.height/2));assert(await page.locator('.home-bible-dialog').evaluate(el=>el.open));
  await page.touchscreen.tap(book.x-5,book.y+Math.min(140,book.height/2));await page.locator('.home-bible-dialog').waitFor({state:'hidden'});await page.locator('#header-bible-open:focus, .menu-toggle:focus').waitFor({state:'attached'});
  console.log(JSON.stringify({engine,width,height,...metrics,iconsSafe:true,keyboardOrder:true,nestedEscape:true,close:true,escape:true,backdrop:true,focusRestored:true}));await context.close();
 }}finally{await browser.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
