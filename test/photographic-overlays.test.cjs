const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const shared=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const hero=fs.readFileSync(path.join(root,'home-hero-v3.css'),'utf8');
function rules(css,selector){return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2]);}
function noShading(values){assert(values.length>0);for(const value of values){for(const bg of value.matchAll(/background(?:-image|-color)?:\s*([^;]+);/g))assert.match(bg[1],/^(?:none|transparent)$/,'Photographic overlay background must be absent');assert.doesNotMatch(value,/(?:linear|radial)-gradient|filter\s*:|blend-mode\s*:/);}}
test('homepage photograph overlay is disabled at every responsive rule',()=>{const values=rules(hero,'.home-hero .hero-overlay');noShading(values);assert.match(values[0],/display:\s*none;/);for(const value of values)for(const display of value.matchAll(/display:\s*([^;]+);/g))assert.equal(display[1].trim(),'none');assert.match(hero,/text-shadow: 0 1px 2px #0006/);});
test('shared hero fallback is disabled and cannot restore photographic shading',()=>{const values=rules(shared,'.hero-overlay');assert.equal(values.length,1);noShading(values);assert.match(values[0],/display:\s*none;/);});
test('homepage Worship and Church Life photo pseudo-overlays remain absent in both responsive treatments',()=>{const values=rules(shared,'.home-feature-grid .feature-card::after');assert.equal(values.length,2);noShading(values);for(const value of values){assert.match(value,/content:\s*none;/);assert.match(value,/display:\s*none;/);}assert.match(shared,/\.home-card-cta[^{}]*\{[^}]*background: #244b39/,'Brand-green buttons remain intact');});

test('non-phone welcome is transparent and uses text-only definition',()=>{const values=rules(hero,'.home-hero .hero-content');const desktop=values.find(value=>value.includes('position: absolute'));assert(desktop);assert.match(desktop,/background: transparent;/);assert.match(desktop,/box-shadow: none;/);assert.match(desktop,/border-radius: 0;/);assert.doesNotMatch(hero,/gradient|filter\s*:|blend-mode\s*:/);assert.match(hero,/aspect-ratio: 4786 \/ 2409/);assert.match(hero,/object-position: 50% 62%/);});

test('photographic card readability is limited to white heading/copy and text shadows',()=>{for(const selector of ['.home-feature-grid .feature-card h3','.home-feature-grid .feature-card p']){const values=rules(shared,selector);assert(values.some(value=>/color: white;/.test(value)&&/text-shadow:/.test(value)));for(const value of values)assert.doesNotMatch(value,/background(?:-image)?:|filter\s*:|blend-mode\s*:/);}});
