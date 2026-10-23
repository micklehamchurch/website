(() => {
 'use strict';
 const M=window.HomeHeroPhotos,hero=document.querySelector('.home-hero'),media=hero?.querySelector('.home-hero-media');
 if(!M||!media)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),first=media.querySelector('picture'),pictures=[first],loading=new Map();
 let current=0,wanted=0,timer=0,idleTimer=0,paused=false,hovered=false,request=0,gesture=null;
 const controls=document.createElement('div');controls.className='hero-photo-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Church photographs');
 const button=(label,text,action)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.textContent=text;b.addEventListener('click',action);controls.append(b);return b;};
 button('Previous photo','‹',()=>select(wanted-1));
 const dots=M.photos.map((p,i)=>{const b=button(`Show photo ${i+1} of ${M.photos.length}: ${p.name}`,'',()=>select(i));b.className='hero-photo-dot';return b;});
 button('Next photo','›',()=>select(wanted+1));
 const pause=button('Pause photo rotation','Ⅱ',()=>{paused=!paused;update();schedule();});
 media.append(controls);
 function framing(picture,p){for(const [key,value]of Object.entries(p.focus))picture.style.setProperty(`--photo-${key}`,value);picture.style.setProperty('--photo-short-fit',p.shortFit||'cover');picture.style.setProperty('--photo-phone-fit',p.phoneFit||'cover');}
 framing(first,M.photos[0]);first.classList.add('is-current');
 function canRotate(){return !paused&&!motion.matches&&!document.hidden&&!hovered&&!hero.contains(document.activeElement);}
 function schedule(){clearTimeout(timer);if(canRotate())timer=setTimeout(()=>select(current+1,true),M.interval);}
 function update(){dots.forEach((b,i)=>{if(i===current)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Resume photo rotation':'Pause photo rotation');pause.setAttribute('aria-pressed',String(paused));pause.hidden=motion.matches;}
 function load(i){
  if(loading.has(i))return loading.get(i);
  const task=(async()=>{
   let picture=pictures[i];
   if(!picture){const p=M.photos[i];picture=document.createElement('picture');picture.className='home-hero-photo hero-photo-layer';picture.setAttribute('aria-hidden','true');framing(picture,p);
    const short=document.createElement('source');short.media='(orientation: landscape) and (max-width: 650px) and (max-height: 460px)';short.type='image/webp';short.srcset=`assets/images/home/hero-${p.id}-short.webp`;
    const phone=document.createElement('source');phone.media='(max-width: 600px)';phone.type='image/webp';phone.srcset=`assets/images/home/hero-${p.id}-phone.webp`;
    const webp=document.createElement('source');webp.type='image/webp';webp.srcset=M.srcset(p);webp.sizes=M.sizes;
    const img=document.createElement('img');img.alt='';img.width=1600;img.height=900;img.decoding='async';img.fetchPriority='low';img.sizes=M.sizes;
    picture.append(short,phone,webp,img);img.src=`assets/images/home/hero-${p.id}.jpg`;pictures[i]=picture;media.insertBefore(picture,controls);
   }
   const img=picture.querySelector('img');await img.decode();if(!img.naturalWidth)throw Error('unavailable-photo');return picture;
  })();loading.set(i,task);task.catch(()=>{loading.delete(i);if(i!==current){pictures[i]?.remove();pictures[i]=null;}});return task;
 }
 function warmNext(){clearTimeout(idleTimer);if(motion.matches||document.hidden)return;idleTimer=setTimeout(()=>load(M.wrap(current+1,M.photos.length)).catch(()=>{}),1600);}
 async function select(index,automatic=false){clearTimeout(timer);wanted=M.wrap(index,M.photos.length);const own=++request;
  try{const picture=await load(wanted);if(own!==request)return;if(automatic&&!canRotate()){wanted=current;return;}const previous=pictures[current];current=wanted;picture.classList.add('is-current');if(previous!==picture)previous.classList.remove('is-current');update();warmNext();}
  catch{if(own===request)wanted=current;}finally{if(own===request)schedule();}
 }
 hero.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hovered=true;clearTimeout(timer);}});
 hero.addEventListener('pointerleave',()=>{hovered=false;schedule();});
 hero.addEventListener('focusin',()=>clearTimeout(timer));hero.addEventListener('focusout',()=>setTimeout(schedule,0));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);clearTimeout(idleTimer);}else{schedule();warmNext();}});
 motion.addEventListener('change',()=>{update();schedule();if(motion.matches)clearTimeout(idleTimer);else warmNext();});
 media.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!e.isPrimary||e.target.closest('button,a'))return;gesture={x:e.clientX,y:e.clientY,at:performance.now()};clearTimeout(timer);});
 media.addEventListener('pointerup',e=>{if(!gesture)return;const direction=M.swipe(gesture,{x:e.clientX,y:e.clientY,at:performance.now()});gesture=null;if(direction)select(wanted+direction);else schedule();});
 media.addEventListener('pointercancel',()=>{gesture=null;schedule();});
 update();load(0).then(()=>{schedule();warmNext();}).catch(()=>{});
})();
