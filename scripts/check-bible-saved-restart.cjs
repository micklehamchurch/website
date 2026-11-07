/* Use an explicitly supplied, empty QA profile; never a user's browser profile. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const profile=process.env.BIBLE_QA_PROFILE,base=process.env.BIBLE_TEST_URL||'http://127.0.0.1:4191/';
if(!profile||fs.existsSync(profile))throw Error('BIBLE_QA_PROFILE must name a new isolated QA directory');
(async()=>{
 for(let pass=0;pass<2;pass++){
  const context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:390,height:844}});
  try{const page=await context.newPage();await page.goto(base);await page.locator('#header-bible-open').click();const f=page.frameLocator('iframe[title="Mickleham Church Bible reader"]');
   await f.locator('#bible-book:not([disabled])').waitFor({state:'attached'});await page.waitForTimeout(250);await f.locator('#bible-browse').click();
   if(pass===0){await f.locator('#bible-book').selectOption('JHN');await f.locator('#bible-chapter').selectOption('JHN.3');await f.locator('#bible-read').click();await f.getByRole('heading',{name:'John 3',exact:true}).waitFor();await f.locator('#bible-bookmark:not([disabled])').click();await f.locator('#bible-browse').click();await f.getByRole('button',{name:/Rename saved place/}).click();await f.getByRole('textbox').fill('Restart check');await f.getByRole('button',{name:'Save',exact:true}).click();}
   else{assert.equal(await f.locator('.bible-place').count(),1);assert((await f.locator('.bible-place').innerText()).includes('Restart check'));}
  }finally{await context.close();}
 }
 console.log('PASS: saved place and custom name survive a complete Chromium shutdown/relaunch using an isolated persistent profile.');
})().catch(e=>{console.error(e);process.exitCode=1;});
