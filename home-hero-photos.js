/* Genuine parish photographs and per-photo framing. Add a definition, not controller branches. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.HomeHeroPhotos=model;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const photos=[
  {id:'exterior',name:'St Michael and All Angels church exterior',focus:{wide:'50% 20%',phone:'50% 50%',short:'64% 50%'},shortFit:'contain'},
  {id:'memorial',name:'Mary Munday memorial and churchyard',focus:{wide:'50% 70%',phone:'50% 0%',short:'50% 65%'},shortFit:'contain',phoneFit:'contain'},
  {id:'churchyard',name:'Churchyard and autumn foliage',focus:{wide:'50% 62%',phone:'50% 50%',short:'35% 55%'},shortFit:'cover'}
 ];
 const sizes='(max-width: 600px) 100vw, (max-height: 460px) and (max-width: 999px) 53vw, (min-width: 1600px) 1600px, 100vw';
 const srcset=p=>[640,960,1600,2560].map(w=>`assets/images/home/hero-${p.id}-${w}.webp ${w}w`).join(', ');
 const wrap=(i,n)=>((i%n)+n)%n;
 function swipe(a,b){if(!a||!b||b.at-a.at>1000)return 0;const x=b.x-a.x,y=b.y-a.y;return Math.abs(x)>=65&&Math.abs(x)>Math.abs(y)*1.8?(x<0?1:-1):0;}
 return {photos,sizes,srcset,wrap,swipe,interval:8000,fade:1400};
});
