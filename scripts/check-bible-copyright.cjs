// Native browser checks; live screenshots include only navigation/attribution
// and About, never long Scripture. Local content is synthetic.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.BIBLE_TEST_URL||'http://127.0.0.1:4191/',out=process.env.BIBLE_SCREENSHOT_DIR;
const notices={niv:'The Holy Bible, New International Version® (Anglicised), NIV® Copyright © 1979, 1984, 2011 by Biblica, Inc.® Used by permission of Biblica, Inc.® All rights reserved worldwide.',nirv:'Holy Bible, New International Reader’s Version®, NIrV® (Anglicised) Copyright © 1995, 1996, 1998, 2014 by Biblica, Inc.® Used by permission. All rights reserved worldwide.'};
const sizes=[[320,740],[375,812],[390,844],[430,932],[844,390],[820,1180],[1180,820],[1360,900],[1440,900],[1920,1080]];
(async()=>{if(out)fs.mkdirSync(out,{recursive:true});for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{for(const [width,height] of sizes){
  if(process.env.BIBLE_TEST_WIDTH&&width!==Number(process.env.BIBLE_TEST_WIDTH))continue;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();
  if(process.env.BIBLE_COPYRIGHT_BASELINE)await page.route('**/*',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);return ['bible.html','bible-physical.css','bible-presentation.js','bible-pages.js'].includes(name)?route.fulfill({path:path.join(process.env.BIBLE_COPYRIGHT_BASELINE,name),contentType:name.endsWith('html')?'text/html':name.endsWith('css')?'text/css':'text/javascript'}):route.continue();});
  if(base.includes('127.0.0.1'))await page.route('**/qa-api/*/chapters/*',async route=>{const response=await route.fetch(),body=await response.json();body.data.copyright=notices[route.request().url().includes('/nirv/')?'nirv':'niv'];await route.fulfill({response,json:body});});
  await page.goto(base);await page.locator('#header-bible-open').click();const f=page.frameLocator('iframe[title="Mickleham Church Bible reader"]');
  await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});await f.locator('#bible-browse').click();await f.locator('#bible-book').selectOption('JHN');await f.locator('#bible-chapter').selectOption('JHN.3');await f.locator('#bible-read').click();
  const settle=async()=>{await f.locator('#bible-page-spread[aria-busy="false"]').waitFor();await page.waitForTimeout(300);};await settle();
  if(process.env.BIBLE_COPYRIGHT_BASELINE){console.log(JSON.stringify({engine,width,height,baselineNotice:await f.locator('.bible-notices').evaluate(el=>({height:el.getBoundingClientRect().height,font:getComputedStyle(el.querySelector('p')).fontSize}))}));await context.close();continue;}
  const metrics=[];
  for(const version of ['niv','nirv']){
   if(version==='nirv'){await f.locator('#bible-browse').tap();await f.locator('#bible-translation').selectOption(version);await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});await f.locator('#bible-drawer-close').click();await settle();}
   assert.equal(await f.locator('#bible-copyright').textContent(),notices[version]);assert(!await f.locator('#bible-copyright').isVisible());
   const citation=await f.locator('#bible-copyright-citation').innerText();assert(citation.startsWith(version==='niv'?'NIV® © 1979, 1984, 2011':'NIrV® © 1995, 1996, 1998, 2014'));assert(citation.endsWith('Biblica, Inc.® All rights reserved.'));
   const m=await f.locator('.bible-notices').evaluate(el=>{const p=el.querySelector('p'),r=el.getBoundingClientRect(),s=getComputedStyle(p),doc=el.ownerDocument;return {height:r.height,font:parseFloat(s.fontSize),overflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth+1,bookBottom:doc.querySelector('.bible-reader').getBoundingClientRect().bottom,noticeBottom:r.bottom};});assert.equal(m.font,12);assert(!m.overflow);assert(m.bookBottom-m.noticeBottom<45);metrics.push({version,citation,...m});
   if(out){const nav=await f.locator('#bible-page-controls').boundingBox(),about=await f.locator('#bible-about').boundingBox();await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${version}-bottom.png`),clip:{x:0,y:nav.y,width,height:Math.min(height,about.y+about.height+8)-nav.y}});}
   await page.keyboard.press('Tab');await f.locator('#bible-about').focus();assert.notEqual(await f.locator('#bible-about').evaluate(el=>getComputedStyle(el).outlineStyle),'none');await page.keyboard.press('Enter');await f.locator('#bible-information[open]').waitFor();assert.equal(await f.locator('#bible-information-copyright').innerText(),notices[version]);assert(await f.locator('#bible-information a[href="https://www.biblica.com/"]').isVisible());assert(await f.locator('#bible-information').getAttribute('aria-labelledby'));
   if(out&&width===390)await page.screenshot({path:path.join(out,`${engine}-${version}-about.png`),clip:await f.locator('#bible-information').boundingBox()});
   await f.locator('#bible-information-close').press('Escape');await f.locator('#bible-about:focus').waitFor({state:'attached'});
   await f.locator('#bible-about').tap();await f.locator('#bible-information-close').click();await f.locator('#bible-about:focus').waitFor({state:'attached'});
  }
  // Text resizing must grow rather than clip small print.
  if(width===390){const frame=page.frames().find(x=>x.url().includes('bible.html'));await frame.addStyleTag({content:'html{font-size:200%!important}'});await settle();assert.equal(await f.locator('.bible-notices p').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),24);assert.equal(await f.locator('.bible-notices').evaluate(el=>el.scrollHeight>el.clientHeight+1),false);}
  console.log(JSON.stringify({engine,width,height,metrics,aboutKeyboardTouchEscapeFocus:true}));await context.close();
 }}finally{await browser.close();}
}})().catch(error=>{console.error(error);process.exitCode=1;});
