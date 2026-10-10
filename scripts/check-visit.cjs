const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.join(__dirname,'..'),base=process.env.VISIT_BASE_URL||'http://127.0.0.1:4195/';
const output=path.join(root,'../visit-verification');fs.mkdirSync(output,{recursive:true});
const server=process.env.VISIT_BASE_URL?null:spawn(process.execPath,[path.join(root,'preview.js')],{env:{...process.env,MICKLEHAM_PREVIEW_PORT:'4195'},stdio:['ignore','pipe','inherit']});
const contrast=(a,b)=>{const lum=s=>{const c=s.match(/[\d.]+/g).slice(0,3).map(x=>{const v=+x/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
async function settle(page){await page.waitForFunction(()=>[...document.querySelectorAll('link[rel=stylesheet]')].every(el=>el.sheet));await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));}
(async()=>{if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage(),errors=[],ratios=[];page.on('pageerror',e=>errors.push(e.message));
  for(const mode of ['heritage','modern-classic','contemporary'])for(const width of [390,430,600,768,1024,1280,1440,1600,1920]){
    await page.setViewportSize({width,height:1100});await page.goto(base+'visit.html');await page.locator(`[data-typography-option="${mode}"]`).click();await settle(page);
    const g=await page.evaluate(()=>{const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width,h:r.height};};return {overflow:document.documentElement.scrollWidth>innerWidth,images:[...document.querySelectorAll('main img')].map(el=>({src:el.currentSrc,nw:el.naturalWidth,nh:el.naturalHeight,...rect(el),filter:getComputedStyle(el).filter,blend:getComputedStyle(el).mixBlendMode})),jumps:[...document.querySelectorAll('.visit-jump-links a')].map(rect),content:[...document.querySelectorAll('main h1,main h2,main h3,main p,main address,main .text-link')].map(el=>({...rect(el),text:el.textContent,color:getComputedStyle(el).color,size:parseFloat(getComputedStyle(el).fontSize)})),background:getComputedStyle(document.body).backgroundColor};});
    assert(!g.overflow,`${mode} ${width}: overflow`);assert.equal(g.images.length,2);
    for(const image of g.images){assert(image.nw>0);assert(image.x>=0&&image.right<=width);assert(Math.abs(image.w/image.h-image.nw/image.nh)<.006,'Image crop changed');assert.equal(image.filter,'none');assert.equal(image.blend,'normal');}
    assert(g.images[1].w<=300);assert(Math.abs(g.images[0].w/g.images[0].h-4/3)<.002,'Landscape proportion');
    for(const r of [...g.jumps,...g.content])assert(r.x>=0&&r.right<=width+.5,r.text+' overflows');for(const r of g.jumps)assert(r.h>=44);
    for(const c of g.content){const ratio=contrast(c.color,g.background);ratios.push(ratio);assert(ratio>=(c.size>=24?3:4.5),`${c.text}: contrast ${ratio}`);}
    assert.equal(await page.locator('.footer-features').count(),1);assert.equal(await page.locator('[data-footer-compact]').count(),0);assert.equal(await page.locator('h1').count(),1);
    for(const external of await page.locator('main a[href^="https:"]').all()){assert.equal(await external.getAttribute('target'),'_blank');assert.equal(await external.getAttribute('rel'),'noopener noreferrer');}
    for(const href of ['what-to-expect.html','church-building.html','our-history.html','westhumble-chapel.html','contact.html','calendar.html','children-families.html','churchyard.html'])assert((await page.request.get(base+href)).ok(),href+' destination');
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const id of ['first-visit','finding-us','church-guide','history','walking','getting-here','westhumble']){
      const jump=page.locator('.visit-jump-links a[href="#'+id+'"]');await page.keyboard.press('Tab');await jump.focus();assert(await jump.evaluate(el=>getComputedStyle(el).outlineStyle!=='none'));await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash,'#'+id);const clearance=await page.evaluate(id=>({target:document.getElementById(id).getBoundingClientRect().top,header:document.querySelector('.site-header').getBoundingClientRect().bottom,focused:document.activeElement.id}),id);assert(clearance.target>=clearance.header,`${id}: sticky header covers target`);assert.equal(clearance.focused,id,'Anchor target not keyboard focused');
    }
    await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,`${process.env.VISIT_BASE_URL?'live':'local'}-${mode}-${width}.png`),fullPage:true});console.log(`${mode} ${width}: PASS photographs, layout, jump keyboard/focus, links, contrast and standard footer`);
  }
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),phone=await touch.newPage();await phone.goto(base+'visit.html');await phone.locator('.visit-jump-links a[href="#finding-us"]').tap();assert.equal(new URL(phone.url()).hash,'#finding-us');await touch.close();
  await page.goto(base+'index.html');assert.equal(await page.getByRole('link',{name:'Plan your visit',exact:true}).getAttribute('href'),'visit.html');await page.getByRole('link',{name:'Plan your visit',exact:true}).click();assert.equal(new URL(page.url()).pathname.split('/').pop(),'visit.html');
  assert.deepEqual(errors,[]);console.log(`27 responsive/typography scenarios passed; 189 keyboard anchor checks; touch navigation and homepage CTA passed. Minimum main text contrast ${Math.min(...ratios).toFixed(2)}:1. No page errors.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.kill());
