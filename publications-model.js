(function (root) {
  'use strict';
  const types = ['pews-news', 'parish-magazine'];
  const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  function parse(data) {
    if (!data || !Array.isArray(data.publications)) throw new Error('Publications must contain a publications array.');
    const ids = new Set(), paths = new Set();
    return data.publications.map(record => {
      if (!record || !types.includes(record.type) || typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || ids.has(record.id)) throw new Error('Invalid or duplicate publication identity.');
      if (typeof record.title !== 'string' || !record.title.trim() || !dateValid(record.date) || typeof record.published !== 'boolean') throw new Error('Invalid publication title, date or status.');
      if (record.description !== undefined && typeof record.description !== 'string') throw new Error('Invalid publication description.');
      const prefix = `assets/documents/news/${record.type}/`;
      if (typeof record.pdf !== 'string' || !record.pdf.startsWith(prefix) || !/^[a-z0-9-]+\.pdf$/.test(record.pdf.slice(prefix.length)) || paths.has(record.pdf)) throw new Error('PDFs require unique, safe permanent paths.');
      ids.add(record.id); paths.add(record.pdf);
      return { id: record.id, type: record.type, title: record.title.trim(), date: record.date, description: record.description || '', pdf: record.pdf, published: record.published };
    });
  }
  const ordered = records => records.filter(item => item.published).slice().sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const latest = (records, type) => ordered(records).find(item => item.type === type) || null;
  const archive = (records, type = 'all') => ordered(records).filter(item => (type === 'all' || item.type === type) && item.id !== latest(records, item.type)?.id);
  const label = type => type === 'pews-news' ? 'Pews News' : 'Parish Magazine';
  const dateLabel = record => new Intl.DateTimeFormat('en-GB', record.type === 'pews-news' ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(record.date));
  const api = { parse, latest, archive, ordered, label, dateLabel, dateValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.churchPublications = api;
})(globalThis);
