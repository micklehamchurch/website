(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.churchClergyStatus=factory();})(globalThis,()=>{
  function status(record,committed){
    const changed=!committed||JSON.stringify(record)!==JSON.stringify(committed);
    if(!committed)return record.published?'Unpublished — marked for publication':'Draft — not saved to Dev';
    if(committed.published){
      if(!record.published)return 'Published on Dev — unpublish pending';
      return changed?'Published on Dev — unpublished edits':'Published on Dev';
    }
    if(record.published)return 'Draft on Dev — publication pending';
    return changed?'Draft on Dev — unsaved edits':'Draft on Dev';
  }
  function toggleLabel(record,committed){
    if(record.published)return committed?.published?'Unpublish':'Cancel publication';
    return committed?.published?'Keep published':'Mark for publication';
  }
  return Object.freeze({status,toggleLabel});
});
