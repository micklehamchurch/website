// Responsive presentation only: never regenerate calendar, content or photographs.
const fs=require('node:fs');
try{const files=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');const allowed=/^(?:header-navigation\.css|site\.js|home-(?:critical\.css|style-sources\.json)|index\.html|test\/.*|scripts\/is-landscape-header-release\.cjs|docs\/landscape-header\.md|\.github\/workflows\/build-content\.yml)$/;process.exit(files.includes('header-navigation.css')&&files.every(f=>allowed.test(f))?0:1);}catch{process.exit(1);}
