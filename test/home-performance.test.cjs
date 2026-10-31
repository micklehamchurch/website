const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const html=()=>fs.readFileSync('index.html','utf8');
test('Home critical CSS is deterministic, uses the original cascade and reserves the actual header breakpoints',()=>{
 const manifest=require('../home-style-sources.json');
 assert(manifest.sources.indexOf('header-navigation.css?navigation=20261027-motion-1')>manifest.sources.indexOf('styles.css?v=natural-photos-card-cta-v4'));
 const first=html(),css=fs.readFileSync('home-critical.css','utf8');require('../build-home-performance').build();assert.equal(html(),first);assert.equal(fs.readFileSync('home-critical.css','utf8'),css);
 assert.match(first,/<link rel="stylesheet" href="home-critical.css\?v=[a-f0-9]{12}">/);
 assert.match(first,/<body class="home-header-hero header-photo-page">/);
 const reserve=fs.readFileSync('home-performance.css','utf8');assert(reserve.includes('var(--header-reserve)'));assert(reserve.includes('min-width:1536px'));assert(!reserve.includes('height:'));
 for(const source of manifest.sources)assert(fs.existsSync(source.split('?')[0]));
});
test('initial state contains only the exact public projections, safely escaped and still refreshed',()=>{
 const h=html();for(const [id,file]of [['home-verses-initial','homepage-verses.json'],['home-service-initial','home-next-service-data.json']]){
  const m=h.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`));assert(m);assert.deepEqual(JSON.parse(m[1]),JSON.parse(fs.readFileSync(file)));assert(!m[1].includes('<'));
 }
 const verse=fs.readFileSync('homepage-verses.js','utf8'),service=fs.readFileSync('home-next-service.js','utf8');assert(verse.indexOf('render(); // Render')<verse.lastIndexOf('void refresh();'));assert(verse.includes("fetch(new URL('homepage-verses.json'"));assert(service.includes("fetch('home-next-service-data.json'"));
});
test('only the first hero receives priority; preload and picture candidates agree',()=>{
 const h=html();assert.equal((h.match(/rel="preload" as="image"/g)||[]).length,3);
 const sets=[...h.matchAll(/(?:imagesrcset|srcset)="([^"]*original-phone[^"\n]+)"/g)].map(m=>m[1]);assert.equal(sets.length,4);assert(sets.every(s=>s===sets[0]));assert(sets[0].includes('800.webp 800w'));
 const carousel=fs.readFileSync('home-hero-carousel.js','utf8');assert(carousel.includes("img.fetchPriority='low'"));assert(carousel.includes('await img.decode()'));assert(carousel.includes('1600)'));
 assert(!h.split('</head>')[0].includes('hero-exterior-'));assert(h.includes('loading="eager" fetchpriority="high"'));
});
test('approved typography and every source photograph remain unchanged; no global UI changes',()=>{
 const old=f=>cp.execFileSync('git',['show','8f15696:'+f],{maxBuffer:10e6});
 for(const f of ['site.js','header-navigation.css','public-header.js','responsive-navigation.js','footer-standard.css','home-hero-carousel.js','home-hero-photos.js','home-next-service-config.json'])assert.equal(fs.readFileSync(f,'utf8').replace(/\r/g,''),old(f).toString().replace(/\r/g,''),f);
 for(const f of ['assets/images/home/ed-popov-e6523-v3-mobile.webp','assets/images/home/ed-popov-e6523-v2-tablet.webp'])assert.deepEqual(fs.readFileSync(f),old(f),f);
 const css=fs.readFileSync('home-fonts.css','utf8');assert(css.includes("'DM Sans'"));assert(css.includes("'Playfair Display'"));assert(!css.includes('https://'));assert(fs.existsSync('assets/fonts/home/DM-Sans-OFL.txt'));assert(fs.existsSync('assets/fonts/home/Playfair-Display-OFL.txt'));
});
test('Home semantic metadata, text, links, dimensions and decorative markup remain unchanged',()=>{
 const before=cp.execFileSync('git',['show','8f15696:index.html'],{encoding:'utf8'}).replace(/\r/g,''),after=html().replace(/\r/g,'');
 const semantic=h=>[...h.matchAll(/<(?:title|meta)\b[^>]*>(?:[^<]*<\/title>)?/g)].map(m=>m[0]);assert.deepEqual(semantic(after),semantic(before));
 const delivery=require('./helpers/home-performance.cjs');assert.equal(delivery(after),delivery(before));
});
