(function(root){
  'use strict';
  function validate(data){
    if(data?.version!==1||data.translation!=='niv'||!Array.isArray(data.moments)||!data.moments.length||data.moments.length>20)throw Error('Invalid moments');
    const ids=new Set();
    for(const m of data.moments){
      if(!/^[a-z-]+$/.test(m.id)||ids.has(m.id)||!m.title||!m.reflection||m.reflection.length>500||!/^([A-Z0-9]{3})\.[1-9]\d{0,2}\.[1-9]\d{0,2}$/.test(m.passage))throw Error('Invalid moment');ids.add(m.id);
      if(!m.photo?.alt||!Array.isArray(m.photo.sources)||!m.photo.sources.length||m.photo.sources.some(s=>!/^assets\/[a-zA-Z0-9/_-]+\.(webp|jpg)$/.test(s.src)||!Number.isInteger(s.width)||s.width<1))throw Error('Invalid photo');
      if(m.excerpt&&!['first-clause','first-sentence'].includes(m.excerpt))throw Error('Invalid excerpt');
    }
    // Audio is intentionally absent until an approved parish recording is supplied.
    return data;
  }
  function scripture(response,moment){
    const d=response?.data;
    if(!d||d.id!==moment.passage||typeof d.content!=='string'||!d.copyright||typeof response.meta?.fumsToken!=='string'||!response.meta.fumsToken)throw Error('Missing Scripture attribution');
    let text=d.content.replace(/^[\s\S]*?\[\d+\]\s*/,'').replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim();
    if(!text||text.length>2000)throw Error('Invalid Scripture');
    if(moment.excerpt==='first-clause'){
      const end=text.indexOf(';');if(end<0)throw Error('Excerpt boundary unavailable');
      text=text.slice(0,end).replace(/^He says,\s*/,'').replace(/^[‘“]/,'');
    }else if(moment.excerpt==='first-sentence'){
      const end=text.indexOf('.');if(end<0)throw Error('Excerpt boundary unavailable');text=text.slice(0,end+1);
    }
    return {text,reference:d.reference,fullCopyright:d.copyright,token:response.meta.fumsToken,excerpt:!!moment.excerpt};
  }
  function adjacent(index,delta,count){return (index+delta+count)%count;}
  const api={validate,scripture,adjacent};if(typeof module==='object'&&module.exports)module.exports=api;else root.PeaceModel=api;
})(typeof window==='undefined'?globalThis:window);
