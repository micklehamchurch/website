const {test}=require('node:test'),assert=require('assert/strict'),fs=require('./helpers/favicon-snapshot.cjs').fs,cp=require('child_process');
const read=f=>require('./helpers/policies-navigation-snapshot.cjs')(fs.readFileSync(f,'utf8')).replace(/\r/g,''),old=f=>cp.execFileSync('git',['show','4eee984:'+f],{encoding:'utf8'}).replace(/\r/g,'');
test('Church open daily changes only its destination to the existing Find Us page',()=>{
 assert(fs.existsSync('finding-us.html'));assert.match(read('finding-us.html'),/<h1[^>]*>Find Us<\/h1>/);
 assert.equal(read('site.js').replace('class="header-opening" href="finding-us.html"','class="header-opening" href="visit.html"'),old('site.js'));
 for(const f of ['header-navigation.css','public-header.js','responsive-navigation.js','header-search.js'])assert.equal(read(f),old(f),f);
});
test("Shared opening link points to the published visitor page", () => {
  assert.match(read('site.js'),/finding-us\.html/); assert.match(read('finding-us.html'),/data-site-header/); assert.match(read('index.html'),/src="site\.js\?[^"\s]*header=/);
});
