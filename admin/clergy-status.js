(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.churchClergyStatus=factory();})(globalThis,()=>{
  function status(record,committed){
    return committed?.published?'Published':'Draft';
  }
  function pending(record,committed){
    if(committed?.published&&!record.published)return 'Will be unpublished';
    if(!committed?.published&&record.published)return 'Ready to publish';
    if(!committed||JSON.stringify(record)!==JSON.stringify(committed))return record.published?'Changes not published':'Draft not saved';
    return '';
  }
  function toggleLabel(record,committed){
    if(record.published)return committed?.published?'Unpublish':'Undo';
    return committed?.published?'Keep published':'Ready to publish';
  }
  function changeCount(working,committed){
    return working.records.filter(r=>!committed.records.some(old=>old.id===r.id&&JSON.stringify(old)===JSON.stringify(r))).length;
  }
  function draftArchive(working,committed){
    const next=structuredClone(working);
    next.records=committed.records.filter(r=>r.published).map(r=>structuredClone(r)).concat(working.records.filter(r=>!r.published&&!committed.records.some(old=>old.id===r.id&&old.published)).map(r=>structuredClone(r)));
    for(const old of committed.records.filter(r=>!r.published))if(!next.records.some(r=>r.id===old.id))next.records.push(structuredClone(old));
    return next;
  }
  return Object.freeze({status,pending,toggleLabel,changeCount,draftArchive});
});
