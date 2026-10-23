(() => {
  'use strict';
  const API = 'https://stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net/api/bible/';
  const $ = id => document.getElementById(`bible-${id}`);
  const controls = $('controls'), translation = $('translation'), book = $('book'), chapter = $('chapter');
  const reading = $('reading'), status = $('status'), retry = $('retry');
  const translationLabel = $('translation-name');
  let translations = [], books = [], chapters = [], current = null, busy = false, retryAction, deferInitialChapter = false;
  // Provider's documented queue records views even while its fixed tracker loads.
  window.fumsData = window.fumsData || [];
  window.fums = window.fums || function () { window.fumsData.push(arguments); };
  const tracker = document.createElement('script');
  tracker.src = 'https://pkg.api.bible/fumsV3.min.js'; tracker.async = true;
  document.head.append(tracker);

  async function get(path) {
    if (window.BibleSessionCache) return window.BibleSessionCache.get(path, () => fetchResponse(path));
    return fetchResponse(path);
  }
  async function fetchResponse(path) {
    const response = await fetch(API + path, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      const error = new Error('unavailable'); error.status = response.status; throw error;
    }
    return response.json();
  }
  function options(select, values, label, chosen) {
    select.replaceChildren(...values.map(value => {
      const option = document.createElement('option'); option.value = value.id;
      option.textContent = label(value); return option;
    }));
    select.value = values.some(v => v.id === chosen) ? chosen : values[0]?.id || '';
  }
  function setBusy(value) {
    busy = value; reading.setAttribute('aria-busy', String(value));
    translation.disabled = value || !translations.length;
    book.disabled = value || !books.length; chapter.disabled = value || !chapters.length;
    $('read').disabled = value || !chapters.length;
    document.dispatchEvent(new CustomEvent('bible-busy', { detail: value }));
  }
  async function run(action) {
    if (busy) return;
    retryAction = action; retry.hidden = true; setBusy(true);
    // Clear stale Scripture when a different selection is being fetched.
    reading.hidden = true; current = null; status.textContent = 'Opening your chapter…';
    try { await action(); }
    catch (error) {
      status.textContent = error.status === 429 ? 'The Bible reading allowance has been reached. Please try again later.' : 'The Bible is temporarily unavailable. Please try again in a moment.';
      retry.hidden = false;
    } finally { setBusy(false); }
  }
  function copyrightText(value) {
    // Copyright may contain publisher markup. Parse inertly, display text only.
    return new DOMParser().parseFromString(String(value || ''), 'text/html').body.textContent;
  }
  function adjacent(direction) { return window.BiblePagesModel.adjacentChapter(chapter.value, direction, books.map(b => b.id)); }
  async function loadChapter(id, focus = false, boundaryDirection = 0) {
    if (!/^[A-Z0-9]{3}\.[1-9][0-9]{0,2}$/.test(id)) throw new Error('invalid-chapter');
    const response = await get(`${translation.value}/chapters/${id}`), data = response.data;
    if (!data?.content || !data.copyright || typeof response.meta?.fumsToken !== 'string' || !response.meta.fumsToken) throw new Error('missing-content-metadata');
    current = data;
    $('reference').textContent = data.reference || `${book.selectedOptions[0].textContent} ${chapter.selectedOptions[0].textContent}`;
    $('edition').textContent = translation.selectedOptions[0].textContent;
    if (translationLabel) translationLabel.textContent = translation.selectedOptions[0].textContent;
    $('content').replaceChildren(...data.content.trim().split(/\n+/).map(text => {
      const p = document.createElement('p');
      for (const part of text.trim().split(/(\[[0-9]+\])/)) {
        if (/^\[[0-9]+\]$/.test(part)) {
          const verse = document.createElement('sup'); verse.textContent = part.slice(1, -1); p.append(verse);
        } else p.append(document.createTextNode(part));
      }
      return p;
    }));
    $('copyright').textContent = copyrightText(data.copyright);
    reading.hidden = false; status.textContent = 'Your chapter is ready.';
    // Report every displayed chapter, including responses served by the proxy cache.
    window.fums('trackView', response.meta.fumsToken);
    document.dispatchEvent(new CustomEvent('bible-chapter-ready', { detail: { translation: translation.value, book: book.value, chapter: chapter.value, reference: $('reference').textContent, hasPreviousChapter: !!adjacent(-1), hasNextChapter: !!adjacent(1), boundaryDirection } }));
    if (focus) $('reference').focus();
  }
  async function loadChapters(preferred = '', boundaryDirection = 0) {
    chapters = [];
    const response = await get(`${translation.value}/books/${book.value}/chapters`);
    chapters = response.data.filter(c => /^[A-Z0-9]{3}\.[1-9][0-9]{0,2}$/.test(c.id));
    if (!chapters.length) throw new Error('empty-chapters');
    if (boundaryDirection && !chapters.some(c => c.id === preferred)) throw new Error('unavailable-chapter');
    options(chapter, chapters, c => c.number, preferred);
    if (deferInitialChapter) {
      deferInitialChapter = false; return;
    }
    await loadChapter(chapter.value, !!boundaryDirection, boundaryDirection);
  }
  async function loadBooks(preferredBook = 'JHN', preferredChapter = 'JHN.1') {
    books = []; chapters = [];
    const response = await get(`${translation.value}/books`); books = response.data;
    if (!Array.isArray(books) || !books.length) throw new Error('empty-books');
    options(book, books, b => b.name, preferredBook); await loadChapters(preferredChapter);
  }
  async function initialise() {
    const response = await get('translations');
    translations = [{ id: 'niv', name: 'New International Version (Anglicised)' }, { id: 'nirv', name: 'New International Reader’s Version (Anglicised)' }].filter(t => response.data.some(b => b.id === (t.id === 'niv' ? '3e2eb613d45e131e-01' : 'de547c01da41e37c-01')));
    if (!translations.some(t => t.id === 'niv')) throw new Error('niv-unavailable');
    let saved;
    try { saved = window.BiblePagesModel?.read(window.localStorage, 'last'); } catch { saved = null; }
    if (!translations.some(t => t.id === saved?.translation)) saved = null;
    deferInitialChapter = true;
    options(translation, translations, t => t.name, saved?.translation || 'niv');
    if (translationLabel) translationLabel.textContent = translation.selectedOptions[0].textContent;
    await loadBooks(saved?.book || 'GEN', saved?.chapter || 'GEN.1');
    if (saved && book.value === saved.book && chapter.value === saved.chapter) {
      document.dispatchEvent(new CustomEvent('bible-restoring-location', { detail: saved }));
      await loadChapter(saved.chapter);
    } else {
      // Missing, invalid or unavailable history starts at Genesis; saved places are independent.
      if (translation.value !== 'niv') { translation.value = 'niv'; await loadBooks('GEN', 'GEN.1'); }
      else if (book.value === 'GEN' && chapter.value === 'GEN.1') await loadChapter('GEN.1');
      else {
        if (!books.some(b => b.id === 'GEN')) throw new Error('genesis-unavailable');
        book.value = 'GEN'; await loadChapters('GEN.1');
      }
    }
  }
  controls.addEventListener('submit', event => { event.preventDefault(); run(() => loadChapter(chapter.value, true)); });
  translation.addEventListener('change', () => { $('translation-name').textContent = translation.selectedOptions[0].textContent; const b = book.value, c = chapter.value; run(() => loadBooks(b, c)); });
  book.addEventListener('change', () => run(() => loadChapters()));
  chapter.addEventListener('change', () => run(() => loadChapter(chapter.value)));
  retry.addEventListener('click', () => run(retryAction || initialise));
  document.addEventListener('bible-request-page-chapter', event => {
    if (busy || !current || ![-1, 1].includes(event.detail)) return;
    const direction = event.detail, target = adjacent(direction);
    if (!target) return;
    run(async () => {
      const targetBook = target.split('.')[0];
      if (book.value !== targetBook) { book.value = targetBook; await loadChapters(target, direction); }
      else { chapter.value = target; await loadChapter(target, true, direction); }
    });
  });
  document.addEventListener('bible-request-location', event => {
    const position = event.detail;
    if (busy || !position || !translations.some(t => t.id === position.translation) || !/^[A-Z0-9]{3}$/.test(position.book) || !new RegExp('^' + position.book + '\\.[1-9][0-9]{0,2}$').test(position.chapter)) return;
    const changedTranslation = translation.value !== position.translation;
    if (!changedTranslation && !books.some(b => b.id === position.book)) return;
    if (!changedTranslation && book.value === position.book && !chapters.some(c => c.id === position.chapter)) return;
    translation.value = position.translation;
    run(async () => {
      if (changedTranslation) await loadBooks(position.book, position.chapter);
      else if (book.value !== position.book) { book.value = position.book; await loadChapters(position.chapter); }
      else { chapter.value = position.chapter; await loadChapter(chapter.value, true); }
      $('reference').focus();
    });
  });
  run(initialise);
})();
