const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),model=require('../peace-model');
const data=require('../peace-moments.json');
test('five moments use real local photographs and the existing licensed NIV endpoint',()=>{
 assert.equal(model.validate(data),data);assert.equal(data.moments.length,5);assert.equal(data.audio,null);
 for(const m of data.moments){assert(m.reflection.length<300);for(const s of m.photo.sources)assert(fs.existsSync(s.src));assert(!m.photo.sources.some(s=>/demo|generated|weddings|funerals|baptisms/.test(s.src)));}
 assert.throws(()=>model.validate({...data,translation:'unknown'}));
 const bad=structuredClone(data);bad.moments[0].photo.sources[0].src='../secret';assert.throws(()=>model.validate(bad));
 assert.throws(()=>model.validate({...data,moments:[data.moments[0],data.moments[0]]}));
});
test('provider text is preserved, excerpts use exact boundaries, attribution cannot be omitted',()=>{
 const m=data.moments[0],response={data:{id:m.passage,content:' [10] He says, ‘Synthetic fixture clause; synthetic remainder.’',copyright:'Fixture notice'},meta:{fumsToken:'fixture-view-token'}};
 assert.equal(model.scripture(response,m).text,'Synthetic fixture clause');
 const whole={...m,excerpt:undefined};assert.equal(model.scripture(response,whole).text,'He says, ‘Synthetic fixture clause; synthetic remainder.’');
 assert.throws(()=>model.scripture({...response,meta:{}},m));assert.throws(()=>model.scripture({...response,data:{...response.data,copyright:''}},m));
 assert.throws(()=>model.scripture({...response,data:{...response.data,id:'OTHER'}},m));
 assert.throws(()=>model.scripture({...response,data:{...response.data,content:'No expected boundary'}},m));
 assert.equal(model.scripture({...response,data:{...response.data,content:'[10] First fixture. Second fixture.'}},{...m,excerpt:'first-sentence'}).text,'First fixture.');
});
test('navigation wraps and audio/rotation/security remain deliberately limited',()=>{
 assert.equal(model.adjacent(0,-1,5),4);assert.equal(model.adjacent(4,1,5),0);
 const js=fs.readFileSync('peace.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('peace.css','utf8');
 assert(js.includes("window.fums('trackView',result.token)"));assert(js.includes("credentials:'omit'"));assert(!js.includes('localStorage'));assert(!js.includes('setInterval'));
 assert(js.includes('cache.clear()'));assert(js.includes('data.translation'));assert(js.includes('disabled aria-describedby="peace-audio-note"'));
 assert(!js.includes('new Audio'));assert(!js.includes('/feedback-admin'));assert(css.includes('prefers-reduced-motion:reduce'));
 assert.equal((html.match(/data-peace-open/g)||[]).length,1);assert(html.indexOf('home-peace-entry')>html.indexOf('home-quick-links'));
});
