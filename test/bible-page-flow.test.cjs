const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('../bible-pages-model');
function pagesReader({reduced=false,columns=1,failLayout=false,pointer=true}={}){
 const ids=new Map(),events={},data=new Map(),emitted=[];let document,selection="";
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 class E{
  constructor(tag='div'){this.dataset={};this.nodeName=tag.toUpperCase();this.children=[];this.attrs={};this.events={};this.hidden=false;this.disabled=false;this.textContent='';this.value='niv';this.props={};this.style={setProperty:(k,v)=>this.props[k]=v};const classes=new Set();this.classList={add:(...c)=>c.forEach(x=>classes.add(x)),remove:(...c)=>c.forEach(x=>classes.delete(x)),contains:c=>classes.has(c)};}
  get childNodes(){return this.children} get clientWidth(){if(failLayout&&this.className==='bible-content bible-page-text')throw Error('measurement');return this===get('bible-page-spread')?(columns===2?1180:390):300} get clientHeight(){return this.className==='bible-content bible-page-text'?258:0}
  get scrollHeight(){const count=n=>n.nodeName==='#TEXT'||n.nodeName==='SUP'?1:n.children.reduce((a,c)=>a+count(c),0);return count(this)*10}
  append(...nodes){for(const n of nodes){if(n.nodeName==='#FRAGMENT'){this.append(...n.children);continue}if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);this.children.push(n);n.parentElement=this}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}
  addEventListener(k,v){this.events[k]=v}focus(){document.activeElement=this}getBoundingClientRect(){return {top:100,bottom:400,left:0,right:390,width:390}}
  closest(selector){if(this.blocked)return this;if(selector===".bible-page-text")return this.className==="bible-content bible-page-text"?this:this.parentElement?.closest(selector);if(selector===".bible-paper-page")return this.className==="bible-paper-page"?this:this.parentElement?.closest(selector);return null}
  querySelectorAll(selector){const found=[];const walk=n=>{if(selector==='.bible-page-text'&&n.className==='bible-content bible-page-text')found.push(n);for(const c of n.children)walk(c)};walk(this);return found}
  querySelector(s){return this.querySelectorAll(s)[0]||null}
 }
 const get=n=>{if(!ids.has(n))ids.set(n,new E());return ids.get(n)};
 const toolbar=new E();document={getElementById:id=>get(id),body:new E(),querySelector:s=>s==='.bible-toolbar'?toolbar:null,createElement:t=>new E(t),createTextNode:t=>{const n=new E('#text');n.textContent=t;return n},createDocumentFragment:()=>new E('#fragment'),addEventListener:(k,v)=>events[k]=v,dispatchEvent:e=>{emitted.push(e);events[e.type]?.(e)}};
 const window={BiblePagesModel:M,localStorage:storage,innerHeight:columns===2?800:500,innerWidth:columns===2?1440:390,addEventListener:(k,v)=>events[k]=v,getSelection:()=>({toString:()=>selection}),PointerEvent:pointer?class{}:undefined};
 get('bible-translation').options=[{value:'niv'}];
 vm.runInNewContext(fs.readFileSync(require.resolve('../bible-pages.js'),'utf8'),{document,window,matchMedia:q=>({matches:q.includes('reduced')?reduced:columns===2}),getComputedStyle:()=>({lineHeight:'20'}),setTimeout,clearTimeout,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}});
 function ready(chapter,boundaryDirection=0){const p=new E('p'),n=new E('#text');n.textContent=Array.from({length:120},(_,i)=>'word'+i+' ').join('');p.append(n);get('bible-content').replaceChildren(p);get('bible-reading').hidden=false;document.dispatchEvent({type:'bible-chapter-ready',detail:{translation:'niv',book:chapter.split('.')[0],chapter,reference:chapter,boundaryDirection,hasPreviousChapter:chapter!=='GEN.1',hasNextChapter:chapter!=='REV.22'}})}
 const ribbons=()=>{let n=0;const visit=e=>{if(e.className==='bible-page-ribbon')n++;e.children.forEach(visit)};visit(get('bible-page-spread'));return n};
 const tap=(direction,blocked=false,touchInput=false)=>{const page=get('bible-page-spread').children[columns===2&&direction>0&&touchInput?1:0],target=page.querySelector('.bible-page-text');target.blocked=blocked;const e={target,pointerType:touchInput?'touch':'mouse',button:0,isPrimary:true,pointerId:1,clientX:direction<0?78:312,clientY:150};get('bible-page-spread').events.pointerdown(e);get('bible-page-spread').events.pointerup(e);target.blocked=false};
 return {get:n=>get('bible-'+n),ready,storage,emitted,ribbons,events,tap,setSelection:s=>selection=s};
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
 const bookmark=M.readPlaces(p.storage)[0];p.ready('JHN.2',1);assert.equal(p.ribbons(),0);assert.deepEqual(M.readPlaces(p.storage)[0],bookmark);assert.equal(M.read(p.storage,'last').chapter,'JHN.2');
 p.ready('JHN.1',1);assert.equal(p.ribbons(),1);p.get('bookmark').events.click();assert.equal(p.ribbons(),0);assert.equal(M.readPlaces(p.storage).length,0);
});
test('absolute Bible limits disable only unavailable directions and reduced motion suppresses boundary turns',()=>{
 const p=pagesReader({reduced:true});p.ready('GEN.1');assert.equal(p.get('page-previous').disabled,true);p.get('page-previous').events.click();assert.equal(p.emitted.filter(e=>e.type==='bible-request-page-chapter').length,0);
 p.ready('REV.22',-1);assert.equal(p.get('page-next').disabled,true);assert.equal(p.get('page-spread').classList.contains('turn-back'),false);
});
test('Phase A removes chapter buttons and permanent afterword while retaining copyright metadata, visible citation and accessible reporting',()=>{
 const html=fs.readFileSync('bible.html','utf8');assert.doesNotMatch(html,/id="bible-(previous|next)"|class="bible-paging"|class="bible-afterword"|Explore the Bible together/);
 assert.match(html,/<span id="bible-copyright"><\/span><span id="bible-copyright-citation"><\/span> Scripture provided by/);assert.match(html,/<dialog id="bible-information"[^>]+>[\s\S]*anonymous Scripture views[\s\S]*About this reporting[\s\S]*<\/dialog>/);
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

test('legacy touch fallback still moves while vertical gestures and selection-like drags are ignored',()=>{
 const p=pagesReader({pointer:false});p.ready('JHN.1');const page=p.get('page-spread').children[0];
 p.get('page-spread').events.touchstart({target:page,touches:[{clientX:300,clientY:150}]});
 p.get('page-spread').events.touchend({target:page,changedTouches:[{clientX:100,clientY:150}]});assert(M.read(p.storage,'last').offset>0);
 const before=M.read(p.storage,'last');p.get('page-spread').events.touchstart({target:page,touches:[{clientX:100,clientY:150}]});p.get('page-spread').events.touchend({target:page,changedTouches:[{clientX:110,clientY:300}]});assert.deepEqual(M.read(p.storage,'last'),before);
});

test('natural side taps target Scripture, safe centre/selection remain unchanged, and pointer swipe consumes compatibility touchend',()=>{
 const p=pagesReader();p.ready('JHN.1');const spread=p.get('page-spread');
 function event(x,target=spread.children[0].querySelector('.bible-page-text'),pointerType='touch'){return {target,pointerType,button:0,isPrimary:true,pointerId:7,clientX:x,clientY:150,preventDefault(){}}}
 function tapAt(x){const e=event(x);spread.events.pointerdown(e);spread.events.pointerup(e)}
 tapAt(312);assert.equal(M.read(p.storage,'last').page,1);
 tapAt(78);assert.equal(M.read(p.storage,'last').page,0);
 tapAt(195);assert.equal(M.read(p.storage,'last').page,0);
 const e=event(312);spread.events.pointerdown(e);p.setSelection('selected Scripture');spread.events.pointerup(e);assert.equal(M.read(p.storage,'last').page,0);p.setSelection('');
 const start=event(320);spread.events.pointerdown(start);spread.events.touchstart({target:start.target,touches:[{clientX:320,clientY:150}]});spread.events.pointerup({...start,clientX:80});
 spread.events.touchend({target:start.target,changedTouches:[{clientX:80,clientY:150}]});spread.events.pointerup({...start,clientX:80});
 assert.equal(M.read(p.storage,'last').page,1);assert.equal(spread.events.click,undefined);
 const mouse=event(320,spread.children[0].querySelector('.bible-page-text'),'mouse');spread.events.pointerdown(mouse);spread.events.pointerup({...mouse,clientX:80});assert.equal(M.read(p.storage,'last').page,1);
 tapAt(312);assert.equal(M.read(p.storage,'last').page,2); // A fresh intentional tap still works.
});

test('facing-page touch swipes remain available and still consume exactly one spread action',()=>{
 for(const pointer of [true,false]){
  const p=pagesReader({columns:2,pointer});p.ready('JHN.1');const s=p.get('page-spread'),target=s.children[0].querySelector('.bible-page-text'),start={target,pointerType:'touch',button:0,isPrimary:true,pointerId:8,clientX:320,clientY:150};
  if(pointer)s.events.pointerdown(start);
  s.events.touchstart({target,touches:[{clientX:320,clientY:150}]});
  if(pointer)s.events.pointerup({...start,clientX:80});
  s.events.touchend({target,changedTouches:[{clientX:80,clientY:150}]});
  assert.equal(M.read(p.storage,'last').page,2);assert.equal(p.emitted.filter(e=>e.type==='bible-request-page-chapter').length,0);
  const currentTarget=s.children[0].querySelector('.bible-page-text');s.events.touchstart({target:currentTarget,touches:[{clientX:320,clientY:150}]});s.events.touchend({target:currentTarget,changedTouches:[{clientX:320,clientY:150}]});
  assert.equal(p.emitted.filter(e=>e.type==='bible-request-page-chapter').length,0);
  assert.equal(M.read(p.storage,'last').page,pointer?2:0,'legacy left leaf tap returns one spread');
 }
});

test('facing-page Scripture child touch and legacy touch choose the physical leaf, mouse stays safe',()=>{
 for(const pointer of [true,false]){
  const p=pagesReader({columns:2,pointer});p.ready('JHN.1');const s=p.get('page-spread');
  function leafTap(leaf,pointerType='touch',blocked=false){
   const target=s.children[leaf].querySelector('.bible-page-text');target.blocked=blocked;
   const e={target,pointerType,button:0,isPrimary:true,pointerId:5,clientX:195,clientY:150};
   if(pointer){s.events.pointerdown(e);s.events.pointerup(e);s.events.touchend({target,changedTouches:[e]});}
   else{s.events.touchstart({target,touches:[e]});s.events.touchend({target,changedTouches:[e]});}
   target.blocked=false;
  }
  leafTap(1);assert.equal(M.read(p.storage,'last').page,2);
  leafTap(0);assert.equal(M.read(p.storage,'last').page,0);
  if(pointer){leafTap(1,'mouse');assert.equal(M.read(p.storage,'last').page,0);}
  leafTap(1,'touch',true);assert.equal(M.read(p.storage,'last').page,0);
  p.setSelection('Scripture selection');leafTap(1);assert.equal(M.read(p.storage,'last').page,0);p.setSelection('');
  const target=s.children[1].querySelector('.bible-page-text'),e={target,pointerType:'touch',button:0,isPrimary:true,pointerId:5,clientX:195,clientY:150};
  if(pointer){s.events.pointerdown(e);s.events.pointermove({...e,clientX:225});s.events.pointerup(e);}
  else{s.events.touchstart({target,touches:[e]});s.events.touchmove({touches:[{...e,clientX:225}]});s.events.touchend({target,changedTouches:[e]});}
  assert.equal(M.read(p.storage,'last').page,0,'out-and-back selection drag is not a tap');
 }
});

test('facing touch taps reuse chapter/book boundaries and stop at both absolute Bible limits',()=>{
 const p=pagesReader({columns:2});p.ready('GEN.1');let count=p.emitted.length;
 p.tap(-1,false,true);assert.equal(p.emitted.length,count);
 for(let i=0;i<20&&!p.emitted.some(e=>e.type==='bible-request-page-chapter');i++)p.tap(1,false,true);
 assert.equal(p.emitted.at(-1).detail,1);p.ready('GEN.2',1);p.tap(-1,false,true);assert.equal(p.emitted.at(-1).detail,-1);
 p.ready('GEN.50',-1);p.tap(1,false,true);assert.equal(M.adjacentChapter('GEN.50',p.emitted.at(-1).detail),'EXO.1');
 p.ready('EXO.1',1);p.tap(-1,false,true);assert.equal(M.adjacentChapter('EXO.1',p.emitted.at(-1).detail),'GEN.50');
 p.ready('REV.22',-1);count=p.emitted.length;p.tap(1,false,true);assert.equal(p.emitted.length,count);
});
