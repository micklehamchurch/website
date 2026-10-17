// Optional browser audit, following the existing scripts/check-homepage-verses.cjs pattern.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),base=process.env.LANDSCAPE_BASE_URL||'http://127.0.0.1:4221/';
const reps=['index.html','worship.html','visit.html','church-life.html','news.html','about.html','our-history.html','churchyard.html','war-memorial.html','norman-architecture.html','our-churches.html','our-vision.html','our-team.html'];
const sizes=[[320,800],[390,844],[430,932],[667,375],[740,360],[812,375],[844,390],[852,393],[874,402],[932,430],[768,1024],[1024,768],[1280,900],[1440,1000]];
const artifacts=path.resolve(root,'../phone-landscape-verification');fs.mkdirSync(artifacts,{recursive:true});
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
async function reachable(locator,height){await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();assert(b&&b.y>=-1&&b.y+b.height<=height+1,`Unreachable navigation item: ${await locator.textContent()}`);}
(async()=>{let browser,server;let count=0;try{
 if(!process.env.LANDSCAPE_BASE_URL){server=spawn(process.execPath,[path.join(root,'preview.js')],{cwd:root,env:{...process.env,MICKLEHAM_PREVIEW_PORT:'4221'},stdio:['ignore','pipe','inherit']});await new Promise(r=>server.stdout.once('data',r));}
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
 const jobs=process.env.LANDSCAPE_EXTRA_ONLY?[]:(process.env.LANDSCAPE_PAGE?reps.filter(p=>p===process.env.LANDSCAPE_PAGE):reps).flatMap(file=>(process.env.LANDSCAPE_LIVE_SMOKE?[[874,402]]:sizes).map(size=>({file,size})));
 await Promise.all(Array.from({length:3},async()=>{while(jobs.length){const {file,size:[width,height]}=jobs.shift();const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-17T12:00Z')});await page.goto(base+file);await page.locator('.site-header .brand').waitFor();await page.evaluate(()=>document.fonts.ready);assert(await overflow(page),`${file} closed ${width}x${height}`);
 const short=width>height&&height<=460&&width<=999;
 if(short){const header=await page.locator('.site-header').boundingBox();assert(header.height<=60);assert(await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<=38));}
 if(file==='church-life.html'&&width===874)await page.screenshot({path:path.join(artifacts,'community-closed.png')});
 const toggle=page.locator('.menu-toggle');if(await toggle.isVisible()){
 await toggle.focus();await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');const nav=page.locator('#mainNav');assert(await nav.isVisible());assert(await overflow(page),`${file} open ${width}`);
 if(short){const b=await nav.boundingBox();assert(Math.abs(b.x)<1&&Math.abs(b.width-width)<1);assert(b.y+b.height<=height);const touch=await page.locator('.nav-primary > .nav-link,.nav-trigger,.menu-toggle,.nav-youtube').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height));assert(touch.every(h=>h>=44));}
 if(file==='church-life.html'&&width===874)await page.screenshot({path:path.join(artifacts,'community-menu.png')});
 for(const trigger of await page.locator('.nav-trigger').all()){
 await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'true');const id=await trigger.getAttribute('aria-controls');const links=page.locator('#'+id+' a');assert(await links.count());for(const link of await links.all()){await reachable(link,height);const b=await link.boundingBox();assert(b.height>=43.9);}
 if(file==='church-life.html'&&width===874&&id==='menu-community')await page.screenshot({path:path.join(artifacts,'community-expanded.png')});
 await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'false');}
 await reachable(page.locator('.nav-calendar'),height);await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert(await toggle.evaluate(e=>e===document.activeElement));assert.equal(await toggle.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 }
 assert.equal(errors.length,0,errors.join('\n'));assert(await overflow(page));await page.close();count++;if(count%26===0)console.log(`${count}/${reps.length*sizes.length} representative viewport checks passed`);}}));
 // Inspect every other indexed public template at a representative short height.
 const indexed=await(await fetch(base+'search-index.json')).json();for(const {url} of indexed.filter(p=>!reps.includes(p.url))){const page=await browser.newPage({viewport:{width:874,height:402}});await page.goto(base+url);await page.evaluate(()=>document.fonts.ready);assert(await overflow(page),url+' extra-template overflow');const heading=page.locator('h1');if(await heading.count()){const font=await heading.first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert(font<=40,url+' large heading '+font);}await page.close();}console.log('All indexed public pages passed additional landscape smoke checks');
 // Orientation changes retain reachable navigation and correct ARIA without reload.
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(base+'church-life.html');await page.locator('.menu-toggle').click();await page.locator('[aria-controls="menu-about"]').click();for(const [width,height]of [[874,402],[390,844]]){await page.setViewportSize({width,height});await reachable(page.locator('#menu-about a').last(),height);assert(await overflow(page));assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');}await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');await page.close();
 // Respect the existing reduced-motion setting and typography alternatives.
 for(const font of ['modern-classic','contemporary']){const p=await browser.newPage({viewport:{width:874,height:402},reducedMotion:'reduce'});await p.addInitScript(mode=>localStorage.setItem('mickleham-typography-preview',mode),font);await p.goto(base+'church-life.html');await p.evaluate(()=>document.fonts.ready);await p.locator('.menu-toggle').click();assert(await overflow(p));assert(await p.locator('.nav-chevron').first().evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<=.001));await p.close();}
 console.log('Orientation recovery, keyboard/focus, reduced motion and typography checks passed');
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
