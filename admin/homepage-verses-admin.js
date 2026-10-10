(() => {
  'use strict';
  const model = window.churchHomepageVersesModel;
  let root, data, sha, dirty = false, busy = false, locked = false, message = '', returnFocus;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api = () => window.churchHomepageVersesApi;
  const sunday = start => model.dateValid(start) ? new Date(Date.parse(start+'T12:00:00Z')+6*86400000).toISOString().slice(0,10) : '';
  const nextMonday = start => new Date(Date.parse(start+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
  function row(verse) {
    return `<article class="verse-admin-row"><div><h3>${escape(verse.reference || 'Unassigned week')}</h3><p>${escape(verse.quotation || 'Quotation not yet supplied')}</p><small>${escape(verse.translation || 'Translation not set')} · ${escape(verse.startDate || 'Unscheduled')} ${verse.endDate ? '– '+escape(verse.endDate) : ''} · <strong>${verse.published ? 'Published' : 'Draft'}</strong></small>${model.warning(verse) ? `<p class="verse-warning">${escape(model.warning(verse))}</p>` : ''}${verse.note ? `<p class="verse-internal-note">Internal note: ${escape(verse.note)}</p>` : ''}</div><button class="admin-button secondary" type="button" data-verse-edit="${escape(verse.id)}" ${busy || locked ? 'disabled' : ''}>Edit ${escape(verse.reference || 'week')}</button></article>`;
  }
  function render() {
    if (!root?.isConnected || location.hash !== '#verses') return;
    const current = model.monday(), next = nextMonday(current);
    let content = '';
    if (data) {
      const sorted = [...data.verses].sort((a,b)=>a.startDate.localeCompare(b.startDate));
      const groups = [ ['Current week',v=>v.startDate===current], ['Next week',v=>v.startDate===next], ['Upcoming',v=>v.startDate>next || !v.startDate], ['Previous',v=>v.startDate && v.startDate<current] ];
      content = groups.map(([name,filter])=>{
        const verses=sorted.filter(filter);
        const gap=(name==='Current week'||name==='Next week')&&!verses.some(v=>v.published);
        return `<section class="verse-admin-group"><h2>${name}</h2>${gap?'<p class="verse-warning">No published verse is scheduled for this week. The homepage will show no verse.</p>':''}${verses.map(row).join('')||'<p>No entries.</p>'}</section>`;
      }).join('');
      const scheduled=sorted.filter(v=>v.startDate>=current);
      const gaps=[];
      if(scheduled.length){for(let week=current;week<=scheduled.at(-1).startDate;week=nextMonday(week)){if(!scheduled.some(v=>v.startDate===week&&v.published))gaps.push(week);if(gaps.length>260)break;}}
      if(gaps.length)content=`<details class="verse-admin-gaps"><summary>${gaps.length} weeks without a published verse</summary><p>${gaps.map(escape).join(', ')}</p></details>`+content;
    }
    root.innerHTML=`<div class="admin-page-heading"><div><p class="admin-kicker">HOMEPAGE SCRIPTURE</p><h1>Bible Verses</h1><p>Plan Monday–Sunday weeks in Europe/London. Drafts and internal notes stay out of the public schedule.</p></div></div><p>Only use approved wording. Website paraphrase identifies a summary, not a verbatim translation. Set translation to NLT only for approved verbatim NLT wording. Short quotations appear over the desktop sky; longer quotations appear below the hero.</p><div class="verse-admin-actions"><button class="admin-button" type="button" data-verse-add ${!data||busy||locked?'disabled':''}>Add verse</button><button class="admin-button" type="button" data-verse-publish ${!dirty||busy||locked?'disabled':''}>Publish changes to Dev</button><button class="admin-button secondary" type="button" data-verse-reload ${busy?'disabled':''}>Reload shared schedule</button></div><p role="status" aria-live="polite">${escape(busy?'Working…':message || (dirty?'Changes staged. Publish changes to Dev to save them.':'Changes are saved only when published to Dev.'))}</p>${content}`;
  }
  async function load() {
    if(busy)return;
    if(dirty&&!confirm('Discard your staged changes and reload the shared schedule?'))return;
    if(!api()){message='Sign in and authorise the existing Admin API connection, then reload the schedule.';render();return;}
    busy=true;render();
    const result=await api().load();busy=false;
    if(result.ok){try{model.validateHomepageVerses(result.homepageVerses);data=structuredClone(result.homepageVerses);sha=result.sha;dirty=false;locked=false;message='Shared schedule loaded.';}catch{data=null;message='The shared schedule is invalid. No edits can be published.';}}
    else message=api().message(result.category);
    render();
  }
  async function publish() {
    if(!data||!dirty||busy||locked||!api())return;
    try{model.validateHomepageVerses(data);}catch(error){message=error.message;render();return;}
    busy=true;render();
    const result=await api().publish({sha,homepageVerses:structuredClone(data)});busy=false;
    if(result.ok){sha=result.sha;dirty=false;message=api().message(result.unchanged?'unchanged':'success');}
    else{message=api().message(result.category);if(['homepage-verses-version-conflict','homepage-verses-publish-result-unavailable','network-failure'].includes(result.category))locked=true;}
    render();
  }
  const dialog=document.createElement('dialog');
  dialog.className='admin-dialog verse-admin-dialog';dialog.setAttribute('aria-labelledby','verse-editor-heading');document.body.append(dialog);
  function edit(id) {
    if(!data||busy||locked)return;
    const existing=data.verses.find(v=>v.id===id);
    const now=new Date().toISOString();
    const verse=existing||{id:'verse-'+crypto.randomUUID(),reference:'',translation:'NLT',quotation:'',startDate:'',endDate:'',published:false,note:'',createdAt:now,updatedAt:now};
    returnFocus=document.activeElement;
    const field=(label,name,type='text',max=120)=>`<label class="admin-field"><span>${label}</span><input name="${name}" type="${type}" ${type==='text'?`maxlength="${max}"`:''} value="${escape(verse[name])}"></label>`;
    dialog.innerHTML=`<form class="verse-editor"><h2 id="verse-editor-heading">${existing?'Edit':'Add'} Bible verse</h2><div class="admin-form-grid">${field('Bible reference','reference')}${field('Translation','translation','text',32)}${field('Week begins (Monday)','startDate','date')}<p class="verse-week-end">Week ends: <span>${escape(verse.endDate || 'Choose a Monday')}</span> (Sunday)</p></div><label class="admin-field"><span>Approved quotation (maximum 320 characters)</span><textarea name="quotation" maxlength="320" rows="4">${escape(verse.quotation)}</textarea></label><label class="admin-field"><span>Internal / seasonal note</span><textarea name="note" maxlength="500" rows="2">${escape(verse.note)}</textarea></label><label><input name="published" type="checkbox" ${verse.published?'checked':''}> Published (complete wording and a valid week required)</label><p class="verse-warning" data-verse-warning role="status"></p><h3>Public text preview</h3><blockquote class="verse-admin-preview"><p></p><cite></cite></blockquote><p>Desktop: short text over the left sky. Narrow screens and quotations over 160 characters: below the hero. No photograph shading.</p><p data-verse-error role="alert"></p><div class="verse-admin-actions"><button class="admin-button" type="submit">Save staged verse</button><button class="admin-button secondary" type="button" data-verse-cancel>Cancel</button>${existing?'<button class="admin-button secondary" type="button" data-verse-remove>Remove verse</button>':''}</div></form>`;
    const form=dialog.querySelector('form');
    const value=()=>({...verse,reference:form.elements.reference.value.trim(),translation:form.elements.translation.value.trim(),quotation:form.elements.quotation.value.trim(),note:form.elements.note.value.trim(),startDate:form.elements.startDate.value,endDate:sunday(form.elements.startDate.value),published:form.elements.published.checked,updatedAt:new Date().toISOString()});
    function preview(){const v=value();dialog.querySelector('.verse-week-end span').textContent=v.endDate||'Choose a Monday';dialog.querySelector('[data-verse-warning]').textContent=model.warning(v);dialog.querySelector('.verse-admin-preview p').textContent=v.quotation?`“${v.quotation}”`:'';dialog.querySelector('.verse-admin-preview cite').textContent=v.reference?`${v.reference} · ${v.translation}`:'';}
    form.addEventListener('input',preview);
    form.addEventListener('submit',event=>{event.preventDefault();const candidate={schemaVersion:1,verses:existing?data.verses.map(v=>v.id===id?value():v):[...data.verses,value()]};try{model.validateHomepageVerses(candidate);data=candidate;dirty=true;message='Verse staged. Publish changes to Dev to save the schedule.';dialog.close();render();}catch(error){dialog.querySelector('[data-verse-error]').textContent=error.message;}});
    dialog.querySelector('[data-verse-cancel]').onclick=()=>dialog.close();
    const remove=dialog.querySelector('[data-verse-remove]');if(remove)remove.onclick=()=>{if(confirm('Remove this verse from the staged schedule?')){data.verses=data.verses.filter(v=>v.id!==id);dirty=true;message='Removal staged. Publish changes to Dev to save it.';dialog.close();render();}};
    preview();dialog.showModal();form.elements.reference.focus();
  }
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else root?.querySelector('[data-verse-add]')?.focus();});
  document.addEventListener('click',event=>{
    if(!root?.contains(event.target))return;
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-verse-edit'))edit(button.dataset.verseEdit);
    if(button.hasAttribute('data-verse-add'))edit();
    if(button.hasAttribute('data-verse-reload'))void load();
    if(button.hasAttribute('data-verse-publish'))void publish();
  });
  window.addEventListener('admin-homepage-verses-ready',()=>{if(location.hash==='#verses'&&!dirty)void load();});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.churchHomepageVersesAdmin=Object.freeze({mount(target){root=target;render();if(!data&&!busy)void load();}});
})();
