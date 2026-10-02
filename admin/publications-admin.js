(() => {
  'use strict';
  const model = window.churchPublications;
  let records = [], loaded = false, failed = false, previewUrl = null, version = null, message = '', publishing = false;
  async function loadShared() {
    if (publishing) return false;
    const api = window.churchNewsApi; if (!api) { message = 'Sign in and authorise the Admin API connection.'; return false; }
    const result = await api.loadPublications();
    if (result.ok) { records = model.parse(result); loaded = true; failed = false; version = { sha: result.sha, headSha: result.headSha }; if (!/published successfully/.test(message)) message = ''; }
    else { version = null; message = api.message(result.category); }
    window.dispatchEvent(new Event('admin-publications-ready')); return result.ok;
  }
  window.addEventListener('admin-news-ready', () => { void loadShared(); });
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  window.publicationsAdmin = {
    render() {
      return `<p class="admin-section-note" role="status">${escape(message || (version ? 'Shared PDF editions loaded from Dev.' : 'Sign in and load shared editions before publishing.'))} <button type="button" class="admin-button secondary small" data-publication-action="reload">Reload editions</button></p><div class="admin-publication-grid">${['pews-news', 'parish-magazine'].map(type => `<section class="admin-publication-panel" aria-labelledby="manage-${type}"><p class="admin-kicker">PDF EDITIONS</p><h2 id="manage-${type}">${model.label(type)}</h2><p>Keep each edition in its permanent archive. Preview your PDF, then publish it securely to Dev.</p><button type="button" class="admin-button secondary" data-publication-action="upload" data-publication-type="${type}">＋ Upload new edition</button><div class="admin-publication-list">${failed ? '<p>Existing editions could not be loaded. Please refresh to try again.</p>' : !loaded ? '<p>Loading editions…</p>' : records.filter(item => item.type === type).map(item => `<article><h3>${escape(item.title)}</h3><p>${escape(model.dateLabel(item))} · ${item.published ? 'Published' : 'Draft'}</p><a href="../${escape(item.pdf)}" target="_blank" rel="noopener">Read PDF</a></article>`).join('') || '<p>No editions have been supplied yet.</p>'}</div></section>`).join('')}</div>`;
    }
  };
  fetch('./publications-data.json').then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); }).then(data => { records = model.parse(data).sort((a, b) => b.date.localeCompare(a.date)); loaded = true; }).catch(() => { failed = true; }).finally(() => window.dispatchEvent(new Event('admin-publications-ready')));
  const dialog = () => document.querySelector('#admin-dialog');
  const release = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; };
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-publication-action]'); if (!button) return;
    const action = button.dataset.publicationAction;
    if (action === 'reload') { await loadShared(); return; }
    if (action === 'close' && publishing) return;
    if (action === 'close') { dialog().close(); release(); return; }
    if (action === 'upload') {
      const type = button.dataset.publicationType; if (!['pews-news', 'parish-magazine'].includes(type)) return;
      if (!version) await loadShared();
      release();
      dialog().innerHTML = `<form id="publication-preview-form"><div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">NEW PDF EDITION · DEV</p><h2 id="admin-dialog-title">New ${model.label(type)} edition</h2></div><button type="button" class="admin-icon-button" data-publication-action="close" aria-label="Close publication preview">×</button></div><p id="publication-publish-note" class="admin-section-note">Preview stays on your device. Publish adds a permanent edition to Dev after your confirmation; older editions are retained.</p><div class="admin-form-grid"><div class="admin-field full"><label for="publication-file">PDF file</label><input id="publication-file" name="pdf" type="file" accept=".pdf,application/pdf" required><span class="admin-field-hint">PDF only, up to 15 MiB. Each edition will have its own permanent file.</span></div><div class="admin-field"><label for="publication-date">${type === 'parish-magazine' ? 'Edition month' : 'Publication date'}</label><input id="publication-date" name="date" type="${type === 'parish-magazine' ? 'month' : 'date'}" required></div><div class="admin-field"><label for="publication-title">Title</label><input id="publication-title" name="title" value="${model.label(type)}" maxlength="180" required></div><div class="admin-field full"><label for="publication-description">Short description (optional)</label><textarea id="publication-description" name="description" maxlength="500" rows="3"></textarea></div></div><p id="publication-preview-error" role="alert"></p><div class="admin-form-actions"><button type="submit" class="admin-button secondary">Preview PDF</button><button type="button" class="admin-button" id="publication-publish" ${version ? '' : 'disabled'} aria-describedby="publication-publish-note">Publish</button></div><div id="publication-local-preview" class="admin-publication-preview" aria-live="polite"></div></div></form>`;
      dialog().showModal(); dialog().querySelector('#publication-file').focus();
      dialog().querySelector('#publication-publish').addEventListener('click', async () => {
        const form = dialog().querySelector('form'), error = form.querySelector('#publication-preview-error');
        if (!version || publishing || !form.reportValidity()) return;
        const file = form.elements.pdf.files[0];
        if (!file || file.size > 15 * 1024 * 1024 || !/\.pdf$/i.test(file.name)) { error.textContent = 'Choose a PDF no larger than 15 MiB.'; return; }
        if (!window.confirm('Publish this permanent edition to the shared Dev website? Existing editions will be retained.')) return;
        publishing = true; const publish = form.querySelector('#publication-publish'); publish.disabled = true; error.textContent = 'Publishing PDF edition…';
        let result;
        try {
          const pdfBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
          result = await window.churchNewsApi.publishPublication({ ...version, type, date: type === 'parish-magazine' ? form.elements.date.value + '-01' : form.elements.date.value, title: form.elements.title.value, description: form.elements.description.value, fileName: file.name, mimeType: file.type || 'application/pdf', pdfBase64 });
        } catch { result = { ok: false, category: 'network-failure' }; }
        publishing = false;
        if (result.ok) { message = model.label(type) + ' published successfully. The Dev website is rebuilding.'; dialog().close(); release(); await loadShared(); }
        else { error.textContent = window.churchNewsApi.message(result.category); version = null; message = error.textContent; }
      });
      dialog().querySelector('form').addEventListener('submit', async event => {
        event.preventDefault(); const form = event.currentTarget, error = form.querySelector('#publication-preview-error'); error.textContent = '';
        if (!form.reportValidity()) return;
        const file = form.elements.pdf.files[0];
        if (!file || !/\.pdf$/i.test(file.name) || file.size > 15 * 1024 * 1024 || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') { error.textContent = 'Choose a valid PDF file no larger than 15 MiB.'; return; }
        if (!form.isConnected || !dialog().open) return;
        release(); previewUrl = URL.createObjectURL(file);
        const target = form.querySelector('#publication-local-preview'); target.replaceChildren();
        const heading = document.createElement('h3'); heading.textContent = form.elements.title.value;
        const text = document.createElement('p'); text.textContent = `${form.elements.date.value} · LOCAL PREVIEW — NOT PUBLISHED`;
        const description = document.createElement('p'); description.textContent = form.elements.description.value;
        const link = document.createElement('a'); link.href = previewUrl; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open local PDF preview'; link.className = 'admin-button secondary';
        target.append(heading, text, description, link);
      });
    }
  });
  document.querySelector('#admin-dialog').addEventListener('close', release);
  document.querySelector('#admin-dialog').addEventListener('cancel', event => { if (publishing) event.preventDefault(); });
})();
