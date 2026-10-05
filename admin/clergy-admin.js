(() => {
  'use strict';
  const renderer=window.churchClergyRender,esc=renderer.esc,copy=value=>structuredClone(value);
  let host,shared=null,working=null,busy=false,message='',editor=null,opener=null,editorDirty=false,needsReload=false;
  const uploads=new Map();
  const dialog=document.createElement('dialog');dialog.id='archive-admin-dialog';dialog.className='admin-dialog';dialog.setAttribute('aria-labelledby','archive-editor-title');document.body.append(dialog);
  const imageDialog=document.createElement('dialog');imageDialog.className='clergy-image-dialog';imageDialog.setAttribute('aria-labelledby','archive-preview-image-title');document.body.append(imageDialog);
  let previewRecord=null,imageIndex=0,imageOpener=null;
  function renderPreviewImage(){const image=previewRecord.archiveImages[imageIndex];imageDialog.innerHTML=`<button type="button" class="clergy-close" data-preview-image-close aria-label="Close archive photograph">Close ×</button><h2 id="archive-preview-image-title">From the archive</h2><figure><img src="${esc(image.src)}" alt="${esc(image.alt)}"><figcaption>${esc(image.caption)}</figcaption></figure>${previewRecord.archiveImages.length>1?`<div class="clergy-gallery-controls"><button type="button" class="btn btn-outline-green" data-preview-image-previous>← Previous</button><p aria-live="polite">${imageIndex+1} / ${previewRecord.archiveImages.length}</p><button type="button" class="btn btn-outline-green" data-preview-image-next>Next →</button></div>`:''}`;}
  imageDialog.addEventListener('click',event=>{if(event.target.closest('[data-preview-image-close]'))imageDialog.close();if(event.target.closest('[data-preview-image-previous]')){imageIndex=(imageIndex-1+previewRecord.archiveImages.length)%previewRecord.archiveImages.length;renderPreviewImage();imageDialog.querySelector('[data-preview-image-previous]')?.focus();}if(event.target.closest('[data-preview-image-next]')){imageIndex=(imageIndex+1)%previewRecord.archiveImages.length;renderPreviewImage();imageDialog.querySelector('[data-preview-image-next]')?.focus();}});
  imageDialog.addEventListener('close',()=>imageOpener?.focus());
  const button=(text,action,extra='')=>`<button type="button" class="admin-button secondary" data-archive-action="${action}" ${extra}>${text}</button>`;
  const field=(label,name,value='',type='text',wide=false)=>`<label class="${wide?'wide':''}" for="archive-${name}">${esc(label)}${type==='textarea'?`<textarea id="archive-${name}" name="${name}" rows="5">${esc(value)}</textarea>`:`<input id="archive-${name}" name="${name}" type="${type}" value="${esc(value)}" ${['displayName','role'].includes(name)?'required maxlength="200"':''}>`}</label>`;
  const changed=()=>working&&shared&&JSON.stringify(working)!==JSON.stringify(shared.archive);
  const imageURL=image=>image.src.startsWith('upload:')?uploads.get(image.src.slice(7))?.url:'../'+image.src;
  function clearUploads(){for(const u of uploads.values())URL.revokeObjectURL(u.url);uploads.clear();}
  function referencedUploads(archive){return new Set(archive.records.flatMap(r=>[r.primaryImage,...r.archiveImages].filter(Boolean)).filter(i=>i.src.startsWith('upload:')).map(i=>i.src.slice(7)));}
  function pruneUploads(){const referenced=referencedUploads(working);for(const [id,u] of uploads)if(!referenced.has(id)){URL.revokeObjectURL(u.url);uploads.delete(id);}}
  function render(){
    if(!host||location.hash!=='#archive')return;
    const disabled=busy?'disabled':'';
    host.innerHTML=`<section><p class="admin-kicker">SHARED DEV CONTENT</p><h1>Historical Archive</h1><p>Manage clergy profiles, biographies and historical photographs.</p><p class="archive-admin-status" role="status">${esc(message||(!working?'Load the shared archive using your authorised Admin API connection.':changed()?'Unpublished changes — staged in this browser. Draft records remain hidden when saved to Dev.':'Shared archive loaded. No unpublished changes.'))}${working?.updatedAt?`<br>Last saved: ${esc(working.updatedAt)}`:''}</p><div class="archive-admin-actions">${button('Reload shared archive','reload',disabled)}${working?button('+ Add clergy record','add',disabled)+button('Save drafts to Dev','save-drafts',!changed()||busy||needsReload?'disabled':'')+button('Publish changes to Dev','publish',!changed()||busy||needsReload?'disabled':''):''}</div><p class="archive-editor-note">Save changes stages edits here; Preview shows the current profile. Save drafts to Dev stores hidden draft records. Publish changes explicitly commits all staged edits, including unpublishing, to Dev. GitHub Actions then rebuilds the public archive and search.</p>${working?`<ol class="archive-admin-list">${[...working.records].sort((a,b)=>Math.min(...a.servicePeriods.map(p=>p.start))-Math.min(...b.servicePeriods.map(p=>p.start))).map(r=>`<li class="archive-admin-row">${r.primaryImage?`<img src="${esc(imageURL(r.primaryImage))}" alt="${esc(r.primaryImage.alt)}">`:'<span aria-label="No portrait">▧</span>'}<div><h2>${esc(r.displayName)}</h2><p>${esc(r.role)} · ${esc(renderer.dates(r))}</p><p>${r.published?'Published':'Draft / unpublished'}</p></div>${button('Edit','edit',`data-id="${esc(r.id)}" ${disabled}`)}${button('Preview','preview',`data-id="${esc(r.id)}" ${disabled}`)}${r.published?button('Unpublish','unpublish',`data-id="${esc(r.id)}" ${disabled}`):button('Mark for publication','mark-published',`data-id="${esc(r.id)}" ${disabled}`)}</li>`).join('')}</ol>`:''}</section>`;
  }
  async function load(force=false){
    if(busy)return;if(force&&changed()&&!window.confirm('Discard the staged archive changes and reload the shared version?'))return;
    if(!window.churchClergyApi){message='Sign in and authorise the Admin API connection before loading.';render();return;}
    busy=true;message='Loading shared archive…';render();
    const result=await window.churchClergyApi.load();busy=false;
    if(result.ok){shared=result;working=copy(result.archive);clearUploads();needsReload=false;message='';}else {message=window.churchClergyApi.message(result.category);needsReload=['archive-version-conflict','network-failure','archive-publish-unavailable'].includes(result.category);}
    render();
  }
  function show(content,trigger){opener=trigger||document.activeElement;dialog.innerHTML=content;dialog.showModal();dialog.querySelector('button,input')?.focus();}
  function close(){dialog.close();editor=null;editorDirty=false;pruneUploads();opener?.focus();}
  function periods(){return editor.servicePeriods.map((p,i)=>`<div class="archive-period">${field('Start year',`start-${i}`,p.start,'number')}${field('End year (blank if unknown / open)',`end-${i}`,p.end??'','number')}${button('Remove period','remove-period',`data-index="${i}" ${editor.servicePeriods.length===1?'disabled':''}`)}</div>`).join('');}
  function imageFields(image,index){const prefix=index===-1?'primary':`image-${index}`;return `<div class="archive-image-editor"><h3>${index===-1?'Primary portrait':`Archive photograph ${index+1}`}</h3><img src="${esc(imageURL(image))}" alt="${esc(image.alt)}"><p class="archive-editor-note">Original: ${esc(image.originalFilename)} · originals are retained.</p><div class="archive-image-fields">${['alt','caption','date','source','credit','copyrightPermission'].map(k=>field(({alt:'Alt text',caption:'Caption',date:'Date or approximate date',source:'Source',credit:'Photographer / credit',copyrightPermission:'Copyright / permission notes (internal)'})[k],`${prefix}-${k}`,image[k]??'','text',k==='caption'||k==='alt')).join('')}</div><div class="archive-admin-actions">${index===-1?button('Remove portrait from display','remove-primary'):button('Use as primary portrait','use-primary',`data-index="${index}"`)+button('Move up','move-up',`data-index="${index}" ${index===0?'disabled':''}`)+button('Move down','move-down',`data-index="${index}" ${index===editor.archiveImages.length-1?'disabled':''}`)+button('Remove from gallery','remove-image',`data-index="${index}"`)}</div></div>`;}
  function editorHTML(error=''){return `<h2 id="archive-editor-title">${esc(editor.displayName||'Add clergy record')}</h2><p class="archive-editor-note">Historical information should be verified before publication. If a date or detail is uncertain, leave it blank or record the uncertainty in the research notes.</p><p role="alert" class="archive-editor-error">${esc(error)}</p><form id="archive-editor-form"><div class="archive-editor-grid">${field('Display name (including title / qualifications)','displayName',editor.displayName)}${field('Role','role',editor.role)}<fieldset class="wide"><legend>Service periods</legend>${periods()}${button('+ Add service period','add-period')}</fieldset>${field('Their story (blank line between paragraphs)','biography',editor.biography.join('\n\n'),'textarea',true)}${field('St Michael’s in their time','parishContext',editor.parishContext.join('\n\n'),'textarea',true)}${field('Did you know?','didYouKnow',editor.didYouKnow.join('\n\n'),'textarea',true)}${field('Internal research notes — never shown publicly','internalNotes',editor.internalNotes,'textarea',true)}${field('Internal sources (one per line)','sources',editor.sources.join('\n'),'textarea',true)}<label class="wide"><span><input type="checkbox" name="published" ${editor.published?'checked':''}> Include in public archive after Publish changes</span></label></div>${editor.primaryImage?imageFields(editor.primaryImage,-1):'<p>No primary portrait. A photograph is optional.</p>'}<label for="archive-primary-upload">${editor.primaryImage?'Replace primary portrait':'Add primary portrait'}</label><input id="archive-primary-upload" type="file" data-upload="primary" accept="image/jpeg,image/png,image/webp"><h3>Additional archive photographs</h3>${editor.archiveImages.map((i,n)=>imageFields(i,n)).join('')}<label for="archive-gallery-upload">+ Add archive photograph</label><input id="archive-gallery-upload" type="file" data-upload="gallery" accept="image/jpeg,image/png,image/webp"><p class="archive-editor-note">JPEG, PNG or WebP. Up to 10 MiB each, six uploads and 20 MiB total per publication. Originals are preserved; device metadata is removed from public web versions.</p><div class="archive-admin-actions"><button type="submit" class="admin-button">Save changes</button>${button('Save draft','stage-draft')}${button('Preview current edits','preview-editor')}${button('Cancel','cancel')}</div></form>`;}
  function readEditor(validate=true){
    const form=dialog.querySelector('form');if(!form)return true;
    if(validate&&!form.reportValidity())return false;
    const values=new FormData(form),paragraphs=value=>String(value||'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    editor.displayName=String(values.get('displayName')||'').trim();editor.role=String(values.get('role')||'').trim();editor.internalNotes=String(values.get('internalNotes')||'');editor.published=values.has('published');
    for(const k of ['biography','parishContext','didYouKnow'])editor[k]=paragraphs(values.get(k));editor.sources=String(values.get('sources')||'').split('\n').map(s=>s.trim()).filter(Boolean);
    editor.servicePeriods=editor.servicePeriods.map((_,i)=>({start:Number(values.get(`start-${i}`)),end:String(values.get(`end-${i}`)).trim()===''?null:Number(values.get(`end-${i}`))}));
    if(validate&&editor.servicePeriods.some(p=>!Number.isInteger(p.start)||p.start<1||p.start>9999||(p.end!==null&&(!Number.isInteger(p.end)||p.end<p.start||p.end>9999)))){dialog.querySelector('[role=alert]').textContent='Enter a valid start year and an end year no earlier than the start. Leave unknown end years blank.';return false;}
    for(const [image,prefix] of [[editor.primaryImage,'primary'],...editor.archiveImages.map((i,n)=>[i,`image-${n}`])])if(image)for(const k of ['alt','caption','date','source','credit','copyrightPermission']){const value=String(values.get(`${prefix}-${k}`)||'').trim();image[k]=['date','credit','copyrightPermission'].includes(k)&&!value?null:value;}
    if(validate&&editor.published&&[editor.primaryImage,...editor.archiveImages].filter(Boolean).some(i=>!i.alt.trim())){dialog.querySelector('[role=alert]').textContent='Add meaningful alt text for each publicly displayed photograph, or save the record as a draft.';return false;}
    return true;
  }
  function edit(id,trigger){
    editor=id?copy(working.records.find(r=>r.id===id)):{id:`clergy-${crypto.randomUUID()}`,displayName:'',role:'Rector',servicePeriods:[{start:'',end:null}],primaryImage:null,archiveImages:[],biography:[],parishContext:[],didYouKnow:[],published:false,internalNotes:'',sources:[]};
    editorDirty=false;show(editorHTML(),trigger);
  }
  function stage(draft=false){if(draft)dialog.querySelector('[name="published"]').checked=false;if(!readEditor())return;if(draft&&shared.archive.records.some(r=>r.id===editor.id&&r.published)&&!confirm('Saving this record as a draft stages unpublishing. Publish changes is required to remove it from public display. Continue?'))return;if(draft)editor.published=false;const index=working.records.findIndex(r=>r.id===editor.id);if(index<0)working.records.push(copy(editor));else working.records[index]=copy(editor);message='Unpublished changes — saved in this browser. Preview, then save drafts or publish to Dev.';const savedId=editor.id;close();render();host.querySelector(`[data-archive-action="edit"][data-id="${savedId}"]`)?.focus();}
  function preview(record,fromEditor=false,trigger){
    const publicRecord=copy(record);for(const image of [publicRecord.primaryImage,...publicRecord.archiveImages].filter(Boolean)){image.thumbnail=imageURL(image);image.src=imageURL(image);}
    previewRecord=publicRecord;
    const content=`<h2 id="archive-editor-title">Profile preview · ${esc(record.displayName)}</h2><p>${record.published?'Will be publicly visible after publishing.':'Draft — excluded from the public archive and search.'}</p><div class="archive-preview">${renderer.profile(publicRecord).replace('<details','<details open')}</div><div class="archive-admin-actions">${button(fromEditor?'Back to editor':'Close preview',fromEditor?'back-editor':'close-preview')}</div>`;
    if(fromEditor)dialog.innerHTML=content;else show(content,trigger);
    dialog.querySelector('button')?.focus();
  }
  async function upload(input){
    const file=input.files?.[0];if(!file)return;const uploadingEditor=editor;
    readEditor(false);editorDirty=true;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||! /\.(jpe?g|png|webp)$/i.test(file.name)||file.size>10*1024*1024){dialog.innerHTML=editorHTML('Choose a JPEG, PNG or WebP image no larger than 10 MiB.');return;}
    const referenced=new Set([...referencedUploads(working),...[editor.primaryImage,...editor.archiveImages].filter(Boolean).filter(i=>i.src.startsWith('upload:')).map(i=>i.src.slice(7))]);
    const total=[...referenced].reduce((n,id)=>n+(uploads.get(id)?.file.size||0),0);
    if(referenced.size>=6||total+file.size>20*1024*1024){dialog.innerHTML=editorHTML('Save the current upload batch first: maximum six images and 20 MiB total.');return;}
    const id=crypto.randomUUID(),url=URL.createObjectURL(file);
    try{const img=new Image();img.src=url;await img.decode();if(img.naturalWidth*img.naturalHeight>40000000)throw new Error();}catch{URL.revokeObjectURL(url);dialog.innerHTML=editorHTML('This image could not be decoded safely. Choose a supported photograph.');return;}
    if(editor!==uploadingEditor||!dialog.open){URL.revokeObjectURL(url);return;}
    uploads.set(id,{file,url});const image={src:`upload:${id}`,thumbnail:`upload:${id}`,alt:'',caption:'',date:null,source:'',credit:null,copyrightPermission:null,originalFilename:file.name,derivativeCreated:true};
    if(input.dataset.upload==='primary')editor.primaryImage=image;else editor.archiveImages.push(image);
    dialog.innerHTML=editorHTML();dialog.querySelector(`[name="${input.dataset.upload==='primary'?'primary':`image-${editor.archiveImages.length-1}`}-alt"]`)?.focus();
  }
  const base64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
  async function publish(draftsOnly=false){
    if(busy||needsReload||!changed())return;
    const next=copy(working);
    if(draftsOnly){
      // Store hidden drafts, retaining the shared public records exactly as loaded.
      next.records=shared.archive.records.filter(r=>r.published).map(copy).concat(working.records.filter(r=>!r.published&&!shared.archive.records.some(old=>old.id===r.id&&old.published)).map(copy));
      for(const old of shared.archive.records.filter(r=>!r.published))if(!next.records.some(r=>r.id===old.id))next.records.push(copy(old));
      if(JSON.stringify(next)===JSON.stringify(shared.archive)){message='No draft changes to save. Use Publish changes for public edits or unpublishing.';render();return;}
    }
    if(!window.confirm(draftsOnly?'Save hidden draft records to Dev? Published profiles will remain unchanged.':'Publish all staged archive changes to Dev? Draft records remain hidden; unpublished profiles leave the public archive.'))return;
    busy=true;message=draftsOnly?'Saving hidden drafts…':'Publishing archive changes…';render();
    const before=copy(working);
    try{
      const ids=referencedUploads(next),pending=[];
      for(const id of ids){const value=uploads.get(id);pending.push({id,fileName:value.file.name,mimeType:value.file.type,base64:await base64(value.file)});}
      const result=await window.churchClergyApi.publish({sha:shared.sha,headSha:shared.headSha,archive:next,uploads:pending});
      if(result.ok){shared=result;working=copy(result.archive);
        if(draftsOnly){for(const r of before.records){const old=next.records.find(n=>n.id===r.id);if(!old||JSON.stringify(old)!==JSON.stringify(r)){const index=working.records.findIndex(n=>n.id===r.id);if(index<0)working.records.push(r);else working.records[index]=r;}}}
        pruneUploads();message=`${draftsOnly?'Drafts saved':'Changes published'} to Dev. The website is rebuilding. Commit ${result.commitSha.slice(0,7)}.${changed()?' Other unpublished changes remain staged.':''}`;
      }else {message=window.churchClergyApi.message(result.category);needsReload=['archive-version-conflict','network-failure','archive-publish-unavailable'].includes(result.category);}
    }catch{needsReload=true;message='Saving could not be confirmed. Reload shared content before retrying.';}finally{busy=false;render();}
  }
  function listAction(event){const target=event.target.closest('[data-archive-action]');if(!target||target.disabled)return;const action=target.dataset.archiveAction,id=target.dataset.id;
    if(action==='reload')void load(true);if(action==='add')edit(null,target);if(action==='edit')edit(id,target);if(action==='preview')preview(working.records.find(r=>r.id===id),false,target);if(action==='publish')void publish();if(action==='save-drafts')void publish(true);
    if(action==='unpublish'||action==='mark-published'){if(action==='unpublish'&&!confirm('Stage removal of this profile from public display? The historical record and images will be retained.'))return;working.records.find(r=>r.id===id).published=action==='mark-published';message='Unpublished changes — choose Publish changes to update public visibility.';render();}
  }
  dialog.addEventListener('input',()=>editorDirty=true);
  dialog.addEventListener('change',event=>{if(event.target.matches('[data-upload]'))void upload(event.target);});
  dialog.addEventListener('submit',event=>{event.preventDefault();stage();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!editorDirty||confirm('Discard unsaved editor changes?'))close();});
  dialog.addEventListener('click',event=>{const image=event.target.closest('.archive-preview [data-archive-image]');if(image){event.preventDefault();imageIndex=Number(image.dataset.archiveImage);imageOpener=image;renderPreviewImage();imageDialog.showModal();imageDialog.querySelector('button').focus();return;}const target=event.target.closest('[data-archive-action]');if(!target||target.disabled)return;const action=target.dataset.archiveAction,index=Number(target.dataset.index);
    if(action==='cancel'){if(!editorDirty||confirm('Discard unsaved editor changes?'))close();return;}
    if(action==='close-preview'){close();return;}if(action==='back-editor'){dialog.innerHTML=editorHTML();return;}
    if(action==='stage-draft'){stage(true);return;}if(action==='preview-editor'){if(readEditor())preview(editor,true);return;}
    readEditor(false);editorDirty=true;
    if(action==='add-period')editor.servicePeriods.push({start:'',end:null});if(action==='remove-period'&&editor.servicePeriods.length>1)editor.servicePeriods.splice(index,1);
    if(action==='remove-primary')editor.primaryImage=null;if(action==='remove-image')editor.archiveImages.splice(index,1);
    if(action==='use-primary')editor.primaryImage=copy(editor.archiveImages[index]);
    if(action==='move-up'&&index>0)[editor.archiveImages[index-1],editor.archiveImages[index]]=[editor.archiveImages[index],editor.archiveImages[index-1]];
    if(action==='move-down'&&index<editor.archiveImages.length-1)[editor.archiveImages[index+1],editor.archiveImages[index]]=[editor.archiveImages[index],editor.archiveImages[index+1]];
    dialog.innerHTML=editorHTML();
  });
  window.addEventListener('beforeunload',event=>{if(changed()||editorDirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('admin-clergy-ready',()=>{if(host&&!shared)void load();});
  window.churchClergyAdmin=Object.freeze({mount(root){if(host!==root){host=root;host.addEventListener('click',listAction);}render();if(!shared&&!busy&&!message)void load();}});
})();
