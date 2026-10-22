/* Loaded only on the first Search activation. Real links, a labelled form and
   a status region deliberately avoid pretending to be a combobox/listbox. */
import './search-model.js?v=20261022-inline-1';
let panel,trigger,base,header,input,status,list,all,results,index,loadState='idle',revision=0,timer,frame;
const model=globalThis.churchSearch;
function searchUrl(query){const url=new URL('search.html',base);if(query.trim())url.searchParams.set('q',query.trim());return url.href;}
function layout(){
 if(!panel||panel.hidden)return;
 const wrap=header.querySelector('.nav-wrap'),r=wrap.getBoundingClientRect(),button=trigger.getBoundingClientRect(),brand=header.querySelector('.header-branding').getBoundingClientRect();
 const wide=matchMedia('(min-width:1536px)').matches;panel.classList.toggle('is-wide',wide);
 if(wide){panel.style.left='auto';panel.style.right=`${r.right-button.right}px`;panel.style.width=`${Math.min(560,button.right-brand.right-28)}px`;panel.style.top=`${(r.height-48)/2}px`;}
 else{panel.style.left='0';panel.style.right='0';panel.style.width='auto';panel.style.top='calc(100% + 8px)';}
 const y=wide?button.top:header.getBoundingClientRect().bottom+8;
 const available=Math.min(400,Math.max(48,(globalThis.visualViewport?.height||innerHeight)-y-72));
 panel.style.setProperty('--search-results-height',`${available}px`);panel.classList.toggle('is-short',available<240);panel.classList.toggle('is-tiny',available<120);
}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);}
function close(restore=true){if(!panel||panel.hidden)return;panel.hidden=true;header.classList.remove('header-search-open');trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus({preventScroll:true});}
function render(){
 const query=input.value.trim(),terms=model.normalizeSearchText(query);all.href=searchUrl(query);list.replaceChildren();
 if(!terms){status.textContent='Enter a word or phrase to find a page.';return;}
 if(loadState==='loading'){status.textContent='Finding pages…';return;}
 if(loadState==='error'){status.textContent='Search is temporarily unavailable. You can try the full Search page.';return;}
 const matches=model.findMatches(index||[],query);status.textContent=matches.length?`${matches.length} matching ${matches.length===1?'page':'pages'}.`:`No pages found for “${query}”. Try different words.`;
 for(const {page,excerpt}of matches.slice(0,5)){
  const url=new URL(page.url,base);if(url.origin!==base.origin||!/^https?:$/.test(url.protocol))continue;
  const item=document.createElement('li'),link=document.createElement('a'),title=document.createElement('span'),summary=document.createElement('span');
  link.href=url.href;title.className='header-result-title';title.textContent=page.title;summary.className='header-result-summary';summary.textContent=excerpt.length>120?excerpt.slice(0,117)+'…':excerpt;link.append(title,summary);item.append(link);list.append(item);
 }
}
async function load(){
 if(index)return;const current=++revision;loadState='loading';render();
 try{const data=await model.loadIndex(new URL('search-index.json',base).href);if(current!==revision)return;index=data;loadState='ready';}catch{if(current!==revision)return;loadState='error';}render();
}
function create(){
 panel=document.createElement('section');panel.id='header-inline-search';panel.className='header-inline-search';panel.hidden=true;panel.setAttribute('aria-label','Website search');
 panel.innerHTML=`<form class="header-inline-form" role="search" aria-label="Search the website" action="${searchUrl('')}" method="get"><button class="header-search-submit" type="submit" aria-label="Search all pages"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button><label class="header-inline-label" for="header-inline-query">Search the website</label><input id="header-inline-query" type="search" name="q" placeholder="Search St Michael's…" autocomplete="off" maxlength="160" aria-describedby="header-search-status"><button class="header-search-close" type="button" aria-label="Close Search">×</button></form><div class="header-search-results"><p id="header-search-status" role="status" aria-live="polite" aria-atomic="true"></p><ul class="header-search-matches" aria-label="Matching pages"></ul><a class="header-search-all" href="${searchUrl('')}">View all results <span aria-hidden="true">→</span></a></div>`;
 header.querySelector('.nav-wrap').append(panel);input=panel.querySelector('input');status=panel.querySelector('[role="status"]');list=panel.querySelector('ul');all=panel.querySelector('.header-search-all');results=panel.querySelector('.header-search-results');trigger.setAttribute('aria-controls',panel.id);
 panel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();location.assign(searchUrl(input.value));});
 panel.querySelector('.header-search-close').addEventListener('click',()=>close());
 input.addEventListener('input',()=>{all.href=searchUrl(input.value);clearTimeout(timer);timer=setTimeout(render,120);});
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}else if(event.key==='ArrowDown'&&event.target===input&&list.firstElementChild){event.preventDefault();list.querySelector('a').focus();}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&!panel.hidden&&!document.querySelector('dialog[open]')){event.preventDefault();close();}});
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target))close(false);},true);
 // A modal opened from elsewhere should never leave a hidden search focused.
 addEventListener('resize',schedule);addEventListener('scroll',schedule,{passive:true});globalThis.visualViewport?.addEventListener('resize',schedule);globalThis.visualViewport?.addEventListener('scroll',schedule);
 if('ResizeObserver'in globalThis)new ResizeObserver(schedule).observe(header.querySelector('.nav-wrap'));
}
export function open(button,root){
 trigger=button;base=root;header=document.querySelector('[data-site-header]');if(!panel)create();
 if(!panel.hidden){close();return;}
 panel.hidden=false;header.classList.add('header-search-open');trigger.setAttribute('aria-expanded','true');layout();input.focus({preventScroll:true});render();void load();
}
