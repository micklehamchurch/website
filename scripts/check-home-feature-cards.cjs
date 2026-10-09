const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),base=process.env.FEATURE_BASE_URL||'http://127.0.0.1:4201/';
const server=process.env.FEATURE_BASE_URL?null:spawn(process.execPath,[path.join(root,'preview.js')],{env:{...process.env,MICKLEHAM_PREVIEW_PORT:'4201'},stdio:['ignore','pipe','inherit']});
const snapshot=()=>[...document.querySelectorAll('.home-feature-grid .feature-card')].map(card=>{const image=card.querySelector('img'),title=card.querySelector('h3'),copy=card.querySelector('p'),button=card.querySelector('.home-card-cta'),rect=card.getBoundingClientRect();const geometry=el=>{const r=el.getBoundingClientRect();return {x:r.left-rect.left,y:r.top-rect.top,w:r.width,h:r.height};};const style=el=>{const s=getComputedStyle(el);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight};};return {width:rect.width,height:rect.height,image:{...geometry(image),source:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,position:getComputedStyle(image).objectPosition},title:{...geometry(title),...style(title),text:title.textContent},copy:{...geometry(copy),...style(copy),text:copy.textContent},button:{...geometry(button),...style(button),text:button.textContent},destination:card.getAttribute('href')};});
(async()=>{
if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const output=path.join(root,'../feature-cards-verification');fs.mkdirSync(output,{recursive:true});
for(const mode of ['heritage','modern-classic','contemporary'])for(const width of [390,430,768,900,1000,1024,1280,1440,1600]){
await page.setViewportSize({width,height:1000});await page.goto(base,{waitUntil:'load'});
await page.locator(`[data-typography-option="${mode}"]`).click();await page.waitForFunction(mode=>document.documentElement.dataset.typography===mode,mode);
await page.waitForFunction(()=>document.querySelector('link[href*="typography-preview.css"]')?.sheet&&document.querySelector('link[href*="header-navigation.css"]')?.sheet);
await page.waitForFunction(()=>[...document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')].every(el=>el.sheet));await page.evaluate(()=>document.fonts.ready);
const grid=page.locator('.home-feature-grid'),cards=grid.locator('.feature-card');assert.equal(await cards.count(),2);
await grid.scrollIntoViewIfNeeded();await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});await cards.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
const current=await page.evaluate(snapshot);
if(process.env.FEATURE_BASELINE_CSS){const old=await page.addStyleTag({content:fs.readFileSync(process.env.FEATURE_BASELINE_CSS,'utf8')});assert.deepEqual(await page.evaluate(snapshot),current,'Original card/photo geometry, typography, buttons and destinations must be preserved');await old.evaluate(el=>el.remove());}
assert.deepEqual(current.map(c=>c.destination),['worship.html','church-life.html']);
assert.deepEqual(current.map(c=>c.image.source),['assets/eco-church/churchyard-view.jpg','assets/eco-church/church-flowers-altar.jpg']);
assert.deepEqual(current.map(c=>c.image.position),['55% 0%','60% 40%']);
assert.deepEqual(current.map(c=>c.title.text),['Worship','Church life']);
assert.deepEqual(current.map(c=>c.copy.text),['Prayer, services and faith at the heart of our parish.','Discover the people and activities that bring us together.']);
assert.deepEqual(current.map(c=>c.button.text),['Explore worship →','Find your place →']);
assert.equal(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width<=760?1:2);
for(const card of await cards.all()){
assert(await card.evaluate(el=>{const cs=getComputedStyle(el,'::after'),photo=getComputedStyle(el.querySelector('img'));return cs.display==='none'&&cs.backgroundImage==='none'&&photo.filter==='none'&&photo.mixBlendMode==='normal';}));
assert(await card.locator('h3,p').evaluateAll(elements=>elements.every(el=>{const s=getComputedStyle(el);return s.color==='rgb(255, 255, 255)'&&s.textShadow!=='none'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&el.scrollWidth<=el.clientWidth+1;})));
assert(await card.locator(':scope > div').evaluate(el=>{const s=getComputedStyle(el);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&s.boxShadow==='none';}));
assert(await card.evaluate(el=>{const c=el.getBoundingClientRect();return [...el.querySelectorAll('h3,p,.home-card-cta')].every(text=>{const r=text.getBoundingClientRect();return r.left>=c.left&&r.right<=c.right&&r.top>=c.top&&r.bottom<=c.bottom;});}));
assert(await card.locator('.home-card-cta').evaluate(el=>el.getBoundingClientRect().height>=44));
}
await cards.first().focus();await page.keyboard.press('Tab');assert(await cards.nth(1).evaluate(el=>el===document.activeElement&&getComputedStyle(el).outlineStyle!=='none'));
if(mode==='heritage'&&[390,768,1000,1440,1600].includes(width))await grid.screenshot({path:path.join(output,`${process.env.FEATURE_BASE_URL?'live':'local'}-${mode}-${width}.png`),style:'.site-header,.skip-link {visibility:hidden!important;}'});
assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
for(const [index,destination] of ['worship.html','church-life.html'].entries())if(mode==='heritage'&&width===390){await Promise.all([page.waitForURL('**/'+destination),cards.nth(index).tap()]);assert(new URL(page.url()).pathname.endsWith('/'+destination));await page.goBack();}
console.log(`${mode} ${width}: PASS (natural photographs, white text/shadows, preserved geometry, focus, destinations, no overflow)`);
}
await page.emulateMedia({reducedMotion:'reduce'});assert(await cardsTransition(page));assert.deepEqual(errors,[]);console.log('27 photographic feature-card checks passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.kill());
async function cardsTransition(page){return page.locator('.home-feature-grid .feature-card').evaluateAll(elements=>elements.every(el=>getComputedStyle(el).transitionDuration.split(',').every(v=>parseFloat(v)<=.00001)));}
