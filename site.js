const navigation = `
  <div class="container nav-wrap">
    <a class="brand" href="index.html" aria-label="St Michael and All Angels home">
      <span class="brand-mark" aria-hidden="true">✝</span>
      <span><strong>ST MICHAEL &amp; ALL ANGELS</strong><small>MICKLEHAM &amp; WESTHUMBLE</small></span>
    </a>
    <button class="menu-toggle" type="button" aria-label="Open navigation" aria-controls="mainNav" aria-expanded="false"><span aria-hidden="true">☰</span></button>
    <nav class="nav" id="mainNav" aria-label="Main navigation">
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-worship">Worship <span aria-hidden="true">⌄</span></button><div class="dropdown" id="menu-worship"><a href="worship.html">Worship and prayer</a><a href="whats-on.html">Services and events</a></div></div>
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-community">Our community <span aria-hidden="true">⌄</span></button><div class="dropdown" id="menu-community"><a href="church-life.html">Church life</a><a href="news.html">News and magazine</a><a href="gallery.html">Gallery</a></div></div>
      <div class="nav-item has-dropdown"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-visit">Visit and learn <span aria-hidden="true">⌄</span></button><div class="dropdown" id="menu-visit"><a href="visit.html">Plan your visit</a><a href="about.html">About our parish</a><a href="contact.html">Contact us</a></div></div>
      <a class="nav-link" href="sunday-services.html">Media</a>
      <a class="nav-link" href="search.html" aria-label="Search the website">Search</a>
      <a class="btn btn-small btn-green nav-give" href="give.html">♥ Give</a>
    </nav>
  </div>`;

const footer = `
  <div class="container footer-grid">
    <div><a class="brand footer-brand" href="index.html"><span class="brand-mark" aria-hidden="true">✝</span><span><strong>ST MICHAEL &amp; ALL ANGELS</strong><small>MICKLEHAM &amp; WESTHUMBLE</small></span></a><p>A friendly church community in the heart of the Surrey Hills.</p></div>
    <div><h2>Explore</h2><a href="worship.html">Worship</a><a href="whats-on.html">Services and events</a><a href="church-life.html">Church life</a><a href="news.html">News</a><a href="gallery.html">Gallery</a><a href="sunday-services.html">Media · Sunday services</a></div>
    <div><h2>Our churches</h2><p>St Michael &amp; All Angels<br>Mickleham, Surrey</p><p>Westhumble Chapel<br>Westhumble, Surrey</p><a href="visit.html">Plan a visit <span aria-hidden="true">→</span></a></div>
    <div><h2>Get in touch</h2><p>Questions about visiting, worship or parish life?</p><a href="contact.html">Contact the church <span aria-hidden="true">→</span></a><a href="give.html">Support our church</a></div>
  </div>
  <div class="container footer-bottom"><span>© <span data-current-year>2026</span> St Michael &amp; All Angels</span><a href="contact.html">Contact</a></div>`;

document.querySelector('[data-site-header]')?.insertAdjacentHTML('afterbegin', navigation);
document.querySelector('[data-site-footer]')?.insertAdjacentHTML('afterbegin', footer);

document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mainNav');
const dropdownButtons = [...document.querySelectorAll('.nav-trigger')];

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
});

dropdownButtons.forEach(button => {
  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    closeDropdowns(button);
    button.setAttribute('aria-expanded', String(!isOpen));
    button.closest('.nav-item')?.classList.toggle('is-open', !isOpen);
  });
});

document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) {
    closeDropdowns();
    nav?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeDropdowns();
    if (nav?.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-label', 'Open navigation');
      menuButton?.focus();
    }
  }
});

const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav a, .dropdown a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  link.addEventListener('click', () => {
    nav?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});
