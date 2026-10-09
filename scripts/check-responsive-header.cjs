// Browser regression check. Set PLAYWRIGHT_MODULE to an installed Playwright
// module if it is not available in this project's normal module search path.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),port=4196,base=`http://127.0.0.1:${port}/`;
const widths=[390,430,600,700,767,768,820,834,980,998,999,1000,1001,1002,1024,1099,1100,1180,1280,1281,1366,1440];
const server=spawn(process.execPath,[path.join(root,'preview.js')],{env:{...process.env,MICKLEHAM_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','inherit']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited: ${code}`)));});
 const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const mode of ['heritage','modern-classic','contemporary'])for(const width of widths){
   await page.setViewportSize({width,height:width===1180?820:1000});
   await page.goto(base+'worship.html');await page.locator(`[data-typography-option="${mode}"]`).click();await page.evaluate(()=>document.fonts.ready);
   const mobile=width<1000,toggle=page.locator('.menu-toggle');assert.equal(await toggle.isVisible(),mobile,`${mode} ${width}: layout`);
   if(mobile)await toggle.click();
   assert.deepEqual(await page.locator('.nav-primary > a, .nav-primary > .nav-item > button').allTextContents().then(xs=>xs.map(x=>x.trim())),['Home','Service','Visit & Learn','Our Community','News','About Us']);
   assert.equal(await page.locator('.nav-primary a[href="news.html"]').count(),1);
   assert.equal(await page.locator('header a[href="give.html"]').count(),0);
   const geometry=await page.evaluate(()=>{
    const selectors='.header-branding .brand,.header-branding .nav-youtube,.menu-toggle,.nav-primary > .nav-link,.nav-trigger,.header-search,.nav-calendar';
    const boxes=[...document.querySelectorAll(selectors)].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,clipped:e.scrollWidth>e.clientWidth+2};});
    const overlaps=boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1));
    const about=document.querySelector('.nav-primary > .nav-item:last-child').getBoundingClientRect(),search=document.querySelector('.header-search').getBoundingClientRect();
    return{overflow:document.documentElement.scrollWidth>innerWidth,clipped:boxes.some(b=>b.clipped),overlaps:overlaps.length,gap:search.left-about.right,primaryRows:new Set(boxes.slice(2,8).map(b=>b.y+b.h/2)).size,height:document.querySelector('header').getBoundingClientRect().height};
   });
   assert(!geometry.overflow&&!geometry.clipped&&!geometry.overlaps,JSON.stringify({mode,width,geometry}));
   if(!mobile){assert(geometry.gap>=18,JSON.stringify({mode,width,geometry}));assert.equal(geometry.primaryRows,1);assert(geometry.height<=79);}
   for(const button of await page.locator('.nav-trigger').all()){
    await button.press('Enter');assert.equal(await button.getAttribute('aria-expanded'),'true');
    const menu=page.locator('#'+await button.getAttribute('aria-controls'));assert(await menu.isVisible());
    const bounds=await menu.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
    await button.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');
    if(mobile)await toggle.click();
   }
   await page.locator('#header-search-query').fill('baptism');await page.locator('#header-search-query').press('Enter');await page.waitForURL('**/search.html?q=baptism');await page.locator('.search-result').first().waitFor();
   assert.equal(await page.locator('#site-search').inputValue(),'baptism');
   console.log(`${mode} ${width}: PASS`);
  }
  assert.deepEqual(errors,[]);console.log(`${widths.length*3} responsive header checks passed, including all dropdowns, keyboard dismissal and search.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
