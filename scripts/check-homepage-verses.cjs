const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),base=process.env.VERSES_BASE_URL||'http://127.0.0.1:4195/';
const server=process.env.VERSES_BASE_URL?null:spawn(process.execPath,[path.join(root,'preview.js')],{env:{...process.env,MICKLEHAM_PREVIEW_PORT:'4195'},stdio:['ignore','pipe','inherit']});
const artifacts=path.join(root,'../weekly-verse-verification');fs.mkdirSync(artifacts,{recursive:true});
const measure=()=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const hero=document.querySelector('.home-hero'),photo=hero.querySelector('img'),welcome=hero.querySelector('.hero-content'),verse=document.querySelector('[data-home-verse]'),s=getComputedStyle(photo);
  return {hero:rect(hero),photo:rect(photo),welcome:rect(welcome),header:rect(document.querySelector('.site-header')),source:photo.currentSrc,fit:s.objectFit,position:s.objectPosition,filter:s.filter,blend:s.mixBlendMode,verse:rect(verse),inHero:verse.parentElement===hero,overflow:document.documentElement.scrollWidth>innerWidth,verseBackground:getComputedStyle(verse).backgroundColor,verseImage:getComputedStyle(verse).backgroundImage,verseAnimation:getComputedStyle(verse).animationName};
};
(async()=>{
  if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*youtube*',route=>route.fulfill({body:'',contentType:'text/html'}));
    // Deterministic calendar date verifies the approved seed even after its week expires.
    await page.clock.install({time:new Date('2026-10-10T12:00:00Z')});
    for(const mode of ['heritage','modern-classic','contemporary'])for(const width of [390,430,600,768,900,999,1000,1024,1280,1440,1600,1920]){
      await page.setViewportSize({width,height:1100});await page.goto(base,{waitUntil:'load'});
      await page.locator(`[data-typography-option="${mode}"]`).click();
      await page.waitForFunction(mode=>document.documentElement.dataset.typography===mode,mode);
      await page.waitForFunction(()=>[...document.querySelectorAll('link[rel="stylesheet"]')].every(l=>l.sheet));await page.evaluate(()=>document.fonts.ready);
      await page.locator('[data-home-verse]').waitFor({state:'visible'});
      await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,left:0,behavior:'instant'});});
      const current=await page.evaluate(measure);
      assert(!current.overflow,`${mode} ${width}: overflow`);assert.equal(current.filter,'none');assert.equal(current.blend,'normal');assert.equal(current.verseBackground,'rgba(0, 0, 0, 0)');assert.equal(current.verseImage,'none');assert.equal(current.verseAnimation,'none');assert.equal(current.inHero,width>=1000);
      assert(current.verse.x>=0&&current.verse.right<=width);
      if(width>=1000){assert(current.verse.y>=current.header.bottom);assert(current.verse.right<current.welcome.x);assert(current.verse.right<=width*.27);assert(current.verse.bottom<current.hero.bottom);}else assert(current.verse.y>=current.hero.bottom);
      assert.match(await page.locator('[data-home-verse]').innerText(),/1 Peter 5:7 · NLT/);
      // Remove only the feature to compare the frozen geometry to the baseline layout.
      await page.locator('[data-home-verse]').evaluate(el=>el.hidden=true);
      const baseline=await page.evaluate(measure);for(const key of ['hero','photo','welcome','header','source','fit','position'])assert.deepEqual(current[key],baseline[key],`${mode} ${width}: changed ${key}`);
      await page.locator('[data-home-verse]').evaluate(el=>el.hidden=false);
      await page.screenshot({path:path.join(artifacts,`${process.env.VERSES_BASE_URL?'live':'local'}-${mode}-${width}.png`)});
      const buttons=page.locator('.home-hero .hero-actions a');await buttons.nth(0).focus();await page.keyboard.press('Tab');assert(await buttons.nth(1).evaluate(el=>document.activeElement===el&&getComputedStyle(el).outlineStyle!=='none'));
      console.log(`${mode} ${width}: PASS; unchanged photo, hero, welcome and header geometry`);
    }
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('[data-home-verse]').evaluate(el=>getComputedStyle(el).animationName),'none');
    const seed=JSON.parse(fs.readFileSync(path.join(root,'homepage-verses.json')));
    for(const [name,payload,status]of [['missing',{schemaVersion:1,verses:[]},200],['malformed',{},200],['overlap',{schemaVersion:1,verses:[seed.verses[0],{...seed.verses[0],id:'conflict'}]},200],['failed',{},503]]){
      await page.route('**/homepage-verses.json',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)}));await page.goto(base);await page.waitForFunction(()=>document.querySelector('[data-home-verse]').hidden);assert.equal(await page.locator('[data-home-verse]').isVisible(),false);await page.unroute('**/homepage-verses.json');console.log(`${name}: hidden safely`);
    }
    const long={schemaVersion:1,verses:[{...seed.verses[0],quotation:'Long approved text for responsive testing. '.repeat(7)}]};
    await page.route('**/homepage-verses.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(long)}));await page.setViewportSize({width:1440,height:1100});await page.goto(base);await page.locator('[data-home-verse]').waitFor({state:'visible'});assert.equal((await page.evaluate(measure)).inHero,false);await page.unroute('**/homepage-verses.json');
    // Real selection also changes automatically while the tab stays open.
    await page.goto(base);await page.locator('[data-home-verse]').waitFor({state:'visible'});await page.clock.setSystemTime(new Date('2026-10-12T12:00Z'));await page.clock.runFor(61000);assert.equal(await page.locator('[data-home-verse]').isVisible(),false);
    assert.deepEqual(errors,[]);console.log('36 responsive checks, safe failures, long text, open-tab rotation and keyboard/reduced-motion checks passed.');
    if(!process.env.VERSES_BASE_URL){
      const admin=await browser.newPage({viewport:{width:1280,height:1000}}),adminErrors=[];admin.on('pageerror',e=>adminErrors.push(e.message));admin.on('dialog',d=>d.accept());
      await admin.route('**/msal-auth.bundle.js*',route=>route.fulfill({body:'',contentType:'text/javascript'}));
      await admin.goto(base+'admin/#verses');
      await admin.evaluate(schedule=>{
        window.verseTestSchedule=schedule;window.verseTestPublishes=[];window.verseTestConflict=false;
        window.churchHomepageVersesApi={load:async()=>({ok:true,sha:'a'.repeat(40),homepageVerses:structuredClone(window.verseTestSchedule)}),publish:async payload=>{window.verseTestPublishes.push(payload);if(window.verseTestConflict)return{ok:false,category:'homepage-verses-version-conflict'};window.verseTestSchedule=structuredClone(payload.homepageVerses);return{ok:true,sha:'b'.repeat(40)};},message:key=>key};
        document.querySelector('#admin-login').hidden=true;document.querySelector('#admin-app').hidden=false;window.churchHomepageVersesAdmin.mount(document.querySelector('#admin-content'));
      },JSON.parse(fs.readFileSync(path.join(root,'_content/homepage-verses.json'))));
      await admin.locator('[data-verse-add]').waitFor({state:'visible'});await admin.waitForFunction(()=>!document.querySelector('[data-verse-add]').disabled);
      await admin.locator('[data-verse-add]').click();await admin.locator('.verse-editor [name=reference]').fill('UI fixture');await admin.locator('.verse-editor [name=quotation]').fill('UI approved fixture text.');await admin.getByRole('button',{name:'Save staged verse',exact:true}).click();await admin.locator('[data-verse-publish]').click();await admin.waitForFunction(()=>window.verseTestPublishes.length===1);assert.equal(await admin.evaluate(()=>window.verseTestSchedule.verses.length),53);
      await admin.locator('[data-verse-edit]').filter({hasText:'UI fixture'}).click();await admin.locator('.verse-editor [name=quotation]').fill('x'.repeat(161));assert.match(await admin.locator('[data-verse-warning]').innerText(),/quite long/);await admin.locator('.verse-editor [name=published]').check();await admin.getByRole('button',{name:'Save staged verse',exact:true}).click();assert.match(await admin.locator('[data-verse-error]').innerText(),/scheduled week/);await admin.locator('.verse-editor [name=startDate]').fill('2026-10-05');await admin.getByRole('button',{name:'Save staged verse',exact:true}).click();assert.match(await admin.locator('[data-verse-error]').innerText(),/overlap/);await admin.locator('.verse-editor [name=startDate]').fill('2027-10-04');await admin.getByRole('button',{name:'Save staged verse',exact:true}).click();await admin.locator('[data-verse-publish]').click();await admin.waitForFunction(()=>window.verseTestPublishes.length===2);
      await admin.locator('[data-verse-edit]').filter({hasText:'UI fixture'}).click();await admin.locator('[data-verse-remove]').click();await admin.locator('[data-verse-publish]').click();await admin.waitForFunction(()=>window.verseTestPublishes.length===3);assert.equal(await admin.evaluate(()=>window.verseTestSchedule.verses.length),52);
      await admin.locator('[data-verse-edit]').first().click();await admin.locator('.verse-editor [name=note]').fill('Stale fixture edit');await admin.getByRole('button',{name:'Save staged verse',exact:true}).click();await admin.evaluate(()=>window.verseTestConflict=true);await admin.locator('[data-verse-publish]').click();await admin.waitForFunction(()=>window.verseTestPublishes.length===4);assert(await admin.locator('[data-verse-publish]').isDisabled());assert.match(await admin.locator('#admin-content [role=status]').innerText(),/version-conflict/);
      await admin.locator('[data-verse-reload]').click();await admin.waitForFunction(()=>!document.querySelector('[data-verse-add]').disabled);assert.equal(await admin.evaluate(()=>window.verseTestSchedule.verses[0].note.includes('Stale')),false);
      for(const width of [390,768,1280]){await admin.setViewportSize({width,height:1000});await admin.locator('[data-verse-add]').click();assert(await admin.locator('.verse-editor [name=reference]').evaluate(el=>document.activeElement===el));await admin.keyboard.press('Escape');assert.equal(await admin.locator('.verse-admin-dialog').isVisible(),false);assert(await admin.locator('[data-verse-add]').evaluate(el=>document.activeElement===el));assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
      assert.deepEqual(adminErrors,[]);console.log('Admin mocked UI add/edit/validate/preview/save/publish/remove/conflict/reload and keyboard/mobile checks passed.');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server?.kill());
