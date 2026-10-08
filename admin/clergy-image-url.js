(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.churchClergyImageURL=factory();})(globalThis,()=>{
  // Admin reads the saved repository before Pages finishes deploying it. Use
  // that immutable commit for uploaded derivatives, never private originals.
  return function imageURL(src,headSha){
    if(/^assets\/images\/clergy\/uploads\/[a-f0-9-]+-(1600|360)\.jpg$/.test(src)&&/^[a-f0-9]{40}$/.test(headSha)){
      return `https://raw.githubusercontent.com/micklehamchurch/website/${headSha}/${src}`;
    }
    if(/^assets\/images\/clergy\/(?:uploads\/)?[a-zA-Z0-9-]+\.jpg$/.test(src))return '../'+src;
    return '';
  };
});
