/* Genuine parish photographs and per-photo framing. Add a definition, not controller branches. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.HomeHeroPhotos=model;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const photos=[
  {
    "id": "sunlit-exterior",
    "name": "St Michael & All Angels Church in autumn sunshine, showing the clock tower and red entrance door",
    "focus": {
      "wide": "50% 0%",
      "phone": "42% 0%",
      "short": "40% 30%"
    },
    "shortFit": "cover",
    "sources": {
      "src": "assets/images/home/hero-sunlit-exterior-1600.webp",
      "srcset": "assets/images/home/hero-sunlit-exterior-480.webp 480w, assets/images/home/hero-sunlit-exterior-720.webp 720w, assets/images/home/hero-sunlit-exterior-960.webp 960w, assets/images/home/hero-sunlit-exterior-1280.webp 1280w, assets/images/home/hero-sunlit-exterior-1600.webp 1600w",
      "phone": "assets/images/home/hero-sunlit-exterior-480.webp 480w, assets/images/home/hero-sunlit-exterior-720.webp 720w, assets/images/home/hero-sunlit-exterior-960.webp 960w",
      "short": "assets/images/home/hero-sunlit-exterior-480.webp 480w, assets/images/home/hero-sunlit-exterior-720.webp 720w, assets/images/home/hero-sunlit-exterior-960.webp 960w"
    }
  },
  {
    "id": "golden-church",
    "name": "St Michael & All Angels Church surrounded by gravestones in warm afternoon light",
    "focus": {
      "wide": "50% 0%",
      "phone": "62% 0%",
      "short": "66% 30%"
    },
    "shortFit": "cover",
    "sources": {
      "src": "assets/images/home/hero-golden-church-1600.webp",
      "srcset": "assets/images/home/hero-golden-church-480.webp 480w, assets/images/home/hero-golden-church-720.webp 720w, assets/images/home/hero-golden-church-960.webp 960w, assets/images/home/hero-golden-church-1280.webp 1280w, assets/images/home/hero-golden-church-1600.webp 1600w",
      "phone": "assets/images/home/hero-golden-church-480.webp 480w, assets/images/home/hero-golden-church-720.webp 720w, assets/images/home/hero-golden-church-960.webp 960w",
      "short": "assets/images/home/hero-golden-church-480.webp 480w, assets/images/home/hero-golden-church-720.webp 720w, assets/images/home/hero-golden-church-960.webp 960w"
    }
  },
  {
    "id": "congregation",
    "name": "Congregation gathered inside St Michael & All Angels Church",
    "focus": {
      "wide": "50% 45%",
      "phone": "50% 45%",
      "short": "50% 45%"
    },
    "shortFit": "cover",
    "sources": {
      "src": "assets/images/home/hero-congregation-1600.webp",
      "srcset": "assets/images/home/hero-congregation-480.webp 480w, assets/images/home/hero-congregation-720.webp 720w, assets/images/home/hero-congregation-960.webp 960w, assets/images/home/hero-congregation-1280.webp 1280w, assets/images/home/hero-congregation-1600.webp 1600w",
      "phone": "assets/images/home/hero-congregation-480.webp 480w, assets/images/home/hero-congregation-720.webp 720w, assets/images/home/hero-congregation-960.webp 960w",
      "short": "assets/images/home/hero-congregation-480.webp 480w, assets/images/home/hero-congregation-720.webp 720w, assets/images/home/hero-congregation-960.webp 960w"
    }
  },
  {
    "id": "autumn-yard",
    "name": "Autumn sunshine across the historic churchyard at Mickleham",
    "focus": {
      "wide": "50% 45%",
      "phone": "28% 45%",
      "short": "22% 45%"
    },
    "shortFit": "cover",
    "sources": {
      "src": "assets/images/home/hero-autumn-yard-1600.webp",
      "srcset": "assets/images/home/hero-autumn-yard-480.webp 480w, assets/images/home/hero-autumn-yard-720.webp 720w, assets/images/home/hero-autumn-yard-960.webp 960w, assets/images/home/hero-autumn-yard-1280.webp 1280w, assets/images/home/hero-autumn-yard-1600.webp 1600w",
      "phone": "assets/images/home/hero-autumn-yard-480.webp 480w, assets/images/home/hero-autumn-yard-720.webp 720w, assets/images/home/hero-autumn-yard-960.webp 960w",
      "short": "assets/images/home/hero-autumn-yard-480.webp 480w, assets/images/home/hero-autumn-yard-720.webp 720w, assets/images/home/hero-autumn-yard-960.webp 960w"
    }
  },
  {
    "id": "sunset-yard",
    "name": "Golden evening sunlight over St Michael's churchyard and historic gravestones",
    "focus": {
      "wide": "50% 15%",
      "phone": "46% 15%",
      "short": "46% 20%"
    },
    "shortFit": "cover",
    "sources": {
      "src": "assets/images/home/hero-sunset-yard-1600.webp",
      "srcset": "assets/images/home/hero-sunset-yard-480.webp 480w, assets/images/home/hero-sunset-yard-720.webp 720w, assets/images/home/hero-sunset-yard-960.webp 960w, assets/images/home/hero-sunset-yard-1280.webp 1280w, assets/images/home/hero-sunset-yard-1600.webp 1600w",
      "phone": "assets/images/home/hero-sunset-yard-480.webp 480w, assets/images/home/hero-sunset-yard-720.webp 720w, assets/images/home/hero-sunset-yard-960.webp 960w",
      "short": "assets/images/home/hero-sunset-yard-480.webp 480w, assets/images/home/hero-sunset-yard-720.webp 720w, assets/images/home/hero-sunset-yard-960.webp 960w"
    }
  }
];
 const sizes='(max-width: 600px) 100vw, (max-height: 460px) and (max-width: 999px) 53vw, (min-width: 1600px) 1600px, 100vw';
 const srcset=p=>p.sources?.srcset||[640,960,1600,2560].map(w=>`assets/images/home/hero-${p.id}-${w}.webp ${w}w`).join(', ');
 const wrap=(i,n)=>((i%n)+n)%n;
 function swipe(a,b){if(!a||!b||b.at-a.at>1000)return 0;const x=b.x-a.x,y=b.y-a.y;return Math.abs(x)>=65&&Math.abs(x)>Math.abs(y)*1.8?(x<0?1:-1):0;}
 return {photos,sizes,srcset,wrap,swipe,interval:8000,fade:1400};
});
