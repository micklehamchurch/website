(() => {
  'use strict';

  // Storage is isolated behind this small adapter so a future CMS/API can replace
  // browser storage without rewriting the dashboard screens.
  const storage = {
    key: 'mickleham-admin-demo-v1',
    read() {
      try { return JSON.parse(localStorage.getItem(this.key) || 'null'); }
      catch { return null; }
    },
    write(value) {
      localStorage.setItem(this.key, JSON.stringify(value));
    }
  };

  const pageCatalog = [
    ['Home', 'index.html'], ['About Our Parish', 'about.html'], ['Our History', 'our-history.html'],
    ['Westhumble Chapel', 'westhumble-chapel.html'], ['Worship', 'worship.html'],
    ['Our Community', 'church-life.html'], ['Visit & Learn', 'visit.html'],
    ['News & Magazine', 'news.html'], ['Calendar', 'calendar.html'],
    ['Media / Sunday Services', 'sunday-services.html'], ['Contact', 'contact.html']
  ];
  const communityDefaults = [
    { id: 'children-families', title: 'Children & Families', summary: 'A welcoming introduction for families exploring church life.', page: 'children-families.html' },
    { id: 'groups-activities', title: 'Groups & Activities', summary: 'An overview of groups and activities that bring people together.', page: 'groups-activities.html' },
    { id: 'community-events', title: 'Community Activities', summary: 'A place to share community activities and parish connections.', page: 'whats-on.html' },
    { id: 'volunteering', title: 'Volunteering', summary: 'Information about helping and getting involved.', page: 'volunteering.html' },
    { id: 'supporting-community', title: 'Supporting the Community', summary: 'A starting point for sharing community support information.', page: 'supporting-community.html' }
  ];
  const photoSeeds = [
    { id: 'photo-church', src: '../assets/demo/parish-exterior-demo.jpg', alt: 'Illustrative generated image of an English parish church exterior; not St Michael and All Angels.', caption: 'DEMO IMAGE · Illustrative only; replace with an official church photograph.' },
    { id: 'photo-churchyard', src: '../assets/demo/churchyard-demo.jpg', alt: 'Illustrative generated image of a leafy English churchyard; not the Mickleham churchyard.', caption: 'DEMO IMAGE · Illustrative only; replace with an official church photograph.' },
    { id: 'photo-worship', src: '../assets/demo/sanctuary-interior-demo.jpg', alt: 'Illustrative generated view of a quiet church interior; not a photograph of this parish church.', caption: 'DEMO IMAGE · Illustrative only; replace with an official church photograph.' },
    { id: 'photo-community', src: '../assets/demo/community-gathering-demo.png', alt: 'Illustrative generated scene of a fictional community gathering; not real parishioners.', caption: 'DEMO IMAGE · Generated people and scene; replace with approved photographs.' },
    { id: 'photo-chapel', src: '../assets/demo/chapel-exterior-demo.jpg', alt: 'Illustrative generated image of a small chapel; not Westhumble Chapel.', caption: 'DEMO IMAGE · Illustrative only; replace with an official church photograph.' }
  ];
  const initialSettings = {
    churchName: "St Michael's & All Angels Church",
    address: "Old London Road\nMickleham, Dorking\nSurrey RH5 6DU\nEngland",
    contactEmail: '', telephone: '', youtube: 'https://www.youtube.com/playlist?list=PLB3x60CMpqckqRCWtb5t-0MWZMImPM_Wb',
    facebook: '', instagram: '', otherSocial: ''
  };
  const sectionCards = [
    ['news', '📰', 'News & Magazine', 'Create and review parish stories and announcements.'],
    ['calendar', '📅', 'Calendar', 'Review the church calendar and manage local demo events.'],
    ['worship', '⛪', 'Worship & Services', 'Manage service information and sample service cards.'],
    ['gallery', '📸', 'Gallery', 'Organise sample albums and demonstrate photo controls.'],
    ['media', '🎥', 'Media / YouTube', 'Maintain links to the church video content.'],
    ['community', '👥', 'Our Community', 'Edit example community sections.'],
    ['pages', '📄', 'Pages', 'Review public pages and prepare local page drafts.'],
    ['settings', '⚙️', 'Website Settings', 'Review known details and update local examples.']
  ];
  const content = document.querySelector('#admin-content');
  const dialog = document.querySelector('#admin-dialog');
  const toast = document.querySelector('#admin-toast');
  const nav = document.querySelector('#admin-nav');
  const sidebar = document.querySelector('.admin-sidebar');
  const mobileMenu = document.querySelector('.admin-mobile-menu');
  let model = null;
  let currentView = 'dashboard';
  let toastTimer;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const paragraphs = value => String(value ?? '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
  const statusClass = value => value === 'Draft' ? 'draft' : value === 'DEMO' ? 'demo' : value === 'From church calendar' ? 'feed' : '';
  const pill = value => `<span class="admin-status ${statusClass(value)}">${esc(value)}</span>`;
  const urlFor = path => {
    if (!path) return '';
    const value = String(path);
    if (/^(?:https?:|data:|blob:|\/|#)/i.test(value)) return value;
    return `../${value.replace(/^\.\//, '')}`;
  };
  const dateFromLabel = value => {
    const match = String(value || '').match(/(\d{1,2})\s+([A-Z]+)\s+(\d{4})/i);
    if (!match) return '';
    const parsed = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    return Number.isNaN(parsed.valueOf()) ? '' : `${match[3]}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  };
  const dateLabel = value => {
    if (!value) return 'Not set';
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.valueOf()) ? esc(value) : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };
  const announce = message => {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
  };
  function save(message = 'Saved in this browser. The public website has not changed.') {
    try {
      storage.write(model);
      render();
      announce(message);
    } catch (error) {
      announce(error?.name === 'QuotaExceededError' ? 'This browser has reached its demo storage limit. Remove a large uploaded image and try again.' : 'Could not save in this browser.');
    }
  }

  async function loadModel() {
    const saved = storage.read();
    if (saved && typeof saved === 'object') {
      model = {
        articles: Array.isArray(saved.articles) ? saved.articles : [],
        events: Array.isArray(saved.events) ? saved.events : [],
        services: Array.isArray(saved.services) ? saved.services : [],
        albums: Array.isArray(saved.albums) ? saved.albums : [],
        media: Array.isArray(saved.media) ? saved.media : [],
        community: Array.isArray(saved.community) ? saved.community : communityDefaults.map(item => ({ ...item, status: 'Draft', demo: true })),
        pages: Array.isArray(saved.pages) ? saved.pages : pageCatalog.map(([title, page]) => ({ title, page, status: 'Published', summary: '' })),
        settings: { ...initialSettings, ...(saved.settings || {}) }
      };
      return;
    }
    const [newsResult, eventsResult] = await Promise.allSettled([
      fetch('../news-data.json').then(response => response.ok ? response.json() : { articles: [] }),
      fetch('../events.json').then(response => response.ok ? response.json() : { items: [] })
    ]);
    const news = newsResult.status === 'fulfilled' ? newsResult.value.articles || [] : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value.items || [] : [];
    const realEvents = events.map(item => ({
      id: item.id, title: item.title, date: item.start?.slice(0, 10) || '', startTime: item.start?.slice(11, 16) || '',
      endTime: item.end?.slice(11, 16) || '', location: item.location || '', description: item.description || '',
      category: 'Worship', image: '', videoUrl: '', status: 'From church calendar', source: 'Church calendar feed', demo: false
    }));
    const services = realEvents.slice(0, 4).map(event => ({ ...event, id: `service-${event.id}`, image: '../assets/demo/sanctuary-interior-demo.jpg' }));
    model = {
      articles: news.map(item => ({
        id: item.slug || uid('article'), title: item.title, summary: item.excerpt || '', content: (item.paragraphs || []).join('\n\n'),
        category: item.category || 'Parish life', image: '../assets/demo/parish-exterior-demo.jpg', date: dateFromLabel(item.dateLabel),
        status: 'Draft', featured: !!item.featured, demo: true
      })),
      events: realEvents,
      services,
      albums: [
        { id: 'album-church', title: 'Our Church', photos: [photoSeeds[0]] },
        { id: 'album-churchyard', title: 'Churchyard', photos: [photoSeeds[1]] },
        { id: 'album-worship', title: 'Worship', photos: [photoSeeds[2]] },
        { id: 'album-community', title: 'Community', photos: [photoSeeds[3]] },
        { id: 'album-events', title: 'Events', photos: [photoSeeds[4]] }
      ],
      media: [{ id: 'media-sunday-playlist', title: 'Sunday Services playlist', url: initialSettings.youtube, category: 'Sunday Services', description: 'The existing church YouTube playlist embedded on the public website.', date: '', status: 'Current playlist', demo: false }],
      community: communityDefaults.map(item => ({ ...item, status: 'Draft', demo: true })),
      pages: pageCatalog.map(([title, page]) => ({ title, page, status: 'Published', summary: '' })),
      settings: { ...initialSettings }
    };
    try { storage.write(model); } catch { /* The visible screen still works if storage is unavailable. */ }
  }

  function heading(kicker, title, subtitle, action = '') {
    return `<div class="admin-page-heading"><div><p class="admin-kicker">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
  }
  function actionButton(label, action, id, extra = '') {
    return `<button type="button" class="admin-button ${extra}" data-action="${esc(action)}" data-id="${esc(id || '')}">${esc(label)}</button>`;
  }
  function summaryCard(count, label) { return `<div class="admin-summary-card"><strong>${esc(count)}</strong><span>${esc(label)}</span></div>`; }

  function renderDashboard() {
    const cards = sectionCards.map(([view, icon, title, desc]) => `<button type="button" class="admin-section-card" data-view="${view}"><span class="admin-card-icon" aria-hidden="true">${icon}</span><strong>${esc(title)}</strong><small>${esc(desc)}</small></button>`).join('');
    content.innerHTML = `
      <div class="admin-dashboard-intro"><p class="admin-kicker">Church team workspace</p><h1>Church Website Administration</h1><p>Manage the content that appears on the Mickleham Church website.</p></div>
      <div class="admin-summary-grid" aria-label="Content overview">${summaryCard(model.articles.length, 'sample news articles')}${summaryCard(model.events.length, 'calendar feed events')}${summaryCard(model.albums.length, 'demo gallery albums')}${summaryCard(model.pages.length, 'public website pages')}</div>
      <div class="admin-card-grid" aria-label="Manage website content">${cards}</div>
      <div class="admin-workflow" aria-label="Example content workflow"><span class="admin-workflow-step">Create or edit</span><span class="admin-workflow-arrow" aria-hidden="true">→</span><span class="admin-workflow-step">Save as draft</span><span class="admin-workflow-arrow" aria-hidden="true">→</span><span class="admin-workflow-step">Preview</span><span class="admin-workflow-arrow" aria-hidden="true">→</span><span class="admin-workflow-step">Publish when approved</span></div>
      <p class="admin-section-note" style="margin-top:14px"><strong>Prototype workflow:</strong> “Published” status is only a local demonstration. It does not update public pages or public search. A future approved CMS can connect publishing to the website and search index.</p>`;
  }

  function renderNews() {
    const rows = model.articles.map(article => `<tr>
      <td><strong>${esc(article.title)}</strong>${article.demo ? '<small>Sample / demo article</small>' : ''}</td>
      <td>${esc(article.category || '—')}</td><td>${esc(dateLabel(article.date))}</td><td>${pill(article.status || 'Draft')}</td>
      <td><div class="admin-actions">${actionButton('Edit', 'edit-article', article.id, 'small secondary')}${actionButton('Preview', 'preview-article', article.id, 'small secondary')}${actionButton(article.status === 'Published' ? 'Set draft' : 'Publish demo', 'toggle-article', article.id, 'small')}${actionButton('Delete', 'delete-article', article.id, 'small danger')}</div></td>
    </tr>`).join('');
    content.innerHTML = `${heading('Content', 'News & Magazine', 'Manage local article examples. Sample content is clearly labelled and is not a real church announcement.', actionButton('＋ Add New Article', 'new-article', '', ''))}
      <p class="admin-section-note"><strong>Demo data:</strong> Articles are stored in this browser. Publishing here only changes the prototype status; the public News page and search remain unchanged.</p>
      <div class="admin-toolbar"><p>${model.articles.length} article${model.articles.length === 1 ? '' : 's'} in this browser</p></div>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Article</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="admin-empty">No articles yet. Add a sample article to begin.</td></tr>'}</tbody></table></div>`;
  }

  function renderCalendar() {
    const rows = [...model.events].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).map(item => `<tr>
      <td><strong>${esc(item.title)}</strong><small>${item.demo ? 'DEMO event' : 'Imported from church calendar'}</small></td><td>${esc(item.category || '—')}</td><td>${esc(dateLabel(item.date))}</td><td>${esc([item.startTime, item.endTime].filter(Boolean).join('–') || 'Not provided')}</td>
      <td>${pill(item.demo ? item.status || 'Draft' : 'From church calendar')}</td><td><div class="admin-actions">${actionButton('Edit', 'edit-event', item.id, 'small secondary')}${actionButton('Preview', 'preview-event', item.id, 'small secondary')}${actionButton('Delete', 'delete-event', item.id, 'small danger')}</div></td>
    </tr>`).join('');
    content.innerHTML = `${heading('Content', 'Calendar', 'Review current church calendar entries and try adding or changing a local demonstration event.', actionButton('＋ Add event', 'new-event', '', ''))}
      <p class="admin-section-note"><strong>Source of real events:</strong> Existing entries were loaded from the supplied church calendar data. Edits or deletions here are local copies only; the source calendar and public website are not changed. New entries are marked DEMO until verified by the parish.</p>
      <div class="admin-toolbar"><p>${model.events.length} event entries</p></div>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="admin-empty">No events in the local preview.</td></tr>'}</tbody></table></div>`;
  }

  function renderWorship() {
    const cards = model.services.map(item => `<article class="admin-record-card"><div class="admin-record-meta">${pill(item.demo ? item.status || 'DEMO' : 'From church calendar')}<span>${esc(dateLabel(item.date))}</span>${esc(item.startTime || '')}</div><h2>${esc(item.title)}</h2><p>${esc(item.description || 'No description provided.')}</p><p><strong>Location:</strong> ${esc(item.location || 'Not provided')}</p>${item.image ? `<img class="admin-preview-image" src="${esc(urlFor(item.image))}" alt="Illustrative demo image of a church interior; not an official church photograph"><p class="admin-demo-caption">Demo image — will be replaced with an official church photograph before the website goes live.</p>` : ''}<div class="admin-actions">${actionButton('Edit', 'edit-service', item.id, 'small secondary')}${actionButton('Preview', 'preview-service', item.id, 'small secondary')}${actionButton(item.status === 'Published' ? 'Set draft' : 'Publish demo', 'toggle-service', item.id, 'small')}${actionButton('Delete', 'delete-service', item.id, 'small danger')}</div></article>`).join('');
    content.innerHTML = `${heading('Content', 'Worship & Services', 'Manage local service information examples. Current calendar entries are shown as supplied by the church feed.', actionButton('＋ Add service', 'new-service', '', ''))}
      <p class="admin-section-note"><strong>Sample images and service entries:</strong> Existing services come from the supplied calendar feed. The interior picture is a generated demonstration image and is not a photograph of this parish. Changes stay in this browser.</p>
      <div class="admin-card-list">${cards || '<p class="admin-empty">No service examples yet.</p>'}</div>`;
  }

  function renderGallery() {
    const albums = model.albums.map(album => {
      const photos = (album.photos || []).map(photo => `<div class="admin-album-photo"><img src="${esc(urlFor(photo.src))}" alt="${esc(photo.alt || 'Demo image')}"><button type="button" aria-label="Remove image from ${esc(album.title)}" data-action="remove-photo" data-id="${esc(album.id)}" data-photo="${esc(photo.id)}">×</button></div>`).join('');
      const cover = album.photos?.[0]?.src;
      return `<article class="admin-album">${cover ? `<img class="admin-album-cover" src="${esc(urlFor(cover))}" alt="${esc(album.photos[0].alt || `Demo image for ${album.title}`)}">` : '<div class="admin-album-cover"></div>'}<div class="admin-album-body"><h2>${esc(album.title)}</h2><p>${(album.photos || []).length} demonstration photo${album.photos?.length === 1 ? '' : 's'}</p><div class="admin-album-photos">${photos || '<span class="admin-field-hint">No photos in this album yet.</span>'}</div><p class="admin-demo-caption">Demo image — will be replaced with an official church photograph before the website goes live.</p><div class="admin-actions">${actionButton('＋ Add photo', 'add-photo', album.id, 'small')}${actionButton('Rename', 'rename-album', album.id, 'small secondary')}${actionButton('Delete album', 'delete-album', album.id, 'small danger')}</div></div></article>`;
    }).join('');
    content.innerHTML = `${heading('Images', 'Gallery', 'Organise albums and try the image controls using local demonstration images.', actionButton('＋ Create album', 'new-album', '', ''))}
      <p class="admin-section-note"><strong>Official photographs:</strong> The images shown are generated demonstrations, not documentary photographs of this parish. Local uploads are saved only in this browser. A future image service can replace this storage adapter without changing the album layout.</p>
      <div class="admin-gallery-grid">${albums || '<p class="admin-empty">No albums yet.</p>'}</div>`;
  }

  function renderMedia() {
    const rows = model.media.map(item => `<tr><td><strong>${esc(item.title)}</strong>${item.demo ? '<small>DEMO entry</small>' : '<small>Existing church playlist</small>'}</td><td>${esc(item.category || '—')}</td><td>${esc(dateLabel(item.date))}</td><td>${pill(item.status || 'Draft')}</td><td><div class="admin-actions">${actionButton('Edit', 'edit-media', item.id, 'small secondary')}${actionButton('Preview', 'preview-media', item.id, 'small secondary')}${actionButton(item.status === 'Published' ? 'Set draft' : 'Publish demo', 'toggle-media', item.id, 'small')}${actionButton('Delete', 'delete-media', item.id, 'small danger')}</div></td></tr>`).join('');
    content.innerHTML = `${heading('Content', 'Media / YouTube', 'Manage video links without inventing titles or replacing the existing church playlist.', actionButton('＋ Add video', 'new-media', '', ''))}
      <p class="admin-section-note"><strong>Existing source:</strong> The Sunday Services playlist below is the playlist already embedded on the public website. No individual video title or extra YouTube URL has been assumed.</p>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Video or playlist</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="admin-empty">No video links yet.</td></tr>'}</tbody></table></div>`;
  }

  function renderCommunity() {
    const cards = model.community.map(item => `<article class="admin-record-card"><div class="admin-record-meta">${pill(item.demo ? 'DEMO' : item.status || 'Draft')}<span>${esc(item.page || '')}</span></div><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><div class="admin-actions">${actionButton('Edit', 'edit-community', item.id, 'small secondary')}${actionButton('Preview', 'preview-community', item.id, 'small secondary')}${actionButton(item.status === 'Published' ? 'Set draft' : 'Publish demo', 'toggle-community', item.id, 'small')}</div></article>`).join('');
    content.innerHTML = `${heading('Content', 'Our Community', 'Edit sample community topics and preview how a volunteer-friendly content screen could work.', actionButton('＋ Add section', 'new-community', '', ''))}
      <p class="admin-section-note"><strong>Demonstration copy:</strong> These are examples only. Approved parish information can replace the sample content later. Local publishing does not update the public site.</p><div class="admin-card-list">${cards || '<p class="admin-empty">No community sections yet.</p>'}</div>`;
  }

  function renderPages() {
    const rows = model.pages.map(item => `<tr><td><strong>${esc(item.title)}</strong><small>${esc(item.page)}</small></td><td>${pill(item.status || 'Published')}</td><td>${esc(item.summary || 'Existing public page')}</td><td><div class="admin-actions">${actionButton('Edit', 'edit-page', item.page, 'small secondary')}${actionButton('Preview', 'preview-page', item.page, 'small secondary')}${actionButton(item.status === 'Draft' ? 'Mark published' : 'Set draft', 'toggle-page', item.page, 'small')}</div></td></tr>`).join('');
    content.innerHTML = `${heading('Website', 'Pages', 'Review existing pages and experiment with draft titles and summaries in this browser.')}
      <p class="admin-section-note"><strong>Public pages remain unchanged:</strong> Page edits here are notes for a future CMS. Preview opens the current public page; draft status is only a local demonstration.</p>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Page</th><th>Status</th><th>Summary</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderSettings() {
    const fields = [
      ['churchName', 'Church name', 'text'], ['address', 'Church address', 'textarea'], ['contactEmail', 'Contact email', 'email'],
      ['telephone', 'Telephone', 'tel'], ['youtube', 'YouTube channel or playlist', 'url'], ['facebook', 'Facebook page', 'url'],
      ['instagram', 'Instagram page', 'url'], ['otherSocial', 'Other social link', 'url']
    ];
    const html = fields.map(([key, label, type]) => `<div class="admin-setting-card"><label for="setting-${key}">${esc(label)}</label>${type === 'textarea' ? `<textarea id="setting-${key}" name="${key}" rows="4" form="settings-form" placeholder="Not configured">${esc(model.settings[key] || '')}</textarea>` : `<input id="setting-${key}" name="${key}" type="${type}" form="settings-form" value="${esc(model.settings[key] || '')}" placeholder="${key === 'churchName' || key === 'address' ? '' : 'Not configured'}">`}</div>`).join('');
    content.innerHTML = `${heading('Website', 'Website Settings', 'Review known church details and record local examples. Unknown contact and social details stay unconfigured.')}
      <p class="admin-section-note"><strong>Existing details:</strong> Church name and address are already used on the public website. Contact email, telephone and social links are shown as “Not configured” until the parish supplies them. Saved settings do not alter public pages.</p>
      <form id="settings-form"><div class="admin-setting-grid">${html}</div><div class="admin-setting-actions"><button class="admin-button" type="submit">Save settings</button></div></form>`;
  }

  const views = { dashboard: renderDashboard, news: renderNews, calendar: renderCalendar, worship: renderWorship, gallery: renderGallery, media: renderMedia, community: renderCommunity, pages: renderPages, settings: renderSettings };
  function render() {
    if (!model || !content) return;
    currentView = views[location.hash.slice(1)] ? location.hash.slice(1) : currentView;
    content.setAttribute('aria-busy', 'true');
    views[currentView]();
    content.setAttribute('aria-busy', 'false');
    nav.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === currentView));
  }
  function go(view) {
    currentView = views[view] ? view : 'dashboard';
    history.replaceState(null, '', `#${currentView}`);
    sidebar.classList.remove('is-open');
    mobileMenu.setAttribute('aria-expanded', 'false');
    render();
    document.querySelector('#admin-main').focus({ preventScroll: true });
  }

  function optionList(options, selected) {
    return options.map(option => `<option value="${esc(option)}" ${option === selected ? 'selected' : ''}>${esc(option)}</option>`).join('');
  }
  function field(label, name, value = '', type = 'text', hint = '', required = false, full = false, extra = '') {
    const id = `field-${name}`;
    const control = type === 'textarea'
      ? `<textarea id="${id}" name="${esc(name)}" ${required ? 'required' : ''} ${extra}>${esc(value)}</textarea>`
      : type === 'select'
        ? `<select id="${id}" name="${esc(name)}" ${required ? 'required' : ''}>${extra}</select>`
        : `<input id="${id}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${required ? 'required' : ''} ${extra}>`;
    return `<div class="admin-field ${full ? 'full' : ''}"><label for="${id}">${esc(label)}</label>${control}${hint ? `<small class="admin-field-hint">${esc(hint)}</small>` : ''}</div>`;
  }
  function openEditor(title, description, formId, inner, submitLabel = 'Save draft', note = '') {
    dialog.innerHTML = `<div class="admin-dialog-inner"><div class="admin-dialog-head"><div><h2 id="dialog-title">${esc(title)}</h2><p>${esc(description)}</p></div><button class="admin-icon-button" type="button" data-action="close-dialog" aria-label="Close">×</button></div>${note ? `<p class="admin-section-note">${note}</p>` : ''}<form id="${esc(formId)}"><div class="admin-form-grid">${inner}</div><div class="admin-form-actions"><button class="admin-button secondary" type="button" data-action="close-dialog">Cancel</button><button class="admin-button" type="submit">${esc(submitLabel)}</button></div></form></div>`;
    dialog.querySelector('form')?.addEventListener('submit', submitEditor);
    dialog.showModal();
  }
  function editArticle(item = {}) {
    const categories = ['Weekly announcements', 'Upcoming parish events', 'Reflection', 'Community news', 'Seasonal notice', 'Parish life & photos'];
    const select = field('Category', 'category', '', 'select');
    const savedContent = Array.isArray(item.content) ? item.content.join('\n\n') : String(item.content || '');
    const inner = `${field('Title', 'title', item.title || '', 'text', '', true)}${field('Publication date', 'date', item.date || '', 'date', 'Use a confirmed date for real church information.')}${select}${field('Status', 'status', '', 'select')}${field('Short summary', 'summary', item.summary || '', 'textarea', '', true, true)}${field('Full article content', 'content', savedContent, 'textarea', 'Use a blank line between paragraphs.', true, true)}${field('Featured image', 'image', item.image || '', 'text', 'Choose an existing demo image path or paste a local asset path.')}${field('Choose image from this device', 'upload', '', 'file', 'Demo only · images up to 750 KB are stored in this browser.', false, false, 'accept="image/*"')}
      <input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="demo" value="${item.demo === false ? 'false' : 'true'}"><input type="hidden" name="featuredImageData" value="">`;
    openEditor(item.id ? 'Edit article' : 'Add New Article', 'Article changes stay in this browser and are marked as demonstration content.', 'article-form', inner, item.status === 'Published' ? 'Save changes' : 'Save as draft', 'This is a sample article editor. Do not enter personal or confidential details.');
    dialog.querySelector('#field-category').innerHTML = optionList(categories, item.category || categories[0]);
    dialog.querySelector('#field-status').innerHTML = optionList(['Draft', 'Published'], item.status || 'Draft');
  }
  const eventCategories = ['Worship', 'Prayer', 'Community', 'Children & Families', 'Baptism', 'Wedding', 'Funeral', 'Bible Study', 'Special Event'];
  function editEvent(item = {}) {
    const inner = `${field('Event name', 'title', item.title || '', 'text', '', true)}${field('Category', 'category', '', 'select')}${field('Date', 'date', item.date || '', 'date', '', true)}${field('Start time', 'startTime', item.startTime || '', 'time')}${field('End time', 'endTime', item.endTime || '', 'time')}${field('Location', 'location', item.location || '', 'text', 'Only add the church address if the calendar entry confirms that location.')}${field('Description', 'description', item.description || '', 'textarea', '', false, true)}${field('Image', 'image', item.image || '', 'text', 'Demo image path or future image URL.')}${field('Optional external / YouTube link', 'videoUrl', item.videoUrl || '', 'url')}${field('Status', 'status', '', 'select')}
      <input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="source" value="${esc(item.source || '')}"><input type="hidden" name="demo" value="${item.demo === false ? 'false' : 'true'}">`;
    openEditor(item.id ? 'Edit event copy' : 'Add demonstration event', 'Save an event example in this browser. It will not change the church calendar feed.', 'event-form', inner, 'Save event', 'New events are marked <strong>DEMO</strong>. Verify all names, dates, times and locations with the parish before publishing.');
    dialog.querySelector('#field-category').innerHTML = optionList(eventCategories, item.category || 'Worship');
    dialog.querySelector('#field-status').innerHTML = optionList(['Draft', 'Published'], item.demo === false ? 'Published' : item.status || 'Draft');
  }
  function editService(item = {}) {
    const inner = `${field('Service title', 'title', item.title || '', 'text', '', true)}${field('Date', 'date', item.date || '', 'date')}${field('Time', 'startTime', item.startTime || '', 'time')}${field('Description', 'description', item.description || '', 'textarea', '', false, true)}${field('Location', 'location', item.location || '', 'text')}${field('Image', 'image', item.image || '../assets/demo/sanctuary-interior-demo.jpg', 'text', 'Demo image only; replace with a church-approved photograph.')}${field('YouTube link', 'videoUrl', item.videoUrl || '', 'url', 'Only use links supplied by the church.')}${field('Status', 'status', '', 'select')}
      <input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="demo" value="${item.demo === false ? 'false' : 'true'}">`;
    openEditor(item.id ? 'Edit service information' : 'Add service information', 'Demonstration content is stored in this browser only.', 'service-form', inner, 'Save service', 'Use parish-approved details before any future publication.');
    dialog.querySelector('#field-status').innerHTML = optionList(['Draft', 'Published'], item.status || 'Draft');
  }
  function editMedia(item = {}) {
    const categories = ['Sunday Services', 'Baptisms', 'Weddings', 'Special Services', 'Sermons', 'Church Events'];
    const inner = `${field('Video or playlist title', 'title', item.title || '', 'text', '', true)}${field('YouTube URL', 'url', item.url || '', 'url', 'Enter a link supplied by the church. No video title or URL is guessed.', true)}${field('Category', 'category', '', 'select')}${field('Date', 'date', item.date || '', 'date', 'Optional; enter only a verified date.')}${field('Description', 'description', item.description || '', 'textarea', '', false, true)}${field('Status', 'status', '', 'select')}<input type="hidden" name="id" value="${esc(item.id || '')}">`;
    openEditor(item.id ? 'Edit video link' : 'Add video link', 'Video information is saved in this browser only.', 'media-form', inner, 'Save video', 'Use only video details and links supplied by the church.');
    dialog.querySelector('#field-category').innerHTML = optionList(categories, item.category || categories[0]);
    dialog.querySelector('#field-status').innerHTML = optionList(['Draft', 'Published'], item.status === 'Current playlist' ? 'Published' : item.status || 'Draft');
  }
  function editCommunity(item = {}) {
    const pages = ['children-families.html', 'groups-activities.html', 'whats-on.html', 'volunteering.html', 'supporting-community.html'];
    const inner = `${field('Section title', 'title', item.title || '', 'text', '', true)}${field('Related page', 'page', '', 'select')}${field('Summary', 'summary', item.summary || '', 'textarea', '', true, true)}${field('Status', 'status', '', 'select')}<input type="hidden" name="id" value="${esc(item.id || '')}">`;
    openEditor(item.id ? 'Edit community section' : 'Add community section', 'Example section content is stored in this browser only.', 'community-form', inner, 'Save section', 'Replace sample text with church-approved information when it is ready.');
    dialog.querySelector('#field-page').innerHTML = optionList(pages, item.page || pages[0]);
    dialog.querySelector('#field-status').innerHTML = optionList(['Draft', 'Published'], item.status || 'Draft');
  }
  function editPage(item = {}) {
    const inner = `${field('Page title', 'title', item.title || '', 'text', '', true)}${field('Page summary', 'summary', item.summary || '', 'textarea', 'Local planning notes only; public page content will not change.', false, true)}${field('Status', 'status', '', 'select')}<input type="hidden" name="page" value="${esc(item.page || '')}">`;
    openEditor('Edit page details', 'The public page stays as it is. These edits are a local CMS demonstration.', 'page-form', inner, 'Save page details', 'Use Preview to open the current public page. This editor does not rewrite its content.');
    dialog.querySelector('#field-status').innerHTML = optionList(['Draft', 'Published'], item.status || 'Published');
  }
  function editAlbum(item = {}) {
    const inner = `${field('Album name', 'title', item.title || '', 'text', '', true)}<input type="hidden" name="id" value="${esc(item.id || '')}">`;
    openEditor(item.id ? 'Rename album' : 'Create gallery album', 'Album changes are stored in this browser only.', 'album-form', inner, item.id ? 'Save album name' : 'Create album');
  }
  function editPhoto(album) {
    const inner = `${field('Choose image from this device', 'upload', '', 'file', 'Demo only · image up to 750 KB, stored in this browser.', true, true, 'accept="image/*"')}${field('Or use an existing image path', 'src', '', 'text', 'For example: ../assets/demo/parish-exterior-demo.jpg', false, true)}${field('Accessible image description', 'alt', '', 'text', '', true, true)}${field('Caption', 'caption', 'DEMO IMAGE · Replace with an official church photograph before publication.', 'text', '', false, true)}<input type="hidden" name="albumId" value="${esc(album.id)}"><input type="hidden" name="photoData" value="">`;
    openEditor('Add photo to album', `Choose an existing demo image or a local file for “${album.title}”.`, 'photo-form', inner, 'Add demo photo', 'Uploaded images are local to this browser and are not sent to a server.');
  }

  function preview(item, kind) {
    const isArticle = kind === 'article';
    const title = item.title || item.name || 'Preview';
    const tag = item.demo ? 'SAMPLE / DEMO CONTENT — FICTIONAL' : (item.source || 'DEVELOPMENT PREVIEW');
    const image = item.image ? `<img class="admin-preview-image" src="${esc(urlFor(item.image))}" alt="${esc(item.alt || 'Illustrative demo image; not an official church photograph')}">` : '';
    const body = isArticle ? paragraphs(item.content).map(text => `<p>${esc(text)}</p>`).join('') : `<p>${esc(item.description || item.summary || 'No description has been entered.')}</p>`;
    const facts = [item.category, item.date ? dateLabel(item.date) : '', item.startTime, item.location].filter(Boolean).map(esc).join(' · ');
    dialog.innerHTML = `<div class="admin-dialog-inner"><div class="admin-dialog-head"><div><p class="admin-kicker">Content preview</p><h2 id="dialog-title">${esc(title)}</h2><p>${esc(facts || item.url || '')}</p></div><button class="admin-icon-button" type="button" data-action="close-dialog" aria-label="Close preview">×</button></div><article class="admin-preview-card"><div class="admin-demo-caption">${esc(tag)} · Preview only, not published to the website</div>${image}<h3>${esc(title)}</h3><p>${esc(item.summary || '')}</p>${body}${item.url ? `<p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open supplied YouTube link ↗</a></p>` : ''}</article><div class="admin-form-actions"><button class="admin-button secondary" type="button" data-action="close-dialog">Close preview</button></div></div>`;
    dialog.showModal();
  }

  function find(collection, id) { return model[collection].find(item => String(item.id) === String(id)); }
  function removeItem(collection, id, label) {
    if (!confirm(`Remove this ${label} from this browser's development preview? The public website will not change.`)) return;
    model[collection] = model[collection].filter(item => String(item.id) !== String(id));
    save(`${label[0].toUpperCase()}${label.slice(1)} removed from this browser.`);
  }

  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (button) go(button.dataset.view);
  });
  mobileMenu.addEventListener('click', () => {
    const opened = sidebar.classList.toggle('is-open');
    mobileMenu.setAttribute('aria-expanded', String(opened));
    mobileMenu.setAttribute('aria-label', opened ? 'Close administration menu' : 'Open administration menu');
  });
  document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton && !nav.contains(viewButton)) go(viewButton.dataset.view);
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const id = action.dataset.id;
    switch (action.dataset.action) {
      case 'new-article': go('news'); editArticle(); break;
      case 'edit-article': editArticle(find('articles', id)); break;
      case 'preview-article': preview(find('articles', id), 'article'); break;
      case 'toggle-article': { const item = find('articles', id); item.status = item.status === 'Published' ? 'Draft' : 'Published'; save('Article status updated in this browser.'); break; }
      case 'delete-article': removeItem('articles', id, 'article'); break;
      case 'new-event': go('calendar'); editEvent(); break;
      case 'edit-event': editEvent(find('events', id)); break;
      case 'preview-event': preview(find('events', id), 'event'); break;
      case 'delete-event': removeItem('events', id, 'event'); break;
      case 'new-service': go('worship'); editService(); break;
      case 'edit-service': editService(find('services', id)); break;
      case 'preview-service': preview(find('services', id), 'service'); break;
      case 'toggle-service': { const item = find('services', id); item.status = item.status === 'Published' ? 'Draft' : 'Published'; save('Service status updated in this browser.'); break; }
      case 'delete-service': removeItem('services', id, 'service'); break;
      case 'new-media': go('media'); editMedia(); break;
      case 'edit-media': editMedia(find('media', id)); break;
      case 'preview-media': preview(find('media', id), 'media'); break;
      case 'toggle-media': { const item = find('media', id); item.status = item.status === 'Published' ? 'Draft' : 'Published'; save('Media status updated in this browser.'); break; }
      case 'delete-media': removeItem('media', id, 'video link'); break;
      case 'new-community': go('community'); editCommunity(); break;
      case 'edit-community': editCommunity(find('community', id)); break;
      case 'preview-community': preview(find('community', id), 'community'); break;
      case 'toggle-community': { const item = find('community', id); item.status = item.status === 'Published' ? 'Draft' : 'Published'; save('Community section status updated in this browser.'); break; }
      case 'edit-page': editPage(model.pages.find(item => item.page === id)); break;
      case 'preview-page': { const item = model.pages.find(record => record.page === id); preview({ ...item, description: `The current public page will open separately. ${item.summary || ''}`, page: item.page }, 'page'); break; }
      case 'toggle-page': { const item = model.pages.find(record => record.page === id); item.status = item.status === 'Draft' ? 'Published' : 'Draft'; save('Page status updated in this browser.'); break; }
      case 'new-album': go('gallery'); editAlbum(); break;
      case 'rename-album': editAlbum(find('albums', id)); break;
      case 'delete-album': removeItem('albums', id, 'album'); break;
      case 'add-photo': editPhoto(find('albums', id)); break;
      case 'remove-photo': {
        const album = find('albums', id);
        if (confirm('Remove this photo from the local demo album?')) { album.photos = album.photos.filter(photo => photo.id !== action.dataset.photo); save('Photo removed from this browser.'); }
        break;
      }
      case 'save-form': {
        const form = action.closest('form');
        if (form?.reportValidity()) submitEditor({ preventDefault() {}, target: form });
        else announce('Please complete the required fields before saving.');
        break;
      }
      case 'close-dialog': dialog.close(); break;
    }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('change', event => {
    if (event.target.name !== 'upload' || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) { announce('Choose an image file.'); event.target.value = ''; return; }
    if (file.size > 750 * 1024) { announce('Please choose an image under 750 KB for this browser demo.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const destination = dialog.querySelector('[name="featuredImageData"], [name="photoData"]');
      if (destination) destination.value = String(reader.result);
      const imagePath = dialog.querySelector('[name="image"], [name="src"]');
      if (imagePath) imagePath.value = `local:${file.name}`;
      announce('Demo image selected. It will be stored in this browser when you save.');
    };
    reader.onerror = () => announce('This browser could not read that image.');
    reader.readAsDataURL(file);
  });
  function submitEditor(event) {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form).entries());
    const hiddenData = values.featuredImageData || values.photoData;
    const localImages = [];
    const replaceLocalData = object => {
      for (const key of ['image', 'src']) {
        if (typeof object[key] === 'string' && object[key].startsWith('local:') && hiddenData) {
          object[key] = hiddenData;
          localImages.push(true);
        }
      }
      if (object.image && object.image.startsWith('data:')) object.image = object.image;
    };
    switch (form.id) {
      case 'article-form': {
        const id = values.id || uid('article');
        const old = find('articles', id);
        const item = { id, title: values.title.trim(), summary: values.summary.trim(), content: paragraphs(values.content), category: values.category, image: values.image.trim(), date: values.date, status: values.status, demo: values.demo !== 'false', featured: old?.featured || false };
        if (values.featuredImageData) item.image = values.featuredImageData;
        model.articles = old ? model.articles.map(entry => entry.id === id ? item : entry) : [item, ...model.articles];
        save(item.demo ? 'Sample article saved in this browser.' : 'Article saved in this browser.');
        break;
      }
      case 'event-form': {
        const id = values.id || uid('event');
        const old = find('events', id);
        const item = { id, title: values.title.trim(), date: values.date, startTime: values.startTime, endTime: values.endTime, location: values.location.trim(), description: values.description.trim(), category: values.category, image: values.image.trim(), videoUrl: values.videoUrl.trim(), status: values.demo === 'false' ? 'From church calendar' : values.status, source: values.source || '', demo: values.demo !== 'false' };
        model.events = old ? model.events.map(entry => entry.id === id ? item : entry) : [{ ...item, demo: true, status: 'Draft' }, ...model.events];
        save(item.demo ? 'Event copy saved in this browser.' : 'Event copy saved in this browser; source feed unchanged.');
        break;
      }
      case 'service-form': {
        const id = values.id || uid('service');
        const old = find('services', id);
        const item = { id, title: values.title.trim(), date: values.date, startTime: values.startTime, description: values.description.trim(), location: values.location.trim(), image: values.image.trim(), videoUrl: values.videoUrl.trim(), status: values.status, demo: values.demo !== 'false' };
        model.services = old ? model.services.map(entry => entry.id === id ? item : entry) : [item, ...model.services];
        save('Service information saved in this browser.');
        break;
      }
      case 'media-form': {
        if (!/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(values.url.trim())) { announce('Enter a YouTube URL supplied by the church.'); return; }
        const id = values.id || uid('media');
        const item = { id, title: values.title.trim(), url: values.url.trim(), category: values.category, date: values.date, description: values.description.trim(), status: values.status, demo: true };
        model.media = model.media.some(entry => entry.id === id) ? model.media.map(entry => entry.id === id ? item : entry) : [item, ...model.media];
        save('Video link saved in this browser.');
        break;
      }
      case 'community-form': {
        const id = values.id || uid('community');
        const item = { id, title: values.title.trim(), page: values.page, summary: values.summary.trim(), status: values.status, demo: true };
        model.community = model.community.some(entry => entry.id === id) ? model.community.map(entry => entry.id === id ? item : entry) : [item, ...model.community];
        save('Community section saved in this browser.');
        break;
      }
      case 'page-form': {
        const item = model.pages.find(entry => entry.page === values.page);
        item.title = values.title.trim(); item.summary = values.summary.trim(); item.status = values.status;
        save('Page notes saved in this browser; the public page is unchanged.');
        break;
      }
      case 'album-form': {
        const id = values.id || uid('album');
        const item = { id, title: values.title.trim(), photos: find('albums', id)?.photos || [] };
        model.albums = model.albums.some(entry => entry.id === id) ? model.albums.map(entry => entry.id === id ? item : entry) : [...model.albums, item];
        save('Gallery album saved in this browser.');
        break;
      }
      case 'photo-form': {
        const album = find('albums', values.albumId);
        const source = values.photoData || values.src.trim();
        if (!source) { announce('Choose a demo image or enter an existing image path.'); return; }
        album.photos.push({ id: uid('photo'), src: source, alt: values.alt.trim(), caption: values.caption.trim(), demo: true });
        save('Demo photo added to this browser album.');
        break;
      }
    }
    dialog.close();
  }

  content.addEventListener('submit', event => {
    if (event.target.id !== 'settings-form') return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target).entries());
    for (const [key, value] of Object.entries(values)) model.settings[key] = value.trim();
    save('Website settings saved in this browser.');
  });
  window.addEventListener('hashchange', () => { if (views[location.hash.slice(1)]) { currentView = location.hash.slice(1); render(); } });

  loadModel().then(() => {
    currentView = views[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
    content.setAttribute('aria-busy', 'false');
    render();
  }).catch(() => {
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = '<h1>Administration preview</h1><p>Content could not be loaded in this browser. Please refresh and try again.</p>';
  });
})();
