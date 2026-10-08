const officialYouTubeChannel = 'https://www.youtube.com/@stmichaelandallangelschurc3012';
// Add future confirmed accounts here, with their own accessible name and inline icon.
const socialLinks = [{
  name: 'YouTube',
  url: officialYouTubeChannel,
  label: 'St Michael & All Angels Church on YouTube (opens in a new tab)',
  icon: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z"/></svg>'
}];

const navigation = `
  <div class="container nav-wrap">
    <div class="header-branding">
    <a class="brand" href="index.html" aria-label="St Michael and All Angels home">
      <span class="brand-mark" aria-hidden="true">✝</span>
      <span><strong>ST MICHAEL &amp; ALL ANGELS</strong><small>MICKLEHAM &amp; WESTHUMBLE</small></span>
    </a>
      <a class="nav-youtube" href="${officialYouTubeChannel}" target="_blank" rel="noopener noreferrer" aria-label="${socialLinks[0].label}" title="YouTube">${socialLinks[0].icon}</a>
    </div>
    <button class="menu-toggle" type="button" aria-label="Open navigation" aria-controls="mainNav" aria-expanded="false"><span aria-hidden="true">☰</span></button>
    <nav class="nav" id="mainNav" aria-label="Main navigation">
      <div class="nav-primary">
      <a class="nav-link" href="index.html">Home</a>
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-worship">Service<svg class="nav-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5"/></svg></button><div class="dropdown" id="menu-worship"><a href="worship.html">Worship overview</a><a href="sunday-services.html">Sunday Services</a><a href="weekly-worship.html">Weekly Worship</a><a href="special-services.html">Special Services</a><a href="prayer.html">Prayer</a><a href="baptisms.html">Baptisms</a><a href="weddings.html">Weddings</a><a href="funerals.html">Funerals</a></div></div>
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-visit">Visit &amp; Learn<svg class="nav-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5"/></svg></button><div class="dropdown" id="menu-visit"><a href="visit.html">Visit the Church</a><a href="what-to-expect.html">What to Expect</a><a href="finding-us.html">Find Us</a><a href="church-building.html">The Church Building</a><a href="westhumble-chapel.html">Westhumble Chapel</a><a href="churchyard.html">Churchyard</a><a href="churchyard-regulations.html">Churchyard Regulations</a><a href="war-memorial.html">War Memorial</a></div></div>
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-community">Our Community<svg class="nav-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5"/></svg></button><div class="dropdown" id="menu-community"><a href="church-life.html">Church Community</a><a href="children-families.html">Children &amp; Families</a><a href="alpha.html">Alpha</a><a href="bible-study-fellowship.html">Bible Study &amp; Fellowship</a><a href="pastoral-care.html">Pastoral Care</a><a href="volunteering.html">Volunteering</a><a href="supporting-community.html">Supporting the Community</a></div></div>
      <a class="nav-link" href="news.html">News</a>
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-about">About Us<svg class="nav-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5"/></svg></button><div class="dropdown" id="menu-about"><a href="our-team.html">Our Team</a><a href="about.html">Our Parish</a><a href="our-vision.html">Our Vision</a><a href="our-churches.html">Our Churches</a><a href="our-history.html">Church History</a><a href="eco-church.html">Eco Church</a><a href="electoral-roll.html">Electoral Roll</a><a href="safeguarding.html">Safeguarding</a><a href="privacy.html">Privacy &amp; GDPR</a></div></div>
      </div>
      <div class="nav-utilities">
      <form class="header-search" role="search" action="search.html" method="get" aria-label="Search the website">
        <label class="header-search-label" for="header-search-query">Search the website</label>
        <input id="header-search-query" type="search" name="q" placeholder="Search..." autocomplete="off">
        <button type="submit" aria-label="Submit website search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
      </form>
      <div class="nav-actions">
      <a class="nav-link nav-calendar" href="calendar.html"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h2M13 15h2M7 18h2"/></svg><span>Calendar</span></a>
      </div>
      </div>
    </nav>
  </div>`;

const socialArea = `<section class="footer-social" aria-labelledby="footer-social-title"><h2 id="footer-social-title">Follow St Michael &amp; All Angels</h2><ul class="social-links">${socialLinks.map(link => `<li><a class="social-link" href="${link.url}" target="_blank" rel="noopener noreferrer" aria-label="${link.label}">${link.icon}<span>${link.name}</span><span class="social-external" aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`;
const footer = `
  <div class="container footer-features">
    <section class="footer-feature-support" aria-labelledby="footer-support-title"><p class="footer-feature-kicker">Help us continue our work</p><h2 id="footer-support-title">Support our church</h2><p>Help care for our buildings, support ministry and serve our community.</p><a class="footer-feature-link" href="give.html">Ways to give <span aria-hidden="true">→</span></a></section>
    <section class="footer-feature-diocese" aria-labelledby="footer-diocese-title"><div><p class="footer-feature-kicker">Our wider church</p><h2 id="footer-diocese-title">Part of the Diocese of Guildford</h2><p>Part of the Church of England and the Diocese of Guildford.</p><a class="footer-feature-link" href="https://www.cofeguildford.org.uk/" target="_blank" rel="noopener noreferrer">Learn more about the Diocese <span aria-hidden="true">→</span></a></div><a class="footer-diocese-logo" href="https://www.cofeguildford.org.uk/" target="_blank" rel="noopener noreferrer" aria-label="Visit the Diocese of Guildford website (opens in a new tab)"><span class="diocese-logo-crop"><img src="assets/branding/diocese-of-guildford-colour.png" width="2291" height="1521" alt="Diocese of Guildford logo" loading="lazy" decoding="async"></span></a></section>
  </div>
  <div class="container footer-grid">
    <div class="footer-identity"><a class="brand footer-brand" href="index.html"><span class="brand-mark" aria-hidden="true">✝</span><span><strong>ST MICHAEL &amp; ALL ANGELS</strong><small>MICKLEHAM &amp; WESTHUMBLE</small></span></a><p>A friendly church community in the heart of the Surrey Hills.</p>${socialArea}</div>
    <div><h2>Explore</h2><div class="footer-explore-links"><a href="worship.html">Worship</a><a href="calendar.html">Calendar</a><a href="church-life.html">Church life</a><a href="news.html">News</a><a href="visit.html">Visit the Church</a><a href="gallery.html">Gallery</a></div></div>
    <div><h2>Get in touch</h2><a href="contact.html">Contact the church</a><a href="our-team.html">Our Team</a><a href="safeguarding.html">Safeguarding</a></div>
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
  <div class="container footer-bottom"><div class="footer-bottom-links"><span>© <span data-current-year>2026</span> St Michael &amp; All Angels</span><a href="contact.html">Contact</a></div><p class="footer-credit">Website by Ed Popov</p></div>`;


document.querySelector('[data-site-header]')?.insertAdjacentHTML('afterbegin', navigation);
document.querySelector('[data-site-footer]')?.insertAdjacentHTML('afterbegin', footer);
document.dispatchEvent(new Event('typography-preview-ready'));
// The contextual Media link shares the same confirmed channel as the footer.
document.querySelectorAll('[data-youtube-channel]').forEach(link => { link.href = officialYouTubeChannel; });

const siteScript = document.querySelector('script[src*="site.js"]');
if (siteScript) {
  const headerStyles = document.createElement('link');
  headerStyles.rel = 'stylesheet';
  headerStyles.href = new URL('header-navigation.css?navigation=20261008-news', siteScript.src).href;
  document.head.append(headerStyles);
}
const footerBottom = document.querySelector('.footer-bottom-links');
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
function syncNavigationBackdrop() {
  navigationBackdrop.hidden = !nav?.classList.contains('is-open') && !dropdownButtons.some(button => button.getAttribute('aria-expanded') === 'true');
}

function closeDropdowns(except = null) {
  dropdownButtons.forEach(button => {
    if (button !== except) {
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
  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    closeDropdowns(button);
    button.setAttribute('aria-expanded', String(!isOpen));
    button.closest('.nav-item')?.classList.toggle('is-open', !isOpen);
    syncNavigationBackdrop();
  });
});

// Only the two read-only public dialogs opt in. Admin/forms are never registered.
// The archive's read-only profile and image dialogs also use this shared behaviour.
const publicDialogIds = new Set(['event-detail-dialog', 'calendar-subscription-dialog', 'clergy-profile-dialog', 'clergy-image-dialog']);
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
  const opener = nav?.classList.contains('is-open') ? menuButton : dropdownButtons.find(button => button.getAttribute('aria-expanded') === 'true');
  closeDropdowns();
  nav?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open navigation');
  syncNavigationBackdrop();
  if (returnFocus) opener?.focus({ preventScroll: true });
}
document.addEventListener('click', event => {
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
    if (!directNavigationPage && !document.querySelector('.nav-trigger.is-current-section')) link.closest('.nav-item')?.querySelector('.nav-trigger')?.classList.add('is-current-section');
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
