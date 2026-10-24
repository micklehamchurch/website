(() => {
  const model = window.churchPublications;
  let onlineEditions = [];
  const create = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
  function actions(record) {
    const group = create('div', '', 'publication-actions');
    const view = create('a', `Read ${model.label(record.type)}`, 'btn btn-green');
    view.href = record.pdf; view.target = '_blank'; view.rel = 'noopener'; view.setAttribute('aria-label', `Read ${record.title}, ${model.dateLabel(record)} (PDF, opens in a new tab)`);
    if (record.type === 'pews-news' && onlineEditions.includes(record.date)) {
      view.href = `pews-news/${record.date}.html`; view.removeAttribute('target'); view.removeAttribute('rel');
      view.setAttribute('aria-label', `Read ${record.title}, ${model.dateLabel(record)} online`);
    }
    const download = create('a', 'Download PDF', 'btn btn-outline-green');
    download.href = record.pdf; download.download = record.pdf.split('/').at(-1); download.setAttribute('aria-label', `Download ${record.title}, ${model.dateLabel(record)} PDF`);
    group.append(view, download); return group;
  }
  function renderLatest(records, type) {
    const target = document.querySelector(`#latest-${type}`), record = model.latest(records, type);
    target.replaceChildren(create('p', 'Latest edition', 'eyebrow'), create('h2', model.label(type)), create('p', type === 'pews-news' ? 'Our regular weekly church news sheet.' : 'News and features from parish life.'));
    if (!record) { target.append(create('p', type === 'pews-news' ? 'The next Pews News edition will be available here when it is supplied by the parish.' : 'Our Parish Magazine will be available here when the parish supplies an edition.', 'publication-empty')); return; }
    const date = create('time', model.dateLabel(record), 'publication-date'); date.dateTime = record.date;
    target.append(create('h3', type === 'pews-news' ? model.dateLabel(record) : record.title));
    if (type !== 'pews-news') target.append(date);
    target.append(create('p', record.description), actions(record));
    if (type === 'pews-news') {
      const recent = model.ordered(records).filter(item => item.type === type && item.id !== record.id).slice(0, 4);
      if (recent.length) {
        target.append(create('h3', 'Recent editions', 'pews-recent-heading'));
        const list = create('ul', '', 'pews-recent-editions');
        for (const item of recent) {
          const row = create('li'), link = create('a'), time = create('time', model.dateLabel(item).replace(/^[^,]+, /, ''));
          time.dateTime = item.date;
          link.href = onlineEditions.includes(item.date) ? `pews-news/${item.date}.html` : item.pdf;
          link.append(time, create('span', onlineEditions.includes(item.date) ? 'Online →' : 'PDF ↗'));
          row.append(link); list.append(row);
        }
        target.append(list);
      }
      const all = create('a', 'View all Pews News →', 'pews-view-all');
      all.href = 'pews-news.html#edition-archive'; target.append(all);
    }
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
  Promise.all([
    fetch('publications-data.json').then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); }),
    fetch('pews-news-data.json').then(response => response.ok ? response.json() : { editions: [] }).catch(() => ({ editions: [] }))
  ]).then(([data, online]) => {
    onlineEditions = Array.isArray(online.editions) ? online.editions : [];
    const records = model.parse(data);
    ['pews-news', 'parish-magazine'].forEach(type => renderLatest(records, type)); renderArchive(records);
    document.querySelector('#publication-type').addEventListener('change', () => renderArchive(records));
  }).catch(() => {
    document.querySelectorAll('.publication-card').forEach(card => card.append(create('p', 'Editions are temporarily unavailable. Please try again later.')));
    document.querySelector('#publication-status').textContent = 'Previous editions could not be loaded.';
  });
})();
