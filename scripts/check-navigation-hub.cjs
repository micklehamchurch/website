// Browser integration checks for the one-panel desktop hub and shared drawer.
// Run NAVIGATION_BASE_URL=https://.../ to verify a deployed build in fresh contexts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/eduar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.NAVIGATION_BASE_URL||'http://127.0.0.1:4471/';
const output=path.resolve(process.env.NAVIGATION_OUTPUT||'../navigation-phase1-verification');fs.mkdirSync(output,{recursive:true});
const sizes=[[2560,1080],[1920,1080],[1600,1000],[1536,864],[1440,900],[1366,768],[1280,800],[1180,820],[1024,768],[820,1180],[768,1024],[430,932],[390,844],[375,812],[320,640],[874,402],[667,375]];
sizes.push([1600,768],[1600,700],[1536,600]);
const ids=['services','life-events','visit','community','about'];
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];try{
for(const [width,height]of sizes){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/images/navigation/'))requests.push([r.url(),r.status()]);});
 await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.churchResponsiveNavigation&&document.querySelector('link[href*="header-navigation.css"]')?.sheet);await page.evaluate(()=>document.fonts.ready);
 assert.equal(requests.length,0,'No initial navigation photo requests');
 const before=await page.locator('main').boundingBox();
 if(width>=1536){const boxes=await page.locator('.header-branding,.nav-primary,.nav-utilities').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));assert(boxes[0].right<=boxes[1].x+1&&boxes[1].right<=boxes[2].x+1,'Header groups do not overlap');}
 const compact=width<1536;if(compact)await page.locator('.menu-toggle').click();
 for(const id of ids){await page.locator('#trigger-'+id).click();const links=page.locator('#menu-'+id+' a');assert(await links.first().isVisible());
  if(compact){assert.equal(await page.locator('.hub-column:visible').count(),1);assert.equal(await page.locator('#trigger-'+id).getAttribute('aria-controls'),'menu-'+id);}
  else{assert.equal(await page.locator('.hub-column:visible').count(),5);assert.equal(await page.locator('.hub-column.is-selected').getAttribute('id'),'menu-'+id);assert.equal(await page.locator('#trigger-'+id).getAttribute('aria-controls'),'navigation-hub');}
  for(const link of await links.all()){const rect=await link.boundingBox();assert(rect.height>=43.9,'44px link targets');}
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflow');
 assert(await page.evaluate(()=>{const e=document.querySelector('dialog[open] .responsive-navigation-scroll')||document.querySelector('.navigation-hub');return e.scrollWidth<=e.clientWidth+1;}),'Navigation overflow');
 if(compact){assert.equal(requests.length,0,'No mobile navigation photos');await page.locator('#menu-about a').last().focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#trigger-about').getAttribute('aria-expanded'),'false');await page.keyboard.press('Escape');assert.equal(await page.locator('#responsive-navigation').getAttribute('open'),null);assert(await page.locator('.menu-toggle').evaluate(e=>e===document.activeElement));}
 else{await page.waitForFunction(()=>[...document.querySelectorAll('.hub-image')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(requests.length,5);assert(requests.every(x=>x[1]===200));const photos=await page.locator('.hub-image').evaluateAll(es=>es.map(e=>({r:e.getBoundingClientRect().toJSON(),fit:getComputedStyle(e).objectFit})));assert(photos.every(x=>Math.abs(x.r.height-(height<=740?104:128))<1&&x.fit==='cover'));assert(Math.max(...photos.map(x=>x.r.bottom))-Math.min(...photos.map(x=>x.r.bottom))<1,'Common image baseline');for(const col of await page.locator('.hub-column').all()){const last=await col.locator('a').last().boundingBox(),image=await col.locator('img').boundingBox();assert(last.y+last.height<=image.y,'No link/image collision');}if(height>740){const panel=await page.locator('.navigation-hub').boundingBox();assert(panel.y+panel.height<=height,'Hub fits normal desktop height');}await page.locator('#menu-about a').first().focus();await page.keyboard.press('Escape');assert(await page.locator('.navigation-hub').evaluate(e=>e.hidden));assert(await page.locator('#trigger-about').evaluate(e=>e===document.activeElement));const after=await page.locator('main').boundingBox();assert(Math.abs(before.y-after.y)<1,'Disclosure does not move page');}
 // Capture the selected Visit & Explore category on each representative format.
 if([1600,1024,390,874].includes(width)){if(compact)await page.locator('.menu-toggle').click();await page.locator('#trigger-visit').click();await page.screenshot({path:path.join(output,`${base.startsWith('http://127')?'local':'live'}-navigation-${width}x${height}.png`)});if(compact)await page.locator('.responsive-navigation-close').click();else await page.keyboard.press('Escape');}
 assert.equal(errors.length,0,errors.join(';'));
 results.push({width,height,layout:compact?'accordion':'five-column hub',overflow:false,photoRequests:requests.length,errors});console.log('PASS',width,height);await context.close();
}
// Destinations, nested-path resolution, original bug flow and history navigation.
for(const width of [1600,1024,390,874]){const p=await browser.newPage({viewport:{width,height:width===874?402:900},reducedMotion:'reduce'});await p.goto(base);await p.waitForFunction(()=>globalThis.churchResponsiveNavigation);const compact=width<1536;
 for(const [category,label,destination]of [['services','Services Overview','worship.html'],['life-events','Baptisms','baptisms.html'],['visit','Our History','our-history.html'],['visit','Parish Photographs','gallery.html'],['community','News','news.html'],['about','Our Team','our-team.html']]){
  if(compact)await p.locator('.menu-toggle').click();await p.locator('#trigger-'+category).click();await Promise.all([p.waitForURL('**/'+destination),p.locator('#menu-'+category).getByRole('link',{name:label,exact:true}).click()]);await p.waitForFunction(()=>globalThis.churchResponsiveNavigation);
  if(compact)await p.locator('.menu-toggle').click();await p.locator('#trigger-'+category).click();const current=p.locator('#menu-'+category+' a[aria-current="page"]');assert.equal(await current.count(),1);assert(await current.isVisible());const style=await current.evaluate(e=>({color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));assert.equal(style.color,'rgb(24, 57, 45)');
  if(compact)await p.locator('.responsive-navigation-close').click();else await p.keyboard.press('Escape');
 }
 await p.goBack();await p.waitForFunction(()=>globalThis.churchResponsiveNavigation);await p.goForward();await p.waitForFunction(()=>globalThis.churchResponsiveNavigation);if(compact)await p.locator('.menu-toggle').click();await p.locator('#trigger-about').click();assert(await p.locator('#menu-about a[aria-current="page"]').isVisible());await p.close();
}
const p=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});await p.goto(base);await p.waitForFunction(()=>globalThis.churchResponsiveNavigation);await p.locator('#trigger-community').click();for(const link of await p.locator('.hub-links a').all()){const href=await link.getAttribute('href');const url=new URL(href,base),res=await p.request.get(url.href);assert.equal(res.status(),200,href);if(url.hash)assert((await res.text()).includes('id="'+url.hash.slice(1)+'"'));}
 await p.keyboard.press('Escape');await Promise.all([p.waitForURL('**/gallery.html'),p.locator('[data-site-footer] a[href="gallery.html"]').click()]);await p.locator('main h1').waitFor();await p.goto(base);await p.waitForFunction(()=>globalThis.churchResponsiveNavigation);await p.locator('#trigger-community').click();
 // Axe checks cover header + exposed hub/drawer (automated, not a screen-reader certification).
 const axe=path.resolve('../header-qa-tools/node_modules/axe-core/axe.min.js');if(fs.existsSync(axe)){await p.addScriptTag({path:axe});const a=await p.evaluate(()=>axe.run(document.querySelector('[data-site-header]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));fs.writeFileSync(path.join(output,'desktop-axe.json'),JSON.stringify(a.violations,null,2));assert.equal(a.violations.length,0,JSON.stringify(a.violations.map(x=>[x.id,x.nodes.map(n=>n.target)])));}
 await p.close();fs.writeFileSync(path.join(output,'responsive-results.json'),JSON.stringify({base,results},null,2));console.log('PASS all destinations, navigation flows, Back/Forward and desktop axe');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
