const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname;const real=JSON.parse(fs.readFileSync(path.join(root,'_content/contacts.json'),'utf8'));
function build(data){const files=new Map();const fake={...fs,readFileSync:(p,...args)=>p.endsWith(path.join('_content','contacts.json'))?JSON.stringify(data):files.has(p)?files.get(p):fs.readFileSync(p,...args),writeFileSync:(p,v)=>files.set(p,v),existsSync:p=>files.has(p),readdirSync:()=>['our-team.html','parish-contact-directory.html'].map(name=>({name,isDirectory:()=>false,isFile:()=>true}))};
 const run=name=>vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),{require:n=>n==='node:fs'?fake:n.startsWith('./')?require(path.join(root,n)):require(n),__dirname:root,console:{log(){}},Buffer});run('build-contact-directory.js');run('build-search-index.js');return{html:files.get(path.join(root,'our-team.html')),admin:files.get(path.join(root,'admin/contacts-data.json')),search:files.get(path.join(root,'search-index.json'))};}
test('Contacts public build and search exclude drafts/deletions, restore published entries and preserve array order',()=>{const data={sections:real.sections,contacts:[{id:'fixture-public',section:real.sections[0].id,role:'Fixture role',name:'VisibleFixture',status:'published'},{id:'fixture-draft',section:real.sections[0].id,role:'Fixture role',name:'PrivateFixture',email:'private@example.org',status:'draft'}],pccMembers:[{id:'pcc-visible',name:'VisibleCouncil',status:'published'},{id:'pcc-private',name:'PrivateCouncil',status:'draft'}]};const out=build(data);for(const value of Object.values(out)){assert.match(value,/VisibleFixture/);assert.doesNotMatch(value,/PrivateFixture|private@example.org|PrivateCouncil/)}data.contacts[1].status='published';data.contacts.reverse();let updated=build(data);assert.match(updated.html,/PrivateFixture/);assert.match(updated.search,/PrivateFixture/);assert.ok(updated.html.indexOf('PrivateFixture')<updated.html.indexOf('VisibleFixture'));data.contacts=data.contacts.filter(c=>c.id!=='fixture-public');updated=build(data);assert.doesNotMatch(updated.html,/VisibleFixture/);assert.doesNotMatch(updated.search,/VisibleFixture/)});

test('Our Team is the single contact destination, preserves all published records and redirects legacy links',()=>{
 const out=build(real),html=out.html;
 assert.match(html,/<h1>Our Team<\/h1>/);
 for(const section of real.sections) assert(html.includes(section.title.replaceAll('&','&amp;')));
 const escape=s=>s.replaceAll('&','&amp;').replaceAll("'",'&#39;');
 for(const record of [...real.contacts,...real.pccMembers].filter(r=>r.status==='published')) {
  assert(html.includes(escape(record.name))); if(record.email) assert(html.includes(record.email)); if(record.phone) assert(html.includes(record.phone));
 }
 assert.equal(real.contacts.filter(r=>r.status==='published').length+real.pccMembers.filter(r=>r.status==='published').length,31);
 const results=JSON.parse(out.search);assert.equal(results.length,1);assert.equal(results[0].url,'our-team.html');
 for(const term of ['Parish Contact Directory','vicar','churchwarden','PCC','safeguarding'])assert(results[0].content.includes(term));
 const compatibility=fs.readFileSync(path.join(root,'parish-contact-directory.html'),'utf8');assert.match(compatibility,/location.replace\('our-team.html' \+ location.search \+ location.hash\)/);assert.match(compatibility,/href="our-team.html"/);
 const nav=fs.readFileSync(path.join(root,'site.js'),'utf8');assert(!nav.includes('parish-contact-directory.html'));assert.match(nav,/href="our-team.html">Our Team/);
});

test('Optional contact portraits use authoritative references, reserve proportions and leave other profiles text-only',()=>{
 const out=build(real),sandra=real.contacts.find(c=>c.id==='parish-priest');
 assert.equal(sandra.photo,'assets/images/contacts/sandra-faccini.jpg');
 assert.match(out.html,/<img class="directory-portrait" src="assets\/images\/contacts\/sandra-faccini.jpg" alt="Revd. Dr. Sandra Faccini" width="88" height="132" loading="lazy" decoding="async">/);
 assert.equal((out.html.match(/class="directory-portrait"/g)||[]).length,1);
 assert.equal(JSON.parse(out.admin).contacts.find(c=>c.id===sandra.id).photo,sandra.photo);
 const without=structuredClone(real);delete without.contacts.find(c=>c.id===sandra.id).photo;
 assert.doesNotMatch(build(without).html,/directory-portrait/);
 assert.match(out.html,/mailto:parishpriest@micklehamchurch.org.uk/);
 assert.match(out.html,/tel:01372417664/);
});
test('Optional contact portraits retain safe local-asset validation',()=>{
 const {validateContacts}=require('./azure-function/src/contacts-model');
 for(const photo of ['https://example.org/person.jpg','../person.jpg','assets/images/contacts/../person.jpg','assets/images/contacts/person.svg','assets/images/contacts/person.jpg" onerror="alert(1)']){
  const data=structuredClone(real);data.contacts[0].photo=photo;assert.throws(()=>validateContacts(data),/invalid-photo/);
 }
});
