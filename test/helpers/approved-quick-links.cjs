// The independently tested compact-card redesign is the sole authorised body change.
module.exports=s=>s.replace(/<div class="home-quick-links">[\s\S]*?<\/div><\/div>/,'APPROVED_QUICK_LINKS').replace(/home-critical\.css\?v=[^" ]+/g,'home-critical.css?v=VERSION');
