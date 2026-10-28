(() => {
  'use strict';
  const queue=window.churchPhotoUploadQueue;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let root,snapshot,edit=null,pending=[],dirty=false,busy=false,locked=false,message='',progress=null,dragged=null,loadGeneration=0;
  const api=()=>window.churchPhotoAlbumsApi;
  const imageUrl=p=>{
    if(p.preview)return p.preview;if(!p.variants)return '';
    const src=p.variants[0].src;
    // Match Historical Archive: new derivatives are readable at the saved immutable
    // GitHub commit immediately, while Pages is still deploying that commit.
    if(/^assets\/images\/albums\/[a-z0-9-]+\/photo-[a-f0-9-]{36}-(?:480|960|1600)\.webp$/.test(src)&&/^[a-f0-9]{40}$/.test(snapshot?.headSha))return `https://raw.githubusercontent.com/micklehamchurch/website/${snapshot.headSha}/${src}`;
    return new URL('../'+src,location.href).href;
  };
  const status=a=>(a.status||'published');
  function notice(text){message=text;const el=root?.querySelector('[data-photo-message]');if(el)el.textContent=text;}
  function release(){for(const p of pending)URL.revokeObjectURL(p.preview);pending=[];}
  function discard(){release();edit=null;dirty=false;locked=false;}
  function photoItem(p,index){return `<li class="photo-admin-item" data-photo-id="${escape(p.id)}"><p class="photo-admin-drag-handle" draggable="${!busy}">↕ Drag to reorder</p>${imageUrl(p)?`<img draggable="false" src="${escape(imageUrl(p))}" alt="${escape(p.alt)}" loading="lazy" width="320" height="180">`:`<p>Preview unavailable · check the file format</p>`}<p><strong>Photograph ${index+1}</strong>${p.preview?' · New upload':''}</p><label><input type="radio" name="cover" value="${escape(p.id)}" ${edit.cover===p.id?'checked':''} ${busy?'disabled':''}> Album cover</label><label for="photo-alt-${index}">Image description (accessibility)</label><input id="photo-alt-${index}" data-photo-field="alt" data-id="${escape(p.id)}" value="${escape(p.alt)}" maxlength="300" required ${busy?'disabled':''}><label for="photo-caption-${index}">Caption (optional)</label><input id="photo-caption-${index}" data-photo-field="caption" data-id="${escape(p.id)}" value="${escape(p.caption)}" maxlength="300" ${busy?'disabled':''}><div class="photo-admin-controls"><button type="button" class="admin-button secondary" data-photo-move="${escape(p.id)}" data-direction="-1" ${index===0||busy?'disabled':''} aria-label="Move photograph ${index+1} earlier">↑ Earlier</button><button type="button" class="admin-button secondary" data-photo-move="${escape(p.id)}" data-direction="1" ${index===edit.photos.length-1||busy?'disabled':''} aria-label="Move photograph ${index+1} later">↓ Later</button><button type="button" class="admin-button secondary" data-photo-remove="${escape(p.id)}" ${busy?'disabled':''}>Remove<span class="parish-sr-only"> photograph ${index+1}</span></button></div></li>`;}
  function render(){
    if(!root?.isConnected||location.hash!=='#gallery')return;
    const toolbar=`<div class="photo-admin-toolbar"><button type="button" class="admin-button" data-photo-new ${!snapshot||busy||locked?'disabled':''}>Create album</button><button type="button" class="admin-button secondary" data-photo-reload ${busy?'disabled':''}>Reload shared albums</button><a class="admin-button secondary" href="../gallery.html" target="_blank" rel="noopener">View Parish Photographs ↗</a></div>`;
    let content='';
    if(edit){content=`<form class="photo-admin-form" data-photo-form><div class="photo-admin-actions"><button class="admin-button secondary" type="button" data-photo-back ${busy?'disabled':''}>← All albums</button><span class="photo-admin-status ${status(edit)==='draft'?'is-draft':''}">${status(edit)==='draft'?'Draft':'Published'}</span></div><h2>${escape(edit.id?'Edit album':'Create album')}</h2><label for="photo-album-title">Album title</label><input id="photo-album-title" name="title" value="${escape(edit.title)}" required maxlength="150" ${busy?'disabled':''}><label for="photo-album-description">Short description</label><textarea id="photo-album-description" name="context" maxlength="500" rows="3" ${busy?'disabled':''}>${escape(edit.context)}</textarea><section class="photo-admin-upload"><label for="photo-upload">Add photographs</label><input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple ${busy||locked?'disabled':''}><p>Maximum 20 photos · 200 MB total. JPEG, PNG or WebP. Export HEIC/HEIF as JPEG first.</p><p>Photographs are prepared and uploaded one at a time, then optimised for the website. Orientation is corrected and device/GPS metadata is removed. Keep your originals separately.</p>${pending.length?`<p>${pending.length} photos selected · ${queue.mb(pending.reduce((n,p)=>n+p.size,0))} MB of 200 MB</p>`:''}<div data-photo-queue>${queueMarkup()}</div><progress aria-label="Photograph upload preparation and processing" ${progress===null?'hidden':''} ${typeof progress==='number'?`value="${progress}" max="100"`:''}></progress></section><p>Drag photographs to reorder, or use Earlier and Later. Choose one cover. Add descriptions yourself; people are never identified automatically.</p><ol class="photo-admin-photos">${edit.photos.map(photoItem).join('')}</ol><label class="photo-admin-consent"><input type="checkbox" name="consent" ${edit.consent?'checked':''} ${busy?'disabled':''}><span>I confirm that the church has permission and appropriate consent to publish these photographs.</span></label><div class="photo-admin-actions"><button class="admin-button secondary" type="submit" data-photo-save="draft" ${busy||locked?'disabled':''}>${status(edit)==='published'?'Unpublish / Save Draft':'Save Draft'}</button><button class="admin-button" type="submit" data-photo-save="published" ${busy||locked?'disabled':''}>${status(edit)==='published'?'Publish changes':'Publish'}</button>${edit.id?`<button type="button" class="admin-button danger" data-photo-delete ${busy||locked?'disabled':''}>Delete album…</button>`:''}</div><p>Drafts are hidden from Parish Photographs. Draft image files and gallery metadata are still in the public repository; use drafts only for photographs suitable for public storage.</p></form>`;
    }else if(snapshot){content=`<div class="photo-admin-list">${snapshot.albums.map(a=>{const cover=a.photos.find(p=>p.id===a.cover)||a.photos[0];return `<article class="photo-admin-card">${cover?`<img src="${escape(imageUrl(cover))}" alt="${escape(cover.alt)}" loading="lazy" width="320" height="180">`:'<p>No photographs yet</p>'}<span class="photo-admin-status ${status(a)==='draft'?'is-draft':''}">${status(a)==='draft'?'Draft':'Published'}</span><h2>${escape(a.title)}</h2><p>${escape(a.context)}</p><p>${a.photos.length} photographs</p><button type="button" class="admin-button secondary" data-photo-edit="${escape(a.id)}" ${busy?'disabled':''}>Edit<span class="parish-sr-only"> ${escape(a.title)}</span></button></article>`;}).join('')}</div>`;}
    root.innerHTML=`<div class="admin-page-heading"><div><p class="admin-kicker">PARISH PHOTOGRAPHS</p><h1>Photo Albums</h1><p>Create and manage church photo albums. Saved changes go to Dev and the website rebuilds afterwards.</p></div></div>${edit?'':toolbar}<p class="photo-admin-message" data-photo-message tabindex="-1" role="status" aria-live="polite">${escape(message || (busy?'Loading shared albums…':dirty?'Unsaved changes.':'Choose an album or create one.'))}</p>${edit?`<button type="button" class="admin-button secondary" data-photo-reload ${busy?'disabled':''}>Reload shared albums</button>`:''}${content}`;
    const form=root.querySelector('[data-photo-form]');if(form)form.addEventListener('submit',event=>{event.preventDefault();void save(event.submitter?.dataset.photoSave);});
  }
  async function load(){
    if(busy)return;if(dirty&&!confirm('Discard your unsaved album changes and reload?'))return;
    if(!api()){notice('Sign in and connect the Admin API to load Photo Albums.');return;}
    const generation=++loadGeneration;busy=true;message='Loading shared albums…';render();
    const result=await api().load();if(generation!==loadGeneration)return;busy=false;
    if(result.ok){discard();snapshot=result;message='Shared albums loaded from Dev.';}else message=api().message(result.category);
    render();
  }
  function open(id){if(dirty&&!confirm('Discard unsaved album changes?'))return;discard();edit=id?structuredClone(snapshot.albums.find(a=>a.id===id)):{id:null,title:'',context:'',status:'draft',cover:'',photos:[]};edit.status=status(edit);edit.consent=false;for(const p of edit.photos)if(p.caption===undefined)p.caption=p.alt;message='';render();root.querySelector('[name=title]')?.focus();}
  function queueMarkup(){
    const labels={waiting:'Waiting',optimising:'Optimising',uploading:'Uploading',complete:'Complete',failed:'Failed'};
    return `<ol class="photo-upload-queue" aria-label="Selected photograph status">${pending.map(p=>`<li><span>${escape(p.name)}</span><strong>${labels[p.state]||'Waiting'}</strong>${p.error?`<p>${escape(api()?.message(p.error)||'This photograph could not be processed.')}</p>`:''}</li>`).join('')}</ol>`;
  }
  function updateQueue(){
    const done=pending.filter(p=>['complete','failed'].includes(p.state)).length;
    const element=root.querySelector('[data-photo-queue]');if(element)element.innerHTML=queueMarkup();
    const bar=root.querySelector('progress');if(bar){bar.hidden=false;bar.max=Math.max(1,pending.length);bar.value=done;}
    notice(`${done} of ${pending.length} photographs handled. ${pending.filter(p=>p.state==='complete').length} complete.`);
  }
  async function prepare(files){
    if(busy||locked)return;const values=[...files];if(!values.length)return;
    const active=pending.filter(p=>p.state!=='complete');
    const problem=queue.validateSelection(values,active.map(p=>({size:p.size})));if(problem){notice(problem);return;}
    if(edit.photos.length+values.length>200){notice('An album can contain up to 200 photographs.');return;}
    pending=active;
    for(const file of values){
      if(pending.some(p=>p.name===file.name&&p.size===file.size&&p.file?.lastModified===file.lastModified))continue;
      const item={id:'upload:'+crypto.randomUUID(),file,name:file.name,size:file.size,state:'waiting',error:'',preview:queue.supported(file)?URL.createObjectURL(file):''};
      pending.push(item);edit.photos.push({id:item.id,alt:'Parish photograph',caption:'',preview:item.preview});
    }
    if(!edit.cover)edit.cover=edit.photos[0]?.id||'';
    dirty=true;message='Photographs queued. Add descriptions, then choose Save Draft or Publish. Keep this tab open until the queue finishes.';
    render();root.querySelector('#photo-upload')?.focus();
  }
  function payloadFor(nextStatus,item,prepared){
    const waiting=new Set(pending.filter(p=>p.state!=='complete').map(p=>p.id));
    const photos=edit.photos.filter(p=>!waiting.has(p.id)||p.id===item?.id).map(p=>({id:p.id,alt:p.alt,caption:p.caption||''}));
    const cover=photos.some(p=>p.id===edit.cover)?edit.cover:(photos[0]?.id||'');
    return {sha:snapshot.sha,headSha:snapshot.headSha,action:'save',id:edit.id,consentConfirmed:edit.consent,album:{title:edit.title,context:edit.context,status:nextStatus,cover,photos},uploads:item?[{id:item.id,fileName:prepared.fileName,mimeType:prepared.mimeType,base64:prepared.base64}]:[]};
  }
  function commitSafely(payload,item){return queue.saveSafely({api:api(),payload,item,getSnapshot:()=>snapshot,setSnapshot:value=>{snapshot=value;}});}
  async function save(nextStatus){
    if(busy||locked||!edit||!['draft','published'].includes(nextStatus))return;
    if(!api()){notice('Sign in and connect the Admin API before saving.');return;}
    if(nextStatus==='published'&&(!edit.consent||!edit.photos.length)){notice('Choose at least one photograph and confirm the church has permission and appropriate consent to publish.');root.querySelector('[name=consent]')?.focus();return;}
    if(pending.some(p=>p.state!=='complete')&&snapshot.uploadMode!=='serial-receipt-v1'){notice('The photo uploader update is still being installed. Reload shared albums in a moment before uploading.');return;}
    busy=true;progress=pending.length?0:null;message='Saving photographs one at a time. Keep this tab open until the queue finishes.';render();
    try{
      const summary=await queue.run(pending,{onChange:updateQueue,upload:async(item,prepared)=>{
        const intermediate=edit.id?status(snapshot.albums.find(a=>a.id===edit.id)):'draft';
        const result=await commitSafely(payloadFor(nextStatus==='draft'?'draft':intermediate,item,prepared),item);
        const album=result.albums.find(a=>a.id===result.albumId),photo=album?.photos.find(p=>p.id===queue.receipt(item.id));
        if(!photo)throw queue.error('album-save-unavailable');
        edit.id=album.id;edit.photos=edit.photos.map(p=>p.id===item.id?structuredClone(photo):p);if(edit.cover===item.id)edit.cover=photo.id;
        if(item.preview)URL.revokeObjectURL(item.preview);item.preview='';item.file=null;
      }});
      const stopped=pending.find(p=>['network-failure','album-save-unavailable','album-version-conflict','authentication-required','administrator-required'].includes(p.error));
      if(stopped)throw queue.error(stopped.error);
      if(edit.id||!pending.length){const result=await commitSafely(payloadFor(nextStatus),null);edit.status=result.albums.find(a=>a.id===result.albumId).status;}
      dirty=summary.failed>0||summary.remaining>0;
      if(dirty)message=`${summary.complete} photographs saved; ${summary.failed} failed. Successful photographs are safe. Remove or retry failed photographs using Save Draft or Publish again.`;
      else{edit.consent=false;message=pending.length?`${summary.complete} photographs complete. ${nextStatus==='draft'?'Draft saved':'Album published'} to Dev; the website rebuilds afterwards.`:'Album changes saved to Dev.';}
    }catch(e){
      const failure=e.category||'network-failure';dirty=true;locked=failure==='album-version-conflict';
      message=`${pending.filter(p=>p.state==='complete').length} photographs saved. ${api().message(failure)} ${locked?'':'Your remaining photographs are kept here. Retry Save Draft or Publish when the connection is ready.'}`;
    }finally{busy=false;progress=null;render();const el=root.querySelector('[data-photo-message]');el?.focus({preventScroll:true});el?.scrollIntoView({block:'nearest'});}
  }

  function move(id,to){const from=edit.photos.findIndex(p=>p.id===id);if(from<0||to<0||to>=edit.photos.length||from===to)return;const [photo]=edit.photos.splice(from,1);edit.photos.splice(to,0,photo);dirty=true;message=`Photograph moved to position ${to+1}. Save to keep this order.`;render();root.querySelector(`[data-photo-id="${CSS.escape(id)}"] [data-photo-move]:not([disabled])`)?.focus();}
  function remove(id){if(!confirm('Remove this photograph from the album? Save to apply the removal.'))return;const index=edit.photos.findIndex(p=>p.id===id);edit.photos=edit.photos.filter(p=>p.id!==id);const upload=pending.find(p=>p.id===id||queue.receipt(p.id)===id);if(upload)URL.revokeObjectURL(upload.preview);pending=pending.filter(p=>p!==upload);if(edit.cover===id)edit.cover=edit.photos[0]?.id||'';dirty=true;message='Photograph removal staged. Save Draft or Publish to apply it.';render();(root.querySelectorAll('.photo-admin-item')[Math.min(index,edit.photos.length-1)]?.querySelector('button')||root.querySelector('#photo-upload'))?.focus();}
  const dialog=document.createElement('dialog');dialog.className='photo-admin-delete-dialog';dialog.setAttribute('aria-labelledby','photo-delete-title');document.body.append(dialog);let deleteFocus;
  function deletion(){
    deleteFocus=root.querySelector('[data-photo-delete]');const stored=snapshot.albums.find(a=>a.id===edit.id);
    dialog.innerHTML=`<h2 id="photo-delete-title">Delete album?</h2><p>This removes “${escape(stored.title)}” and its photographs from Parish Photographs. This action cannot be undone in the dashboard.</p><p>Type the saved title exactly: <strong>${escape(stored.title)}</strong></p><form><label for="photo-delete-confirm">Album title</label><input id="photo-delete-confirm" name="confirmTitle" autocomplete="off" required><p role="alert" data-photo-delete-error></p><div class="photo-admin-actions"><button type="button" class="admin-button secondary" data-photo-delete-cancel>Cancel</button><button class="admin-button danger" type="submit">Permanently delete album</button></div></form>`;
    dialog.querySelector('[data-photo-delete-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const confirmTitle=dialog.querySelector('input').value;if(confirmTitle!==stored.title){dialog.querySelector('[data-photo-delete-error]').textContent='Type the album title exactly.';return;}busy=true;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=true);const result=await api().save({sha:snapshot.sha,headSha:snapshot.headSha,action:'delete',id:edit.id,confirmTitle});busy=false;if(result.ok){discard();snapshot=result;message='Album deleted from Dev. Parish Photographs will update after the rebuild.';dialog.close();render();root.querySelector('[data-photo-new]')?.focus();}else{dialog.querySelector('[data-photo-delete-error]').textContent=api().message(result.category);dialog.querySelectorAll('button,input').forEach(e=>e.disabled=false);locked=['album-version-conflict','network-failure','album-save-unavailable'].includes(result.category);}};
    dialog.showModal();dialog.querySelector('input').focus();
  }
  dialog.addEventListener('close',()=>{if(deleteFocus?.isConnected)deleteFocus.focus();else root?.querySelector('[data-photo-new]')?.focus();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('click',event=>{if(event.target===dialog&&!busy){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  document.addEventListener('input',event=>{if(!edit||busy||!root?.contains(event.target))return;const e=event.target;if(['title','context'].includes(e.name))edit[e.name]=e.value;else if(e.dataset.photoField){const p=edit.photos.find(p=>p.id===e.dataset.id);if(p)p[e.dataset.photoField]=e.value;}else return;dirty=true;});
  document.addEventListener('change',event=>{if(!edit||busy||!root?.contains(event.target))return;const e=event.target;if(e.id==='photo-upload')void prepare(e.files);else if(e.name==='cover'){edit.cover=e.value;dirty=true;notice('Cover selected. Save to apply it.');}else if(e.name==='consent')edit.consent=e.checked;});
  document.addEventListener('click',event=>{
    if(!root?.contains(event.target))return;const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.hasAttribute('data-photo-new'))open();else if(b.hasAttribute('data-photo-edit'))open(b.dataset.photoEdit);else if(b.hasAttribute('data-photo-reload'))void load();else if(b.hasAttribute('data-photo-back')){if(!dirty||confirm('Discard unsaved album changes?')){discard();message='';render();root.querySelector('[data-photo-new]')?.focus();}}else if(b.hasAttribute('data-photo-move'))move(b.dataset.photoMove,edit.photos.findIndex(p=>p.id===b.dataset.photoMove)+Number(b.dataset.direction));else if(b.hasAttribute('data-photo-remove'))remove(b.dataset.photoRemove);else if(b.hasAttribute('data-photo-delete'))deletion();
  });
  document.addEventListener('dragstart',event=>{const item=event.target.closest?.('[data-photo-id]');if(!item||!root?.contains(item)||busy||event.target.matches('input,button'))return;dragged=item.dataset.photoId;event.dataTransfer.setData('text/plain',dragged);event.dataTransfer.effectAllowed='move';item.classList.add('is-dragging');});
  document.addEventListener('dragover',event=>{const item=event.target.closest?.('[data-photo-id]');if(item&&dragged&&root?.contains(item)){event.preventDefault();item.classList.add('is-drop-target');}});
  document.addEventListener('dragleave',event=>event.target.closest?.('[data-photo-id]')?.classList.remove('is-drop-target'));
  document.addEventListener('drop',event=>{const item=event.target.closest?.('[data-photo-id]');if(item&&dragged&&root?.contains(item)){event.preventDefault();move(dragged,edit.photos.findIndex(p=>p.id===item.dataset.photoId));dragged=null;}});
  document.addEventListener('dragend',()=>{dragged=null;root?.querySelectorAll('.is-dragging,.is-drop-target').forEach(e=>e.classList.remove('is-dragging','is-drop-target'));});
  document.addEventListener('click',event=>{const link=event.target.closest('a,button[data-view]');if(!edit||!link||root?.contains(link)||link.dataset.view==='gallery')return;if(busy){event.preventDefault();event.stopImmediatePropagation();notice('Please wait for the album request to finish.');return;}if(dirty){if(!confirm('Leave Photo Albums and discard unsaved changes?')){event.preventDefault();event.stopImmediatePropagation();document.querySelector('.admin-sidebar')?.classList.remove('is-open');const menu=document.querySelector('.admin-mobile-menu');menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Open administration menu');}else discard();}},true);
  window.addEventListener('hashchange',()=>{if(location.hash!=='#gallery'&&edit){if(busy || (dirty&&!confirm('Leave Photo Albums and discard unsaved changes?'))){history.replaceState(null,'','#gallery');render();}else discard();}});
  window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
  window.addEventListener('admin-photo-albums-ready',()=>{if(location.hash==='#gallery'&&!dirty)void load();});
  window.churchPhotoAlbumsAdmin=Object.freeze({mount(target){root=target;render();if(!snapshot&&!busy)void load();}});
})();
