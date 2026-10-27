const officialYouTubeChannel = 'https://www.youtube.com/@stmichaelandallangelschurc3012';
// Add future confirmed accounts here, with their own accessible name and inline icon.
const socialLinks = [{
  name: 'YouTube',
  url: officialYouTubeChannel,
  label: 'St Michael & All Angels Church on YouTube (opens in a new tab)',
  icon: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z"/></svg>'
}];

// Audited destinations shared by the desktop hub and mobile accordions.
const navigationCategories = [
 {id:'services',title:'Services',description:'Join us for services and prayer',icon:'book',image:'assets/images/navigation/services-480.webp',links:[['Services Overview','worship.html'],['Service Times','weekly-worship.html'],['Prayer','prayer.html']]},
 {id:'life-events',title:'Life Events',description:"For life's most important moments",icon:'heart',image:'assets/images/navigation/life-events-480.webp',links:[['Baptisms','baptisms.html'],['Weddings','weddings.html'],['Funerals','funerals.html']]},
 {id:'visit',title:'Visit & Explore',description:'Discover our church and its heritage',icon:'church',image:'assets/images/navigation/visit-480.webp',links:[['Find Us','finding-us.html'],['The Church Building','church-building.html'],['Our History','our-history.html'],['The Churchyard','churchyard.html'],['Westhumble Chapel','westhumble-chapel.html']]},
 {id:'community',title:'Community',description:'Life and activities in our parish',icon:'people',image:'assets/images/navigation/community-480.webp',links:[['News','news.html'],['Community & Groups','church-life.html'],['Children & Families','children-families.html'],['Bible Study & Fellowship','bible-study-fellowship.html'],['Pastoral Care','pastoral-care.html'],['Eco Church','eco-church.html'],['Parish Magazine','news.html#latest-parish-magazine']]},
 {id:'about',title:'About Us',description:'Our people, vision and information',icon:'church',image:'assets/images/navigation/about-480.webp',links:[['Our Team','our-team.html'],['Our Parish','about.html'],['Our Vision','our-vision.html'],['Our Churches','our-churches.html'],['Safeguarding','safeguarding.html'],['Contact','contact.html']]}
];
const navigationEscape=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const navigationIcons={
 book:'<path d="M12 5Q7 2 2 4v16q5-2 10 1 5-3 10-1V4q-5-2-10 1Zm0 0v16"/>',
 heart:'<path d="M12 21 3 12C-3 5 6-1 12 6c6-7 15-1 9 6Z"/>',
 church:'<path d="M4 21V11l8-7 8 7v10ZM9 21v-7h6v7M12 1v6M9 3h6"/>',
 people:'<circle cx="12" cy="6" r="3"/><path d="M6 21v-6a6 6 0 0 1 12 0v6ZM4 5a3 3 0 0 0 0 6M20 5a3 3 0 0 1 0 6M3 14H1v6h3M21 14h2v6h-3"/>'
};
const navigationIcon=icon=>`<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${navigationIcons[icon]}</svg>`;
const navigation = `
  <div class="container nav-wrap">
    <div class="header-branding">
    <a class="brand" href="index.html">
      <span class="brand-mark" aria-hidden="true">✝</span>
      <span><strong>St Michael &amp; All Angels</strong><small>MICKLEHAM &amp; WESTHUMBLE</small></span>
    </a>
    </div>
    <button class="menu-toggle" type="button" aria-label="Open navigation" aria-controls="mainNav" aria-expanded="false"><span aria-hidden="true">☰</span><span class="menu-label">Menu</span></button>
    <nav class="nav" id="mainNav" aria-label="Main">
      <div class="nav-primary">
      <a class="nav-link" href="index.html">Home</a>
      ${navigationCategories.map(category=>`<div class="nav-item has-dropdown" data-category="${category.id}"><button class="nav-trigger" id="trigger-${category.id}" type="button" aria-expanded="false" aria-controls="menu-${category.id}">${navigationEscape(category.title)}<svg class="nav-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></button></div>`).join('')}
      </div>
      <div class="navigation-hub" id="navigation-hub" role="region" aria-label="Explore our parish" hidden>
      ${navigationCategories.map(category=>`<section class="dropdown hub-column" id="menu-${category.id}" data-category="${category.id}" aria-labelledby="heading-${category.id}"><div class="hub-heading">${navigationIcon(category.icon)}<h2 id="heading-${category.id}">${navigationEscape(category.title)}</h2></div><p class="hub-description">${navigationEscape(category.description)}</p><div class="hub-links">${category.links.map(([label,url])=>`<a href="${url}">${navigationEscape(label)}</a>`).join('')}</div><img class="hub-image" data-src="${category.image}" width="480" height="200" alt="" decoding="async"></section>`).join('')}
      </div>
      <div class="nav-utilities">
      <a class="compact-search" href="search.html" aria-label="Search the website"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>Search</span></a>
      <form class="header-search" role="search" action="search.html" method="get" aria-label="Search the website">
        <label class="header-search-label" for="header-search-query">Search the website</label>
        <input id="header-search-query" type="search" name="q" placeholder="Search..." autocomplete="off">
        <button type="submit" aria-label="Submit website search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
      </form>
      <div class="nav-actions">
      <a class="nav-link nav-calendar" href="calendar.html" aria-label="Calendar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h2M13 15h2M7 18h2"/></svg><span>Calendar</span></a>
      <a class="nav-link nav-bible" id="header-bible-open" href="bible.html" aria-label="Bible" title="Open the Bible"><svg class="header-book" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 5Q7 2 2 4v16q5-2 10 1 5-3 10-1V4q-5-2-10 1Zm0 0v16"/></svg><span class="header-bible-label">Bible</span></a>
      </div>
      <a class="header-visit" href="visit.html">Plan your visit <span aria-hidden="true">→</span></a>
      </div>
    </nav>
  </div>`;

const socialArea = `<section class="footer-social" aria-labelledby="footer-social-title"><h2 id="footer-social-title">Follow St Michael &amp; All Angels</h2><ul class="social-links">${socialLinks.map(link => `<li><a class="social-link" href="${link.url}" target="_blank" rel="noopener noreferrer" aria-label="${link.label}">${link.icon}<span>${link.name}</span><span class="social-external" aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`;
const footer = `
  <div class="container footer-grid">
    <div class="footer-identity"><a class="brand footer-brand" href="index.html"><span class="brand-mark" aria-hidden="true">✝</span><span><strong>ST MICHAEL &amp; ALL ANGELS</strong><small>MICKLEHAM &amp; WESTHUMBLE</small></span></a><p>A friendly church community in the heart of the Surrey Hills.</p>${socialArea}</div>
    <div><h2>Explore</h2><div class="footer-explore-links"><a href="worship.html">Worship</a><a href="calendar.html">Calendar</a><a href="bible.html">Read the Bible</a><a href="church-life.html">Church life</a><a href="news.html">News</a><a href="visit.html">Visit the Church</a><a href="gallery.html">Parish Photographs</a></div></div>
    <div><h2>Parish information</h2><a href="contact.html">Contact the church</a><a href="our-team.html">Our Team</a><a href="safeguarding.html">Safeguarding</a><a href="electoral-roll.html">Electoral Roll</a><a href="privacy.html">Privacy &amp; GDPR</a><a href="bible-translation.html">Bible translation acknowledgement</a></div>
  </div>
  <!-- TEMPORARY TYPOGRAPHY PREVIEW: remove after parish typography decision. -->
  <section class="container typography-preview" aria-label="Preview typography">
    <p>Preview typography</p><p class="typography-preview-note">Temporary design preview</p>
    <div class="typography-preview-options" role="group" aria-label="Typography options">
      <button type="button" data-typography-option="heritage" aria-pressed="true">Heritage</button>
      <button type="button" data-typography-option="modern-classic" aria-pressed="false">Modern Classic</button>
      <button type="button" data-typography-option="contemporary" aria-pressed="false">Contemporary</button>
    </div>
  </section>
  <div class="container footer-development" role="group" aria-label="Development tools"></div>
  <div class="container footer-bottom"><div class="footer-bottom-links"><span>© <span data-current-year>2026</span> St Michael &amp; All Angels</span></div><p class="footer-credit">Website by Ed Popov</p></div>`;


document.querySelector('[data-site-header]')?.insertAdjacentHTML('afterbegin', navigation);
document.querySelector('[data-site-footer]')?.insertAdjacentHTML('afterbegin', footer);
// Legal information can opt into the same useful footer without promotional features.
const compactFooter = document.querySelector('[data-site-footer][data-footer-compact]');
if (compactFooter) {
  compactFooter.querySelector('.footer-features')?.remove();
  const identity = compactFooter.querySelector('.footer-identity');
  const relationship = document.createElement('p');
  relationship.className = 'footer-diocese-note';
  relationship.append('Church of England · ');
  const diocese = document.createElement('a');
  diocese.href = 'https://www.cofeguildford.org.uk/';
  diocese.textContent = 'Diocese of Guildford';
  diocese.target = '_blank';
  diocese.rel = 'noopener noreferrer';
  relationship.append(diocese, '.');
  identity?.append(relationship);
  const preview = compactFooter.querySelector('.typography-preview');
  if (preview) {
    const details = document.createElement('details');
    details.className = 'container footer-typography-options';
    const summary = document.createElement('summary');
    summary.textContent = 'Typography preview (Dev)';
    preview.before(details);
    details.append(summary, preview);
  }
}
document.dispatchEvent(new Event('typography-preview-ready'));
// The contextual Media link shares the same confirmed channel as the footer.
document.querySelectorAll('[data-youtube-channel]').forEach(link => { link.href = officialYouTubeChannel; });

const siteScript = document.querySelector('script[src*="site.js"]');
if (siteScript) {
  const headerStyles = document.createElement('link');
  const footerStyles = document.createElement('link');
  footerStyles.rel = 'stylesheet';
  footerStyles.href = new URL('footer-standard.css?v=20261027-clean-1', siteScript.src).href;
  document.head.append(footerStyles);
  headerStyles.rel = 'stylesheet';
  headerStyles.href = new URL('header-navigation.css?navigation=20261026-hub-1', siteScript.src).href;
  document.head.append(headerStyles);
  // One signature background for normal public internal headers only.
  // Keep Home, Admin and the embedded Bible reader on their existing treatment.
  const publicHeader=document.querySelector('header.site-header[data-site-header]');
  const publicBase=new URL('.',siteScript.src);
  const publicPath=location.pathname.startsWith(publicBase.pathname)?location.pathname.slice(publicBase.pathname.length):null;
  const isHome=publicPath===''||publicPath==='index.html';
  const isSpecial=publicPath===null||/^(admin|auth|login)(?:[/.]|$)/i.test(publicPath)||(window.parent!==window&&new URLSearchParams(location.search).get('book')==='overlay');
  if(publicHeader&&!isHome&&!isSpecial){
    publicHeader.classList.add('header-internal-photo');
    const photoStyles=document.createElement('link');photoStyles.rel='stylesheet';
    // Explicit approved hero routes; ordinary internal pages retain Phase 1.
    const seamlessHeroes={
      'news.html':'.news-hub-hero','baptisms.html':'.baptism-hero','weddings.html':'.wedding-hero',
      'funerals.html':'.funeral-hero','about.html':'.parish-about-hero',
      'our-history.html':'.history-hero','pastoral-care.html':'.pastoral-banner',
      'visit.html':'.visit-opening','finding-us.html':'.find-hero'
    };
    const seamlessHero=seamlessHeroes[publicPath]||(/^pews-news(?:\.html|\/\d{4}-\d{2}-\d{2}\.html)$/.test(publicPath)?'.pews-hero':null);
    if(document.querySelector('.editorial-hero')){
      publicHeader.classList.add('editorial-header');
      const editorialScript=document.createElement('script');
      editorialScript.src=new URL('editorial-heroes.js?v=20261024-1',siteScript.src).href;
      document.body.append(editorialScript);
    }else if(seamlessHero&&document.querySelector(seamlessHero+' img')){
      publicHeader.dataset.seamlessHero=seamlessHero;
      photoStyles.href=new URL('seamless-heroes.css?v=20261024-polish-1',siteScript.src).href;
      const seamlessScript=document.createElement('script');
      seamlessScript.src=new URL('seamless-heroes.js?v=20261024-1',siteScript.src).href;
      photoStyles.addEventListener('load',()=>document.body.append(seamlessScript),{once:true});
    }else photoStyles.href=new URL('internal-header-photo.css?v=20261024-1',siteScript.src).href;
    if(photoStyles.hasAttribute('href'))document.head.append(photoStyles);
  }

  const stateScript=document.createElement('script');
  stateScript.src=new URL('public-header.js?v=20261026-hub-1',siteScript.src).href;
  document.head.append(stateScript);
  const landscapeStyles = document.createElement('link');
  landscapeStyles.rel = 'stylesheet';
  landscapeStyles.href = new URL('phone-landscape.css?v=20261020-reading-1', siteScript.src).href;
  document.head.append(landscapeStyles);
}
const footerBottom = document.querySelector('.footer-development');
if (siteScript && footerBottom) {
  const adminUrl = new URL('admin/', new URL('.', siteScript.src)).href;
  const adminLink = document.createElement('a');
  adminLink.href = adminUrl;
  adminLink.textContent = 'Administration — Development Preview';
  footerBottom.append(adminLink);

}

document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mainNav');
const dropdownButtons = [...document.querySelectorAll('.nav-trigger')];
const navigationBackdrop = document.createElement('div');
navigationBackdrop.className = 'navigation-dismiss-backdrop';
navigationBackdrop.setAttribute('aria-hidden', 'true');
navigationBackdrop.hidden = true;
document.body.append(navigationBackdrop);
const navigationHub=document.querySelector('.navigation-hub');
function syncNavigationHub(){
 const compact=matchMedia('(max-width:1535px)').matches;
 const selected=dropdownButtons.find(button=>button.closest('.nav-item').classList.contains('is-open'));
 dropdownButtons.forEach(button=>{button.setAttribute('aria-controls',compact?'menu-'+button.closest('.nav-item').dataset.category:'navigation-hub');if(!compact)button.setAttribute('aria-expanded',String(!!selected));});
 if(navigationHub)navigationHub.hidden=compact||!selected;
 document.querySelectorAll('.hub-column').forEach(column=>column.classList.toggle('is-selected',selected?.closest('.nav-item').dataset.category===column.dataset.category));
 if(!compact&&selected)document.querySelectorAll('.hub-image[data-src]').forEach(image=>{image.addEventListener('error',()=>{image.style.visibility='hidden';},{once:true});image.src=new URL(image.dataset.src,siteScript.src).href;delete image.dataset.src;});
}
function syncNavigationBackdrop() {
  syncNavigationHub();
  if (globalThis.churchResponsiveNavigation?.isOpen()) { navigationBackdrop.hidden = true; return; }
  navigationBackdrop.hidden = !nav?.classList.contains('is-open') && !dropdownButtons.some(button => button.getAttribute('aria-expanded') === 'true');
}

function closeDropdowns(except = null) {
  dropdownButtons.forEach(button => {
    if (button !== except) {
      delete button.dataset.openedByHover;
      button.setAttribute('aria-expanded', 'false');
      button.closest('.nav-item')?.classList.remove('is-open');
    }
  });
}

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  if (!isOpen) closeDropdowns();
  syncNavigationBackdrop();
});

dropdownButtons.forEach(button => {
  button.addEventListener('click', event => {
    if(event.detail>0 && button.dataset.openedByHover){delete button.dataset.openedByHover;return;}
    const isOpen = button.closest('.nav-item').classList.contains('is-open');
    closeDropdowns(button);
    button.setAttribute('aria-expanded', String(!isOpen));
    button.closest('.nav-item')?.classList.toggle('is-open', !isOpen);
    syncNavigationBackdrop();
  });
});

// Only the two read-only public dialogs opt in. Admin/forms are never registered.
// The archive's read-only profile and image dialogs also use this shared behaviour.
const publicDialogIds = new Set(['event-detail-dialog', 'calendar-subscription-dialog', 'clergy-profile-dialog', 'clergy-image-dialog', 'parish-gallery-dialog']);
const publicDialogOpeners = new WeakMap();
let publicDialogStack = [];
function openPublicDialog(dialog, opener = document.activeElement) {
  if (!publicDialogIds.has(dialog.id) || dialog.open) return;
  if (!publicDialogOpeners.has(dialog)) dialog.addEventListener('close', () => {
    publicDialogStack = publicDialogStack.filter(item => item !== dialog);
    let previous = publicDialogOpeners.get(dialog);
    if (previous?.dataset?.eventId && !previous.isConnected) previous = [...document.querySelectorAll('[data-event-id]')].find(item => item.dataset.eventId === previous.dataset.eventId && item.getClientRects().length);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  });
  publicDialogOpeners.set(dialog, opener);
  publicDialogStack.push(dialog);
  dialog.showModal();
}
function activePublicDialog() { return [...publicDialogStack].reverse().find(dialog => dialog.open); }
function outsidePanel(event, panel) {
  const rect = panel.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}
let outsidePress = null;
document.addEventListener('pointerdown', event => {
  const dialog = activePublicDialog();
  outsidePress = event.isPrimary && event.button === 0 && dialog && outsidePanel(event, dialog) ? dialog : null;
}, true);
function closeNavigation(returnFocus = false) {
  if (globalThis.churchResponsiveNavigation?.close(returnFocus)) return;
  const opener = nav?.classList.contains('is-open') ? menuButton : dropdownButtons.find(button => button.closest('.nav-item').classList.contains('is-open'));
  closeDropdowns();
  nav?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open navigation');
  syncNavigationBackdrop();
  if (returnFocus) opener?.focus({ preventScroll: true });
}
document.addEventListener('click', event => {
  if (globalThis.churchResponsiveNavigation?.isOpen()) return;
  const dialog = activePublicDialog();
  if (dialog) {
    const dismiss = outsidePress === dialog && outsidePanel(event, dialog);
    outsidePress = null;
    if (dismiss) { event.preventDefault(); event.stopImmediatePropagation(); dialog.close(); }
    return;
  }
  outsidePress = null;
  const navigationOpen = nav?.classList.contains('is-open') || dropdownButtons.some(button => button.getAttribute('aria-expanded') === 'true');
  if (navigationOpen && !event.target.closest('#mainNav, .menu-toggle')) {
    // Capture before page controls: the dismissal tap cannot also activate them.
    event.preventDefault(); event.stopImmediatePropagation(); closeNavigation(true);
  }
}, true);
document.addEventListener('keydown', event => {
  // Native modal Escape/cancel handles the top dialog, preserving nested dialogs.
  if (event.key === 'Escape' && !activePublicDialog()) closeNavigation(true);
});
const currentPage = location.pathname.split('/').pop() || 'index.html';
if (currentPage === 'search.html') {
  document.querySelector('.header-search')?.classList.add('is-current-section');
  const headerQuery = document.querySelector('#header-search-query');
  if (headerQuery) headerQuery.value = new URLSearchParams(location.search).get('q') || '';
}
const directNavigationPage = document.querySelector(`.nav-primary > a[href="${currentPage}"], .nav-actions > a[href="${currentPage}"]`);
document.querySelectorAll('.nav a, .dropdown a').forEach(link => {
  if (link.getAttribute('href') === currentPage) {
    link.setAttribute('aria-current', 'page');
    // Prefer a direct page link; otherwise the first matching section is canonical.
    if (!directNavigationPage && !document.querySelector('.nav-trigger.is-current-section')) document.querySelector(`[aria-controls="${link.closest('.hub-column')?.id}"]`)?.classList.add('is-current-section');
  }
  link.addEventListener('click', () => {
    closeNavigation();
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});
// A versioned Home destination avoids the separately cached / and /index.html documents.
// Relative URLs retain GitHub Pages and custom-domain base-path behaviour.
document.querySelectorAll('a[href="index.html"]').forEach(link => {
  link.setAttribute('href', 'index.html?hero=20261005-v4');
});

// Shared compact header: one navigation tree, native modal drawer.
if (siteScript && nav && menuButton) {
  const landscapeScript = document.createElement('script');
  landscapeScript.src = new URL('responsive-navigation.js?v=20261026-hub-1', siteScript.src).href;
  document.head.append(landscapeScript);
}

// The shared Bible entry reuses the existing book reader and modal presentation.
if (siteScript && document.getElementById('header-bible-open') && window.parent === window) {
  const bibleStyles = document.createElement('link');
  bibleStyles.rel = 'stylesheet';
  bibleStyles.href = new URL('home-bible.css?v=20261019-mobile-target-2', siteScript.src).href;
  document.head.append(bibleStyles);
  const bibleScript = document.createElement('script');
  bibleScript.src = new URL('home-bible.js?v=20261020-performance-1', siteScript.src).href;
  document.head.append(bibleScript);
}

// Additive feedback loads independently; unavailable/Off mode leaves the page intact.
if(siteScript){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('feedback.css?v=20261018-simple-1',siteScript.src).href;document.head.append(css);const feedback=document.createElement('script');feedback.type='module';feedback.src=new URL('feedback.js?v=20261019-public-wording-1',siteScript.src).href;css.addEventListener('load',()=>document.body.append(feedback),{once:true});}
