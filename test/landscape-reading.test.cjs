const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('phone-landscape.css','utf8'),site=fs.readFileSync('site.js','utf8');
test('phone reading styles have no declarations outside short-landscape media queries',()=>{
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'').trim();let depth=0,start=0,blocks=[];
 for(let i=0;i<clean.length;i++){if(clean[i]==='{'){if(depth===0){assert(/^@media\s+\(orientation:landscape\)/.test(clean.slice(start,i).trim()));assert(clean.slice(start,i).includes('(max-height:460px)'));}depth++;}else if(clean[i]==='}'){depth--;if(!depth){blocks.push(clean.slice(start,i+1));start=i+1;}}}
 assert.equal(depth,0);assert.equal(blocks.length,2);assert.equal(clean.slice(start).trim(),'');
 assert(!css.includes('!important'));assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert(css.includes('flex-direction:row'));assert(css.includes('min-height:44px'));assert(css.includes('font-size:max(16px,1em)'));
 assert(!css.includes('.calendar-month-grid'));assert(!css.includes('.home-editorial-portraits'));
});
test('shared site loads a versioned reading stylesheet without changing navigation or feedback logic',()=>{
 assert(site.includes("new URL('phone-landscape.css?v=20261020-reading-1', siteScript.src)"));
 assert(site.includes('header-navigation.css?navigation=20261022-green-2'));
 assert(css.includes('safe-area-inset-right'));assert(css.includes('.feedback-launcher::before'));
});
