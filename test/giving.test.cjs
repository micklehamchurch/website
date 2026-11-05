const test=require('node:test'),assert=require('assert/strict'),fs=require('fs'),cp=require('child_process');
const read=f=>fs.readFileSync(f,'utf8').replaceAll('\r',''),html=()=>read('give.html'),old=f=>cp.execFileSync('git',['show','f49bfce:'+f],{encoding:'utf8'}).replaceAll('\r','');
test('confirmed bank, charity, cheque payee and postal details remain exact and distinct',()=>{
 const h=html();for(const t of ['NatWest','Mickleham PCC','60-07-02','31547257','Mickleham Church PCC','Registered Charity No. 1128482','The Parochial Church Council of the Ecclesiastical Parish of Mickleham','Treasurer c/o The Rectory<br>Old London Road<br>Mickleham, Surrey RH5 6EB'])assert(h.includes(t),t);
 assert.equal(h.match(/<dl class="giving-bank-details">[\s\S]*?<\/dl>/)[0],old('give.html').match(/<dl class="giving-bank-details">[\s\S]*?<\/dl>/)[0]);
});
test('all practical methods and Christian generosity are restored within the existing sections',()=>{
 const h=html();for(const t of ['Jesus’ example','time, talents and financial resources','Direct Debit','inflation','Gift Aid on eligible gifts','set one up, change it or cancel it','to the right as you enter','card or phone','Yellow Free Will Offering / Gift Aid envelopes','Westhumble Chapel','offering plate','25p for every £1','Income Tax or Capital Gains Tax','donating shares','Inheritance Tax','solicitor or financial adviser'])assert(h.includes(t),t);
 assert(h.includes('https://www.parishgiving.org.uk/home/'));assert(h.includes('does not currently take online donations'));assert(!/<form|<iframe|Stripe|PayPal|giving-qr/.test(h));assert.equal((h.match(/class="giving-method-card"/g)||[]).length,4);
 assert.deepEqual([...h.matchAll(/<section\b[^>]+class="([^"]+)"/g)].map(x=>x[1]),[...old('give.html').matchAll(/<section\b[^>]+class="([^"]+)"/g)].map(x=>x[1]));
});
test('modern artwork, purpose cards, page structure and every shared system are preserved',()=>{
 const h=html(),before=old('give.html');assert.equal(require('./helpers/approved-giving-restoration.cjs')(h),before);assert.equal(h.match(/<section class="giving-hero"[\s\S]*?<\/section>/)[0],before.match(/<section class="giving-hero"[\s\S]*?<\/section>/)[0]);
 assert.equal(h.match(/<div class="giving-benefit-grid">[\s\S]*?<\/section>/)[0],before.match(/<div class="giving-benefit-grid">[\s\S]*?<\/section>/)[0]);
 assert.deepEqual([...h.matchAll(/<(?:script|img|footer)\b[^>]*>/g)].map(x=>x[0]),[...before.matchAll(/<(?:script|img|footer)\b[^>]*>/g)].map(x=>x[0]));
 assert(read('giving-refinements.css').startsWith(old('giving-refinements.css')));
 for(const f of ['index.html','contact.html','_content/contacts.json','site.js','styles.css','public-header.js','header-navigation.css','policies-navigation.js','policies-navigation.css','home-next-service.js','home-hero-carousel.js'])assert.equal(read(f),old(f),f);
 const a=JSON.parse(read('search-index.json')).filter(x=>x.url!=='give.html'),b=JSON.parse(old('search-index.json')).filter(x=>x.url!=='give.html');assert.deepEqual(a,b);
});
test('every giving enquiry uses Richard Siberry’s published contact, with no guessed payment destination',()=>{
 const contact=JSON.parse(read('_content/contacts.json')).contacts.find(x=>x.id==='treasurer');assert.equal(contact.name,'Richard Siberry');assert.equal(contact.email,'pcctreasurer@micklehamchurch.org.uk');
 const h=html(),main=h.match(/<main\b[\s\S]*?<\/main>/)[0],urls=[...main.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);assert(!urls.includes('contact.html'));assert.equal(urls.filter(x=>x.startsWith('mailto:')).length,8);for(const u of urls.filter(x=>x.startsWith('mailto:')))assert.equal(u,'mailto:'+contact.email);assert(h.includes('tel:'+contact.phone.replace(/\s/g,'')));assert(h.includes('Richard Siberry, Treasurer'));
 assert(urls.every(u=>u==='#ways-to-give'||u==='https://www.parishgiving.org.uk/home/'||u==='mailto:'+contact.email||u==='tel:'+contact.phone.replace(/\s/g,'')));
});
