(() => {
  'use strict';

  const root = document.querySelector('#admin-content');
  const nav = document.querySelector('#admin-nav');
  const menuButton = document.querySelector('.admin-mobile-menu');
  const sidebar = document.querySelector('.admin-sidebar');
  const base = 'https://github.com/micklehamchurch/website/edit/Dev/';
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const dateLabel = value => {
    if (!value) return 'Date not provided';
    const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsed.valueOf()) ? safe(value) : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
  };
  const editLink = (path, label) => `<a class="admin-button" href="${base}${path}" target="_blank" rel="noopener noreferrer">${label} on GitHub ↗</a>`;
  const intro = `<div class="admin-repository-notice" role="note"><strong>Repository-backed content</strong><p>This dashboard is a static GitHub Pages site, so it cannot write files or publish changes itself. There is no browser-only saving and no GitHub token in the page. Use the repository links below; your GitHub account controls who can edit. Editable source files are kept under Jekyll-excluded <code>_content/</code>; the Dev build publishes only approved entries and regenerates the public pages and search index. Repository source visibility follows GitHub permissions; source remains visible on GitHub to anyone allowed to read the repository.</p></div>`;

  const sections = {
    dashboard: () => `<p class="admin-kicker">CONTENT WORKFLOW</p><h1>Website Administration</h1><p class="admin-lead">Review the current repository content and open its source files for an authenticated edit.</p>${intro}<div class="admin-dashboard-grid"><a href="#calendar" class="admin-dashboard-card"><span aria-hidden="true">▦</span><h2>Calendar</h2><p>Current event feed, manual additions, overrides and hidden entries.</p></a><a href="#news" class="admin-dashboard-card"><span aria-hidden="true">▤</span><h2>News &amp; Magazine</h2><p>Articles, publication status and generated article pages.</p></a></div><section class="admin-workflow"><h2>How a content change reaches the website</h2><ol><li>Open the source file and make a change using your GitHub account.</li><li>Commit the change to <code>Dev</code>. The repository build workflow validates and generates the calendar, article pages and search index.</li><li>Review the build result and the Dev website. Approved changes can later be merged through the church’s normal review process.</li></ol><p>Changes are not reported as published until the repository build succeeds. GitHub Pages remains a static host; secure editing is provided by GitHub’s own account permissions.</p></section>`,
    calendar: () => `<p class="admin-kicker">CURRENT REPOSITORY DATA</p><h1>Calendar</h1><p class="admin-lead">The public calendar is generated from the supplied ICS feed plus approved repository-managed changes.</p>${intro}<div class="admin-source-actions">${editLink('_content/calendar.json', 'Edit calendar additions / overrides')}<a class="admin-button" href="../events.json" target="_blank" rel="noopener noreferrer">View generated event IDs ↗</a>${editLink('_content/calendar-source.ics', 'Inspect current calendar feed')}</div><p class="admin-section-note"><strong>Source rules:</strong> <code>_content/calendar-source.ics</code> preserves the supplied church calendar. Add events in <code>_content/calendar.json</code>; edit feed events with an override keyed by its generated event <code>id</code>; hide a feed event by adding its ID to <code>hiddenEventIds</code>. Set an entry’s <code>status</code> to <code>draft</code> to unpublish it. Do not edit generated <code>events.json</code>.</p><p class="admin-count">${calendarCount} published events currently in the generated calendar.</p><div class="admin-record-list">${calendarRows}</div><section class="admin-workflow"><h2>Calendar data example</h2><pre><code>{
  "hiddenEventIds": [],
  "overrides": [{ "id": "FEED_EVENT_ID", "title": "Updated title", "status": "published" }],
  "events": [{ "id": "parish-event-1", "title": "Confirmed event", "start": "2026-10-10T10:00:00", "end": "2026-10-10T11:00:00", "timeZone": "Europe/London", "location": "Confirmed venue", "description": "Approved details", "status": "published" }]
}</code></pre><p>Use ISO local date-times with the stated time zone. Keep event details accurate and use the church address only when the source confirms the church as venue.</p></section>`,
    news: () => `<p class="admin-kicker">CURRENT REPOSITORY DATA</p><h1>News &amp; Magazine</h1><p class="admin-lead">News cards, individual article pages and search entries are built from one source file.</p>${intro}<div class="admin-source-actions">${editLink('_content/news.json', 'Edit News &amp; Magazine source')}</div><p class="admin-section-note"><strong>Source rules:</strong> Edit <code>_content/news.json</code>. Give each article a unique slug, title, category, date label, excerpt and paragraphs. Use <code>"status": "draft"</code> to unpublish while retaining it in the source repository. Omit status or set it to <code>published</code> to publish. All current articles are fictional samples and must remain visibly marked until replaced with approved parish content. Do not edit generated HTML directly. Draft copy is kept out of the deployed site files.</p><p class="admin-count">${newsCount} published articles currently in the News listing.</p><div class="admin-record-list">${newsRows}</div>`,
    help: () => `<p class="admin-kicker">SECURE EDITING</p><h1>Publishing workflow</h1>${intro}<section class="admin-workflow"><h2>Current process</h2><ol><li>Use the GitHub source link for the relevant content file.</li><li>Commit content changes to <code>Dev</code>. GitHub repository permissions and review rules govern the edit.</li><li>The repository action runs <code>npm run build</code>, checks the result and commits generated outputs to <code>Dev</code>.</li><li>GitHub Pages deploys the updated branch content after the generated commit.</li></ol><p>To edit a feed event, copy its exact <code>id</code> from the generated calendar view or <code>events.json</code> and add an override. To delete a feed event from the public calendar, add the id to <code>hiddenEventIds</code>. Manual events can be removed from the <code>events</code> array.</p><h2>What this does not do</h2><p>This is not an in-page CMS. Editors need GitHub repository access. Image uploads, rich text editing, user roles, approvals in the dashboard and direct online publication require a future authenticated backend/CMS. No personal access token is stored in the website.</p></section>`
  };

  let calendarCount = 0;
  let newsCount = 0;
  let calendarRows = '';
  let newsRows = '';
  function render(view = location.hash.slice(1) || 'dashboard') {
    root.innerHTML = (sections[view] || sections.dashboard)();
    nav.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
    document.querySelector('#admin-main').focus({ preventScroll: true });
  }

  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    location.hash = button.dataset.view;
  });
  window.addEventListener('hashchange', () => render());
  menuButton.addEventListener('click', () => {
    const opened = sidebar.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(opened));
    menuButton.setAttribute('aria-label', opened ? 'Close administration menu' : 'Open administration menu');
  });

  Promise.all([
    fetch('../events.json').then(response => { if (!response.ok) throw new Error('Calendar build output is unavailable'); return response.json(); }),
    fetch('../news-data.json').then(response => { if (!response.ok) throw new Error('News source is unavailable'); return response.json(); })
  ]).then(([calendar, news]) => {
    const events = calendar.items || [];
    const articles = (news.articles || []).filter(article => (article.status || 'published') === 'published');
    calendarCount = events.length;
    newsCount = articles.length;
    calendarRows = events.slice(0, 12).map(item => `<article class="admin-record-card"><div class="admin-record-meta">${safe(dateLabel(item.start))} · ${safe(item.start?.slice(11, 16) || '')}</div><h2>${safe(item.title)}</h2><p>${safe(item.location || 'Location not provided')}</p>${item.sourceUrl ? `<a href="${safe(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Original calendar entry ↗</a>` : '<span>Repository-managed event</span>'}</article>`).join('') || '<p>No published events are generated yet.</p>';
    newsRows = articles.map(article => `<article class="admin-record-card"><div class="admin-record-meta">${safe(article.category)} · ${safe(article.dateLabel)}</div><h2>${safe(article.title)}</h2><p>${safe(article.excerpt)}</p><p class="admin-demo-caption">${article.demo === false ? 'Parish content' : 'SAMPLE / DEMO — fictional content'}</p><a href="../news/${encodeURIComponent(article.slug)}.html">Open generated article ↗</a></article>`).join('') || '<p>No published articles are generated yet.</p>';
    root.setAttribute('aria-busy', 'false');
    render();
  }).catch(error => {
    console.error(error);
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = `<h1>Repository data unavailable</h1><p>${safe(error.message)}. Run the repository build and reload this page.</p>`;
  });
})();
