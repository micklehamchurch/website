(() => {
  const model = window.churchPublications;
  const create = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
  function actions(record) {
    const group = create('div', '', 'publication-actions');
    const view = create('a', `Read ${model.label(record.type)}`, 'btn btn-green');
    view.href = record.pdf; view.target = '_blank'; view.rel = 'noopener'; view.setAttribute('aria-label', `Read ${record.title}, ${model.dateLabel(record)} (PDF, opens in a new tab)`);
    const download = create('a', 'Download PDF', 'btn btn-outline-green');
    download.href = record.pdf; download.download = record.pdf.split('/').at(-1); download.setAttribute('aria-label', `Download ${record.title}, ${model.dateLabel(record)} PDF`);
    group.append(view, download); return group;
  }
  function renderLatest(records, type) {
    const target = document.querySelector(`#latest-${type}`), record = model.latest(records, type);
    target.replaceChildren(create('p', 'Latest edition', 'eyebrow'), create('h2', model.label(type)), create('p', type === 'pews-news' ? 'Our regular weekly church news sheet.' : 'News and features from parish life.'));
    if (!record) { target.append(create('p', type === 'pews-news' ? 'The next Pews News edition will be available here when it is supplied by the parish.' : 'Our Parish Magazine will be available here when the parish supplies an edition.', 'publication-empty')); return; }
    const date = create('time', model.dateLabel(record), 'publication-date'); date.dateTime = record.date;
    target.append(create('h3', record.title), date, create('p', record.description), actions(record));
  }
  function renderArchive(records) {
    const list = document.querySelector('#publication-archive'), visible = model.archive(records, document.querySelector('#publication-type').value);
    list.replaceChildren();
    const years = [...new Set(visible.map(record => record.date.slice(0, 4)))];
    for (const year of years) {
      const group = create('details', '', 'publication-year'), editions = visible.filter(record => record.date.startsWith(year));
      group.append(create('summary', `${year} · ${editions.length} ${editions.length === 1 ? 'edition' : 'editions'}`));
      for (const record of editions) {
        const row = create('article', '', 'publication-row'), text = create('div');
        text.append(create('p', model.label(record.type), 'eyebrow'), create('h3', record.title), create('p', model.dateLabel(record))); row.append(text, actions(record)); group.append(row);
      }
      list.append(group);
    }
    if (!years.length) list.append(create('p', 'Previous editions will appear here as our collection grows.', 'publication-empty'));
    document.querySelector('#publication-status').textContent = `${visible.length} previous ${visible.length === 1 ? 'edition' : 'editions'}.`;
  }
  fetch('publications-data.json').then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); }).then(data => {
    const records = model.parse(data);
    ['pews-news', 'parish-magazine'].forEach(type => renderLatest(records, type)); renderArchive(records);
    document.querySelector('#publication-type').addEventListener('change', () => renderArchive(records));
  }).catch(() => {
    document.querySelectorAll('.publication-card').forEach(card => card.append(create('p', 'Editions are temporarily unavailable. Please try again later.')));
    document.querySelector('#publication-status').textContent = 'Previous editions could not be loaded.';
  });
})();
