const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process'),vm=require('vm');
const read=f=>fs.readFileSync(f,'utf8').replace(/\r/g,''),before=f=>cp.execFileSync('git',['show','c8bcef49:'+f],{encoding:'utf8'}).replace(/\r/g,'');
const source=read('site.js'),nav=s=>vm.runInNewContext(s.slice(0,s.indexOf('const socialArea'))+'\nJSON.stringify({navigation,navigationCategories})'),current=JSON.parse(nav(source)),old=JSON.parse(nav(before('site.js')));
test('shared information links retain main navigation, branding and footer exactly',()=>{
 assert.deepEqual(current.navigationCategories,old.navigationCategories);
 for(const [label,href]of [['Safeguarding','safeguarding.html'],['Policies &amp; documents','policies.html'],['Church open daily','finding-us.html']]){assert(current.navigation.includes(`href="${href}"`));assert(current.navigation.includes(label));assert(fs.existsSync(href));}
 assert.equal(source.match(/const footer = `[\s\S]*?`;/)[0],before('site.js').match(/const footer = `[\s\S]*?`;/)[0]);
 assert.equal(require('./helpers/header-church-mark-snapshot.cjs')(current.navigation.match(/<div class="header-branding">[\s\S]*?<\/div>/)[0]),old.navigation.match(/<div class="header-branding">[\s\S]*?<\/div>/)[0]);
 assert(current.navigation.indexOf('Important information')<current.navigation.indexOf('class="nav-primary"'));
});
test('all existing page bodies, homepage systems and regulatory documents remain unchanged',()=>{
 const files=cp.execFileSync('git',['ls-tree','-r','--name-only','c8bcef49'],{encoding:'utf8'}).trim().split('\n');
 const pages=files.filter(f=>f.endsWith('.html')&&!f.startsWith('admin/')&&read(f).includes('data-site-header')&&f!=='safeguarding.html');
 const strip=s=>require('./helpers/approved-quick-links.cjs')(s).replace(/header=[^&" ]+/g,'header=VERSION').replace(/home-critical\.css\?v=[^" ]+/g,'home-critical.css?v=VERSION');
 for(const f of pages.filter(f=>f!=='alpha.html'))assert.equal(strip(read(f)),strip(before(f)),f);
 for(const f of ['home-next-service.js','home-next-service.css','home-next-service-config.json','home-next-service-data.json','home-hero-photos.js','home-hero-carousel.js','home-hero-carousel.css','churchyard-regulations.css','churchyard-regulations.js','churchyard-practical-guidance.json','churchyard-resources.json','responsive-navigation.js','footer-standard.css'])assert.equal(read(f),before(f),f);
 for(const f of files.filter(f=>f.startsWith('assets/documents/churchyard/')))assert.deepEqual(fs.readFileSync(f),cp.execFileSync('git',['show','c8bcef49:'+f]),f);
});
test('safeguarding improves contact order while preserving every existing policy commitment and contact',()=>{
 const data=JSON.parse(read('content-pages.json')).pages.find(p=>p.slug==='safeguarding'),prior=JSON.parse(before('content-pages.json')).pages.find(p=>p.slug==='safeguarding');
 assert.deepEqual(data.safeguardingContacts,prior.safeguardingContacts);assert.deepEqual(data.policyApproval,prior.policyApproval);
 for(const section of prior.sections.filter(s=>s.variant!=='contacts'))assert.deepEqual(data.sections.find(s=>s.title===section.title),section);
 assert.equal(data.sections[0].variant,'contacts');assert(read('safeguarding.html').indexOf('Vickie Leney')<read('safeguarding.html').indexOf('Our safeguarding commitments'));
});
test('policies links point only to existing public guidance and documents and are searchable',()=>{
 const html=read('policies.html');for(const m of html.matchAll(/href="([^"#]+)"/g)){if(!/^https?:/.test(m[1]))assert(fs.existsSync(m[1].split('?')[0]),m[1]);}
 assert(html.includes('Baptism Policy'));assert(html.includes('Wedding guidance'));assert(!html.includes('Wedding policy'));assert(html.includes('churchyard-regulations.html'));
 assert(JSON.parse(read('search-index.json')).some(p=>p.url==='policies.html'));
 assert(read('sitemap.xml').includes('/policies.html'));
});
