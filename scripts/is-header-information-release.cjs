// Scope this release to shared presentation and Safeguarding; preserve all projections.
const fs=require('fs'),cp=require('child_process');
try{
const files=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');
const allowed=/^(?:[^/]+\.html|(?:news|pews-news)\/[^/]+\.html|(?:site|public-header|header-search|build-content-pages|build-typography-preview|build-search-index)\.js|(?:header-navigation|safeguarding|policies|home-critical)\.css|(?:content-pages|home-style-sources|search-index)\.json|sitemap\.xml|build-policy-sitemap\.cjs|test\/(?:[^/]+\.test\.cjs|helpers\/header-information-snapshot\.cjs|fixtures\/header-information-approved\.json)|scripts\/(?:check-header-information|is-header-information-release)\.cjs|docs\/header-information\.md|\.github\/workflows\/build-content\.yml)$/;
if(!files.includes('site.js')||files.some(f=>!allowed.test(f)))process.exit(1);
const a=JSON.parse(cp.execFileSync('git',['show',process.env.BEFORE_SHA+':content-pages.json'],{encoding:'utf8'})),b=JSON.parse(fs.readFileSync('content-pages.json'));
for(const x of[a,b])x.pages=x.pages.filter(p=>p.slug!=='safeguarding');
process.exit(JSON.stringify(a)===JSON.stringify(b)?0:1);
}catch{process.exit(1);}
