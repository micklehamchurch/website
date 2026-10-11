const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),live=process.env.CHECK_BASE_URL,base=live||'http://127.0.0.1:4198/';
const out=process.env.CHECK_OUTPUT||path.join(root,'..','parish-albums-verification');fs.mkdirSync(out,{recursive:true});
const albums=JSON.parse(fs.readFileSync(path.join(root,'parish-albums.json'))).albums;
const server=live?null:spawn(process.execPath,[path.join(root,'preview.js')],{env:{...process.env,MICKLEHAM_PREVIEW_PORT:'4198'},stdio:['ignore','pipe','inherit']});
(async()=>{
 if(server) await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 try{
 for(const mode of ['heritage','modern-classic','contemporary'])for(const width of [390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});const page=await context.newPage();const errors=[],failed=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failed.push(r.url())});page.on('request',r=>{if(r.url().includes('/assets/images/albums/'))requests.push(r.url())});
  await page.goto(base+'gallery.html');await page.locator(`[data-typography-option="${mode}"]`).click();await page.waitForFunction(m=>document.documentElement.dataset.typography===m,mode);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.parish-album-cards').scrollIntoViewIfNeeded();
  await page.locator('.parish-album-card img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode()}});
  assert.equal(await page.locator('.parish-album-card').count(),5);assert.equal(await page.locator('[data-gallery-photo]').count(),0);
  const coverSources=albums.flatMap(a=>(a.photos.find(p=>p.id===a.cover)||a.photos[0]).variants.slice(0,2).map(v=>v.src));
  assert(requests.every(u=>coverSources.some(src=>u.endsWith(src))),'Only covers requested on landing');
  const allCovers=[...new Set(requests)];const coverBytes=await page.locator('.parish-album-card img').evaluateAll(imgs=>imgs.map(i=>i.currentSrc));
  const bytes=coverBytes.reduce((sum,u)=>sum+albums.flatMap(a=>a.photos).flatMap(p=>p.variants).find(v=>u.endsWith(v.src)).bytes,0);
  assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`${mode} ${width} landing overflow`);
  await page.keyboard.press('Tab');await page.locator('.parish-album-card').first().focus();assert(await page.locator('.parish-album-card').first().evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
  await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'})});await page.screenshot({path:path.join(out,`${live?'live':'local'}-${mode}-${width}-landing.png`),fullPage:true});
  for(const album of albums){
   const card=page.locator(`[data-album-card="${album.id}"]`);await card.focus();await page.keyboard.press('Enter');await page.waitForFunction(id=>document.querySelector('[data-album-view] h2')?.id===id+'-heading',album.id);
   const links=page.locator('[data-gallery-photo]');assert.equal(await links.count(),album.photos.length);assert(await page.locator('[data-album-view] h2').evaluate(e=>e===document.activeElement));
   await page.locator('.parish-album-grid img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode()}});
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`${album.id} overflow`);
   await links.first().focus();await page.keyboard.press('Enter');const dialog=page.locator('#parish-gallery-dialog');await dialog.waitFor({state:'visible'});
   assert(await dialog.locator('[data-close]').evaluate(e=>e===document.activeElement));
   await page.keyboard.press('ArrowRight');assert.match(await dialog.locator('[data-gallery-status]').textContent(),/^2 of /);
   await page.keyboard.press('ArrowLeft');assert.match(await dialog.locator('[data-gallery-status]').textContent(),/^1 of /);
   await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert(await dialog.evaluate(e=>e.contains(document.activeElement)));
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await links.first().evaluate(e=>e===document.activeElement));
   await links.last().click();await dialog.locator('[data-next]').click();assert.match(await dialog.locator('[data-gallery-status]').textContent(),/^1 of /);await page.mouse.click(1,1);await dialog.waitFor({state:'hidden'});assert(await links.last().evaluate(e=>e===document.activeElement));
   for(const link of await links.all()){await link.click();await dialog.locator('img').evaluate(img=>img.decode());assert(await dialog.locator('img').evaluate(img=>img.naturalWidth>0));await dialog.locator('[data-close]').click();}
   if(album.id==='eco-group-working-parties')await page.screenshot({path:path.join(out,`${live?'live':'local'}-${mode}-${width}-eco.png`),fullPage:true});
   await page.locator('.parish-albums-back').first().click();await page.locator('[data-album-landing]').waitFor({state:'visible'});assert(await card.evaluate(e=>e===document.activeElement));assert.equal(await links.count(),0);
  }
  await page.goto(base+'gallery.html#remembrance-sunday');assert.equal(await page.locator('[data-gallery-photo]').count(),2);await page.locator('.parish-albums-back').first().click();await page.goBack();await page.locator('[data-album-view]').waitFor({state:'visible'});assert.equal(await page.locator('[data-gallery-photo]').count(),2);
  await page.goto(base+'gallery.html#unknown-album');assert(await page.locator('[data-album-landing]').isVisible());
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);results.push({mode,width,dpr:1,coverBytes:bytes,coverRequests:allCovers});console.log(`${mode} ${width}: PASS, five albums / 22 photos, keyboard, focus, close, routes, lazy images; covers ${bytes} bytes`);await context.close();
 }
 for(const width of [390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:2});const page=await context.newPage();const requests=[];page.on('request',r=>{if(r.url().includes('/assets/images/albums/'))requests.push(r.url())});await page.goto(base+'gallery.html');await page.locator('.parish-album-card img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode()}});const sources=await page.locator('.parish-album-card img').evaluateAll(imgs=>imgs.map(i=>i.currentSrc));const covers=albums.flatMap(a=>(a.photos.find(p=>p.id===a.cover)||a.photos[0]).variants.slice(0,2));assert(requests.every(u=>covers.some(v=>u.endsWith(v.src))));const bytes=sources.reduce((n,u)=>n+covers.find(v=>u.endsWith(v.src)).bytes,0);results.push({mode:'heritage',width,dpr:2,coverBytes:bytes,coverRequests:requests});console.log(`DPR 2 / ${width}: covers ${bytes} bytes, no album grid requests`);await context.close();
 }
 // Verify every derivative independently, including sizes not selected by srcset.
 const page=await browser.newPage();for(const variant of albums.flatMap(a=>a.photos).flatMap(p=>p.variants)){
  const response=await page.request.get(base+variant.src);assert.equal(response.status(),200,variant.src);assert.equal((await response.body()).length,variant.bytes,variant.src);
 }
 await page.goto(base+'gallery.html#harvest-family-service-2026');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('[data-gallery-photo]').count(),13);
 fs.writeFileSync(path.join(out,`${live?'live':'local'}-results.json`),JSON.stringify(results,null,2));console.log('PASS: all 66 derivatives respond with exact expected sizes; deep-link Harvest retained.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server?.kill());
