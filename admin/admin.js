(() => {
  'use strict';

  const root = document.querySelector('#admin-content');
  const nav = document.querySelector('#admin-nav');
  const menuButton = document.querySelector('.admin-mobile-menu');
  const sidebar = document.querySelector('.admin-sidebar');
  const stateKey = 'mickleham-admin-cms-demo-v1';
  const githubEdit = 'https://github.com/micklehamchurch/website/edit/Dev/';
  const images = [
    { value: '../assets/demo/parish-exterior-demo.jpg', label: 'Parish exterior (demo image)', alt: 'Demonstration photograph of a parish church exterior' },
    { value: '../assets/demo/sanctuary-interior-demo.jpg', label: 'Sanctuary interior (demo image)', alt: 'Demonstration photograph of a church sanctuary' },
    { value: '../assets/demo/community-gathering-demo.png', label: 'Community gathering (demo image)', alt: 'Demonstration photograph of a community gathering' },
    { value: '../assets/demo/churchyard-demo.jpg', label: 'Churchyard (demo image)', alt: 'Demonstration photograph of a churchyard' },
    { value: '../assets/demo/chapel-exterior-demo.jpg', label: 'Chapel exterior (demo image)', alt: 'Demonstration photograph of a chapel exterior' }
  ];
  const sections = [
    ['dashboard', '⌂', 'Overview'], ['news', '▤', 'News & Magazine'], ['calendar', '▦', 'Calendar'], ['contacts', '♧', 'Parish Contacts'],
    ['documents', '▧', 'Documents'], ['services', '✝', 'Worship & Services'], ['gallery', '▧', 'Gallery'], ['media', '▷', 'Media / YouTube'],
    ['community', '♧', 'Our Community'], ['pages', '▤', 'Pages'], ['settings', '⚙', 'Website Settings']
  ];
  const workflowView = 'publishing';
  const initialState = () => ({
    calendar: { created: [], updated: {}, deleted: [] },
    news: { created: [], updated: {}, deleted: [] },
    contacts: { working: null }
  });
  let demoState = initialState();
  let baseEvents = [];
  let baseArticles = [];
  let baseContacts = { sections: [], contacts: [], pccMembers: [] };
  let basePages = [];
  let contentManagedSlugs = new Set();
  let documentGroups = [];
  let recordsReady = false;
  let toastTimer;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const escAttr = safe;
  const dateLabel = (value, options = { day: 'numeric', month: 'long', year: 'numeric' }) => {
    if (!value) return 'Date not provided';
    const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsed.valueOf()) ? safe(value) : new Intl.DateTimeFormat('en-GB', options).format(parsed);
  };
  const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'demo-article';
  const idFor = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const optionsForImages = selected => `<option value="">No image selected</option>${images.map(image => `<option value="${escAttr(image.value)}" ${selected === image.value ? 'selected' : ''}>${safe(image.label)}</option>`).join('')}`;

  function readDemoState() {
    try {
      const stored = sessionStorage.getItem(stateKey);
      if (!stored) return initialState();
      const parsed = JSON.parse(stored);
      return {
        calendar: { ...initialState().calendar, ...(parsed.calendar || {}) },
        news: { ...initialState().news, ...(parsed.news || {}) },
        contacts: { ...initialState().contacts, ...(parsed.contacts || {}) }
      };
    } catch (error) {
      console.warn('The development preview could not read its session data.', error);
      return initialState();
    }
  }
  function persistDemoState() {
    try {
      sessionStorage.setItem(stateKey, JSON.stringify(demoState));
      return true;
    } catch (error) {
      console.error(error);
      showToast('This browser could not save the preview change for this tab. No shared website content was changed.', true);
      return false;
    }
  }
  function showToast(message, isError = false) {
    const toast = document.querySelector('#admin-toast');
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 6500);
  }
  function savedToast(action) {
    showToast(`${action} — Saved in development preview. To publish to the shared Dev website, commit the corresponding repository content.`);
  }
  function currentView() {
    const wanted = location.hash.slice(1) || 'dashboard';
    return sections.some(([id]) => id === wanted) || wanted === workflowView ? wanted : 'dashboard';
  }
  function setNavigation(view) {
    nav.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
    nav.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false'));
  }
  function demoBanner() {
    return `<div class="admin-demo-banner" role="note"><span class="admin-demo-pill">DEVELOPMENT DEMO</span><p>Changes here are saved only in this browser tab for demonstration. They do not publish to the shared website.</p></div>`;
  }
  function pageHeading(kicker, title, description, action = '') {
    return `<div class="admin-page-heading"><div><p class="admin-kicker">${safe(kicker)}</p><h1>${safe(title)}</h1><p>${safe(description)}</p></div>${action}</div>`;
  }
  function workflowPanel(compact = false) {
    return `<section class="admin-publishing-panel ${compact ? 'compact' : ''}"><div><p class="admin-kicker">SHARED WEBSITE · CURRENT PROCESS</p><h2>How publishing works today</h2><p>The dashboard prototype is for practicing the future editing experience. Shared content is still published from repository files with GitHub access.</p></div><ol class="admin-publishing-steps"><li><strong>Practise here.</strong> Create, edit and preview demo content in this tab.</li><li><strong>Commit the approved content.</strong> An authorised editor records it in <code>_content/calendar.json</code>, <code>_content/news.json</code> or <code>_content/contacts.json</code> on <code>Dev</code>.</li><li><strong>Build and review.</strong> GitHub Actions validates the files and regenerates calendar pages, article pages, the contact directory and search.</li><li><strong>Deploy.</strong> GitHub Pages serves the generated version after the workflow completes.</li></ol><p class="admin-publishing-note">A future secure CMS will let volunteers sign in, edit the shared source directly and upload approved images. That needs an authenticated backend and media storage; this static dashboard does not provide those services.</p><details class="admin-technical-details"><summary>Repository editing links for authorised editors</summary><div><a href="${githubEdit}_content/calendar.json" target="_blank" rel="noopener noreferrer">Calendar source on GitHub ↗</a><a href="${githubEdit}_content/news.json" target="_blank" rel="noopener noreferrer">News source on GitHub ↗</a><a href="${githubEdit}_content/contacts.json" target="_blank" rel="noopener noreferrer">Parish contacts source on GitHub ↗</a></div></details></section>`;
  }
  function demoCounts() {
    const events = listRecords('calendar');
    const articles = listRecords('news');
    return { eventCount: events.length, newsCount: articles.length, drafts: [...events, ...articles].filter(item => item.status === 'draft').length };
  }
  function overview() {
    const counts = demoCounts();
    const labels = {
      calendar: ['▦', 'Calendar / Events', `${baseEvents.length} current church events. Preview event edits in this tab.`],
      news: ['▤', 'News & Announcements', `${counts.newsCount} current articles. Practise an article preview.`],
      pages: ['▱', 'Pages', `${basePages.length} public pages with links to their current content source.`],
      contacts: ['♧', 'Contacts', `${contactRecords().length} parish contacts across ${baseContacts.sections.length} sections.`],
      documents: ['▧', 'Documents', `${documentGroups.reduce((total, group) => total + group.items.length, 0)} migrated pages and files to view or manage.`],
      media: ['▷', 'Media', 'See how current photos and YouTube content are managed today.'],
      website: ['↗', 'Website', 'Open the current public Dev website.']
    };
    return `${pageHeading('CHURCH WEBSITE CONTENT', 'Welcome', 'Manage the St Michael & All Angels website and preview how future updates could work.', '<span class="admin-prototype-tag">DEVELOPMENT DEMO</span>')}
      <div class="admin-summary-grid"><div class="admin-summary-card"><strong>${baseEvents.length}</strong><span>real calendar events loaded</span></div><div class="admin-summary-card"><strong>${demoState.calendar.created.length}</strong><span>demo events added in this tab</span></div><div class="admin-summary-card"><strong>${counts.newsCount}</strong><span>news articles in this preview</span></div><div class="admin-summary-card"><strong>${contactRecords().filter(item => item.status === 'published').length}</strong><span>published parish contacts</span></div><div class="admin-summary-card"><strong>${counts.drafts}</strong><span>drafts in this preview</span></div></div>
      <div class="admin-section-label">MANAGE THE WEBSITE</div><div class="admin-card-grid admin-overview-grid">${Object.entries(labels).map(([id, [icon, title, desc]]) => id === 'website' ? `<a class="admin-section-card" href="../index.html"><span class="admin-card-icon" aria-hidden="true">${icon}</span><strong>${safe(title)}</strong><small>${safe(desc)}</small></a>` : `<button class="admin-section-card" type="button" data-go="${id}"><span class="admin-card-icon" aria-hidden="true">${icon}</span><strong>${safe(title)}</strong><small>${safe(desc)}</small></button>`).join('')}</div>
      <div class="admin-quick-links"><a href="../calendar.html">Open Calendar ↗</a><a href="../news.html">Open News ↗</a><a href="../parish-contact-directory.html">Open Contact Directory ↗</a></div>
      ${workflowPanel(true)}
      <button type="button" class="admin-reset-link" data-action="reset-demo">Clear this tab’s demo changes</button>`;
  }

  function listRecords(kind) {
    const source = kind === 'calendar' ? demoState.calendar : demoState.news;
    const baseline = kind === 'calendar' ? baseEvents : baseArticles;
    const changed = baseline.filter(item => !source.deleted.includes(item.id)).map(item => ({ ...item, ...(source.updated[item.id] || {}), id: item.id, _origin: 'repository' }));
    return [...changed, ...source.created.map(item => ({ ...item, _origin: 'demo' }))];
  }
  function eventCategory(item) {
    const title = `${item.title || ''} ${item.location || ''}`.toLowerCase();
    if (/baptis|wedding|funeral|christmas|easter|special/.test(title)) return 'Special service';
    if (/chapel/.test(title)) return 'Weekly worship';
    if (/worship|communion|prayer|service/.test(title)) return 'Worship & Services';
    return 'Parish event';
  }
  function eventFields(item) {
    return {
      id: item.id,
      title: item.title || '',
      date: String(item.start || '').slice(0, 10),
      startTime: String(item.start || '').slice(11, 16),
      endTime: String(item.end || '').slice(11, 16),
      location: item.location || '',
      description: item.description || '',
      category: item.category || eventCategory(item),
      image: item.image || '',
      externalLink: item.externalLink || item.sourceUrl || '',
      status: item.status || 'published',
      timeZone: item.timeZone || 'Europe/London',
      _origin: item._origin
    };
  }
  function eventStart(value) { return `${value.date}T${value.startTime}`; }
  function eventEnd(value) { return value.endTime ? `${value.date}T${value.endTime}` : ''; }
  function calendarView() {
    const today = new Date().toISOString().slice(0, 10);
    const records = listRecords('calendar').map(eventFields).sort((a, b) => {
      const aFuture = a.date >= today;
      const bFuture = b.date >= today;
      return aFuture !== bFuture ? (aFuture ? -1 : 1) : eventStart(a).localeCompare(eventStart(b));
    });
    const action = '<div class="admin-heading-actions"><a class="admin-button secondary" href="../calendar.html" target="_blank" rel="noopener noreferrer">Preview public calendar ↗</a><button class="admin-button" type="button" data-action="add" data-kind="calendar">＋ Add event</button></div>';
    return `${pageHeading('EVENTS & SERVICES', 'Calendar', 'Upcoming events appear first. Review the existing calendar and practise managing preview-only changes.', action)}
      ${demoBanner()}<div class="admin-section-note"><strong>Real source calendar:</strong> the ${baseEvents.length} existing feed events are preserved here. Edits and removals you try in this demo are temporary overlays in this browser tab; they never alter the real feed or repository.</div>
      <div class="admin-list-toolbar"><label for="calendar-filter">Find an event</label><input id="calendar-filter" type="search" placeholder="Search title, date or location"><span>${records.length} items shown</span></div>
      <div class="admin-cms-list" id="calendar-records">${records.map(item => recordCard('calendar', item)).join('') || '<p class="admin-empty">No calendar items match this view.</p>'}</div>`;
  }
  function articleDateToInput(value) {
    const match = String(value || '').match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (!match) return '';
    const parsed = new Date(`${match[1]} ${match[2]} ${match[3]} 12:00:00`);
    if (Number.isNaN(parsed.valueOf())) return '';
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  function articleFields(item) {
    return {
      id: item.id || item.slug,
      slug: item.slug || '',
      title: item.title || '',
      summary: item.excerpt || '',
      content: (item.paragraphs || []).join('\n\n'),
      category: item.category || 'Parish news',
      date: item.date || articleDateToInput(item.dateLabel),
      image: item.image || '',
      status: item.status || 'published',
      demo: item.demo !== false,
      galleryLink: item.galleryLink || '',
      _origin: item._origin
    };
  }
  function newsView() {
    const records = listRecords('news').map(articleFields).sort((a, b) => b.date.localeCompare(a.date));
    const action = '<button class="admin-button" type="button" data-action="add" data-kind="news">＋ Add article</button>';
    return `${pageHeading('PARISH STORIES & UPDATES', 'News & Magazine', 'Practise drafting a parish article, choosing an image and checking its preview.', action)}
      ${demoBanner()}<div class="admin-section-note"><strong>Current news:</strong> published articles are shown from the public news feed; explicitly marked fictional samples are shown as SAMPLE / DEMO previews. Edits in this screen stay in this tab and do not update the public listing, generated article pages or search index.</div>
      <div class="admin-list-toolbar"><label for="news-filter">Find an article</label><input id="news-filter" type="search" placeholder="Search title, category or summary"><span>${records.length} items shown</span></div>
      <div class="admin-cms-list news-list" id="news-records">${records.map(item => recordCard('news', item)).join('') || '<p class="admin-empty">No news items match this view.</p>'}</div>`;
  }
  function contactData() {
    return JSON.parse(JSON.stringify(demoState.contacts.working || baseContacts));
  }
  function contactRecords() { return contactData().contacts || []; }
  function contactsView() {
    const data = contactData();
    const published = data.contacts.filter(item => item.status === 'published').length + data.pccMembers.filter(item => item.status === 'published').length;
    const drafts = data.contacts.filter(item => item.status === 'draft').length + data.pccMembers.filter(item => item.status === 'draft').length;
    const sectionViews = data.sections.filter(section => section.id !== 'pcc-members').map(section => {
      const records = data.contacts.filter(item => item.section === section.id);
      return `<section class="admin-contact-section"><div class="admin-contact-section-head"><div><p class="admin-kicker">${safe(section.eyebrow)}</p><h2>${safe(section.title)}</h2></div><button class="admin-button secondary small" type="button" data-action="add-contact" data-section="${escAttr(section.id)}">＋ Add contact</button></div><div class="admin-contact-grid">${records.map(item => contactCard(item)).join('') || '<p class="admin-empty">No contacts in this section.</p>'}</div></section>`;
    }).join('');
    const pcc = data.pccMembers.map((item, index) => `<li class="admin-pcc-row"><strong>${safe(item.name)}</strong><span class="admin-status ${item.status === 'draft' ? 'draft' : 'feed'}">${item.status === 'draft' ? 'Draft' : 'Published'}</span><div class="admin-actions"><button class="admin-button secondary small" type="button" data-action="move-pcc" data-id="${escAttr(item.id)}" data-direction="-1" aria-label="Move ${escAttr(item.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button><button class="admin-button secondary small" type="button" data-action="move-pcc" data-id="${escAttr(item.id)}" data-direction="1" aria-label="Move ${escAttr(item.name)} down" ${index === data.pccMembers.length - 1 ? 'disabled' : ''}>↓</button><button class="admin-button secondary small" type="button" data-action="edit-pcc" data-id="${escAttr(item.id)}">Edit</button><button class="admin-button danger small" type="button" data-action="delete-pcc" data-id="${escAttr(item.id)}">Delete</button></div></li>`).join('');
    const downloadLink = `<button class="admin-button" type="button" data-action="download-contacts">Download updated contacts file</button>`;
    return `${pageHeading('PEOPLE & PARISH CONTACTS', 'Parish Contacts', 'Review and prepare contact updates for the shared Parish Contact Directory.', '<a class="admin-button" href="../parish-contact-directory.html" target="_blank" rel="noopener noreferrer">Preview public directory ↗</a>')}
      <div class="admin-demo-banner" role="note"><span class="admin-demo-pill">REPOSITORY WORKFLOW</span><p>Edits here are a development preview saved in this browser tab. To publish them: download the updated <code>contacts.json</code>, open the source on GitHub, replace the file contents with the downloaded JSON, then commit the change to <code>Dev</code>. The website build regenerates the public directory and search index. This dashboard does not commit changes or use GitHub credentials.</p></div>
      <div class="admin-section-note"><strong>${published} published · ${drafts} draft</strong><br>Published items appear in the public directory after the repository update is built. Draft contacts and draft PCC members are left out of the public page and search index.</div>
      <div class="admin-contact-toolbar"><button class="admin-button" type="button" data-action="add-contact">＋ Add contact</button><button class="admin-button secondary" type="button" data-action="add-pcc">＋ Add PCC member</button>${downloadLink}<a class="admin-button secondary" href="${githubEdit}_content/contacts.json" target="_blank" rel="noopener noreferrer">Open source on GitHub ↗</a></div>
      ${sectionViews}
      <section class="admin-contact-section admin-pcc-section"><div class="admin-contact-section-head"><div><p class="admin-kicker">PARISH COUNCIL</p><h2>PCC members</h2><p>Names only; no phone or email fields are collected for this separate list.</p></div><button class="admin-button secondary small" type="button" data-action="add-pcc">＋ Add PCC member</button></div><ol class="admin-pcc-list">${pcc || '<li class="admin-empty">No PCC members are listed.</li>'}</ol></section>
      <p class="admin-contact-note">The public page is built from <code>_content/contacts.json</code>. The dashboard uses temporary session changes for review; download the file and commit it to share approved updates.</p>`;
  }
  function contactCard(item) {
    return `<article class="admin-contact-card"><div class="admin-record-meta"><span class="admin-status ${item.status === 'draft' ? 'draft' : 'feed'}">${item.status === 'draft' ? 'Draft' : 'Published'}</span></div><p class="admin-contact-role">${safe(item.role)}</p><h3>${safe(item.name)}</h3>${item.phone ? `<p>${safe(item.phone)}</p>` : ''}${item.email ? `<p>${safe(item.email)}</p>` : ''}<div class="admin-actions"><button class="admin-button secondary small" type="button" data-action="edit-contact" data-id="${escAttr(item.id)}">Edit</button><button class="admin-button secondary small" type="button" data-action="toggle-contact-status" data-id="${escAttr(item.id)}">${item.status === 'draft' ? 'Publish in preview' : 'Move to draft'}</button><button class="admin-button danger small" type="button" data-action="delete-contact" data-id="${escAttr(item.id)}">Delete</button></div></article>`;
  }
  function recordCard(kind, item) {
    const fields = item;
    const date = kind === 'calendar' ? dateLabel(fields.date) : dateLabel(fields.date);
    const time = kind === 'calendar' ? ` · ${safe(fields.startTime || 'Time not set')}` : '';
    const title = fields.title || 'Untitled';
    const description = kind === 'calendar' ? fields.location : fields.summary;
    const origin = item._origin === 'repository' ? '<span class="admin-status feed">Current website content</span>' : '<span class="admin-status demo">DEMO ITEM</span>';
    const sample = kind === 'news' && item.demo ? '<span class="admin-status demo">SAMPLE / DEMO</span>' : '';
    const image = fields.image ? `<img class="admin-record-image" src="${escAttr(fields.image)}" alt="${safe(imageAlt(fields.image))}"><small class="admin-image-caption">Demo image · replace with church-approved photography in a future CMS</small>` : '';
    return `<article class="admin-cms-card ${fields.image ? 'has-image' : ''}" data-record-card data-search="${escAttr(`${title} ${fields.category} ${fields.location || ''} ${fields.summary || ''} ${fields.date}`.toLowerCase())}">${image}<div class="admin-cms-card-main"><div class="admin-record-meta"><span>${safe(fields.category)}</span><span>${safe(date)}${time}</span>${origin}${sample}<span class="admin-status ${fields.status === 'draft' ? 'draft' : ''}">${fields.status === 'draft' ? 'Draft' : 'Published in preview'}</span></div><h2>${safe(title)}</h2><p>${safe(description || (kind === 'calendar' ? 'No location supplied' : 'No summary supplied'))}</p><div class="admin-actions"><button class="admin-button secondary small" type="button" data-action="preview" data-kind="${kind}" data-id="${escAttr(fields.id)}">Preview</button><button class="admin-button secondary small" type="button" data-action="edit" data-kind="${kind}" data-id="${escAttr(fields.id)}">Edit</button><button class="admin-button secondary small" type="button" data-action="toggle-status" data-kind="${kind}" data-id="${escAttr(fields.id)}">${fields.status === 'draft' ? 'Publish in preview' : 'Move to draft'}</button><button class="admin-button danger small" type="button" data-action="delete" data-kind="${kind}" data-id="${escAttr(fields.id)}">Delete</button></div></div></article>`;
  }
  function imageAlt(path) { return images.find(item => item.value === path)?.alt || 'Demonstration church website image'; }

  function sourceForPage(page) {
    const route = String(page.url || '').replace(/^\//, '');
    const slug = route.replace(/\.html?$/i, '');
    if (slug === 'calendar') return '_content/calendar-source.ics';
    if (slug === 'news' || route.startsWith('news/')) return '_content/news.json';
    if (slug === 'parish-contact-directory') return '_content/contacts.json';
    if (contentManagedSlugs.has(slug)) return 'content-pages.json';
    return route || 'index.html';
  }

  function pagesView() {
    const cards = basePages.map(page => {
      const route = String(page.url || '').replace(/^\//, '');
      const source = sourceForPage(page);
      const search = `${page.title || ''} ${page.description || ''} ${route}`.toLowerCase();
      return `<article class="admin-page-record" data-managed-card data-search="${escAttr(search)}"><div><span class="admin-status">Website page</span><h2>${safe(page.title || route)}</h2><p>${safe(page.description || '')}</p><small>${safe(route)}</small></div><div class="admin-actions"><a class="admin-button secondary small" href="../${escAttr(route)}" target="_blank" rel="noopener noreferrer">View page ↗</a><a class="admin-button small" href="${githubEdit}${escAttr(source)}" target="_blank" rel="noopener noreferrer">Manage content source ↗</a></div></article>`;
    }).join('');
    return `${pageHeading('WEBSITE INFORMATION', 'Pages', 'Browse the public pages and open the repository source used to maintain each one.', '<a class="admin-button secondary" href="../index.html" target="_blank" rel="noopener noreferrer">Open website ↗</a>')}
      <div class="admin-section-note"><strong>Current capability:</strong> pages are maintained in repository files or generated from the shared page content file. This screen links to the right source; it does not edit or publish page content in the browser.</div>
      <div class="admin-list-toolbar"><label for="page-filter">Find a page</label><input id="page-filter" type="search" placeholder="Search page title or topic"><span>${basePages.length} pages</span></div>
      <div class="admin-managed-list" id="page-records">${cards || '<p class="admin-empty">No public pages were found in the current search index.</p>'}</div>`;
  }

  function documentsView() {
    const groups = documentGroups.map(group => `<section class="admin-document-group"><h2>${safe(group.section)}</h2><div class="admin-document-grid">${group.items.map(item => `<article class="admin-document-card" data-managed-card data-search="${escAttr(`${group.section} ${item.title} ${item.kind} ${item.note || ''}`.toLowerCase())}"><div class="admin-document-icon" aria-hidden="true">▤</div><div class="admin-document-copy"><span class="admin-status">${safe(item.kind)}</span><h3>${safe(item.title)}</h3><p>${safe(item.note || '')}</p></div><div class="admin-actions"><a class="admin-button secondary small" href="../${escAttr(item.path)}" target="_blank" rel="noopener noreferrer">View ${item.kind === 'Web page' ? 'page' : 'file'} ↗</a><a class="admin-button small" href="https://github.com/micklehamchurch/website/blob/Dev/${escAttr(item.source)}" target="_blank" rel="noopener noreferrer">${item.kind === 'Web page' ? 'Manage page source' : 'Open repository file'} ↗</a></div></article>`).join('')}</div></section>`).join('');
    const count = documentGroups.reduce((total, group) => total + group.items.length, 0);
    return `${pageHeading('PARISH RESOURCES', 'Documents', 'Find the forms, policies and guidance currently held in the website repository.')}
      <div class="admin-section-note"><strong>Repository-managed documents:</strong> view the current public file or open its source location for an authorised editor to replace it. This dashboard does not upload files or change the shared website.</div>
      <div class="admin-list-toolbar"><label for="document-filter">Find a document</label><input id="document-filter" type="search" placeholder="Search forms, policies or guidance"><span>${count} resources</span></div>${groups}`;
  }

  function mediaView() {
    const samples = images.map(image => `<article class="admin-media-card"><img src="${escAttr(image.value)}" alt="${safe(image.alt)}"><div><strong>${safe(image.label)}</strong><p>Available in the development image selector. Replacing or uploading parish photographs requires a future authenticated media library.</p></div></article>`).join('');
    return `${pageHeading('PHOTOGRAPHS & VIDEO', 'Media', 'Review current media and understand how it is managed for the website.', '<a class="admin-button secondary" href="../sunday-services.html" target="_blank" rel="noopener noreferrer">Open Sunday Services ↗</a>')}
      <div class="admin-section-note"><strong>No online upload manager is connected.</strong> Images and video links are maintained in repository content. The event and article forms can select from the existing labelled demo images, but cannot upload a photograph or publish a replacement. A future CMS will need secure media storage.</div>
      <section class="admin-media-section"><p class="admin-kicker">CURRENT PHOTO OPTIONS</p><h2>Illustrative development images</h2><p>These are the existing illustrative images used to demonstrate layouts. They are not presented as official parish photographs.</p><div class="admin-media-grid">${samples}</div><a class="admin-source-link" href="${githubEdit}assets/demo/README.txt" target="_blank" rel="noopener noreferrer">View media notes in the repository ↗</a></section>
      <section class="admin-media-section"><p class="admin-kicker">VIDEO</p><h2>Sunday Services on YouTube</h2><p>The Sunday Services page embeds the parish playlist and links to the church’s YouTube content.</p><a class="admin-button secondary" href="../sunday-services.html" target="_blank" rel="noopener noreferrer">Preview Media page ↗</a></section>`;
  }

  const futureAreas = {
    services: ['Worship & Services', 'Help visitors find worship information and life events.', [['Sunday Services', '../sunday-services.html'], ['Weekly Worship', '../weekly-worship.html'], ['Baptisms', '../baptisms.html'], ['Weddings', '../weddings.html'], ['Funerals', '../funerals.html'], ['Prayer', '../prayer.html'], ['Edit Prayer content on GitHub', `${githubEdit}content-pages.json`], ['Archived Cycle of Prayer (August 2023–March 2024)', '../assets/documents/prayer/cycle-of-prayer-2023-4.pdf'], ['Cycle of Prayer PDF source on GitHub', 'https://github.com/micklehamchurch/website/blob/Dev/assets/documents/prayer/cycle-of-prayer-2023-4.pdf'], ['Pastoral Care', '../pastoral-care.html'], ['Edit Pastoral Care content on GitHub', `${githubEdit}content-pages.json`], ['View Privacy & GDPR page', '../privacy.html'], ['Edit Privacy & GDPR source on GitHub', `${githubEdit}content-pages.json`], ['View Data Privacy Consent Form', '../assets/documents/privacy/data-privacy-consent-form.pdf'], ['Replace Data Privacy Consent Form PDF on GitHub', 'https://github.com/micklehamchurch/website/blob/Dev/assets/documents/privacy/data-privacy-consent-form.pdf'], ['Electoral Roll', '../electoral-roll.html'], ['Edit Electoral Roll page content on GitHub', `${githubEdit}content-pages.json`], ['Electoral Roll Application Form', '../assets/documents/electoral-roll/electoral-roll-application-form.pdf'], ['Electoral Roll Privacy Notice', '../assets/documents/electoral-roll/electoral-roll-privacy-notice.pdf'], ['Application Form source on GitHub', 'https://github.com/micklehamchurch/website/blob/Dev/assets/documents/electoral-roll/electoral-roll-application-form.pdf'], ['Privacy Notice source on GitHub', 'https://github.com/micklehamchurch/website/blob/Dev/assets/documents/electoral-roll/electoral-roll-privacy-notice.pdf'], ['Eco Church', '../eco-church.html'], ['Edit Eco Church source on GitHub', `${githubEdit}content-pages.json`], ['Fellowship & Bible Study Groups', '../bible-study-fellowship.html'], ['Edit Fellowship & Bible Study Groups source on GitHub', `${githubEdit}content-pages.json`], ['Churchyard Trail document', '../assets/documents/eco-church/churchyard-trail-2024.docx'], ['Sustainable Flowers guidance', '../assets/documents/eco-church/sustainable-church-flowers-guidance.docx'], ['Churchyard Trail source on GitHub', 'https://github.com/micklehamchurch/website/blob/Dev/assets/documents/eco-church/churchyard-trail-2024.docx'], ['Sustainable Flowers source on GitHub', 'https://github.com/micklehamchurch/website/blob/Dev/assets/documents/eco-church/sustainable-church-flowers-guidance.docx'], ['Finding us', '../finding-us.html'], ['Contact', '../contact.html'], ['Search the website', '../search.html']]],
    gallery: ['Gallery', 'Explore the current public gallery and the approved-image workflow.', [['Open the public gallery', '../gallery.html'], ['Image notes in the repository', `${githubEdit}assets/demo/README.txt`]]],
    community: ['Our Community', 'Explore existing community pages and their current source content.', [['Children & Families', '../children-families.html'], ['Alpha Course', '../alpha.html'], ['Bible Study & Fellowship', '../bible-study-fellowship.html'], ['Pastoral Care', '../pastoral-care.html'], ['Prayer', '../prayer.html'], ['Community Events', '../whats-on.html'], ['Volunteering', '../volunteering.html'], ['Supporting the Community', '../supporting-community.html']]],
    settings: ['Website Settings', 'A future signed-in CMS could manage approved site-wide details and publishing preferences.', [['Public website', '../index.html'], ['Calendar', '../calendar.html'], ['News & Magazine', '../news.html'], ['Give', '../give.html']]]
  };
  function futureView(view) {
    const [title, desc, links] = futureAreas[view];
    return `${pageHeading('CMS AREA PREVIEW', title, desc)}${demoBanner()}<section class="admin-coming-soon"><span class="admin-card-icon" aria-hidden="true">${safe(sections.find(([id]) => id === view)?.[1] || '◇')}</span><div><h2>Future CMS area</h2><p>This section previews where a secure online CMS could manage this content. The current publishing workflow remains the repository build on <code>Dev</code>; no changes made here are saved to the website.</p><p class="admin-image-caption">Future media library: authorised editors could upload, replace, caption and reuse church-approved images stored in secure cloud media storage.</p></div></section><h2 class="admin-subheading">Explore the current website</h2><div class="admin-link-grid">${links.map(([label, href]) => `<a class="admin-dashboard-card" href="${escAttr(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}><strong>${safe(label)}</strong><span aria-hidden="true"> ↗</span></a>`).join('')}</div>`;
  }
  function publishingView() {
    return `${pageHeading('SHARED DEV WEBSITE', 'How publishing works today', 'The prototype lets volunteers practise the future workflow. Approved shared changes continue to come from repository content.')}${demoBanner()}${workflowPanel()}<div class="admin-section-note"><strong>About this preview’s storage:</strong> demo changes use this browser tab’s session storage, which clears when the tab session ends. They are not in the project files, not visible to other visitors and not published. There is no GitHub token or credential in the dashboard.</div><button type="button" class="admin-button secondary" data-action="reset-demo">Clear this tab’s demo changes</button>`;
  }
  function render({ focus = true } = {}) {
    const view = currentView();
    setNavigation(view);
    if (!recordsReady) {
      root.innerHTML = `<p class="admin-loading" role="status">Loading the church calendar and sample articles…</p>`;
      return;
    }
    const markup = view === 'dashboard' ? overview()
      : view === 'calendar' ? calendarView()
        : view === 'news' ? newsView()
      : view === 'contacts' ? contactsView()
          : view === 'pages' ? pagesView()
            : view === 'documents' ? documentsView()
              : view === 'media' ? mediaView()
          : view === workflowView ? publishingView() : futureView(view);
    root.innerHTML = markup;
    if (focus) document.querySelector('#admin-main').focus({ preventScroll: true });
  }

  function field(label, name, value = '', options = {}) {
    const { type = 'text', required = false, full = false, hint = '', choices = null, rows = 4, placeholder = '' } = options;
    const id = `admin-field-${name}`;
    const control = choices
      ? `<select id="${id}" name="${name}" ${required ? 'required' : ''}>${choices.map(([key, text]) => `<option value="${escAttr(key)}" ${value === key ? 'selected' : ''}>${safe(text)}</option>`).join('')}</select>`
      : type === 'textarea'
        ? `<textarea id="${id}" name="${name}" rows="${rows}" ${required ? 'required' : ''} placeholder="${escAttr(placeholder)}">${safe(value)}</textarea>`
        : `<input id="${id}" name="${name}" type="${type}" value="${escAttr(value)}" ${required ? 'required' : ''} placeholder="${escAttr(placeholder)}">`;
    return `<div class="admin-field ${full ? 'full' : ''}"><label for="${id}">${safe(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${control}${hint ? `<span class="admin-field-hint">${safe(hint)}</span>` : ''}</div>`;
  }
  function openContactEditor(id = '', sectionId = '') {
    const data = contactData();
    const item = id ? data.contacts.find(contact => contact.id === id) : null;
    if (id && !item) return showToast('That contact is no longer available in this preview.', true);
    const sectionChoices = data.sections.filter(section => section.id !== 'pcc-members').map(section => [section.id, section.title]);
    const dialog = document.querySelector('#admin-dialog');
    dialog.innerHTML = `<form id="admin-contact-form" novalidate><div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">PARISH CONTACTS · DEVELOPMENT PREVIEW</p><h2 id="admin-dialog-title">${item ? 'Edit contact' : 'Add contact'}</h2><p>Save a preview, then download and commit the source file to publish.</p></div><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Close editor">×</button></div><input type="hidden" name="id" value="${escAttr(item?.id || '')}"><input type="hidden" name="groupId" value="${escAttr(item?.groupId || '')}"><div class="admin-form-grid">${field('Role', 'role', item?.role || '', { required: true, full: true, placeholder: 'For example, Parish Administrator' })}${field('Name', 'name', item?.name || '', { required: true })}${field('Section', 'section', item?.section || sectionId || sectionChoices[0]?.[0] || '', { required: true, choices: sectionChoices })}${field('Telephone', 'phone', item?.phone || '', { type: 'tel', hint: 'Optional. Use normal UK telephone formatting.' })}${field('Email', 'email', item?.email || '', { type: 'email', hint: 'Optional.' })}${field('Status', 'status', item?.status || 'published', { required: true, choices: [['published', 'Published'], ['draft', 'Draft']] })}</div><p class="admin-form-error" id="admin-form-error" role="alert" hidden></p><div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="admin-button">Save in development preview</button></div></div></form>`;
    dialog.showModal();
    const form = dialog.querySelector('#admin-contact-form');
    form.addEventListener('submit', event => { event.preventDefault(); saveContactForm(form); });
    form.querySelector('[name="role"]')?.focus();
  }
  function openPccEditor(id = '') {
    const data = contactData();
    const item = id ? data.pccMembers.find(member => member.id === id) : null;
    if (id && !item) return showToast('That PCC member is no longer available in this preview.', true);
    const dialog = document.querySelector('#admin-dialog');
    dialog.innerHTML = `<form id="admin-pcc-form" novalidate><div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">PCC MEMBERS · DEVELOPMENT PREVIEW</p><h2 id="admin-dialog-title">${item ? 'Edit PCC member' : 'Add PCC member'}</h2><p>This list stores names only.</p></div><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Close editor">×</button></div><input type="hidden" name="id" value="${escAttr(item?.id || '')}"><div class="admin-form-grid">${field('Name', 'name', item?.name || '', { required: true, full: true, placeholder: 'Enter the member’s name' })}${field('Status', 'status', item?.status || 'published', { required: true, choices: [['published', 'Published'], ['draft', 'Draft']] })}</div><p class="admin-form-error" id="admin-form-error" role="alert" hidden></p><div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="admin-button">Save in development preview</button></div></div></form>`;
    dialog.showModal();
    const form = dialog.querySelector('#admin-pcc-form');
    form.addEventListener('submit', event => { event.preventDefault(); savePccForm(form); });
    form.querySelector('[name="name"]')?.focus();
  }
  function saveContactData(data, message) {
    demoState.contacts.working = data;
    if (!persistDemoState()) return;
    document.querySelector('#admin-dialog').close();
    render({ focus: false });
    savedToast(message);
  }
  function contactIdFor(data, role, name) {
    const stem = slugify(`${role}-${name}`);
    let id = stem, suffix = 2;
    while (data.contacts.some(item => item.id === id)) id = `${stem}-${suffix++}`;
    return id;
  }
  function saveContactForm(form) {
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const error = document.querySelector('#admin-form-error');
    let message = '';
    if (!values.name.trim()) message = 'Enter a name.';
    else if (!values.role.trim()) message = 'Enter a role.';
    else if (!baseContacts.sections.some(section => section.id === values.section && section.id !== 'pcc-members')) message = 'Choose one of the supported contact sections.';
    else if (!['published', 'draft'].includes(values.status)) message = 'Choose Published or Draft.';
    else if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) message = 'Enter a valid email address.';
    else if (values.phone && (!/^[+0-9().\s-]+$/.test(values.phone) || values.phone.replace(/\D/g, '').length < 7)) message = 'Enter a valid telephone number using normal UK formatting.';
    error.textContent = message; error.hidden = !message;
    if (message) return;
    const data = contactData();
    const index = data.contacts.findIndex(item => item.id === values.id);
    const old = index >= 0 ? data.contacts[index] : null;
    const entry = { id: old?.id || contactIdFor(data, values.role.trim(), values.name.trim()), role: values.role.trim(), name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim(), section: values.section, status: values.status };
    if (old?.groupId && old.role === entry.role && old.section === entry.section) entry.groupId = old.groupId;
    if (index >= 0) data.contacts[index] = entry; else data.contacts.push(entry);
    saveContactData(data, old ? 'Contact updated' : 'Contact added');
  }
  function savePccForm(form) {
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const error = document.querySelector('#admin-form-error');
    const message = !values.name.trim() ? 'Enter a name.' : !['published', 'draft'].includes(values.status) ? 'Choose Published or Draft.' : '';
    error.textContent = message; error.hidden = !message;
    if (message) return;
    const data = contactData();
    const index = data.pccMembers.findIndex(member => member.id === values.id);
    let memberId = index >= 0 ? data.pccMembers[index].id : `pcc-${slugify(values.name)}`;
    if (index < 0) { let suffix = 2; const stem = memberId; while (data.pccMembers.some(existing => existing.id === memberId)) memberId = `${stem}-${suffix++}`; }
    const member = { id: memberId, name: values.name.trim(), status: values.status };
    if (index >= 0) data.pccMembers[index] = member; else data.pccMembers.push(member);
    saveContactData(data, index >= 0 ? 'PCC member updated' : 'PCC member added');
  }
  function changeContactStatus(id) {
    const data = contactData();
    const item = data.contacts.find(contact => contact.id === id);
    if (!item) return;
    item.status = item.status === 'draft' ? 'published' : 'draft';
    saveContactData(data, item.status === 'draft' ? 'Contact moved to draft' : 'Contact published in preview');
  }
  function confirmContactDelete(id, type = 'contact') {
    const data = contactData();
    const item = type === 'pcc' ? data.pccMembers.find(member => member.id === id) : data.contacts.find(contact => contact.id === id);
    if (!item) return;
    const dialog = document.querySelector('#admin-dialog');
    dialog.innerHTML = `<div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">PARISH CONTACTS · PREVIEW ONLY</p><h2 id="admin-dialog-title">Delete ${type === 'pcc' ? 'PCC member' : 'contact'}?</h2><p>${safe(type === 'pcc' ? item.name : `${item.role} · ${item.name}`)}</p></div><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Cancel deletion">×</button></div><div class="admin-section-note">This removes the entry from the current development preview. To remove it from the shared website, download and commit the updated contacts source file.</div><div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="close-dialog">Cancel</button><button type="button" class="admin-button danger" data-action="confirm-contact-delete" data-kind="${type}" data-id="${escAttr(id)}">Delete from preview</button></div></div>`;
    dialog.showModal();
  }
  function deleteContactFromPreview(id, type) {
    const data = contactData();
    if (type === 'pcc') data.pccMembers = data.pccMembers.filter(item => item.id !== id);
    else data.contacts = data.contacts.filter(item => item.id !== id);
    saveContactData(data, `${type === 'pcc' ? 'PCC member' : 'Contact'} deleted`);
  }
  function reorderPcc(id, direction) {
    const data = contactData();
    const index = data.pccMembers.findIndex(item => item.id === id);
    const next = index + Number(direction);
    if (index < 0 || next < 0 || next >= data.pccMembers.length) return;
    [data.pccMembers[index], data.pccMembers[next]] = [data.pccMembers[next], data.pccMembers[index]];
    saveContactData(data, 'PCC order updated');
  }
  function downloadContactsSource() {
    const data = contactData();
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'contacts.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Updated contacts.json downloaded. Commit it to _content/contacts.json on Dev to publish.');
  }
  function openEditor(kind, id = '') {
    const collection = listRecords(kind);
    const item = id ? collection.find(record => record.id === id || (kind === 'news' && record.slug === id)) : null;
    if (id && !item) return showToast('That item is no longer available in this preview.', true);
    const event = kind === 'calendar';
    const current = item ? (event ? eventFields(item) : articleFields(item)) : {};
    const dialog = document.querySelector('#admin-dialog');
    const title = item ? (event ? 'Edit event' : 'Edit article') : (event ? 'Add event' : 'Add article');
    const commonImage = `<div class="admin-field full"><label for="admin-field-image">${event ? 'Image' : 'Featured image'}</label><select id="admin-field-image" name="image">${optionsForImages(current.image || '')}</select><span class="admin-field-hint">Choose from existing DEMO images. Church photography upload and cloud storage will belong to the future CMS.</span><div class="admin-image-select-preview" id="admin-image-preview"></div></div>`;
    const form = event ? `
      <div class="admin-form-grid">
        ${field('Event name', 'title', current.title, { required: true, full: true, placeholder: 'Enter a clear event name' })}
        ${field('Date', 'date', current.date, { type: 'date', required: true })}
        ${field('Start time', 'startTime', current.startTime, { type: 'time', required: true })}
        ${field('End time', 'endTime', current.endTime, { type: 'time', hint: 'Optional' })}
        ${field('Category', 'category', current.category || 'Parish event', { required: true, choices: ['Worship & Services', 'Weekly worship', 'Special service', 'Parish event', 'Community', 'Children & families', 'Other'].map(value => [value, value]) })}
        ${field('Status', 'status', current.status || 'published', { required: true, choices: [['published', 'Published in preview'], ['draft', 'Draft']] })}
        ${field('Location', 'location', current.location, { required: true, full: true, placeholder: 'Add a confirmed venue' })}
        ${field('Description', 'description', current.description, { type: 'textarea', required: true, full: true, placeholder: 'Add useful event details' })}
        ${field('Optional YouTube or external link', 'externalLink', current.externalLink, { type: 'url', full: true, placeholder: 'https://…' })}
        ${commonImage}
      </div>` : `
      <div class="admin-form-grid">
        ${field('Article title', 'title', current.title, { required: true, full: true, placeholder: 'Enter an article title' })}
        ${field('Summary', 'summary', current.summary, { type: 'textarea', required: true, full: true, rows: 2, placeholder: 'A short introduction for the News listing' })}
        ${field('Article content', 'content', current.content, { type: 'textarea', required: true, full: true, rows: 8, placeholder: 'Write the article. Separate paragraphs with a blank line.' })}
        ${field('Category', 'category', current.category || 'Parish news', { required: true, choices: ['Weekly announcements', 'Upcoming parish events', 'Reflection', 'Community news', 'Seasonal notice', 'Parish life & photos', 'Parish news', 'Other'].map(value => [value, value]) })}
        ${field('Date', 'date', current.date || new Date().toISOString().slice(0, 10), { type: 'date', required: true })}
        ${field('Status', 'status', current.status || 'published', { required: true, choices: [['published', 'Published in preview'], ['draft', 'Draft']] })}
        ${commonImage}
      </div>`;
    dialog.innerHTML = `<form id="admin-editor-form" novalidate><div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">DEVELOPMENT DEMO · ${event ? 'CALENDAR' : 'NEWS & MAGAZINE'}</p><h2 id="admin-dialog-title">${title}</h2><p>Changes are preview-only and stay in this browser tab.</p></div><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Close editor">×</button></div><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="id" value="${escAttr(id)}"><div class="admin-form-grid">${form}</div><p class="admin-form-error" id="admin-form-error" role="alert" hidden></p><div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="preview-form">Preview</button><button type="button" class="admin-button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="admin-button">Save in development preview</button></div></div></form>`;
    dialog.showModal();
    const editorForm = dialog.querySelector('#admin-editor-form');
    editorForm.addEventListener('submit', event => {
      event.preventDefault();
      saveForm(editorForm);
    });
    updateImagePreview(dialog.querySelector('[name="image"]')?.value || '');
    dialog.querySelector('[name="image"]')?.addEventListener('change', event => updateImagePreview(event.target.value));
    dialog.querySelector('input:not([type="hidden"]),textarea,select')?.focus();
  }
  function updateImagePreview(path) {
    const target = document.querySelector('#admin-image-preview');
    if (!target) return;
    const chosen = images.find(image => image.value === path);
    target.innerHTML = chosen ? `<img src="${escAttr(path)}" alt="${safe(chosen.alt)}"><span>DEMO IMAGE</span>` : '<span>No image selected</span>';
  }
  function readForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }
  function validateForm(form) {
    if (!form.reportValidity()) return false;
    const data = readForm(form);
    let message = '';
    if (data.kind === 'calendar' && data.endTime && data.endTime <= data.startTime) message = 'End time must be later than the start time.';
    if (data.kind === 'calendar' && data.externalLink) {
      try { if (!['http:', 'https:'].includes(new URL(data.externalLink).protocol)) message = 'Use a web link beginning with http:// or https://.'; }
      catch { message = 'Enter a valid web link.'; }
    }
    if (data.kind === 'news' && !data.content.trim()) message = 'Add the article content before saving.';
    const error = document.querySelector('#admin-form-error');
    error.textContent = message;
    error.hidden = !message;
    return !message;
  }
  function updateRecord(kind, id, value, created) {
    const collection = demoState[kind];
    if (created) collection.created = [...collection.created, value];
    else if (collection.created.some(item => item.id === id)) collection.created = collection.created.map(item => item.id === id ? value : item);
    else collection.updated[id] = value;
  }
  function dateLabelForArticle(iso) {
    return `SAMPLE DATE · ${dateLabel(iso, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`;
  }
  function saveForm(form) {
    if (!validateForm(form)) return;
    const values = readForm(form);
    const kind = values.kind;
    const id = values.id;
    const isNew = !id;
    const oldItem = id ? listRecords(kind).find(item => item.id === id || (kind === 'news' && item.slug === id)) : null;
    let value;
    if (kind === 'calendar') {
      const recordId = id || idFor('demo-event');
      value = { id: recordId, title: values.title.trim(), start: `${values.date}T${values.startTime}`, end: values.endTime ? `${values.date}T${values.endTime}` : '', timeZone: oldItem?.timeZone || 'Europe/London', location: values.location.trim(), description: values.description.trim(), category: values.category, image: values.image, externalLink: values.externalLink.trim(), status: values.status, ...(oldItem?.sourceUrl ? { sourceUrl: oldItem.sourceUrl } : {}) };
      updateRecord('calendar', recordId, value, isNew);
    } else {
      const priorSlug = oldItem?.slug;
      let slug = priorSlug || slugify(values.title);
      const existingSlugs = new Set(listRecords('news').filter(item => item.id !== id && item.slug !== id).map(item => item.slug));
      if (isNew) { let suffix = 2; const stem = slug; while (existingSlugs.has(slug)) slug = `${stem}-${suffix++}`; }
      const recordId = id || slug;
      value = { id: recordId, slug, title: values.title.trim(), excerpt: values.summary.trim(), paragraphs: values.content.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean), category: values.category, date: values.date, dateLabel: dateLabelForArticle(values.date), image: values.image, status: values.status, demo: true };
      updateRecord('news', recordId, value, isNew);
    }
    if (!persistDemoState()) return;
    document.querySelector('#admin-dialog').close();
    render({ focus: false });
    savedToast('Item saved');
  }
  function previewMarkup(kind, item) {
    const isEvent = kind === 'calendar';
    const image = item.image ? `<img class="admin-preview-image" src="${escAttr(item.image)}" alt="${safe(imageAlt(item.image))}"><p class="admin-image-caption">DEMO IMAGE · temporary selection</p>` : '';
    const body = isEvent
      ? `<p><strong>${safe(dateLabel(item.date))} · ${safe(item.startTime || 'Time not set')}${item.endTime ? `–${safe(item.endTime)}` : ''}</strong></p><p>${safe(item.location)}</p><p>${safe(item.description)}</p>${item.externalLink ? `<p><a href="${escAttr(item.externalLink)}" target="_blank" rel="noopener noreferrer">Open event link ↗</a></p>` : ''}`
      : `${item.demo ? '<p class="admin-demo-caption">SAMPLE / DEMO ARTICLE · FICTIONAL CONTENT</p>' : ''}<p>${safe(item.summary)}</p>${item.content.split(/\n\s*\n/).filter(Boolean).map(paragraph => `<p>${safe(paragraph)}</p>`).join('')}`;
    return `<div class="admin-dialog-head"><div><p class="admin-kicker">PREVIEW ONLY · ${isEvent ? 'CALENDAR EVENT' : 'NEWS ARTICLE'}</p><h2 id="admin-dialog-title">${safe(item.title)}</h2><p>${safe(item.category)} · ${safe(dateLabel(item.date))} · ${item.status === 'draft' ? 'Draft preview' : 'Preview status'}</p></div></div><article class="admin-preview-card">${image}${!isEvent && item.demo ? '<p class="admin-demo-caption">SAMPLE / DEMO — this local preview is not a published church announcement.</p>' : ''}<h3>${safe(item.title)}</h3>${body}</article>`;
  }
  function previewRecord(kind, value) {
    const isEvent = kind === 'calendar';
    const item = isEvent ? eventFields(value) : articleFields(value);
    const dialog = document.querySelector('#admin-dialog');
    dialog.innerHTML = `<div class="admin-dialog-inner"><div class="admin-preview-close"><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Close preview">×</button></div>${previewMarkup(kind, item)}<div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="close-dialog">Close preview</button></div></div>`;
    if (!dialog.open) dialog.showModal();
  }
  function previewFromForm() {
    const form = document.querySelector('#admin-editor-form');
    if (!validateForm(form)) return;
    const data = readForm(form);
    const item = data.kind === 'calendar'
      ? { ...data, id: data.id || 'preview', start: `${data.date}T${data.startTime}`, end: data.endTime ? `${data.date}T${data.endTime}` : '' }
      : { ...data, id: data.id || 'preview', slug: slugify(data.title), excerpt: data.summary, paragraphs: data.content.split(/\n\s*\n/).filter(Boolean), dateLabel: dateLabelForArticle(data.date), demo: true };
    const preview = document.createElement('section');
    preview.className = 'admin-inline-preview';
    preview.innerHTML = `${previewMarkup(data.kind, data.kind === 'calendar' ? eventFields(item) : articleFields(item))}<div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="back-to-editor">Back to editing</button></div>`;
    form.hidden = true;
    document.querySelector('#admin-dialog').append(preview);
  }
  function toggleStatus(kind, id) {
    const item = listRecords(kind).find(record => record.id === id || (kind === 'news' && record.slug === id));
    if (!item) return;
    const next = { ...item, status: item.status === 'draft' ? 'published' : 'draft' };
    updateRecord(kind, id, next, false);
    if (!persistDemoState()) return;
    render({ focus: false });
    savedToast(next.status === 'draft' ? 'Moved to draft' : 'Published in this preview');
  }
  function deleteRecord(kind, id) {
    const item = listRecords(kind).find(record => record.id === id || (kind === 'news' && record.slug === id));
    if (!item) return;
    const dialog = document.querySelector('#admin-dialog');
    dialog.innerHTML = `<div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">DEVELOPMENT DEMO · PREVIEW ONLY</p><h2 id="admin-dialog-title">Remove this ${kind === 'calendar' ? 'event' : 'article'}?</h2><p>${safe(item.title)}</p></div><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Cancel removal">×</button></div><div class="admin-section-note">This removes the item from this browser tab’s preview only. It will not change the repository or the shared public website.</div><div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="close-dialog">Keep item</button><button type="button" class="admin-button danger" data-action="confirm-delete" data-kind="${kind}" data-id="${escAttr(id)}">Remove from preview</button></div></div>`;
    dialog.showModal();
  }
  function removeRecordFromPreview(kind, id) {
    const collection = demoState[kind];
    if (collection.created.some(entry => entry.id === id)) collection.created = collection.created.filter(entry => entry.id !== id);
    else if (!collection.deleted.includes(id)) collection.deleted.push(id);
    delete collection.updated[id];
    if (!persistDemoState()) return;
    render({ focus: false });
    savedToast('Item removed from this preview');
  }
  function resetDemo() {
    const dialog = document.querySelector('#admin-dialog');
    dialog.innerHTML = `<div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">DEVELOPMENT DEMO · PREVIEW ONLY</p><h2 id="admin-dialog-title">Clear this tab’s demo changes?</h2></div><button type="button" class="admin-icon-button" data-action="close-dialog" aria-label="Cancel clearing demo changes">×</button></div><div class="admin-section-note">This resets Calendar, News and Parish Contacts changes made in this tab. Repository files and the public website will not be changed.</div><div class="admin-form-actions"><button type="button" class="admin-button secondary" data-action="close-dialog">Keep changes</button><button type="button" class="admin-button danger" data-action="confirm-reset">Clear demo changes</button></div></div>`;
    dialog.showModal();
  }
  function resetDemoState() {
    demoState = initialState();
    try { sessionStorage.removeItem(stateKey); }
    catch { /* State resets for the current page even if the browser blocks session storage. */ }
    render({ focus: false });
    showToast('This tab’s preview changes have been cleared. Repository content is unchanged.');
  }
  function filterCards(input) {
    const target = document.querySelector(input.id === 'calendar-filter' ? '#calendar-records' : '#news-records');
    if (!target) return;
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    target.querySelectorAll('[data-record-card]').forEach(card => {
      const visible = !query || card.dataset.search.includes(query);
      card.hidden = !visible;
      if (visible) shown++;
    });
    const count = input.closest('.admin-list-toolbar')?.querySelector('span');
    if (count) count.textContent = `${shown} item${shown === 1 ? '' : 's'} shown`;
  }

  nav.innerHTML = `${sections.map(([id, icon, label]) => `<button type="button" data-view="${id}" class="${id === 'dashboard' ? 'is-active' : ''}"><span aria-hidden="true">${icon}</span>${safe(label)}</button>`).join('')}<button type="button" data-view="${workflowView}"><span aria-hidden="true">◇</span>How publishing works</button>`;
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    location.hash = button.dataset.view;
    sidebar.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open administration menu');
  });
  window.addEventListener('hashchange', () => render());
  menuButton.addEventListener('click', () => {
    const opened = sidebar.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(opened));
    menuButton.setAttribute('aria-label', opened ? 'Close administration menu' : 'Open administration menu');
  });
  root.addEventListener('click', event => {
    const go = event.target.closest('[data-go]');
    if (go) { location.hash = go.dataset.go; return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, kind, id } = button.dataset;
    if (action === 'add-contact') { openContactEditor('', button.dataset.section || ''); return; }
    if (action === 'edit-contact') { openContactEditor(id); return; }
    if (action === 'toggle-contact-status') { changeContactStatus(id); return; }
    if (action === 'delete-contact') { confirmContactDelete(id); return; }
    if (action === 'add-pcc') { openPccEditor(); return; }
    if (action === 'edit-pcc') { openPccEditor(id); return; }
    if (action === 'delete-pcc') { confirmContactDelete(id, 'pcc'); return; }
    if (action === 'move-pcc') { reorderPcc(id, button.dataset.direction); return; }
    if (action === 'download-contacts') { downloadContactsSource(); return; }
    if (action === 'add' || action === 'edit') openEditor(kind, action === 'edit' ? id : '');
    else if (action === 'preview') {
      const item = listRecords(kind).find(record => record.id === id || (kind === 'news' && record.slug === id));
      if (item) previewRecord(kind, item);
    } else if (action === 'toggle-status') toggleStatus(kind, id);
    else if (action === 'delete') deleteRecord(kind, id);
    else if (action === 'reset-demo') resetDemo();
  });
  root.addEventListener('input', event => { if (event.target.matches('#calendar-filter,#news-filter')) filterCards(event.target); });
  root.addEventListener('input', event => {
    if (!event.target.matches('#page-filter,#document-filter')) return;
    const container = event.target.id === 'page-filter' ? '#page-records' : '.admin-document-grid';
    const query = event.target.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(`${container} [data-managed-card]`).forEach(card => {
      card.hidden = query && !card.dataset.search.includes(query);
      if (!card.hidden) shown++;
    });
    const count = event.target.closest('.admin-list-toolbar')?.querySelector('span');
    if (count) count.textContent = `${shown} item${shown === 1 ? '' : 's'} shown`;
  });
  document.querySelector('#admin-dialog').addEventListener('click', event => {
    if (event.target.closest('[data-action="close-dialog"]')) document.querySelector('#admin-dialog').close();
    else if (event.target.closest('[data-action="preview-form"]')) previewFromForm();
    else if (event.target.closest('[data-action="back-to-editor"]')) {
      document.querySelector('.admin-inline-preview')?.remove();
      const form = document.querySelector('#admin-editor-form');
      form.hidden = false;
      form.querySelector('input:not([type="hidden"]),textarea,select')?.focus();
    } else if (event.target.closest('[data-action="confirm-delete"]')) {
      const { kind, id } = event.target.closest('[data-action="confirm-delete"]').dataset;
      document.querySelector('#admin-dialog').close();
      removeRecordFromPreview(kind, id);
    } else if (event.target.closest('[data-action="confirm-contact-delete"]')) {
      const { kind, id } = event.target.closest('[data-action="confirm-contact-delete"]').dataset;
      document.querySelector('#admin-dialog').close();
      deleteContactFromPreview(id, kind);
    } else if (event.target.closest('[data-action="confirm-reset"]')) {
      document.querySelector('#admin-dialog').close();
      resetDemoState();
    }
  });
  demoState = readDemoState();
  Promise.all([
    fetch('../events.json').then(response => { if (!response.ok) throw new Error('The generated calendar is unavailable.'); return response.json(); }),
    fetch('../news-data.json').then(response => { if (!response.ok) throw new Error('The published news list is unavailable.'); return response.json(); }),
    fetch('./news-demo-data.json').then(response => { if (!response.ok) throw new Error('The sample news previews are unavailable.'); return response.json(); }),
    fetch('./contacts-data.json').then(response => { if (!response.ok) throw new Error('The generated contact source is unavailable.'); return response.json(); }),
    fetch('../search-index.json').then(response => { if (!response.ok) throw new Error('The public page list is unavailable.'); return response.json(); }),
    fetch('../content-pages.json').then(response => { if (!response.ok) throw new Error('The managed page list is unavailable.'); return response.json(); }),
    fetch('./documents-data.json').then(response => { if (!response.ok) throw new Error('The document list is unavailable.'); return response.json(); })
  ]).then(([calendar, news, newsSamples, contacts, pages, managedPages, documents]) => {
    baseEvents = calendar.items || [];
    baseArticles = [
      ...(news.articles || []).map((article, index) => ({ ...article, id: article.slug, image: article.image || images[(index + 1) % images.length].value, demo: article.demo === true })),
      ...(newsSamples.articles || []).map((article, index) => ({ ...article, id: article.slug, image: article.image || images[(index + 1) % images.length].value, demo: true }))
    ];
    baseContacts = contacts || { sections: [], contacts: [], pccMembers: [] };
    basePages = Array.isArray(pages) ? pages : (pages.pages || []);
    contentManagedSlugs = new Set((managedPages.pages || []).map(page => page.slug));
    documentGroups = Array.isArray(documents) ? documents : [];
    recordsReady = true;
    root.setAttribute('aria-busy', 'false');
    render({ focus: false });
  }).catch(error => {
    console.error(error);
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = `<h1>Preview content unavailable</h1><p>${safe(error.message)} Refresh after the repository build has completed. No content has been changed.</p>`;
  });
})();
