const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const shared=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const hero=fs.readFileSync(path.join(root,'home-hero-v3.css'),'utf8');
function backgrounds(css,selector){return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2].match(/background:\s*([^;]+);/)?.[1]).filter(Boolean);}
function neutralGradient(value){assert.match(value,/(?:linear|radial)-gradient\(/);assert.match(value,/transparent/);const colors=value.match(/#[0-9a-f]{3,8}\b/gi)||[];assert(colors.length>0);for(const color of colors){const rgb=color.length<=5?color.slice(1,4):color.slice(1,7);assert.match(rgb,/^0+$/,'Photographic shading must be neutral black: '+color);}}
test('wide homepage photograph uses a local neutral gradient and neutral text shadow',()=>{const values=backgrounds(hero,'.home-hero .hero-overlay').filter(v=>v.includes('gradient'));assert.equal(values.length,1);neutralGradient(values[0]);assert.match(hero,/text-shadow: 0 2px 5px #000000c0/);});
test('shared photographic hero fallback cannot restore the old green tint',()=>{const values=backgrounds(shared,'.hero-overlay');assert.equal(values.length,1);neutralGradient(values[0]);});
test('homepage photo cards retain neutral readable shading at both responsive treatments',()=>{const values=backgrounds(shared,'.home-feature-grid .feature-card::after');assert.equal(values.length,2);values.forEach(neutralGradient);assert.match(shared,/\.home-card-cta[^{}]*\{[^}]*background: #244b39/,'Brand-green buttons remain intact');});
