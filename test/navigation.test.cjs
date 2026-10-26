const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'site.js'),'utf8');
const html=vm.runInNewContext(source.slice(0,source.indexOf('const socialArea'))+'\nnavigation');
const categories=vm.runInNewContext(source.slice(0,source.indexOf('const socialArea'))+'\nnavigationCategories');
const menus=Object.fromEntries(categories.map(c=>[c.id,Array.from(c.links,p=>p[1])]));
const labels=s=>s.replace(/<svg\b.*?<\/svg>/gs,'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim();
test('one desktop hub contains every audited category; Home and utilities remain separate',()=>{
 assert.equal((html.match(/class="navigation-hub"/g)||[]).length,1);
 assert.deepEqual(Array.from(categories,c=>c.title),['Services','Life Events','Visit & Explore','Community','About Us']);
 const primary=html.match(/<div class="nav-primary">([\s\S]*?)<div class="navigation-hub"/)[1];
 assert.match(primary,/href="index.html">Home/);assert.doesNotMatch(primary,/href="news.html"/);
 assert.equal((html.match(/class="nav-trigger"/g)||[]).length,5);
 assert.equal((html.match(/class="dropdown hub-column"/g)||[]).length,5);
 assert.equal((html.match(/href="calendar.html"/g)||[]).length,1);
 assert.equal((html.match(/href="bible.html"/g)||[]).length,1);
});
test('exact Phase 1 destinations exclude lower-priority content without deleting it',()=>{
 assert.deepEqual(menus,{
 services:['worship.html','weekly-worship.html','prayer.html'],
 'life-events':['baptisms.html','weddings.html','funerals.html'],
 visit:['finding-us.html','church-building.html','our-history.html','churchyard.html','westhumble-chapel.html'],
 community:['news.html','church-life.html','children-families.html','bible-study-fellowship.html','pastoral-care.html','eco-church.html','news.html#latest-parish-magazine'],
 about:['our-team.html','about.html','our-vision.html','our-churches.html','safeguarding.html','contact.html']});
 for(const file of ['electoral-roll.html','privacy.html','norman-architecture.html','sunday-services.html','special-services.html','whats-on.html','parish-magazine.html'])assert(fs.existsSync(path.join(root,file)));
});
test('every hub destination and fragment resolves to retained content; decorative images are deferred',()=>{
 for(const category of categories){
  assert.match(html,new RegExp(`id="menu-${category.id}"`));
  assert(category.description);assert(fs.existsSync(path.join(root,category.image)));
  for(const [,url]of category.links){const [file,fragment]=url.split('#');const page=fs.readFileSync(path.join(root,file),'utf8');assert.match(page,/<main\b/);assert.match(page,/<h1\b/);if(fragment)assert(page.includes(`id="${fragment}"`));}
 }
 assert.equal((html.match(/class="hub-image" data-src=/g)||[]).length,5);
 assert.equal((html.match(/width="480" height="200" alt=""/g)||[]).length,5);
});
test('History and Prayer retain search discoverability and relevant contextual links',()=>{
 const search=JSON.parse(fs.readFileSync(path.join(root,'search-index.json'),'utf8'));
 for(const url of ['our-history.html','prayer.html'])assert(search.some(p=>p.url===url));
 for(const page of ['visit.html','church-building.html'])assert.match(fs.readFileSync(path.join(root,page),'utf8'),/href="our-history.html"/);
 for(const page of ['church-life.html','pastoral-care.html','bible-study-fellowship.html'])assert.match(fs.readFileSync(path.join(root,page),'utf8'),/href="prayer.html"/);
});
test('header omits YouTube while the existing shared footer retains it',()=>{assert.doesNotMatch(html,/class="nav-youtube"/);assert.match(source,/const socialArea/);assert.match(source,/footer-social/);assert.match(source,/www.youtube.com/);});

test('Real accessible header search submits q to the existing search page',()=>{
 assert.match(html,/<form class="header-search" role="search" action="search.html" method="get" aria-label="Search the website">/);
 assert.match(html,/<label[^>]+for="header-search-query">Search the website<\/label>/);
 assert.match(html,/<input id="header-search-query" type="search" name="q"/);
 assert.match(html,/<button type="submit" aria-label="Submit website search"/);
 const search=fs.readFileSync(path.join(root,'search.js'),'utf8');assert.match(search,/new URLSearchParams\(location.search\).get\('q'\)/);assert.match(search,/renderSearch\(searchInput.value\)/);
 const styles=fs.readFileSync(path.join(root,'header-navigation.css'),'utf8');assert.match(styles,/var\(--sans\)/);assert.match(styles,/min-height:44px/);assert.match(styles,/:focus-visible/);
});

test('Bible utility follows Calendar, has an accessible name and desktop label, and is absent from the hero',()=>{
 const actions=html.match(/<div class="nav-actions">([\s\S]*?)<\/div>/)[1];
 assert(actions.indexOf('nav-calendar')<actions.indexOf('nav-bible'));
 const control=actions.match(/<a class="nav-link nav-bible"[^>]*>[\s\S]*?<\/a>/)[0];
 assert.match(control,/aria-label="Bible"/);
 assert.match(control,/href="bible.html"/);
 assert.match(control,/class="header-book"/);
 assert.equal(labels(control),'Bible');
 const hero=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<a class="home-next-service"[^>]*>(.*?)<\/a>/s)[1];
 assert.equal((hero.match(/<a /g)||[]).length,0);assert.doesNotMatch(hero,/bible/i);
 assert(fs.existsSync(path.join(root,'assets/images/bible-closed.svg')));
});
