const fs=require('node:fs'),path=require('node:path'),config=require('./editorial-hero-config.cjs');
function render(html,c){
 // Remove only generated decoration. Copy, meaningful images and links are retained verbatim.
 html=html.replace(/<div class="editorial-media"[\s\S]*?<\/div><!--editorial-media-->/g,'')
  .replace(/^[ \t]*<link rel="stylesheet" href="editorial-heroes.css[^\"]*">\r?\n/gm,'')
  .replace(/<section class="page-hero editorial-hero"[^>]*>/g,'<section class="page-hero">');
 if(!c)return html;
 html=html.replace(/<section class="page-hero">/,`<section class="page-hero editorial-hero" style="--editorial-focal:${c.focal};--editorial-mobile-focal:${c.mobile}"><div class="editorial-media" aria-hidden="true"><img src="assets/images/editorial/atmosphere-${c.image}-1600.webp" srcset="assets/images/editorial/atmosphere-${c.image}-800.webp 800w, assets/images/editorial/atmosphere-${c.image}-1600.webp 1600w" sizes="(min-width:1600px) 1600px, 100vw" alt="" width="1600" height="533" decoding="async" fetchpriority="high"><span class="editorial-shade"></span><span class="editorial-nav-shade"></span></div><!--editorial-media-->`);
 return html.replace('</head>','  <link rel="stylesheet" href="editorial-heroes.css?v=20261024-1">\n</head>');
}
if(require.main===module)for(const file of require('./scripts/public-page-inventory.cjs').inventory().normal){if(process.argv.length>2&&!process.argv.slice(2).includes(file))continue;const filename=path.join(__dirname,file),html=fs.readFileSync(filename,'utf8'),next=render(html,config[file]);if(next!==html)fs.writeFileSync(filename,next);}
module.exports={render};
