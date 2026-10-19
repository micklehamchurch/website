/* Visual pages are derived from the live, safely rendered chapter in memory. */
(() => {
  'use strict';
  const M = window.BiblePagesModel, $ = name => document.getElementById(`bible-${name}`);
  const spread = $('page-spread'), content = $('content'), reading = $('reading');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerGestures = typeof window.PointerEvent === 'function';
  let storage; try { storage = window.localStorage; } catch { storage = null; }
  let last = M.read(storage, 'last'), places = M.readPlaces(storage), deletedPlace = null, busy = false;
  let location = null, units = [], pages = [], index = 0, columns = 1, pending = null, loaded = false, timer, touch, resumeOffset = null;
  let hasPreviousChapter = false, hasNextChapter = false, tap = null;
  document.body.classList.add('bible-paginated');
  document.body.classList.add('bible-awaiting-reading');
  function savedControls() {
    $('continue').hidden = !last;
    if (last) $('continue').textContent = `Continue reading — ${last.reference}`;
  }
  function announce(message) { $('save-status').textContent=message; $('places-status').textContent=message; }
  function placesError(message) { announce(message);if(!$('drawer').open)$('drawer').showModal();$('places-status').focus(); }
  function commitPlaces(next,message) {
    if(!M.writePlaces(storage,next)){placesError('This browser could not save changes. Your saved places have not been changed.');return false;}
    places=next;drawPlaces();render(0,false);announce(message);return true;
  }
  function placePosition() {
    const p=position();if(!p)return null;
    // Offset identifies the current content, independent of visual page numbers.
    let verse;for(let n=0;n<=p.offset&&n<units.length;n++)if(units[n].verse)verse=units[n].text;
    return M.validPlace({...p,reference:verse&&/^\d+$/.test(verse)?`${location.reference}:${verse}`:location.reference,createdAt:Date.now()});
  }
  function visiblePlaces() { return places.filter(p=>{const n=M.bookmarkPage(p,location,pages);return n>=index&&n<index+columns;}); }
  function currentPlace() { const visible=visiblePlaces();return visible.find(p=>p.offset===position()?.offset)||visible[0]; }
  function drawPlaces(focusId,action='open') {
    const list=$('places-list');list.replaceChildren();$('places-empty').hidden=places.length>0;$('places-undo').hidden=!deletedPlace;
    for(const p of places){
      const row=document.createElement('li');row.className='bible-place';
      const open=document.createElement('button');open.type='button';open.className='bible-place-open';open.disabled=busy;open.dataset.place=p.id;open.dataset.action='open';
      const label=document.createElement('span');label.textContent=p.name||p.reference;open.append(label);
      const detail=document.createElement('small');detail.textContent=`${p.name?p.reference+' · ':''}${p.translation==='niv'?'NIV':'NIrV'} · Anglicised`;open.append(detail);
      open.setAttribute('aria-label',`Open saved place ${p.name?p.name+', ':''}${p.reference}, ${p.translation==='niv'?'NIV':'NIrV'}`);
      open.addEventListener('click',()=>restore({...p,v:1,page:0}));row.append(open);
      const actions=document.createElement('div');actions.className='bible-place-actions';
      function button(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',`${text} saved place ${p.name||p.reference}`);b.dataset.place=p.id;b.dataset.action=text.toLowerCase();b.addEventListener('click',fn);actions.append(b);return b;}
      button('Rename',()=>{
        const form=document.createElement('form');form.className='bible-place-edit';
        const name=document.createElement('input');name.type='text';name.maxLength=80;name.value=p.name;name.setAttribute('aria-label',`Custom name for ${p.reference}`);name.autocomplete='off';
        const save=document.createElement('button');save.type='submit';save.textContent='Save';
        const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>drawPlaces(p.id,'rename'));
        form.append(name,save,cancel);actions.replaceChildren(form);name.focus();form.scrollIntoView?.({block:'nearest'});
        form.addEventListener('submit',e=>{e.preventDefault();const next=places.map(x=>x.id===p.id?{...x,name:name.value.trim().slice(0,80)}:x);if(commitPlaces(next,'Saved place renamed.'))drawPlaces(p.id,'rename');});
        name.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();drawPlaces(p.id,'rename');}});
      });
      button('Delete',()=>{const previous=deletedPlace;deletedPlace=p;if(commitPlaces(places.filter(x=>x.id!==p.id),'Saved place deleted. Undo is available.'))$('places-undo').focus();else deletedPlace=previous;});
      row.append(actions);list.append(row);
    }
    if(focusId)for(const b of list.querySelectorAll('button'))if(b.dataset.place===focusId&&b.dataset.action===action)b.focus();
  }
  function position() { return location && { v: 1, ...location, page: index, offset: resumeOffset ?? (pages[index]?.start || 0) }; }
  function saveLast() {
    const p = position(); if (p && M.save(storage, 'last', p)) { last = p; savedControls(); }
  }
  function tokens() {
    const result = [];
    for (const p of content.children) {
      for (const node of p.childNodes) {
        if (node.nodeName === 'SUP') result.push({ text: node.textContent, verse: true });
        else for (const text of node.textContent.match(/\S+\s*|\s+/gu) || []) result.push({ text });
      }
      result.push({ paragraph: true });
    }
    return result;
  }
  function fragment(start, end) {
    const root = document.createDocumentFragment(); let p;
    for (let i = start; i < end; i++) {
      const token = units[i];
      if (token.paragraph) { p = null; continue; }
      if (!p) { p = document.createElement('p'); root.append(p); }
      let node;
      if (token.verse) { node = document.createElement('sup'); node.textContent = token.text; }
      else node = document.createTextNode(token.text);
      if (i === resumeOffset) { const mark = document.createElement('mark'); mark.className = 'bible-resume-anchor'; mark.title = 'Saved reading position'; mark.append(node); p.append(mark); }
      else p.append(node);
    }
    return root;
  }
  function leaf(pageIndex) {
    const section = document.createElement('section'); section.className = 'bible-paper-page';
    const text = document.createElement('div'); text.className = 'bible-content bible-page-text';
    if (pageIndex < pages.length) {
      section.setAttribute('aria-label', `${location.reference}, page ${pageIndex + 1} of ${pages.length}`);
      if (places.some(p=>M.bookmarkPage(p, location, pages) === pageIndex)) {
        section.setAttribute('aria-label', `${location.reference}, page ${pageIndex + 1} of ${pages.length}, bookmarked`);
        const ribbon = document.createElement('span'); ribbon.className = 'bible-page-ribbon'; ribbon.setAttribute('aria-hidden', 'true'); section.append(ribbon);
      }
      text.append(fragment(pages[pageIndex].start, pages[pageIndex].end));
    } else { section.setAttribute('aria-hidden', 'true'); section.classList.add('bible-blank-page'); }
    section.append(text); return section;
  }
  function render(direction = 0, remember = true) {
    spread.replaceChildren(...Array.from({ length: columns }, (_, n) => leaf(index + n)));
    for (const text of spread.querySelectorAll('.bible-page-text')) if (text.scrollHeight > text.clientHeight + 1) { text.tabIndex = 0; text.setAttribute('role', 'region'); text.setAttribute('aria-label', 'Scroll within this reading page'); }
    spread.setAttribute('data-reading-offset', String(position()?.offset ?? 0));
    pageControls(busy);
    $('page-status').textContent = columns > 1 && index + 1 < pages.length ? `Pages ${index + 1}–${Math.min(index + columns, pages.length)} of ${pages.length}` : `Page ${index + 1} of ${pages.length}`;
    const visibleBookmark = visiblePlaces().length>0;
    $('bookmark').setAttribute('aria-pressed', String(visibleBookmark));
    $('bookmark').setAttribute('aria-label', visibleBookmark ? `Remove saved place ${currentPlace().reference} from this page` : 'Bookmark this page');
    if (direction && !reduced.matches) {
      spread.classList.remove('turn-forward', 'turn-back'); void spread.offsetWidth;
      spread.classList.add(direction > 0 ? 'turn-forward' : 'turn-back');
    }
    if (remember) saveLast();
  }
  function pageControls(busy = false) {
    $('page-previous').disabled = busy || (index === 0 && !hasPreviousChapter);
    $('page-next').disabled = busy || (index + columns >= pages.length && !hasNextChapter);
  }
  function layout(offset = resumeOffset ?? (pages[index]?.start || 0), remember = false) {
    if (!location || reading.hidden) return;
    spread.setAttribute('aria-busy', 'true');
    content.hidden = true; content.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('bible-pages-fallback');
    spread.hidden = false;
    columns = M.layoutColumns(spread.clientWidth, window.innerHeight, 20);
    // Use the Scripture probe, rather than the chapter heading, for enlarged text.
    const probeSize = document.querySelector('.bible-font-probe');
    if (probeSize) columns = M.layoutColumns(spread.clientWidth, window.innerHeight, parseFloat(getComputedStyle(probeSize).fontSize) || 20);
    spread.style.setProperty('--bible-columns', columns);
    spread.setAttribute('data-page-mode', columns === 2 ? 'facing' : 'single');

    // Match the real leaf's typography and usable width before measuring fits.
    pages = [{ start: 0, end: 0 }]; spread.hidden = false; render(0, false);
    const top = spread.getBoundingClientRect().top + (window.scrollY || 0);
    const notices = document.querySelector('.bible-notices');
    const reserve = ($('page-controls').offsetHeight || 64) + (notices?.offsetHeight || 44) + 164;
    const height = Math.max(120, Math.min(900, window.innerHeight - top - reserve));
    spread.style.setProperty('--bible-page-height', `${height}px`);
    const realText = spread.querySelector('.bible-page-text');
    const measure = document.createElement('div'); measure.className = 'bible-content bible-page-measure';
    measure.style.width = `${realText.clientWidth}px`; document.body.append(measure);
    const measuredHeight = Math.max(height, parseFloat(getComputedStyle(realText).lineHeight) || 0);
    pages = M.paginate(units, (start, end) => {
      measure.replaceChildren(fragment(start, end)); return measure.scrollHeight <= measuredHeight + 1;
    });
    measure.remove();
    index = Math.floor(M.pageForOffset(pages, offset) / columns) * columns;
    $('page-controls').hidden = false; render(0, remember);
    spread.setAttribute('data-layout-viewport', String(window.innerWidth));
    spread.setAttribute('data-layout-height', String(window.innerHeight));
    spread.setAttribute('aria-busy', 'false');
  }
  function fallback() {
    spread.setAttribute('aria-busy', 'false');
    content.hidden = false; content.removeAttribute('aria-hidden');
    spread.hidden = true; $('page-controls').hidden = false;
    index = 0; columns = 1; pages = [{ start: 0, end: units.length }];
    $('page-status').textContent = 'Full chapter'; pageControls(); saveLast();
    document.body.classList.add('bible-pages-fallback');
    $('status').textContent = 'Showing the full chapter. Reading pages are unavailable in this layout.';
  }
  function move(direction) {
    if (!location || reading.hidden || reading.getAttribute('aria-busy') === 'true') return false;
    const next = M.turn(index, direction, columns, pages.length);
    if (next === index) {
      if (direction < 0 ? !hasPreviousChapter : !hasNextChapter) return false;
      document.dispatchEvent(new CustomEvent('bible-request-page-chapter', { detail: direction })); return true;
    }
    resumeOffset = null; index = next; render(direction); return true;
  }
  function restore(p) {
    if (!p) return;
    if ($('read').disabled) { placesError('The Bible is not ready to open this place. Close this menu and use Try again. Your saved place is kept.'); return; }
    if (!Array.from($('translation').options).some(option => option.value === p.translation)) { placesError('The saved translation is unavailable. Your saved place is kept. Choose a book and chapter to keep reading.'); return; }
    const drawer = $('drawer');
    if (drawer.open) {
      drawer.addEventListener('close', () => restore(p), { once: true });
      drawer.close(); return;
    }
    pending = p; resumeOffset = p.offset;
    if (location && p.translation === location.translation && p.chapter === location.chapter) {
      layout(p.offset, true); pending = null; $('save-status').textContent = 'Returned near your saved reading position.'; $('reference').focus();
    } else document.dispatchEvent(new CustomEvent('bible-request-location', { detail: p }));
  }
  document.addEventListener('bible-busy', event => {
    busy=event.detail;$('continue').disabled=busy;
    for(const b of $('places-list').querySelectorAll('button'))if(b.dataset.action==='open')b.disabled=busy;
    $('bookmark').disabled = event.detail || reading.hidden || !location;
    pageControls(event.detail);
  });
  document.addEventListener('bible-chapter-ready', event => {
    document.body.classList.remove('bible-awaiting-reading');
    const detail = event.detail;
    location = { translation: detail.translation, book: detail.book, chapter: detail.chapter, reference: detail.reference };
    hasPreviousChapter = detail.hasPreviousChapter; hasNextChapter = detail.hasNextChapter;
    units = tokens(); index = 0;
    content.hidden = true; content.setAttribute('aria-hidden', 'true');
    const restoring = pending && pending.translation === location.translation && pending.chapter === location.chapter;
    const offset = restoring ? pending.offset : detail.boundaryDirection < 0 ? Math.max(0, units.length - 1) : 0;
    resumeOffset = restoring ? offset : null;
    while (resumeOffset !== null && units[resumeOffset]?.paragraph) resumeOffset++;
    try { layout(offset, loaded || !last || restoring); if (detail.boundaryDirection) render(detail.boundaryDirection); } catch { fallback(); }
    if (restoring) $('save-status').textContent = 'Returned near your saved reading position.';
    loaded = true; pending = null;
    $('bookmark').disabled = false;
  });
  document.addEventListener('bible-restoring-location', event => { pending = event.detail; resumeOffset = pending.offset; });
  $('page-previous').addEventListener('click', () => move(-1));
  $('page-next').addEventListener('click', () => move(1));
  $('continue').addEventListener('click', () => restore(last));
  $('places-undo').addEventListener('click',()=>{
    if(!deletedPlace)return;
    if(places.length>=M.placesLimit){placesError('You have 100 saved places. Delete one before undoing this deletion.');return;}
    const p=deletedPlace;deletedPlace=null;
    if(commitPlaces([...places.filter(x=>x.id!==p.id),p].sort((a,b)=>b.createdAt-a.createdAt),'Saved place restored.'))drawPlaces(p.id);else deletedPlace=p;
  });
  $('bookmark').addEventListener('click', () => {
    if (reading.hidden || $('read').disabled) return;
    const p = placePosition(),current=currentPlace();
    if(current){commitPlaces(places.filter(x=>x.id!==current.id),`Removed saved place ${current.reference}.`);return;}
    if(places.length>=M.placesLimit){placesError('You have 100 saved places. Delete one in Books and saved places before adding another.');return;}
    if(p)commitPlaces([p,...places.filter(x=>x.id!==p.id)],`Saved ${p.reference}.`);
  });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target.closest('input, select, textarea, [contenteditable], dialog[open]') || (target.closest('button, a') && !target.closest('#bible-page-controls'));
    const direction = M.keyDirection(event, !!editing);
    if (direction && move(direction)) event.preventDefault();
  });
  spread.addEventListener('animationend', () => spread.classList.remove('turn-forward', 'turn-back'));
  function interactionBlocked(target) {
    return !!(document.querySelector('dialog[open]') || target.closest('a, button, input, select, textarea, [contenteditable], [role="button"], audio, video, [data-bible-no-turn]'));
  }
  function tapBounds(page, touchInput) {
    const r = page.getBoundingClientRect();
    if (columns === 1) return r;
    // Facing pages respond to touch/pen, not ordinary desktop text clicks.
    if (!touchInput) return null;
    const direction = page === spread.children[0] ? -1 : 1;
    return { top:r.top, bottom:r.bottom, left:r.left + (direction === 1 ? 12 : 0), right:r.right - (direction === -1 ? 12 : 0), width:r.width, direction };
  }
  function trackMovement(start, point) {
    if (start && (Math.abs(point.clientX-start.x)>10 || Math.abs(point.clientY-start.y)>10)) start.moved = true;
  }
  spread.addEventListener('pointerdown', event => {
    tap = null;
    if (event.button !== 0 || event.isPrimary === false || interactionBlocked(event.target) || window.getSelection()?.toString()) return;
    const page = event.target.closest('.bible-paper-page');
    if (!page) return;
    const inText = !!event.target.closest('.bible-page-text');
    // Mouse text drags remain selection. A mouse drag starting in paper padding
    // may turn a page, without starting an unwanted selection across the text.
    if (event.pointerType === 'mouse' && !inText) event.preventDefault();
    tap = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId, bounds: tapBounds(page, event.pointerType === 'touch' || event.pointerType === 'pen'), swipeAllowed: event.pointerType !== 'mouse' || !inText };
  });
  spread.addEventListener('pointerup', event => {
    const start = tap; tap = null;
    if (!start || start.id !== event.pointerId) return;
    const direction = M.gestureDirection(start, {x:event.clientX,y:event.clientY,at:Date.now()}, start.bounds, interactionBlocked(event.target) || !!window.getSelection()?.toString(), start.swipeAllowed);
    if (direction) move(direction);
  });
  spread.addEventListener('pointercancel', () => { tap = null; });
  spread.addEventListener('pointermove', event => { if (tap?.id === event.pointerId) trackMovement(tap,event); });
  spread.addEventListener('touchstart', event => {
    // Pointer-capable browsers have exactly one owner. Their compatibility
    // touchend must not add another action after pointerup already navigated.
    touch = null;
    if (pointerGestures || interactionBlocked(event.target) || window.getSelection()?.toString() || event.touches.length !== 1) return;
    const page = event.target.closest('.bible-paper-page');
    if (page) touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, at: Date.now(), bounds: tapBounds(page, true) };
  }, { passive: true });
  spread.addEventListener('touchend', event => {
    const start = touch; touch = null;
    if (pointerGestures || !start || event.changedTouches.length !== 1) return;
    const end = event.changedTouches[0];
    const direction = M.gestureDirection(start, { x: end.clientX, y: end.clientY, at: Date.now() }, start.bounds, interactionBlocked(event.target) || !!window.getSelection()?.toString());
    if (direction) move(direction);
  }, { passive: true });
  spread.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  spread.addEventListener('touchmove', event => { if (event.touches.length !== 1) touch = null; else trackMovement(touch,event.touches[0]); }, {passive:true});
  function resize() {
    tap = null; touch = null;
    if (!location || reading.hidden) return;
    resumeOffset = resumeOffset ?? (pages[index]?.start || 0);
    spread.setAttribute('aria-busy', 'true'); clearTimeout(timer);
    timer = setTimeout(() => { try { layout(); } catch { fallback(); } }, 120);
  }
  window.addEventListener('resize', resize);
  document.fonts?.ready.then(resize);
  // A font-sized probe also detects text-only resizing without a viewport resize.
  const probe = document.createElement('span'); probe.className = 'bible-font-probe bible-content'; probe.textContent = 'M'; document.body.append(probe);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(resize);
    for (const element of [probe, document.querySelector('.site-header'), document.querySelector('.bible-intro'), document.querySelector('.bible-toolbar'), document.querySelector('.bible-saved-tools'), document.querySelector('.bible-reading-heading')]) if (element) observer.observe(element);
  }
  window.addEventListener('pagehide', () => { if (loaded && !reading.hidden) saveLast(); });
  $('drawer-content').append($('continue'),$('places-section'));
  document.querySelector('.bible-toolbar').append($('bookmark'),$('close'));
  savedControls();drawPlaces();
})();
