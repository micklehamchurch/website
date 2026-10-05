const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../azure-function/src/clergy-model'),renderer=require('../clergy-render');
const fixture=()=>structuredClone(require('../_content/clergy.json'));
test('structured evidence accepts http, https and local evidence without a link',()=>{
 const archive=fixture(),r=archive.records[0];r.sources=[{title:'Web evidence',url:' https://example.org/evidence ',notes:'Public note',public:true},{title:'Local parish collection',url:'',notes:'Local note',public:true},{title:'HTTP evidence',url:'http://example.org/evidence',notes:'',public:false}];
 model.validateArchive(archive);assert.equal(r.sources[0].url,'https://example.org/evidence');
 const html=renderer.profile(r);assert.match(html,/Sources &amp; further reading/);assert.match(html,/href="https:\/\/example.org\/evidence"/);assert.match(html,/rel="noopener noreferrer"/);assert.match(html,/Local parish collection/);assert.match(html,/Local note/);assert.equal((html.match(/>View source/g)||[]).length,1);assert.doesNotMatch(html,/HTTP evidence/);
});
test('private evidence, legacy sources and research notes never render; legacy narrative remains',()=>{
 const archive=fixture(),r=archive.records[0];r.sources=['LEGACY PRIVATE',{title:'PRIVATE TITLE',url:'https://example.org/private',notes:'PRIVATE NOTE',public:false}];r.internalNotes='PRIVATE RESEARCH';r.parishContext=['Existing parish prose'];
 const before=structuredClone(archive);model.validateArchive(archive);assert.deepEqual(archive,before);const html=renderer.profile(r);assert.doesNotMatch(html,/PRIVATE|example.org\/private|Sources &amp; further reading/);assert.match(html,/Existing parish prose/);
});
test('evidence validation rejects unsafe protocols, malformed rows and arbitrary fields',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,bad','file:///test','//example.org','https://user:pass@example.org','https://example.org/ bad','https:\\example.org']){const a=fixture();a.records[0].sources=[{title:'Evidence',url,notes:'',public:true}];assert.throws(()=>model.validateArchive(a));assert.equal(renderer.safeSourceURL(url),'');}
 for(const source of [{title:'',url:'',notes:'',public:false},{title:'Title',url:'',notes:'',public:'true'},{title:'Title',url:'',notes:'',public:true,path:'main'},{title:'<script>',url:'',notes:'',public:true}]){const a=fixture();a.records[0].sources=[source];assert.throws(()=>model.validateArchive(a));}
});
test('source renderer escapes all visitor-visible content defensively',()=>{const r=fixture().records[0];r.sources=[{title:'<script> & title',url:'javascript:alert(1)',notes:'<img onerror=bad>',public:true}];const html=renderer.profile(r);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<img onerror|javascript:|View source/);});
test('name-only and ordinary profiles validate without specialist metadata',()=>{for(const record of [{id:'simple',displayName:'Name only',published:false},{id:'ordinary',displayName:'Ordinary person',published:true,role:'Rector',servicePeriods:[{start:1900,end:1910},{start:1920,end:null}],biography:['Their story.']}]){const a=fixture();a.records.push(record);model.validateArchive(a);assert.equal(record.parishContext.length,0);assert.deepEqual(record.sources,[]);}});
test('validation preserves every existing historical value and photograph',()=>{const a=fixture(),before=structuredClone(a);model.validateArchive(a);assert.deepEqual(a,before);});
