// Local HTTP integration: real handlers/UI; isolated storage and simulated Azure
// principal. This is not proof of live Azure Easy Auth or storage permissions.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createFeedbackHandlers}=require('../azure-function/src/feedback');
const {empty}=require('../azure-function/src/feedback-store');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),artifacts=path.resolve(root,'../feedback-verification');fs.mkdirSync(artifacts,{recursive:true});
const principal={auth_typ:'aad',claims:Object.entries({tid:'9188040d-6c67-4c5b-b112-36a304b66dad',oid:'00000000-0000-0000-f978-44e4d44cc925',sub:'AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc',iss:'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0'}).map(([typ,val])=>({typ,val}))};
let state=empty(),queue=Promise.resolve();
const store={read:async()=>structuredClone(state),locked:action=>{const p=queue.then(()=>action(structuredClone(state),async value=>{state=structuredClone(value);}));queue=p.catch(()=>{});return p;}};
const api=createFeedbackHandlers({store});
let browser,server;
(async()=>{
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')){
    const buffers=[];for await(const chunk of req)buffers.push(chunk);
    const headers=new Headers(req.headers);headers.set('origin','https://micklehamchurch.github.io');
    if(headers.get('authorization')==='Bearer admin-test-only')headers.set('x-ms-client-principal',Buffer.from(JSON.stringify(principal)).toString('base64'));
    const request={method:req.method,headers,query:url.searchParams,body:req.method==='POST'?new Blob(buffers).stream():null};
    const result=await api[url.pathname==='/api/admin-feedback'?'adminHandler':'publicHandler'](request);
    res.writeHead(result.status,{'Content-Type':'application/json',...result.headers});res.end(JSON.stringify(result.jsonBody));return;
   }
   const relative=url.pathname.replace(/^\/website\//,'').replace(/^\//,'')||'index.html',file=path.resolve(root,relative);
   if(!file.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
   const type={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const admin=async(action,body,id)=>{const url=new URL('/api/admin-feedback',base);url.searchParams.set('action',action);if(id)url.searchParams.set('id',id);const response=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer admin-test-only','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert(response.ok);return response.json();};
 await admin('rotate-code',{code:'isolated-browser-test-review-code'});await admin('settings',{mode:'pcc'});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,800],[874,402]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
  await page.route('https://stmichael-church-admin-api-*/api/*',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:base+u.pathname+u.search});await route.fulfill({response});});
  await page.goto(base+'/website/our-history.html');await page.locator('.feedback-launcher').click();const dialog=page.locator('.feedback-dialog');await dialog.waitFor({state:'visible'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.feedback-launcher')).opacity==='0');
  await dialog.locator('input[name=name]').fill('Sandra');await dialog.locator('input[name=code]').fill('isolated-browser-test-review-code');await dialog.getByRole('button',{name:'Join the review'}).click();await dialog.locator('[data-fb-form=create]').waitFor();
  const content=width===1440?'Could we include more organ information? <img src=x onerror="window.feedbackXSS=true">':'Could we include more information about the organ?';
  await dialog.locator('[data-fb-form=create] textarea').fill(content);await dialog.getByRole('button',{name:'Post discussion',exact:true}).click();await dialog.locator('[data-fb-form=reply]').waitFor();
  assert.equal(await page.evaluate(()=>window.feedbackXSS),undefined);if(width===1440)assert(await dialog.locator('.fb-message').first().textContent().then(s=>s.includes('<img')));
  await dialog.locator('[data-fb-form=reply] textarea').fill('A photograph would be useful too.');await dialog.getByRole('button',{name:'Send reply',exact:true}).click();await dialog.getByText('A photograph would be useful too.',{exact:true}).waitFor();
  const id=state.topics.at(-1).id;await admin('reply',{body:'Thank you — I am collecting the information.'},id);await admin('moderate',{status:'In development',reviewed:true},id);
  await dialog.getByRole('button',{name:'← All discussions'}).click();await dialog.locator('[data-fb-open="'+id+'"]').click();await dialog.getByText('Website Admin',{exact:true}).first().waitFor();assert((await dialog.textContent()).includes('In development'));
  if(width===390)await page.addStyleTag({content:'.feedback-view *{font-size:20px!important}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const bounds=await dialog.boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=height+1);
  for(const control of await dialog.locator('button,input:not([type=checkbox]):not([tabindex="-1"]),select,textarea').all()){if(await control.isVisible()){const b=await control.boundingBox();assert(b.height>=43.9,await control.getAttribute('name'));}}
  if([390,874].includes(width))await page.screenshot({path:path.join(artifacts,'conversation-'+width+'.png')});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement===document.querySelector('.feedback-launcher'));await page.locator('.feedback-launcher').click();await dialog.locator('[data-fb-form=create]').waitFor(); // remembered access
  await dialog.getByRole('button',{name:'Close feedback'}).click();await context.close();console.log(width+'x'+height+': HTTP discussion/replies/status, XSS, remembered access and accessibility passed');
 }
 const adminPage=await browser.newPage({viewport:{width:1280,height:900}});await adminPage.route('https://stmichael-church-admin-api-*/api/*',async route=>{const u=new URL(route.request().url());await route.fulfill({response:await route.fetch({url:base+u.pathname+u.search})});});await adminPage.goto(base+'/website/feedback.html');await adminPage.evaluate(async()=>{const ui=await import('./feedback-ui.mjs');const root=document.querySelector('#website-feedback-board');await ui.mountFeedback(root,{admin:true,api:ui.createFeedbackClient({admin:true,getToken:async()=>'admin-test-only'}),context:{title:'Review',path:'/website/',canonicalPath:'/website/'}});});const adminRoot=adminPage.locator('#website-feedback-board');await adminRoot.locator('[data-fb-open]').first().click();await adminRoot.locator('[data-fb-form=moderate] select').selectOption('Done');await adminRoot.locator('[data-fb-form=moderate] input[type=checkbox]').check();await adminRoot.getByRole('button',{name:'Save status',exact:true}).click();await adminRoot.getByText(/marked this as Done/).waitFor();await adminRoot.getByRole('button',{name:'← All discussions'}).click();await adminRoot.locator('.fb-settings summary').click();adminPage.on('dialog',d=>d.accept());await adminRoot.locator('[data-fb-form=rotate-code] input').fill('rotated-browser-test-code-not-live');await adminRoot.getByRole('button',{name:'Save review code',exact:true}).click();await adminRoot.getByText(/Review code saved/).waitFor();await adminPage.close();console.log('Admin UI status/review and code rotation passed');
 await admin('settings',{mode:'public'});const p=await browser.newPage({viewport:{width:390,height:844}});await p.route('https://stmichael-church-admin-api-*/api/*',async route=>{const u=new URL(route.request().url());await route.fulfill({response:await route.fetch({url:base+u.pathname+u.search})});});await p.goto(base+'/website/feedback.html');await p.getByRole('button',{name:'Send feedback',exact:true}).waitFor();assert.equal(await p.locator('[data-fb-open]').count(),0);await p.locator('textarea[name=body]').fill('Public test feedback');await p.getByRole('button',{name:'Send feedback',exact:true}).click();await p.getByText(/Thank you. Your feedback has been sent privately/).waitFor();assert.equal(state.topics.at(-1).audience,'public');
 await admin('settings',{mode:'off'});await p.reload();await p.getByText(/Website feedback is currently closed/).waitFor();assert.equal(await p.locator('.feedback-launcher').count(),0);assert(state.topics.length>=6);await p.close();console.log('Public submission-only and Off retention passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
