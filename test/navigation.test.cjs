const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'site.js'),'utf8');
const html=vm.runInNewContext(source.slice(0,source.indexOf('const socialArea'))+'\nnavigation');
const menus=Object.fromEntries([...html.matchAll(/<div class="dropdown" id="menu-([^"]+)">(.*?)<\/div>/gs)].map(m=>[m[1],[...m[2].matchAll(/href="([^"]+)"/g)].map(a=>a[1])]));
const labels=s=>s.replace(/<svg\b.*?<\/svg>/gs,'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/♥\s*/g,'').trim();
test('shared desktop/mobile top-level order retains styled utilities and excludes Media',()=>{
 const nav=html.match(/<nav\b.*?<\/nav>/s)[0].replace(/<div class="dropdown".*?<\/div>/gs,'');
 const names=[...nav.matchAll(/<(a|button)\b[^>]*>(.*?)<\/\1>/gs)].map(m=>labels(m[2]));
 assert.deepEqual(names,['Home','Worship','Visit & Learn','Our Community','About Us','Search','YouTube','Calendar','Give']);
 assert.match(nav,/class="nav-youtube"/);assert.match(nav,/class="nav-link nav-calendar"/);assert.match(nav,/class="btn btn-small btn-green nav-give"/);
});
test('reviewed dropdowns group worship, visiting, community and parish governance without duplicates',()=>{
 assert.deepEqual(menus,{
 worship:['worship.html','sunday-services.html','weekly-worship.html','special-services.html','prayer.html','baptisms.html','weddings.html','funerals.html'],
 visit:['visit.html','what-to-expect.html','finding-us.html','church-building.html','westhumble-chapel.html','churchyard.html','churchyard-regulations.html','war-memorial.html'],
 community:['church-life.html','children-families.html','alpha.html','bible-study-fellowship.html','pastoral-care.html','volunteering.html','supporting-community.html','news.html'],
 about:['about.html','our-vision.html','our-team.html','our-churches.html','our-history.html','eco-church.html','electoral-roll.html','safeguarding.html','privacy.html']});
 const urls=Object.values(menus).flat();assert.equal(new Set(urls).size,urls.length);
});
test('every submenu resolves to a retained public page with a main heading and unique controlled menu',()=>{
 for(const [id,urls] of Object.entries(menus)){
  assert(urls.length);assert.equal((html.match(new RegExp(`id="menu-${id}"`,'g'))||[]).length,1);
  assert.match(html,new RegExp(`aria-controls="menu-${id}"`));
  for(const url of urls){const page=fs.readFileSync(path.join(root,url),'utf8');assert.match(page,/<main\b/);assert.match(page,/<h1\b/);}
 }
});
test('History and Prayer retain search discoverability and relevant contextual links',()=>{
 const search=JSON.parse(fs.readFileSync(path.join(root,'search-index.json'),'utf8'));
 for(const url of ['our-history.html','prayer.html'])assert(search.some(p=>p.url===url));
 for(const page of ['visit.html','church-building.html','about.html'])assert.match(fs.readFileSync(path.join(root,page),'utf8'),/href="our-history.html"/);
 for(const page of ['church-life.html','pastoral-care.html','bible-study-fellowship.html'])assert.match(fs.readFileSync(path.join(root,page),'utf8'),/href="prayer.html"/);
});
test('YouTube keeps secure external-link conventions and Search Calendar Give keep their URLs',()=>{
 assert.match(html,/class="nav-youtube"[^>]+target="_blank" rel="noopener noreferrer"/);
 for(const url of ['search.html','calendar.html','give.html'])assert.match(html,new RegExp(`href="${url}"`));
});
