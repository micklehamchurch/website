// Public HTML inventory already used by Search; no private/admin destinations.
const fs=require('fs'),path=require('path');
const pages=JSON.parse(fs.readFileSync(path.join(__dirname,'search-index.json'),'utf8'));
fs.writeFileSync(path.join(__dirname,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>'<url><loc>https://micklehamchurch.github.io/website/'+p.url.replace(/&/g,'&amp;')+'</loc></url>').join('\n')+'\n</urlset>\n');
