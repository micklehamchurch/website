// All edits and publications remain in memory. Real portraits are read-only.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),{preparePhotos}=require('../azure-function/src/contacts-photos');
const source=require('../_content/contacts.json'),files=new Map();
let current=structuredClone(source),publishes=[];
const original=structuredClone(source.contacts.find(r=>r.id==='organist-david-fishwick').photo);
// Give one PCC fixture a portrait to exercise its shared controls without editing source data.
current.pccMembers[0].photo=structuredClone(original);
function render(){const fake={...fs,readFileSync:(p,...args)=>p.endsWith(path.join('_content','contacts.json'))?JSON.stringify(current):fs.readFileSync(p,...args),writeFileSync:(p,v)=>files.set('/'+path.relative(root,p).replace(/\\/g,'/'),Buffer.from(v))};vm.runInNewContext(fs.readFileSync(path.join(root,'build-contact-directory.js'),'utf8'),{require:n=>n==='node:fs'?fake:createRequire(path.join(root,'build-contact-directory.js'))(n),__dirname:root,console});}
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost').pathname,p=path.resolve(root,'.'+url);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp'}[path.extname(p)]||'application/octet-stream';if(files.has(url))return res.writeHead(200,{'content-type':type}).end(files.get(url));fs.readFile(p,(e,b)=>res.writeHead(e?404:200,{'content-type':type}).end(e?'Not found':b));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
 await page.route('https://raw.githubusercontent.com/micklehamchurch/website/**',r=>{const asset=new URL(r.request().url()).pathname.split('/').slice(4).join('/');return r.fulfill({path:path.join(root,asset)});});
 await page.route('**/msal-auth.bundle.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.exposeFunction('fixtureLoad',()=>({ok:true,sha:'a'.repeat(40),headSha:'b'.repeat(40),contacts:current}));
 await page.exposeFunction('fixturePublish',async payload=>{publishes.push(payload);const mutation=await preparePhotos(payload,current);assert.deepEqual(mutation.files,[]);assert.deepEqual(mutation.deleted,[]);current=mutation.next;return{ok:true,sha:'a'.repeat(40),headSha:'b'.repeat(40),commitSha:'c'.repeat(40),contacts:current};});
 const url=`http://127.0.0.1:${server.address().port}`;
 const load=async()=>{await page.goto(url+'/admin/index.html#contacts');await page.evaluate(()=>{document.querySelector('#admin-login').hidden=true;document.querySelector('#admin-app').hidden=false;window.churchContactsApi={load:()=>window.fixtureLoad(),publish:p=>window.fixturePublish(p),message:()=> 'Contacts published to Dev.'};window.dispatchEvent(new Event('admin-contacts-ready'));});await page.waitForFunction(()=>document.querySelector('#contacts-shared-status').textContent.includes('loaded'));};
 const edit=()=>page.locator('[data-action="edit-contact"][data-id="organist-david-fishwick"]').click();
 const stage=()=>page.locator('#admin-contact-form button[type=submit]').click();
 const publish=async()=>{page.once('dialog',d=>d.accept());await page.locator('[data-action="publish-contacts"]').click();await page.waitForFunction(()=>document.querySelector('#contacts-shared-status').textContent.includes('Contacts published to Dev.'));};
 const geometry=e=>{const s=getComputedStyle(e),p=e.parentElement.getBoundingClientRect(),r=e.getBoundingClientRect();return{fit:s.objectFit,position:s.objectPosition,width:r.width,height:r.height,left:r.left-p.left,top:r.top-p.top,frame:[p.width,p.height]};};
 await load();await edit();await page.waitForFunction(()=>document.querySelector('#contact-photo-preview').naturalWidth>0);
 assert.equal(await page.locator('#contact-photo-y').inputValue(),'0');
 await page.locator('#contact-photo-zoom').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#contact-photo-zoom').inputValue(),'1.01');
 for(const [key,value]of [['zoom','1.75'],['x','32'],['y','68']])await page.locator('#contact-photo-'+key).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const adminGeometry=await page.locator('#contact-photo-preview').evaluate(geometry);
 await page.locator('#admin-dialog').screenshot({path:path.join(root,'..','framing-admin-preview.png')});
 assert.equal(adminGeometry.position,'32% 68%');assert.equal(adminGeometry.width,150.5);
 for(const width of [320,390,768,1366,1920]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#admin-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);}
 await stage();assert.equal(publishes.length,0);await publish();assert.deepEqual(current.contacts.find(r=>r.id==='organist-david-fishwick').photoFraming,{zoom:1.75,x:32,y:68});
 await load();await edit();assert.equal(await page.locator('#contact-photo-zoom').inputValue(),'1.75');assert.equal(await page.locator('#contact-photo-y').inputValue(),'68');
 render();const publicPage=await browser.newPage();await publicPage.goto(url+'/our-team.html');const portrait=publicPage.locator('img[alt="David Fishwick"]');await portrait.scrollIntoViewIfNeeded();await publicPage.waitForFunction(()=>document.querySelector('img[alt="David Fishwick"]').naturalWidth>0);
 const publicGeometry=await portrait.evaluate(geometry);for(const key of ['fit','position','width','height','left','top','frame'])assert.deepEqual(publicGeometry[key],adminGeometry[key],key);
 for(const width of [320,390,768,1366,1920]){await publicPage.setViewportSize({width,height:1000});assert.equal(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual((await portrait.evaluate(geometry)).frame,[88,132]);}
 await page.locator('#contact-photo-reset').click();assert.equal(await page.locator('#contact-photo-zoom').inputValue(),'1');assert.equal(await page.locator('#contact-photo-y').inputValue(),'0');await stage();await publish();assert.equal(current.contacts.find(r=>r.id==='organist-david-fishwick').photoFraming,undefined);assert.deepEqual(current.contacts.find(r=>r.id==='organist-david-fishwick').photo,original);
 render();await publicPage.reload();assert.equal(await portrait.getAttribute('class'),'directory-portrait profile-derivative');
 await page.locator('[data-action="edit-contact"][data-id="churchwarden-john-banfield"]').click();assert.equal(await page.locator('#contact-framing-controls').isVisible(),false);await page.locator('[data-action="close-dialog"]').last().click();
 await page.locator('[data-action="edit-pcc"]').first().click();assert.equal(await page.locator('#contact-framing-controls').isVisible(),true);
 await page.locator('#contact-photo-zoom').focus();await page.keyboard.press('ArrowRight');await page.locator('#admin-pcc-form button[type=submit]').click();await publish();assert.equal(current.pccMembers[0].photoFraming.zoom,1.01);
 render();await publicPage.reload();assert.equal(await publicPage.locator('.pcc-list .directory-portrait-frame').count(),1);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS: David intact; live keyboard framing, stage/publish/reload/reset; public/Admin identical geometry; photo-free contacts/PCC; five widths including 320px; zero network writes.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
