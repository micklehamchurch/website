// Reverse only the authorised semantic wrapper/CTA changes for older preservation tests.
module.exports=html=>html.replace(/<a class="home-involvement-card" ([^>]+)>([\s\S]*?)<\/a>/g,(_,attrs,inside)=>{
 const original=attrs.replace(/ aria-labelledby="[^"]+"/,'');
 inside=inside.replace(/<h3 id="home-involvement-(?:eco|giving|diocese)-title">/,'<h3>').replace(/<span class="home-involvement-cta">([\s\S]*)<\/span><\/div>$/,(_,cta)=>'<a '+original+'>'+cta+'</a></div>');
 return'<article class="home-involvement-card">'+inside+'</article>';
});
