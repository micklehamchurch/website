// The independently tested compact-card redesign is the sole authorised body change.
module.exports=s=>require('./approved-involvement-links.cjs')(require('./approved-giving-restoration.cjs')(s)).replace(/<div class="home-quick-links">[\s\S]*?<\/div><\/div>/,'APPROVED_QUICK_LINKS').replace(/home-critical\.css\?v=[^" ]+/g,'home-critical.css?v=VERSION');
