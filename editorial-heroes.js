/* Decoration only: no copy, links, menu behaviour or hero geometry is changed here. */
(()=>{'use strict';const hero=document.querySelector('.editorial-hero'),header=document.querySelector('.site-header');if(!hero||!header)return;const media=hero.querySelector('.editorial-media'),image=media.querySelector('img');let ready=false,frame;
 function update(){frame=0;hero.style.setProperty('--editorial-top',Math.max(0,hero.getBoundingClientRect().top+scrollY)+'px');hero.style.setProperty('--editorial-header',header.getBoundingClientRect().height+'px');header.classList.toggle('editorial-active',ready&&scrollY<1);}
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 async function loaded(){try{await image.decode();ready=true;media.classList.remove('image-failed');schedule();}catch{failed();}}
 function failed(){ready=false;media.classList.add('image-failed');schedule();}
 image.addEventListener('load',loaded);image.addEventListener('error',failed);if(image.complete){if(image.naturalWidth)void loaded();else failed();}new ResizeObserver(schedule).observe(header);addEventListener('resize',schedule);addEventListener('scroll',schedule,{passive:true});addEventListener('pageshow',schedule);schedule();
})();
