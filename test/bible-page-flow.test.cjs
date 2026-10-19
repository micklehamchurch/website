const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('../bible-pages-model');
function pagesReader({reduced=false,columns=1,failLayout=false}={}){
 const ids=new Map(),events={},data=new Map(),emitted=[];let document;
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 class E{
  constructor(tag='div'){this.nodeName=tag.toUpperCase();this.children=[];this.attrs={};this.events={};this.hidden=false;this.disabled=false;this.textContent='';this.value='niv';this.props={};this.style={setProperty:(k,v)=>this.props[k]=v};const classes=new Set();this.classList={add:(...c)=>c.forEach(x=>classes.add(x)),remove:(...c)=>c.forEach(x=>classes.delete(x)),contains:c=>classes.has(c)};}
  get childNodes(){return this.children} get clientWidth(){if(failLayout&&this.className==='bible-content bible-page-text')throw Error('measurement');return this===get('bible-page-spread')?(columns===2?1180:390):300} get clientHeight(){return this.className==='bible-content bible-page-text'?258:0}
  get scrollHeight(){const count=n=>n.nodeName==='#TEXT'||n.nodeName==='SUP'?1:n.children.reduce((a,c)=>a+count(c),0);return count(this)*10}
  append(...nodes){for(const n of nodes){if(n.nodeName==='#FRAGMENT'){this.append(...n.children);continue}if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);this.children.push(n);n.parentElement=this}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}
  addEventListener(k,v){this.events[k]=v}focus(){document.activeElement=this}getBoundingClientRect(){return {top:100,bottom:400,left:0,right:390,width:390}}
  closest(selector){if(this.blocked)return this;if(selector===".bible-paper-page")return this.className==="bible-paper-page"?this:this.parentElement?.closest(selector);return null}
  querySelectorAll(selector){const found=[];const walk=n=>{if(selector==='.bible-page-text'&&n.className==='bible-content bible-page-text')found.push(n);for(const c of n.children)walk(c)};walk(this);return found}
  querySelector(s){return this.querySelectorAll(s)[0]||null}
 }
 const get=n=>{if(!ids.has(n))ids.set(n,new E());return ids.get(n)};
 const toolbar=new E();document={getElementById:id=>get(id),body:new E(),querySelector:s=>s==='.bible-toolbar'?toolbar:null,createElement:t=>new E(t),createTextNode:t=>{const n=new E('#text');n.textContent=t;return n},createDocumentFragment:()=>new E('#fragment'),addEventListener:(k,v)=>events[k]=v,dispatchEvent:e=>{emitted.push(e);events[e.type]?.(e)}};
 const window={BiblePagesModel:M,localStorage:storage,innerHeight:columns===2?800:500,innerWidth:columns===2?1440:390,addEventListener:(k,v)=>events[k]=v,getSelection:()=>null};
 get('bible-translation').options=[{value:'niv'}];
 vm.runInNewContext(fs.readFileSync(require.resolve('../bible-pages.js'),'utf8'),{document,window,matchMedia:q=>({matches:q.includes('reduced')?reduced:columns===2}),getComputedStyle:()=>({lineHeight:'20'}),setTimeout,clearTimeout,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}});
 function ready(chapter,boundaryDirection=0){const p=new E('p'),n=new E('#text');n.textContent=Array.from({length:120},(_,i)=>'word'+i+' ').join('');p.append(n);get('bible-content').replaceChildren(p);get('bible-reading').hidden=false;document.dispatchEvent({type:'bible-chapter-ready',detail:{translation:'niv',book:chapter.split('.')[0],chapter,reference:chapter,boundaryDirection,hasPreviousChapter:chapter!=='GEN.1',hasNextChapter:chapter!=='REV.22'}})}
 const ribbons=()=>{let n=0;const visit=e=>{if(e.className==='bible-page-ribbon')n++;e.children.forEach(visit)};visit(get('bible-page-spread'));return n};
 const tap=(direction,blocked=false)=>{const page=get('bible-page-spread').children[0];page.blocked=blocked;const e={target:page,button:0,isPrimary:true,pointerId:1,clientX:direction<0?5:385,clientY:150};get('bible-page-spread').events.pointerdown(e);get('bible-page-spread').events.pointerup(e);page.blocked=false};
 return {get:n=>get('bible-'+n),ready,storage,emitted,ribbons,events,tap};
}
test('visual page flow crosses forward at the end, lands backward on the last spread, and saves the correct content offset',()=>{
 for(const columns of [1,2]){
 const p=pagesReader({columns});p.ready('JHN.1');let turns=0;
 do{p.get('page-next').events.click();turns++}while(!p.emitted.some(e=>e.type==='bible-request-page-chapter')&&turns<20);
 assert(turns>1);assert.equal(p.emitted.at(-1).detail,1);
 p.ready('JHN.2',1);assert.match(p.get('page-status').textContent,/^Pages? 1(?:–2)? of/);assert.equal(M.read(p.storage,'last').chapter,'JHN.2');assert.equal(M.read(p.storage,'last').offset,0);
 p.get('page-previous').events.click();assert.equal(p.emitted.at(-1).detail,-1);
 p.ready('JHN.1',-1);const status=p.get('page-status').textContent, numbers=status.match(/\d+/g).map(Number);assert.equal(numbers.at(-2),numbers.at(-1));assert(M.read(p.storage,'last').offset>0);
 }
});
test('ribbon stays with the explicit chapter while continuous progress changes and returns, including removal',()=>{
 const p=pagesReader();p.ready('JHN.1');p.get('bookmark').events.click();assert.equal(p.ribbons(),1);
 const bookmark=M.read(p.storage,'bookmark');p.ready('JHN.2',1);assert.equal(p.ribbons(),0);assert.deepEqual(M.read(p.storage,'bookmark'),bookmark);assert.equal(M.read(p.storage,'last').chapter,'JHN.2');
 p.ready('JHN.1',1);assert.equal(p.ribbons(),1);p.get('bookmark').events.click();assert.equal(p.ribbons(),0);assert.equal(M.read(p.storage,'bookmark'),null);
});
test('absolute Bible limits disable only unavailable directions and reduced motion suppresses boundary turns',()=>{
 const p=pagesReader({reduced:true});p.ready('GEN.1');assert.equal(p.get('page-previous').disabled,true);p.get('page-previous').events.click();assert.equal(p.emitted.filter(e=>e.type==='bible-request-page-chapter').length,0);
 p.ready('REV.22',-1);assert.equal(p.get('page-next').disabled,true);assert.equal(p.get('page-spread').classList.contains('turn-back'),false);
});
test('Phase A removes chapter buttons and permanent afterword while retaining visible full copyright and accessible reporting',()=>{
 const html=fs.readFileSync('bible.html','utf8');assert.doesNotMatch(html,/id="bible-(previous|next)"|class="bible-paging"|class="bible-afterword"|Explore the Bible together/);
 assert.match(html,/<span id="bible-copyright"><\/span> Scripture provided by/);assert.match(html,/<dialog id="bible-information"[^>]+>[\s\S]*anonymous Scripture views[\s\S]*About this reporting[\s\S]*<\/dialog>/);
 assert.match(html,/id="bible-page-previous"/);assert.match(html,/id="bible-page-next"/);
});

test('full-chapter fallback retains continuous controls and required readable content',()=>{
 const p=pagesReader({failLayout:true});p.ready('JHN.2');assert.equal(p.get('content').hidden,false);assert.equal(p.get('page-controls').hidden,false);assert.equal(p.get('page-status').textContent,'Full chapter');
 p.get('page-next').events.click();assert.equal(p.emitted.at(-1).type,'bible-request-page-chapter');assert.equal(p.emitted.at(-1).detail,1);
});

test('edge taps use continuous navigation across chapters/books and stop at the absolute Bible limits',()=>{
 const p=pagesReader();p.ready('GEN.1');p.tap(-1);assert.equal(p.emitted.length,1); // chapter-ready only
 p.tap(1);assert(M.read(p.storage,'last').offset>0);
 for(let i=0;i<20&&!p.emitted.some(e=>e.type==='bible-request-page-chapter');i++)p.tap(1);
 assert.equal(p.emitted.at(-1).type,'bible-request-page-chapter');assert.equal(p.emitted.at(-1).detail,1);
 p.ready('GEN.2',1);p.tap(-1);assert.equal(p.emitted.at(-1).detail,-1);
 p.ready('GEN.50',-1);p.tap(1);assert.equal(M.adjacentChapter('GEN.50',p.emitted.at(-1).detail),'EXO.1');
 p.ready('EXO.1',1);p.tap(-1);assert.equal(M.adjacentChapter('EXO.1',p.emitted.at(-1).detail),'GEN.50');
 p.ready('REV.22',-1);const requests=p.emitted.length;p.tap(1);assert.equal(p.emitted.length,requests);
});

test('interactive targets and facing-page layouts cannot turn through edge taps',()=>{
 const p=pagesReader();p.ready('JHN.1');const before=M.read(p.storage,'last');
 for(const control of ['Bookmark','Browse','Close','About','link','translation','chapter','dialog']){p.tap(1,true);assert.deepEqual(M.read(p.storage,'last'),before,control)}
 const wide=pagesReader({columns:2});wide.ready('JHN.1');const wideBefore=M.read(wide.storage,'last');wide.tap(1);assert.deepEqual(M.read(wide.storage,'last'),wideBefore);
});

test('existing swipe still moves while vertical gestures and selection-like drags are ignored',()=>{
 const p=pagesReader();p.ready('JHN.1');const page=p.get('page-spread').children[0];
 p.get('page-spread').events.touchstart({target:page,touches:[{clientX:300,clientY:150}]});
 p.get('page-spread').events.touchend({changedTouches:[{clientX:100,clientY:150}]});assert(M.read(p.storage,'last').offset>0);
 const before=M.read(p.storage,'last');p.get('page-spread').events.touchstart({target:page,touches:[{clientX:100,clientY:150}]});p.get('page-spread').events.touchend({changedTouches:[{clientX:110,clientY:300}]});assert.deepEqual(M.read(p.storage,'last'),before);
});
