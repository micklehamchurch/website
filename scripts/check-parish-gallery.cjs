const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),port=4197,base=`http://127.0.0.1:${port}/`;
const server=spawn(process.execPath,[path.join(root,'preview.js')],{env:{...process.env,MICKLEHAM_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','inherit']});
(async()=>{
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const context=await browser.newContext({hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const mode of ['heritage','modern-classic','contemporary'])for(const width of [390,768,1024,1440]){
 await page.setViewportSize({width,height:1000});await page.goto(base);await page.locator(`[data-typography-option="${mode}"]`).click();await page.evaluate(()=>document.fonts.ready);
 await page.locator('.parish-life').scrollIntoViewIfNeeded();
 const spacing=await page.evaluate(()=>({top:parseFloat(getComputedStyle(document.querySelector('.parish-life')).paddingTop),subtitle:parseFloat(getComputedStyle(document.querySelector('.parish-life-heading > p')).fontSize),branding:parseFloat(getComputedStyle(document.querySelector('.header-branding')).gap)}));
 const oldPadding=width>=1051?Math.max(42,Math.min(width*.04,56)):Math.max(62,Math.min(width*.08,88));
 assert(Math.abs(spacing.top-oldPadding*.7)<.1,JSON.stringify({width,spacing,oldPadding}));assert.equal(spacing.subtitle,15);assert.equal(spacing.branding,width<=460?6:10);

 assert.equal(await page.locator('.menu-toggle').isVisible(),width<1000);
 const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(document.querySelector('.parish-life-grid')).gridTemplateColumns.split(' ').length,fit:getComputedStyle(document.querySelector('[data-slide]')).objectFit,video:document.querySelector('.parish-life-video').getBoundingClientRect().width/document.querySelector('.parish-life-video').getBoundingClientRect().height}));
 assert(!geometry.overflow,`${mode} ${width} overflow`);assert.equal(geometry.columns,width<=700?1:2);assert.equal(geometry.fit,'contain');assert(Math.abs(geometry.video-16/9)<.02);
 const carousel=page.locator('[data-parish-carousel]');await carousel.locator('[data-next]').click();assert.equal(await carousel.locator('[data-slide]:visible').getAttribute('alt'),'The congregation gathering in the church decorated for Harvest');
 await carousel.locator('[data-next]').press('ArrowLeft');assert.equal(await carousel.locator('[data-position][aria-pressed="true"]').getAttribute('aria-label').then(s=>s.startsWith('Show photograph 1:')),true);
 await carousel.locator('.parish-carousel-images').dispatchEvent('pointerdown',{clientX:240,clientY:120,pointerType:'touch',isPrimary:true});await carousel.locator('.parish-carousel-images').dispatchEvent('pointerup',{clientX:100,clientY:121,pointerType:'touch',isPrimary:true});assert.equal(await carousel.locator('[data-position][aria-pressed="true"]').getAttribute('aria-label').then(s=>s.startsWith('Show photograph 2:')),true);
 await carousel.locator("[data-slide]:visible").evaluate(img=>img.decode());
 await carousel.locator("[data-slide]:visible").evaluate(img=>img.decode());
 await page.screenshot({path:path.join(root,'../../outputs',`parish-life-${mode}-${width}.png`)});
 await page.locator('.parish-life a[href^="gallery.html"]').click();
 const links=page.locator('[data-gallery-photo]');assert.equal(await links.count(),13);await links.first().click();const dialog=page.locator('#parish-gallery-dialog');assert(await dialog.isVisible());await dialog.locator('[data-next]').press('ArrowRight');assert.match(await dialog.locator('[data-gallery-status]').textContent(),/^2 of 13/);await dialog.locator('[data-next]').press('Escape');assert(!(await dialog.isVisible()));assert(await links.first().evaluate(e=>e===document.activeElement));
 await links.nth(12).click();await dialog.locator('[data-next]').click();assert.match(await dialog.locator('[data-gallery-status]').textContent(),/^1 of 13/);await dialog.locator('[data-close]').click();assert(await links.nth(12).evaluate(e=>e===document.activeElement));
 await links.first().click();await page.mouse.click(1,1);assert(!(await dialog.isVisible()));assert(await links.first().evaluate(e=>e===document.activeElement));
 for(const link of await links.all()){await link.click();await dialog.locator('img').evaluate(img=>img.decode());assert(await dialog.locator('img').evaluate(img=>img.naturalWidth>0));await dialog.locator('[data-close]').click();}
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));console.log(`${mode} ${width}: PASS (carousel, swipe, keyboard, 13 images, close/focus, responsive)`);
}
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);assert.equal(await page.locator('[data-slide]:visible').count(),1);assert.deepEqual(errors,[]);console.log('12 responsive checks passed; reduced motion supported by manual-only carousel.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
